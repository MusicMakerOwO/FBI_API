import { Request, Response } from 'express';
import { IEndpoint } from '../../Typings/Types';
import { Database } from '../../Database';

export default {
	route: '/stats',
	method: 'POST',
	params: {
		shardID: 'number',
		guilds: 'number',
		messages: 'number',
		users: 'number',
		snapshots: 'number'
	},
	handler: async (req: Request, res: Response) => {
		if (!req.headers.key) return res.status(401).send('No key provided');
		if (req.headers.key !== process.env.ACCESS_KEY) return res.status(401).send('Unauthorised');

		if (!req.body) return res.status(400).send('No body provided');
		const { shardID, guilds, messages, users, snapshots } = req.body as Record<string, number>;

		// don't care about the results, just respond quickly
		Database.query(`
			INSERT INTO BotStats (shard_id, guilds, messages, users, snapshots, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE
				guilds = VALUES(guilds),
				messages = VALUES(messages),
				users = VALUES(users),
				snapshots = VALUES(snapshots),
				updated_at = CURRENT_TIMESTAMP
		`, [shardID, guilds, messages, users, snapshots]);

		return { status: 200 }
	}
} as IEndpoint;