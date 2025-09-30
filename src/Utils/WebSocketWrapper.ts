import {Log} from "./Log";
import {WebSocket} from 'ws';
import {JSONObject, WebSocketPayload} from "../Types";

type PromiseHandlers = {
	resolve: (value: any) => void;
	reject: (reason?: any) => void;
}

const WSPromises = new Map<number, PromiseHandlers>();
const PromiseTimeout = new WeakMap<PromiseHandlers, NodeJS.Timeout>();

let requestCounter = 0;

export class WebSocketWrapper {

	// no constructor, everything is static

	static Receive(data: WebSocketPayload): void {
		if (data.seq && WSPromises.has(data.seq)) {
			const promise = WSPromises.get(data.seq)!;
			WSPromises.delete(data.seq);
			clearTimeout(PromiseTimeout.get(promise));

			promise.resolve(data.d);
		} else {
			Log('WARN', 'Received WebSocket response with unknown sequence number:', data);
		}
	}

	static Send<T>(ws: WebSocket, op: number, d?: JSONObject): Promise<T | void> {
		const seq = (requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER);
		const payload: WebSocketPayload = {
			op,
			seq
		};
		if (d) payload.d = d;

		return new Promise<T | void>((resolve, reject) => {
			const promiseHandlers: PromiseHandlers = { resolve, reject };
			WSPromises.set(seq, promiseHandlers);

			const timeout = setTimeout(() => {
				WSPromises.delete(seq);
				reject(new Error('WebSocket request timed out'));
			}, 10_000);
			PromiseTimeout.set(promiseHandlers, timeout);

			ws.send(JSON.stringify(payload), (err) => {
				if (err) {
					WSPromises.delete(seq);
					clearTimeout(timeout);
					reject(err);
				}
			});
		});
	}
}