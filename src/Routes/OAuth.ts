/*
app.get('/auth', async (req, res) => {
	if (!req.query.code) return res.status(400).send('No code provided');
	if (typeof req.query.code !== 'string') return res.status(400).send('Invalid code');

	const AccessTokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: 'Basic ' + Buffer.from(`1065103018212732938:8EkDk4aU0kRW8Qfy83zjIgaA75dRAf0I`).toString('base64'),
		},
		body: new URLSearchParams({
			code: req.query.code,
			grant_type: 'authorization_code',
			redirect_uri: 'https://api.notfbi.dev/auth',
		})
	});

	console.log(await AccessTokenResponse.json());

	return res.status(501).send('Not implemented');
});
*/

import { Request, Response } from 'express';
import { IEndpoint } from '../Types';
import {ExchangeOAuthCode} from "../Utils/ExchangeOAuthCode";
import {WrapKey} from "../Utils/Encryption/KeyWrapper";

export default {
	route: '/auth',
	method: 'GET',
	queries: ['code'],
	handler: async (req: Request, res: Response) => {
		if (!req.query.code) return res.status(400).send('No code provided');
		if (typeof req.query.code !== 'string') return res.status(400).send('Invalid code');

		const Access = await ExchangeOAuthCode(req.query.code);
		console.log(Access);

		const encrypted = WrapKey(Buffer.from(Access.token + ':' + Access.expiresAt.getTime()));
		res.cookie('session', encrypted.toString('base64'), { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }); // 7 days, default for discord

		res.redirect('https://dashboard.notfbi.dev/home');
	}
} as IEndpoint<void>;