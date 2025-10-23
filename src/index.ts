import 'source-map-support/register'; // Enable source maps for better error stack traces
import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../.env` });

import express from 'express';
import ReadFolder from './Utils/ReadFolder';
import ResolveIP from './Utils/ResolveIP';
import {Log} from './Utils/Log';
import {AVAILABLE_METHODS, PRIMITIVE_TYPES, ROUTES_FOLDER} from './Constants';
import {Database} from './Database';
import {IEndpoint, JSONPrimitiveStrings} from "./Typings/Types";
import {createServer} from 'http';
import {InitializeWebSocket, ShutdownWebSocket} from "./Utils/WebSocketUtils";

const PORT = 3002;

const app = express();
const server = createServer(app);

InitializeWebSocket(server);

app.use(express.json());
//define the CORS headers
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, key');
	res.header('Access-Control-Allow-Methods', Array.from(AVAILABLE_METHODS).join(', '));
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
});

app.all('*', async (req, res, next) => {
	const IP = ResolveIP(req);
	Log('INFO', `${IP} : ${req.method} ${req.url}`);
	next();
});

app.get('/favicon.ico', (req, res) => {
	// redirect to main site
	res.redirect('https://notfbi.dev/favicon.ico');
});

const Routes = new Map<string, IEndpoint>();

const availableRoutes = ReadFolder(ROUTES_FOLDER, 5).filter(x => x.endsWith('.js'));
Log('DEBUG', `Found ${availableRoutes.length} routes to load`);

for (const file of availableRoutes) {
	const relativePath = file.replace(__dirname + '/', '');
	let Endpoint = require(file) as IEndpoint | { default: IEndpoint };
	if ('default' in Endpoint) {
		Endpoint = Endpoint.default;
	}
	if (typeof Endpoint.route !== 'string') {
		Log('ERROR', `Invalid route in file "${relativePath}" - Route must be a string`);
		continue;
	}
	Endpoint.route = Endpoint.route.toLowerCase().trim();
	if (!AVAILABLE_METHODS.has(Endpoint.method?.toUpperCase())) {
		Log('ERROR', `Invalid method in file "${relativePath}" - Method must be one of ${Array.from(AVAILABLE_METHODS).join(', ')}`);
		continue;
	}
	Endpoint.method = Endpoint.method.toUpperCase() as IEndpoint['method'];
	if (!Endpoint.handler || Endpoint.handler.constructor.name !== 'AsyncFunction') {
		Log('ERROR', `Invalid handler in file "${relativePath}" - Handler must be an async function`);
		continue;
	}

	if (Endpoint.params) {
		if (typeof Endpoint.params !== 'object') {
			Log('ERROR', `Invalid params in file "${relativePath}" - Params must be an object`);
			continue;
		}

		for (const [key, type] of Object.entries(Endpoint.params)) {
			if (typeof key !== 'string' || !key.trim()) {
				Log('ERROR', `Invalid parameter name "${key}" in file "${relativePath}" - Parameter names must be non-empty strings`);
				continue;
			}
			if (!PRIMITIVE_TYPES.has(type)) {
					Log('ERROR', `Invalid parameter type "${type}" for "${key}" in file "${relativePath}" - Type must be one of ${Array.from(PRIMITIVE_TYPES).join(', ')}`);
			}
		}
	}

	if (Endpoint.queries) {
		if (!Array.isArray(Endpoint.queries) || Endpoint.queries.some(q => typeof q !== 'string')) {
			Log('ERROR', `Invalid queries in file "${relativePath}" - Queries must be an array of strings`);
			continue;
		}
	}

	const key = `${Endpoint.method}:${Endpoint.route}`;
	if (Routes.has(key)) {
		Log('ERROR', `Duplicate route detected: ${Endpoint.method} ${Endpoint.route}`);
		continue;
	}

	Routes.set(key, Endpoint);
}

Log('DEBUG', `Loaded ${Routes.size} routes`);

//  Request Validator
async function CheckType(value: any, type: JSONPrimitiveStrings): Promise<boolean> {
	switch (type) {
		case 'string':
			return typeof value === type && value.trim() !== '';
		case 'boolean':
			return typeof value === type;
		case 'number':
			return typeof value === type && !isNaN(value) && isFinite(value);
		case 'array':
			return Array.isArray(value);
		case 'object':
			return value !== null && typeof value === 'object' && !Array.isArray(value);
		default:
			Log('ERROR', `Unsupported type "${type}" in CheckType function`);
			return false;
	}
}

app.all('*', async (req, res) => {
	const method = req.method.toUpperCase();
	const route = req.path.toLowerCase();

	const key = `${method}:${route}`;
	if (!Routes.has(key)) {
		Log('ERROR', `Route not found: ${method} ${route}`);
		return res.status(404).json({ error: 'Route not found' });
	}

	const Endpoint = Routes.get(key)!;

	const errors = [];

	if (Endpoint.params) {
		for (const [param, type] of Object.entries(Endpoint.params)) {
			if (!(param in req.body)) {
				errors.push(`Missing required parameter "${param}" of type "${type}"`);
				continue;
			}

			if ( ! await CheckType(req.body[param], type as JSONPrimitiveStrings) ) {
				errors.push(`Invalid type for parameter "${param}": expected ${type}, got ${typeof req.body[param]}`);
				continue;
			}

			if (type === 'number' && (isNaN(req.body[param]) || !isFinite(req.body[param]))) {
				errors.push(`Invalid number for parameter "${param}": NaN or Infinity is not allowed`);
				continue;
			}
		}
	}

	if (Endpoint.queries) {
		for (const query of Endpoint.queries) {
			if (!(query in req.query)) {
				errors.push(`Missing required query parameter "${query}"`);
			}
		}
	}

	if (errors.length > 0) {
		return res.status(400).json({ error: 'Validation error', details: errors });
	}

	const timeout = setTimeout(() => {
		Log('ERROR', `Request to ${method} ${route} timed out after 10 seconds`);
		res.status(504).json({ error: 'Request timed out' }).end();
	}, 10000); // 10 seconds timeout

	const response = await Endpoint.handler(req, res).catch((error: unknown) => {
		Log('ERROR', error);
		return { status: 500, error: 'Internal server error' };
	});

	// if response is already sent, ignore the rest
	if (res.headersSent) {
		clearTimeout(timeout);
		return;
	}

	if (!response) {
		Log('ERROR', `No response returned from handler for ${method} ${route}`);
		return res.status(500).json({ error: 'Internal server error' });
	}

	clearTimeout(timeout);

	response.status ??= 200;

	const clean = await CleanResponse(response);

	res.status(response.status).json(clean);
});

// recursion :)
async function CleanResponse(obj: any) {
	if (typeof obj !== 'object' || obj === null) return obj; // Return non-objects as is

	for (const key in obj) {
		if (typeof obj[key] === 'bigint' || obj[key] instanceof BigInt) {
			obj[key] = obj[key].toString() + 'n';
		} else if (typeof obj[key] === 'number') {
			if (Number.isNaN(obj[key]) || !isFinite(obj[key])) {
				obj[key] = null; // Convert NaN or Infinity to null
			}
			if (obj[key] > Number.MAX_SAFE_INTEGER || obj[key] < Number.MIN_SAFE_INTEGER) {
				throw new RangeError(`Number out of safe range: ${obj[key]}; Consider switching to BigInt for large numbers`);
			}
		} else if (Array.isArray(obj[key])) {
			for (let i = 0; i < obj[key].length; i++) {
				obj[key][i] = await CleanResponse(obj[key][i]); // Recursively clean arrays
			}
		} else if (typeof obj[key] === 'object') {
			obj[key] = await CleanResponse(obj[key]); // Recursively clean nested objects
		}
	}

	return obj;
}

server.listen(PORT, async () => {
	Log('INFO', `Server is running on http://localhost:${PORT}`);
	Log('INFO', `WebSocket server is running on ws://localhost:${PORT}/ws`);
	await Database.Initialize();
	Log('INFO', `Database initialised and ready to use`);
});

async function Shutdown(code: string) {
	console.log();
	Log('WARN', `Received ${code}, shutting down ...`);

	const errCallback = Log.bind(null, 'ERROR');

	Log('INFO', 'Closing database connection ...');
	await Database.destroy().catch(errCallback);

	ShutdownWebSocket();

	Log('INFO', 'Closing HTTP server ...');
	await new Promise( r => server.close(r) ).catch(errCallback);

	process.exit(0);
}

async function ErrorCallback(error: unknown) {
	if (error instanceof Error) {
		Log('ERROR', `Uncaught exception: ${error.message}`);
		Log('ERROR', error.stack || 'No stack trace available');
	} else {
		Log('ERROR', `Uncaught exception: ${String(error)}`);
	}
}

// handle ctrl+c
process.on('SIGINT', () => Shutdown('SIGINT'));

// handle docker stop, kill etc
process.on('SIGTERM', () => Shutdown('SIGTERM'));

// handle ctrl+z (pause, but we don't want to pause)
process.on('SIGTSTP', () => Shutdown('SIGTSTP'));

// standard uncaught errors
process.on('uncaughtException', ErrorCallback);
process.on('unhandledRejection', ErrorCallback);