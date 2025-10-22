import {Request, Response} from 'express';
import {Database} from '../../Database';

export default {
	route: '/stats',
	method: 'GET',
	handler: async (req: Request, res: Response) => {
		const stats = await Database.query(`
			SELECT 
				SUM(guilds) as guilds,
				SUM(messages) as messages,
				SUM(users) as users,
				SUM(snapshots) as snapshots,
				MAX(updated_at) as last_updated
			FROM BotStats
		`).then(x => x[0]);

		return stats;
	}
}