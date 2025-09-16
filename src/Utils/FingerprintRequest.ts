import { Request } from 'express';
import crypto from 'crypto';
import ResolveIP from "./ResolveIP";

/**
 * Generate a device fingerprint from a request. \
 * This is not at all reliable because a lot of this information is generic and
 * can be spoofed, but it will defend against basic attacks and script kiddies.
 * A given request will always generate the same fingerprint, this is then hashed and the IP is included.
 * @param req
 * @returns {string} A SHA-1 hash of the fingerprint.
 */
export async function FingerprintRequest(req: Request) {
	const IP = ResolveIP(req);
	const userAgent = req.headers['user-agent'] || '';
	const accept = req.headers['accept'] || '';
	const acceptLanguage = req.headers['accept-language'] || '';
	const acceptEncoding = req.headers['accept-encoding'] || '';
	return crypto.createHash('sha1').update(IP + ':' + userAgent + ':' + accept + ':' + acceptLanguage + ':' + acceptEncoding).digest('hex');
}