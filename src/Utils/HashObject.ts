import {JSONObject} from "../Typings/Types";
import {createHash} from 'crypto';

export function HashObject(obj: JSONObject): string {
	if (Object.values(obj).some(v => typeof v === 'object' && v !== null)) {
		console.log(obj);
		throw new Error('HashObject received a nested object. Use only on flattened structures.');
	}

	const entries = Object.entries(obj);
	entries.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
	const flatString = entries.map(([key, value]) => key + ':' + value).join(',');
	return createHash('sha1').update(flatString).digest('hex');
}