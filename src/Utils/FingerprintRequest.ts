import { Request } from 'express';

export async function FingerprintRequest(req: Request) {
	return {
		user_agent: String(req.headers['user-agent'] || ''),
		accept: String(req.headers['accept'] || ''),
		accept_language: String(req.headers['accept-language'] || ''),
		accept_encoding: String(req.headers['accept-encoding'] || '')
	}
}