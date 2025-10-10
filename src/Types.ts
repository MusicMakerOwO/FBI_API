import {Request, Response} from 'express';

export type JSONPrimitives = string | number | boolean | null;
export type JSONValue = JSONPrimitives | JSONValue[] | JSONObject;
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

export type WebSocketPayload = {
	op: number;
	seq: number;
	d?: JSONObject;
}

export type WebSocketHandlerResponse = {
	op: number;
	d?: JSONObject;
}

export interface WSEndpoint<TReturn = WebSocketHandlerResponse | void> {
	op_code: number;
	handler: (data: JSONObject | undefined) => Promise<TReturn>;
}