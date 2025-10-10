import {Database} from '../../Database';
import {LRUCache} from "../Cache/LRUCache";

const cache = new LRUCache<Buffer>(1000); // userID -> key

export async function ResolveUserKey(userID: string): Promise<Buffer | null> {
	if (cache.has(userID)) return cache.get(userID); // buffer

	const savedKey = await Database.query('SELECT wrapped_key FROM Users WHERE id = ?', [userID]).then(rows => rows[0]?.wrapped_key) as Buffer | undefined;
	if (savedKey) cache.set(userID, savedKey);

	return savedKey ?? null; // buffer or null
}

export async function ResolveUserKeyBulk(userIDs: string[]): Promise<{ [userID: string]: Buffer | null }> {
	let needsFetch = false;
	const results: Record<string, Buffer | null> = Object.fromEntries( userIDs.map(id => [id, cache.get(id) ?? (needsFetch = true, null)]) );
	if (!needsFetch) return results; // all in cache

	const connection = await Database.getConnection();

	const fetchQuery = await connection.prepare(`SELECT wrapped_key FROM FBI.Users WHERE id = ?`);

	for (const [userID, key] of Object.entries(results)) {
		if (key) continue; // already in cache

		const savedKey = await fetchQuery.execute(userID).then(rows => rows[0]?.wrapped_key);
		if (savedKey) {
			cache.set(userID, savedKey);
			results[userID] = savedKey; // buffer
		}
	}

	Database.releaseConnection(connection);

	return results;
}

export function DeleteUserKeyFromCache(userID: string) {
	return cache.delete(userID);
}