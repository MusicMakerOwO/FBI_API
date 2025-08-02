// must be run with `node --env-file .env index.js`
if (!process.env.ACCESS_KEY) {
	console.error('Could not find process.env.ACCESS_KEY in .env');
	console.error('Please run the server with `node --env-file .env index.js`');
	process.exit(1);
}

const express = require('express');
const Database = require('./Database');

const app = express();
app.use(express.json());
//define the CORS headers
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, key');
	res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
});

// It's not very efficient but can prevent against timing attacks
function SecureStringTest(a = '', b = '') {
	if (a.length !== b.length) return false;

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}


function GetTimestamp() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	const day = now.getDate();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const seconds = now.getSeconds();
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function ResolveIP(input = '') {
	const [ IPv6, IPv4 ] = input.split(',');
	return IPv6 ?? IPv4 ?? null;
}

app.all('*', (req, res, next) => {
	const IP = ResolveIP(req.headers['x-forwarded-for']);
	const timestamp = GetTimestamp();
	console.log(`[${timestamp}] ${IP} : ${req.method} ${req.url}`);
	next();
});

app.post('/stats', (req, res) => {
	if (!req.headers.key) return res.status(401).send('No key provided');
	if (!SecureStringTest(req.headers.key, process.env.ACCESS_KEY)) return res.status(401).send('Unauthorised');

	if (!req.body) return res.status(400).send('No body provided');

	const { shardID, guilds, messages, users, snapshots } = req.body;

	console.log('Received stats:', req.body);

	if (
		typeof shardID   !== 'number' ||
		typeof guilds    !== 'number' ||
		typeof messages  !== 'number' ||
		typeof users 	 !== 'number' ||
		typeof snapshots !== 'number'
	) return res.status(400).send('Invalid data');

	Database.prepare(`
		INSERT INTO BotStats (shard_id, guilds, messages, users, snapshots, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(shard_id) DO UPDATE SET
			guilds = excluded.guilds,
			messages = excluded.messages,
			users = excluded.users,
			snapshots = excluded.snapshots,
			updated_at = excluded.updated_at
	`).run(shardID, guilds, messages, users, snapshots, new Date().toISOString());

	// delete stats that haven't been updated in 12 hours
	Database.prepare(`
		DELETE FROM BotStats
		WHERE updated_at < datetime('now', '-12 hours')
	`).run();

	return res.status(200).json({ status: 'ok' });
});

app.get('/stats', (req, res) => {
	const stats = Database.prepare(`
		SELECT
			SUM(guilds) AS guilds,
			SUM(messages) AS messages,
			SUM(users) AS users,
			SUM(snapshots) AS snapshots,
			MAX(updated_at) AS updated_at
		FROM BotStats
	`).get();
	console.log(stats);
	if (!stats) return res.status(500).send('Error fetching stats');
	return res.status(200).json(stats);
});

// api.notfbi.dev
const server = app.listen(3002, () => {
	console.log('Server started');
});

process.on('SIGINT', () => {
	console.log('Shutting down...');
	server.close();

	console.log('Optimising database...');
	Database.pragma('analysis_limit = 8000');
	Database.exec('ANALYZE'); // Optimise the database and add indecies
	Database.exec('VACUUM'); // Clear dead space to reduce file size
	Database.close();

	process.exit(0);
});