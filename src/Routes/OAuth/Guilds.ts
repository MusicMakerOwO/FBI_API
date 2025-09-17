import { Request, Response } from 'express';
import { IEndpoint } from '../../Types';
import {GetGuilds} from "../../Utils/OAuth/UserRoutes";
import {ResolveToken} from "../../Utils/OAuth/ResolveToken";

export default {
	route: '/auth/guilds',
	method: 'GET',
	handler: async (req: Request, res: Response) => {
		const [ token, expiresAt ] = ResolveToken(req);
		if (expiresAt < Date.now()) return res.status(401).send('Session expired');

		const guilds = await GetGuilds(token);
		return Object.fromEntries(guilds.entries());
	}
} as IEndpoint;