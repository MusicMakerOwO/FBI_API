import {Server} from 'node:http';
import {WebSocket, WebSocketServer} from 'ws';
import {Log} from "./Log";
import {WEBSOCKET_FOLDER, WEBSOCKET_OP_CODES} from "../Constants";
import * as WebSocketWrapper from "./WebSocketWrapper";
import {JSONObject, WebSocketPayload, WSEndpoint} from "../Types";
import {HashObject} from "./HashObject";
import {SecureStringTest} from "./SecureStringTest";
import ReadFolder from "./ReadFolder";
import {existsSync} from "node:fs";

let wss: WebSocketServer | undefined;

let sessionCounter = 0; // unsigned int, 4 bytes
const sessions = new Map<number, { ws: WebSocket | null, authorized: boolean, active: boolean, lastAck: number }>();

const WebSocketHandlers = new Map<number, WSEndpoint>();

const AvailableOpCodes = new Set<number>(Object.values(WEBSOCKET_OP_CODES));

function LoadHandlers() {
	if (!existsSync(WEBSOCKET_FOLDER)) {
		Log('ERROR', 'No WebSocket handlers found - Did TypeScript generate an empty folder?');
		return;
	}

	// just in case it gets called multiple times
	WebSocketHandlers.clear();

	const WSEndpointFiles = ReadFolder(WEBSOCKET_FOLDER, 5);
	Log('DEBUG', `Found ${WSEndpointFiles.length} WebSocket handlers to load`);

	for (const file of WSEndpointFiles) {
		const relativePath = file.replace(__dirname + '/', '');
		let Endpoint = require(file) as WSEndpoint | { default: WSEndpoint };
		if ('default' in Endpoint) {
			Endpoint = Endpoint.default;
		}
		if (typeof Endpoint.op_code !== 'number' || !AvailableOpCodes.has(Endpoint.op_code)) {
			Log('ERROR', `Invalid op code in file "${relativePath}" - Op code must be a valid WebSocketOpCodes enum value`);
			continue;
		}
		if (!Endpoint.handler || Endpoint.handler.constructor.name !== 'AsyncFunction') {
			Log('ERROR', `Invalid handler in file "${relativePath}" - Handler must be an async function`);
			continue;
		}
		if (WebSocketHandlers.has(Endpoint.op_code)) {
			Log('ERROR', `Duplicate WebSocket op code detected: ${Endpoint.op_code} in file "${relativePath}"`);
			continue;
		}

		WebSocketHandlers.set(Endpoint.op_code, Endpoint);
	}
	Log('DEBUG', `Loaded ${WebSocketHandlers.size} WebSocket handlers`);
}

export function InitializeWebSocket(server: Server, path: string = '/') {
	if (wss) return wss;

	LoadHandlers();

	wss = new WebSocketServer({ server, path });
	wss.on('connection', OnConnection);

	return wss;
}

export function ShutdownWebSocket() {
	if (!wss) return;

	Log('INFO', `Closing ${sessions.size} active WebSocket sessions ...`);
	for (const [code, session] of sessions) {
		if (session.ws) {
			session.ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.SHUTTING_DOWN }));
			session.ws.close( 1001, 'Server is shutting down' );
			WebSocketWrapper.CloseWS(session.ws);
		}
		sessions.delete(code);
	}
	wss.close();
}

