import type {Request} from 'express';

export default function ResolveIP(req: Request): string {
	const [ IPv6, IPv4 ] = ((req.headers['x-forwarded-for'] ?? '') as string).split(',');
	return IPv6 || IPv4 || '127.0.0.1';
}