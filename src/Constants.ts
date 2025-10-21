const ROOT_FOLDER = __dirname;

const DB_SETUP_FILE    = `${ROOT_FOLDER}/../DB_SETUP.sql`;
const ROUTES_FOLDER    = `${ROOT_FOLDER}/Routes`;
const WEBSOCKET_FOLDER = `${ROOT_FOLDER}/WebSocket`;

const AVAILABLE_METHODS = new Set(['GET', 'POST', 'DELETE', 'PUT', 'PATCH']);
const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean', 'array', 'object']);

const SECONDS = {
	MINUTE: 60,
	HOUR: 	60 * 60,
	DAY: 	60 * 60 * 24,
	WEEK: 	60 * 60 * 24 * 7,
	MONTH: 	60 * 60 * 24 * 30,
	YEAR: 	60 * 60 * 24 * 365
}

const CORES_AVAILABLE = require('os').cpus().length;

const WEBSOCKET_OP_CODES = {
	// connection ops (100-199)
	HEARTBEAT		: 100,
	HEARTBEAT_ACK	: 101,
	OK				: 102,
	HELLO			: 103,
	IDENTIFY		: 104,

	// dispatch ops (200-299)
	FLUSH_CACHE		: 200,

	// errors (400-499)
	ERR_JSON_PARSE		: 400,
	ERR_JSON_FORMAT		: 401,
	ERR_UNKNOWN_OP_CODE	: 402,
	ERR_NO_RESPONSE		: 403,
	ERR_INVALID_AUTH	: 404,
	ERR_BAD_OP_CODES	: 405,

	SHUTTING_DOWN		: 499,

	// critical errors (500-599)
	CRIT_SERVER_BUSY		: 500,
}

const FORMAT = {
	TEXT: 'txt',
	JSON: 'json',
	CSV: 'csv',
	HTML: 'html'
}

export {
	ROOT_FOLDER,
	DB_SETUP_FILE,
	ROUTES_FOLDER,
	WEBSOCKET_FOLDER,

	AVAILABLE_METHODS,
	PRIMITIVE_TYPES,

	SECONDS,

	CORES_AVAILABLE,

	WEBSOCKET_OP_CODES,

	FORMAT
}