import {Log} from "./Log";
import {WebSocket} from 'ws';
import {JSONObject, WebSocketPayload} from "../Types";

type PromiseHandlers = {
	resolve: (value: any) => void;
	reject: (reason?: any) => void;
}

const WSPromises = new WeakMap<WebSocket, Map<number, PromiseHandlers>>(); // socket -> seq -> promise
const PromiseTimeout = new WeakMap<PromiseHandlers, NodeJS.Timeout>();

let requestCounter = 0;

function ResolveInnerMap(ws: WebSocket): Map<number, PromiseHandlers> {
	if (!WSPromises.has(ws)) WSPromises.set(ws, new Map());
	return WSPromises.get(ws)!;
}

function CleanupPromise(handlers: PromiseHandlers): void {
	const timeout = PromiseTimeout.get(handlers);
	clearTimeout(timeout);
	PromiseTimeout.delete(handlers);
}

export function Receive(ws: WebSocket, data: WebSocketPayload): void {
	const innerMap = ResolveInnerMap(ws);
	if (data.seq && innerMap.has(data.seq)) {
		const promise = innerMap.get(data.seq)!;
		CleanupPromise(promise);
		innerMap.delete(data.seq);

		promise.resolve(data.d);
	} else {
		Log('WARN', 'Received WebSocket response with unknown sequence number:', data);
	}
}

export function CloseWS(ws: WebSocket): void {
	if (WSPromises.has(ws)) {
		const promises = WSPromises.get(ws)!;
		for (const handlers of promises.values()) {
			CleanupPromise(handlers);
			handlers.reject(new Error('WebSocket closed before response was received'));
		}
		WSPromises.delete(ws);
	}
	if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) return;
	ws.close(1000, 'Normal Closure');
	Log('INFO', 'WebSocket closed');
}

export function Send<T>(ws: WebSocket, op: number, d?: JSONObject): Promise<T | void> {
	const seq = (requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER);
	const payload: WebSocketPayload = {
		op,
		seq
	};
	if (d) payload.d = d;

	const innerMap = ResolveInnerMap(ws);
	if (innerMap.size >= 100) {
		return Promise.reject(new Error('Too many pending WebSocket requests'));
	}

	return new Promise<T | void>((resolve, reject) => {
		const promiseHandlers: PromiseHandlers = { resolve, reject };
		innerMap.set(seq, promiseHandlers);

		const timeout = setTimeout(() => {
			innerMap.delete(seq);
			reject(new Error('WebSocket request timed out'));
		}, 10_000);
		PromiseTimeout.set(promiseHandlers, timeout);

		ws.send(JSON.stringify(payload), (err) => {
			if (err) {
				CleanupPromise(promiseHandlers);
				innerMap.delete(seq);
				reject(err);
			}
		});
	});
}