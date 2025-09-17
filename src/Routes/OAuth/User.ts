import { Request, Response } from 'express';
import { IEndpoint } from '../../Types';
import {GetUser} from "../../Utils/OAuth/UserRoutes";
import {ResolveToken} from "../../Utils/OAuth/ResolveToken";

export default {
	route: '/auth/user',
	method: 'GET',
	handler: async (req: Request, res: Response) => {
		const [ token, expiresAt ] = ResolveToken(req);
		if (expiresAt < Date.now()) return res.status(401).send('Session expired');

		return await GetUser(token);
	}
} as IEndpoint;