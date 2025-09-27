import {Request, Response} from 'express';

export type JSONPrimitives = string | number | boolean | null;
export type JSONValue = JSONPrimitives | JSONValue[] | { [key: string]: JSONValue };
export type JSONObject = { [key: string]: JSONValue };

export type JSONPrimitiveStrings = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export type Awaitable<T> = T | Promise<T>;

export type IEndpointReturn = { status?: number, [key: string]: JSONValue };

export interface IEndpoint<TReturn extends JSONObject | Response | void = IEndpointReturn> {
	method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
	route: string;
	params?: Record<string, JSONPrimitiveStrings>;
	queries?: string[];
	handler: (req?: Request, res?: Response) => Promise<TReturn>;
}

export type DiscordUser = {
	id: string;
	username: string;
	discriminator: string;
	global_name: string | null;
	avatar: string | null;
	bot?: boolean;
	system?: boolean;
	mfa_enabled?: boolean;
	banner?: string | null;
	accent_color?: number | null;
	locale?: string;
	verified?: boolean;
	email?: string | null;
	flags?: number;
	premium_type?: number;
	public_flags?: number;
	avatar_decoration_data?: object | null;
	collectibles?: object | null;
	primary_guild?: object | null;
}

/**
 * This is only a partial guild object due to oauth restrictions.
 * The data contained here should be enough for most use cases but many items are missing.
 */
export type DiscordGuild = {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string; // bitfield as a string
	features: string[];
}

export enum WebSocketOpCodes {
	// connection ops (100-199)
	HEARTBEAT = 100,
	HEARTBEAT_ACK = 101,
	SERVER_ACK = 102,
	CLIENT_ACK = 103,
	HELLO = 104,

	// dispatch ops (200-299)
	FLUSH_CACHE = 200,

	// errors (400-499)
	JSON_PARSE_ERROR = 400,
	JSON_FORMAT_ERROR = 401,
	UNKNOWN_OP_CODE = 402,
	NO_RESPONSE = 403,
	INVALID_SESSION = 404,

	SHUTTING_DOWN = 499,
}

export type WebSocketPayload = {
	op: WebSocketOpCodes;
	code: string;
	d?: JSONObject;
}

export interface WSEndpoint<TReturn = JSONObject | void> {
	op_code: number;
	handler: (data: JSONObject) => Promise<TReturn>;
}