const ROOT_FOLDER = __dirname;

const DB_SETUP_FILE = `${ROOT_FOLDER}/../DB_SETUP.sql`;
const ROUTES_FOLDER = `${ROOT_FOLDER}/Routes`;

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

export {
	ROOT_FOLDER,

	DB_SETUP_FILE,

	ROUTES_FOLDER,

	AVAILABLE_METHODS,
	PRIMITIVE_TYPES,

	SECONDS,

	CORES_AVAILABLE
}