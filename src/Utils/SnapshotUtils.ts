import {Database} from '../Database';
import {
	DB_Snapshot,
	DB_Snapshot_Ban,
	DB_Snapshot_Channel,
	DB_Snapshot_Permission,
	DB_Snapshot_Role
} from "../Typings/DatabaseTypes";
import {TTLCache} from "./Cache/TTLCache";
import {LRUCache} from "./Cache/LRUCache";

// for future use when adding premium
export async function MaxSnapshots(guildID: string) {
	return 7;
}

const GuildSnapshotCache = new TTLCache<DB_Snapshot[]>(1000 * 60 * 10); // 10 minute cache

/**
 * Returns a list of current snapshots owned by the guild.
 * The list is returned in order of newest first.
 * @param guildID
 * @constructor
 */
export async function ListSnapshots(guildID: string) {
	if (GuildSnapshotCache.has(guildID)) return GuildSnapshotCache.get(guildID)!;

	const snapshotList = await Database.query(`SELECT * FROM FBI.Snapshots WHERE guild_id = ? ORDER BY id DESC`, [guildID]) as DB_Snapshot[];
	GuildSnapshotCache.set(guildID, snapshotList);
	return snapshotList;
}

const SnapshotGuildCache = new LRUCache<number, string | undefined>(1000);
/**
 * Guild ID will be undefined only if the snapshot does not exist
 * @param snapshotID
 */
export async function ResolveGuildIDFromSnapshot(snapshotID: number) {
	if (SnapshotGuildCache.has(snapshotID)) return SnapshotGuildCache.get(snapshotID)!;

	const guildID = await Database.query(`
		SELECT guild_id FROM FBI.Snapshots
		WHERE id = ?
	`, [snapshotID]).then(res => res[0]?.guild_id) as string | undefined;

	SnapshotGuildCache.set(snapshotID, guildID);
	return guildID;
}

/**
 * @param snapshotID The target snapshot ID
 * @param pinned Whether the snapshot should be pinned or not
 */
export async function PinSnapshot(snapshotID: number, pinned: boolean) {
	const guildID = await ResolveGuildIDFromSnapshot(snapshotID);
	if (!guildID) throw new Error('Snapshot does not exist');

	const maxSnapshots = await MaxSnapshots(guildID);

	const snapshotList = await ListSnapshots(guildID);
	const pinnedSnapshotCount = snapshotList.reduce((curr, snapshot) => curr + snapshot.pinned, 0);
	const pinnedCountAfterOperation = pinnedSnapshotCount + (pinned ? 1 : -1);

	if (pinned && pinnedCountAfterOperation >= maxSnapshots) throw new Error('No slots available');

	Database.query(`
		UPDATE FBI.Snapshots
		SET pinned = ?
		WHERE id = ?
	`, [pinned, snapshotID]);
}

type SnapshotData = DB_Snapshot & {
	channels: DB_Snapshot_Channel[];
	roles: DB_Snapshot_Role[];
	permissions: DB_Snapshot_Permission[];
	bans: DB_Snapshot_Permission[];
}

type SnapshotEntity = DB_Snapshot_Role | DB_Snapshot_Channel | DB_Snapshot_Permission | DB_Snapshot_Ban;

const SnapshotCache = new LRUCache<number, SnapshotData>(200); // save up to 200 snapshots
export async function FetchSnapshot(snapshotID: number) {
	if (SnapshotCache.has(snapshotID)) return SnapshotCache.get(snapshotID)!;

	const guildID = await ResolveGuildIDFromSnapshot(snapshotID);
	if (!guildID) throw new Error('Snapshot does not exist');

	const roles       = new Map<string, DB_Snapshot_Role      >();
	const channels    = new Map<string, DB_Snapshot_Channel   >();
	const permissions = new Map<string, DB_Snapshot_Permission>();
	const bans        = new Map<string, DB_Snapshot_Permission>();

	const snapshotList = await ListSnapshots(guildID);

	const snapshotIDsToFetch = snapshotList.map(x => x.id).filter(id => id <= snapshotID); // just for ease of use lol
	if (snapshotIDsToFetch.length === 0) throw new Error('No snapshots to fetch - List is empty');

	const connection = await Database.getConnection();

	const searchParams = snapshotIDsToFetch.map((id) => id).join(', ');

	// wont use until the end of the function, but the connection is only used here lol
	const snapshotMetadata = await connection.query(`SELECT * FROM FBI.Snapshots WHERE id = ?`, [snapshotID]).then(x => x[0]) as DB_Snapshot;

	const fetchedRoles       = await connection.query(`SELECT * FROM FBI.SnapshotRoles       WHERE snapshot_id IN (${searchParams})`, []) as DB_Snapshot_Role[];
	const fetchedChannels    = await connection.query(`SELECT * FROM FBI.SnapshotChannels    WHERE snapshot_id IN (${searchParams})`, []) as DB_Snapshot_Channel[];
	const fetchedPermissions = await connection.query(`SELECT * FROM FBI.SnapshotPermissions WHERE snapshot_id IN (${searchParams})`, []) as DB_Snapshot_Permission[];
	const fetchedBans        = await connection.query(`SELECT * FROM FBI.SnapshotBans        WHERE snapshot_id IN (${searchParams})`, []) as DB_Snapshot_Ban[];

	Database.releaseConnection(connection);

	// sort lowest to highest
	const SortFunction = (a: {snapshot_id: number}, b: {snapshot_id:number}) => a.snapshot_id - b.snapshot_id;

	fetchedRoles.sort(SortFunction);
	fetchedChannels.sort(SortFunction);
	fetchedPermissions.sort(SortFunction);
	fetchedBans.sort(SortFunction);

	const ProcessEntities = (cache: Map<string, unknown>, entityList: SnapshotEntity[], keyProp = 'id') => {
		for (let i = 0; i < entityList.length; i++) {
			const entity = entityList[i];
			if (!(keyProp in entity)) throw new Error(`Cannot find "${keyProp}" in entity: ${JSON.stringify(entityList[i])}`);

			if (entity.deleted) {
				// @ts-expect-error
				cache.delete(entity[keyProp])
				continue;
			}
			// @ts-expect-error
			cache.set(entity[keyProp], entity);
		}
	}

	ProcessEntities(roles, fetchedRoles);
	ProcessEntities(channels, fetchedChannels);
	ProcessEntities(permissions, fetchedPermissions);
	ProcessEntities(bans, fetchedBans, 'user_id');

	const snapshot: SnapshotData = {
		... snapshotMetadata,

		channels   : Array.from(channels.values()),
		roles      : Array.from(roles.values()),
		permissions: Array.from(permissions.values()),
		bans       : Array.from(bans.values())
	}

	SnapshotCache.set(snapshotID, snapshot);
	return snapshot;
}

export async function DeleteSnapshot(snapshotID: number) {
	const snapshotData = await Database.query(`
		SELECT * FROM FBI.Snapshots
		WHERE id = ?
	`, [snapshotID]).then(res => res[0]) as DB_Snapshot;

	if (snapshotData.pinned) throw new Error('Cannot delete a pinned snapshot');
}