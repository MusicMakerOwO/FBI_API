const ROOT_FOLDER = __dirname;

const DB_SETUP_FILE = `${ROOT_FOLDER}/DB_SETUP.sql`;
const DB_FILE = `${ROOT_FOLDER}/api.sqlite`;

const FILES_FOLDER = `${ROOT_FOLDER}/Files`;

module.exports = {
	ROOT_FOLDER,

	DB_SETUP_FILE,
	DB_FILE,

	FILES_FOLDER
}