function OnConnection(ws: WebSocket) {
	let deadConnectionCount = 0;
	let noAuthCount = 0;
	for (const session of sessions.values()) {
		if (!session.active || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
			deadConnectionCount++;
		}
		if (!session.authorized) {
			noAuthCount++;
		}
	}

	if (deadConnectionCount > 10) Log('WARN', `Found ${deadConnectionCount} dead WebSocket connections, did you forget to clear them?`);
	if (noAuthCount > 10) Log('WARN', `Found ${noAuthCount} unauthorized WebSocket connections, did the client forget to authenticate?`);
	if (sessions.size - deadConnectionCount >= 100) {
		Log('ERROR', `Rejecting new WebSocket connection - Server is handling ${sessions.size - deadConnectionCount} active WebSocket connections`);
		ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.CRIT_SERVER_BUSY }));
		WebSocketWrapper.CloseWS(ws);
		return;
	}

	const sessionID = ( sessionCounter = (sessionCounter + 1) % 0xFFFFFFFF ); // wrap around at 2^32 - 1
	sessions.set(sessionID, { ws, authorized: false, active: true, lastAck: Date.now() });

	Log('INFO', `New WebSocket connection established - Session #${sessionID}`);

	ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.HELLO }));

	ws.on('close', () => {
		sessions.delete(sessionID);
		WebSocketWrapper.CloseWS(ws);
		Log('WARN', `WebSocket connection closed - Session #${sessionID}`);
	});

	ws.on('message', async (rawMessage) => {
		let parsed: JSONObject = {};
		try {
			parsed = JSON.parse(rawMessage.toString());
		} catch {
			return ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_JSON_PARSE, d: { message: 'Failed to parse JSON' } }));
		}

		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_JSON_FORMAT, d: { message: 'Parsed JSON is not an object' } }));
		}

		if (typeof parsed.op !== 'number' || !AvailableOpCodes.has(parsed.op)) {
			return ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_UNKNOWN_OP_CODE, d: { message: `Invalid or unknown operation code: ${parsed.op}` } }));
		}
		const session = sessions.get(sessionID);
		if (!session) {
			ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_INVALID_AUTH }));
			WebSocketWrapper.CloseWS(ws);
			return;
		}

		if (parsed.op === WEBSOCKET_OP_CODES.HEARTBEAT_ACK) {
			if (session) {
				session.lastAck = Date.now();
				session.active = true;
				session.ws = ws;
			}
			return;
		}

		parsed.d ??= {}; // null | undefined -> {}
		if (typeof parsed.d !== 'object' || Array.isArray(parsed.d)) {
			return ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_JSON_FORMAT, d: { message: 'Field "d" must be an object if provided' } }));
		}

		if (!session.authorized) {
			// only thing you can do is heartbeat and identify

			if (parsed.op === WEBSOCKET_OP_CODES.IDENTIFY) {

				const opCodeHash = HashObject(WEBSOCKET_OP_CODES);

				const CloseConnection = (op: number) => {
					ws.send(JSON.stringify({ op }));
					WebSocketWrapper.CloseWS(ws);
					sessions.delete(sessionID);
				}

				if (typeof parsed.d.auth !== 'string' || !parsed.d.auth.trim()) {
					return CloseConnection(WEBSOCKET_OP_CODES.ERR_INVALID_AUTH);
				}
				if (typeof parsed.d.op_code_hash !== 'string' || !parsed.d.op_code_hash.trim()) {
					return CloseConnection(WEBSOCKET_OP_CODES.ERR_BAD_OP_CODES);
				}
				const base64Regex = /^[A-Za-z0-9+\/=]+$/;
				if (!base64Regex.test(parsed.d.auth)) {
					return CloseConnection(WEBSOCKET_OP_CODES.ERR_INVALID_AUTH);
				}
				const isValidAuth = SecureStringTest(parsed.d.auth, process.env.WEBSOCKET_AUTH!);
				if (!isValidAuth) {
					return CloseConnection(WEBSOCKET_OP_CODES.ERR_INVALID_AUTH);
				}

				// not critical for security, just sanity check to prevent issues
				if (parsed.d.op_code_hash !== opCodeHash) {
					return CloseConnection(WEBSOCKET_OP_CODES.ERR_BAD_OP_CODES);
				}

				session.authorized = true;
				Log('INFO', `WebSocket connection authorized - Session #${sessionID}`);
				return;
			}

			return;
		}

		console.log(parsed);

		if (typeof parsed.seq !== 'number' || parsed.seq < 0 || !Number.isInteger(parsed.seq)) {
			return ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_JSON_FORMAT, d: { message: 'Field "seq" must be a non-negative integer' } }));
		}

		if (parsed.op === WEBSOCKET_OP_CODES.OK) {
			WebSocketWrapper.Receive(ws, parsed as WebSocketPayload);
			return;
		}

		const endpoint = WebSocketHandlers.get(parsed.op);
		if (!endpoint) {
			return ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.ERR_UNKNOWN_OP_CODE, d: { message: `No handler for operation code: ${parsed.op}` } }));
		}

		const response = await endpoint.handler(parsed.d).catch((error: unknown) => {
			Log('ERROR', error);
			return { op: WEBSOCKET_OP_CODES.ERR_NO_RESPONSE, d: { message: 'Internal server error' } };
		});
		if (!response) return;

		ws.send(JSON.stringify(response));
	});

	setInterval(() => {
		const session = sessions.get(sessionID);
		if (!session || !session.ws) return;
		if (Date.now() - session.lastAck > 90_000) { // 90 seconds without ack
			WebSocketWrapper.CloseWS(session.ws);
			sessions.delete(sessionID);
			Log('WARN', `WebSocket connection timed out due to inactivity - Session #${sessionID}`);
			return;
		}
		session.ws.send(JSON.stringify({ op: WEBSOCKET_OP_CODES.HEARTBEAT }));
	}, 30_000);
}