import { Request } from "express";
import Cookies from "universal-cookie";
import { UnwrapKey } from "../Encryption/KeyWrapper";

const tokenCache = new WeakMap<Request, [string, number]>();
export function ResolveToken(req: Request): [ string, number ] {
	if (tokenCache.has(req)) return tokenCache.get(req)!;

	const headerSession = typeof req.headers.session === 'string' ? decodeURIComponent(req.headers.session.replace(/\+/g, ' ')) : undefined;

	const encryptedToken = headerSession ?? new Cookies(req.headers.cookies).get('session'); // Support both header and cookie for flexibility
	if (!encryptedToken) return [ '', 0 ];

	const tokenBuffer = Buffer.from(encryptedToken, 'base64');

	const tokenParts = UnwrapKey(tokenBuffer).toString();

	const [ token, expiresAt ] = tokenParts.split(':');
	return [ token, parseInt(expiresAt) ];
}