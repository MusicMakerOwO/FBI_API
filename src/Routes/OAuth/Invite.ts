import { Request, Response } from 'express';
import { IEndpoint } from '../../Types';

export default {
	route: '/invite',
	method: 'GET',
	handler: async (req: Request, res: Response) => {
		const target = req.query.id;
		return res.redirect('https://discord.com/oauth2/authorize?client_id=1065103018212732938&permissions=268560404&integration_type=0&scope=bot' + (target ? `&guild_id=${target}` : ''));
	}
} as IEndpoint<void>;