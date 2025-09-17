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
	/**
	 * Whether the endpoint requires authentication.
	 * If false, the endpoint can be accessed without authentication
	 *
	 * The session token will automatically be checked in the header and refreshed if valid
	 *
	 * @default true
	 */
	authenticated?: boolean;
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