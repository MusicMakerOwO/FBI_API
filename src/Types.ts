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
