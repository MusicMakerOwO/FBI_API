import { Request } from "express";
import Cookies from "universal-cookie";
import { UnwrapKey } from "../Encryption/KeyWrapper";

const tokenCache = new WeakMap<Request, [string, number]>();
export function ResolveToken(req: Request): [ string, number ] {
	if (tokenCache.has(req)) return tokenCache.get(req)!;

	const cookieJar = new Cookies(req.headers.cookie);
	const encryptedToken = req.headers.session ?? cookieJar.get('session'); // Support both header and cookie for flexibility
	if (!encryptedToken) return [ '', 0 ];

	const tokenBuffer = Buffer.from(encryptedToken, 'base64');

	const tokenParts = UnwrapKey(tokenBuffer).toString();

	const [ token, expiresAt ] = tokenParts.split(':');
	return [ token, parseInt(expiresAt) ];
}