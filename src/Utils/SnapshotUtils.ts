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
import {FetchDiscordGuild, FetchDiscordMember, MakeDiscordRequest} from "./Discord/FetchDiscord";
import {ObjectValues} from "../Typings/HelperTypes";
import {BOT_CLIENT_ID, SNAPSHOT_TYPE} from "../Constants";
import {DISCORD_PERMISSIONS} from "./Discord/Permissions";
import {Log} from "./Log";
import {DiscordBan, DiscordChannel} from "../Typings/DiscordTypes";
import {HashObject} from "./HashObject";
import {
	SimpleBan,
	SimpleChannel,
	SimplePermission, SimpleRole,
	SimplifyBan,
	SimplifyChannel,
	SimplifyPermission,
	SimplifyRole
} from "./Processing/Simplify";
import {GlobalMemberPermissions} from "./Discord/MemberPermissions";

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

/**
 * Internally just calls FetchSnapshotMetadata() and returns the guild ID from that.
 * Returns null if the snapshot does not exist.
 * @param snapshotID
 */
export async function ResolveGuildIDFromSnapshot(snapshotID: number) {
	const metadata = await FetchSnapshotMetadata(snapshotID);
	return metadata ? metadata.guild_id : null;
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

	// invalidate caches - force a fresh fetch next time
	GuildSnapshotCache.delete(guildID);
	SnapshotCache.delete(snapshotID);
}

type SnapshotData = DB_Snapshot & {
	channels: DB_Snapshot_Channel[];
	roles: DB_Snapshot_Role[];
	permissions: DB_Snapshot_Permission[];
	bans: DB_Snapshot_Ban[];
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
	const bans        = new Map<string, DB_Snapshot_Ban       >();

	const snapshotList = await ListSnapshots(guildID);

	const snapshotIDsToFetch = snapshotList.map(x => x.id).filter(id => id <= snapshotID); // just for ease of use lol
	if (snapshotIDsToFetch.length === 0) throw new Error('No snapshots to fetch - List is empty');

	// won't use until the end of the function, but the connection is only used here lol
	const snapshotMetadata = await FetchSnapshotMetadata(snapshotID);

	const searchParams = snapshotIDsToFetch.map((id) => id).join(', ');

	const connection = await Database.getConnection();

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
		... snapshotMetadata!,

		channels   : Array.from(channels.values()),
		roles      : Array.from(roles.values()),
		permissions: Array.from(permissions.values()),
		bans       : Array.from(bans.values())
	}

	SnapshotCache.set(snapshotID, snapshot);
	return snapshot;
}

const SnapshotMetadataCache = new LRUCache<number, DB_Snapshot | null>(1000);
export async function FetchSnapshotMetadata(snapshotID: number) {
	if (SnapshotMetadataCache.has(snapshotID)) return SnapshotMetadataCache.get(snapshotID)!;

	const snapshotMetadata = await Database.query(`
		SELECT * FROM FBI.Snapshots
		WHERE id = ?
	`, [snapshotID]).then(res => res[0] ?? null) as DB_Snapshot | null;

	SnapshotMetadataCache.set(snapshotID, snapshotMetadata);
	return snapshotMetadata;
}

export async function DeleteSnapshot(snapshotID: number) {
	const guildID = await ResolveGuildIDFromSnapshot(snapshotID);
	if (!guildID) throw new Error('Snapshot does not exist');

	const snapshotList = await ListSnapshots(guildID);
	if (!snapshotList.find(s => s.id === snapshotID)) throw new Error('Snapshot does not exist');

	const snapshotData = snapshotList.find(s => s.id === snapshotID)!;
	if (snapshotData.pinned) throw new Error('Cannot delete a pinned snapshot');

	const tables = [
		{
			name: 'SnapshotRoles',
			idColumn: 'id'
		},
		{
			name: 'SnapshotChannels',
			idColumn: 'id'
		},
		{
			name: 'SnapshotPermissions',
			idColumn: 'id'
		},
		{
			name: 'SnapshotBans',
			idColumn: 'user_id'
		}
	]

	const connection = await Database.getConnection();

	const promiseQueue = [];

	if (snapshotList[0].id === snapshotID) {
		// this is the most recent snapshot, we don't have to do any merging
		for (const table of tables) {
			promiseQueue.push(
				connection.query(`
					DELETE FROM FBI.${table.name}
					WHERE snapshot_id = ?
				`, [snapshotID])
			);
		}
	} else {
		// not the most recent snapshot, we have to merge the changes into the next snapshot

		const nextSnapshotID = snapshotList[ snapshotList.findIndex(s => s.id === snapshotID) - 1 ].id;

		for (const table of tables) {
			promiseQueue.push(
				// delete entries that exist in the next snapshot
				connection.query(`
                    DELETE FROM FBI.${table.name}
                    WHERE snapshot_id = ?
                      AND EXISTS (
                        SELECT 1
                        FROM ${table.name} AS next
                        WHERE next.snapshot_id = ?
                          AND next.${table.idColumn} = ${table.name}.${table.idColumn}
                    )
				`, [snapshotID, nextSnapshotID]),

				// move over entries that don't exist in the next snapshot
				connection.query(`
					UPDATE FBI.${table.name}
					SET snapshot_id = ?
					WHERE snapshot_id = ?
					AND NOT EXISTS (
						SELECT 1
						FROM ${table.name} AS next
						WHERE next.snapshot_id = ?
						AND next.${table.idColumn} = ${table.name}.${table.idColumn}
					)
				`, [nextSnapshotID, snapshotID, nextSnapshotID]),

				// delete any remaining entries (should be none, but just in case)
				connection.query(`
					DELETE FROM FBI.${table.name}
					WHERE snapshot_id = ?
				`, [snapshotID])
			);
		}

		await Promise.all(promiseQueue);

		// and finally delete the snapshot entry itself
		await connection.query(`
			DELETE FROM FBI.Snapshots
			WHERE id = ?
		`, [snapshotID]);

		Database.releaseConnection(connection);

		// invalidate caches - force a fresh fetch next time
		GuildSnapshotCache.delete(guildID);
		SnapshotCache.delete(snapshotID);
	}
}

const banCache = new TTLCache< DiscordBan[] >(1000 * 60 * 10); // guild_id -> Map<userID, DiscordBan>
async function FetchAllBans(guildID: string) {
	if (banCache.has(guildID)) return banCache.get(guildID)!;

	const MAX_BANS = 1000;
	const bans: DiscordBan[] = [];

	let offset: string | undefined;
	let previousOffset: string | undefined;

	while (true) {
		const fetchedBans = await MakeDiscordRequest<DiscordBan[]>(`guilds/${guildID}/bans?limit=${MAX_BANS}${offset ? `&after=${offset}` : ''}`);
		if ('code' in fetchedBans) {
			throw new Error(`Discord API error: ${fetchedBans.code} - ${fetchedBans.message}`);
		}

		if (fetchedBans.length === 0) break; // done reading bans

		bans.push( ... fetchedBans );

		offset = fetchedBans[ fetchedBans.length - 1].user.id;
		if (!offset || offset === previousOffset) {
			throw new Error('Pagination halted: offset is stuck or undefined.');
		}
		previousOffset = offset;

		if (fetchedBans.length < MAX_BANS) break;
	}

	banCache.set(guildID, bans);
	return bans;
}

const CHANGE_TYPE = {
	CREATE: 0,
	UPDATE: 1,
	DELETE: 2
}

const ALLOWED_CHANNEL_TYPES = new Set([0, 2, 4, 5, 10, 13, 15, 16]);

type Diff<T extends Object> = T & { change_type: ObjectValues<typeof CHANGE_TYPE>, hash?: string };

export async function CreateSnapshot(guildID: string, type: ObjectValues<typeof SNAPSHOT_TYPE>) {

	const guild = await FetchDiscordGuild(guildID);

	const botMember = await FetchDiscordMember(guildID, BOT_CLIENT_ID);
	if (!botMember) throw new Error('Bot is not a member of the guild');

	const botRole = guild.roles.find(role => role.tags?.bot_id === BOT_CLIENT_ID);
	if (!botRole) throw new Error('Bot role not found in guild');

	let currentBans: DiscordBan[] = [];

	const fetchStart = process.hrtime.bigint();
	const botPermissions = await GlobalMemberPermissions(guildID, botMember);
	if ((botPermissions & DISCORD_PERMISSIONS.BAN_MEMBERS) === 0n) {
		Log('WARN', `[SNAPSHOT] Bot does not have BanMembers permission in guild ${guild.name} (${guild.id}), skipping bans fetch`);
	} else {
		// Fetch all bans, this can take a while
		try {
			currentBans = await FetchAllBans(guildID);
		} catch (error) {
			Log('ERROR', error);
		}
	}

	const channels   : Diff<SimpleChannel>   [] = [];
	const roles      : Diff<SimpleRole>      [] = [];
	const permissions: Diff<SimplePermission>[] = [];
	const bans       : Diff<SimpleBan>       [] = [];

	const guildChannels = await MakeDiscordRequest<DiscordChannel[]>(`guilds/${guildID}/channels`);
	if ('code' in guildChannels) {
		throw new Error(`Discord API error: ${guildChannels.code} - ${guildChannels.message}`);
	}

	const guildRoles = guild.roles;
	const guildBans = currentBans;

	const fetchEnd = process.hrtime.bigint();

	const diffStart = process.hrtime.bigint();

	const highestRole = guild.roles.reduce((prev, curr) => (curr.position > prev.position ? curr : prev), guild.roles[0]);
	if (botRole.position < highestRole.position) {
		// bot role is not at the top, move everything above it down
		for (const role of guildRoles) {
			if (role.id === botRole.id) {
				role.position = highestRole.position + 1; // move bot role to the top
			}
		}
	}

	const connection = await Database.getConnection();

	const latestSnapshotID = await connection.query(`
		SELECT MAX(id) as id
		FROM FBI.Snapshots
		WHERE guild_id = ?
	`, [guild.id]).then(x => x[0]?.id ?? null ) as number | null;

	const snapshotList = await ListSnapshots(guildID);
	if (snapshotList.length > 0) {
		// first snapshot, no checks needed

		for (let i = 0; i < guildRoles.length; i++) {
			const simpleRole = SimplifyRole(guildRoles[i]);
			const hash = HashObject(simpleRole);
			roles.push({
				... simpleRole,
				change_type: CHANGE_TYPE.CREATE,
				hash: hash,
			});
		}

		for (let i = 0; i < guildChannels.length; i++) {
			const channel = guildChannels[i];
			if (!ALLOWED_CHANNEL_TYPES.has(channel.type)) continue; // skip non-guild channels

			const simpleChannel = SimplifyChannel(channel);
			const hash = HashObject(simpleChannel);

			channels.push({
				... simpleChannel,
				change_type: CHANGE_TYPE.CREATE,
				hash: hash,
			});

			if (channel.permission_overwrites) {
				for (let j = 0; j < channel.permission_overwrites.length; j++) {
					const permission = channel.permission_overwrites[j];
					if (permission.allow === '0' && permission.deny === '0') continue; // default permissions, save storage lol

					const simplePermission = SimplifyPermission(channel.id, permission);
					// hash without bigint permissions
					const hash = HashObject({ ... simplePermission, allow: permission.allow, deny: permission.deny });

					permissions.push({
						... simplePermission,
						change_type: CHANGE_TYPE.CREATE,
						hash: hash,
					});
				}
			}
		}

		for (const ban of guildBans.values()) {
			const simpleBan = SimplifyBan(ban);
			const hash = HashObject(simpleBan);
			bans.push({
				... simpleBan,
				change_type: CHANGE_TYPE.CREATE,
				hash: hash,
			});
		}
	} else {

		const snapshotData = await FetchSnapshot(latestSnapshotID!);

		// quick index for fast lookup
		const snapshotChannels    = new Map<string, DB_Snapshot_Channel   >(snapshotData.channels   .map(x => [x.id, x]));
		const snapshotRoles       = new Map<string, DB_Snapshot_Role      >(snapshotData.roles      .map(x => [x.id, x]));
		const snapshotPermissions = new Map<string, DB_Snapshot_Permission>(snapshotData.permissions.map(x => [x.id, x]));
		const snapshotBans        = new Map<string, DB_Snapshot_Ban       >(snapshotData.bans       .map(x => [x.user_id, x]));

		const processedRoles    = new Set<string>();
		const processedChannels = new Set<string>();
		const processedPerms    = new Set<string>();
		const processedBans     = new Set<string>();

		for (let i = 0; i < guildRoles.length; i++) {
			const simpleRole = SimplifyRole(guildRoles[i]);
			const hash = HashObject(simpleRole);
			processedRoles.add(simpleRole.id);
			if (snapshotRoles.has(simpleRole.id)) {
				if (snapshotRoles.get(simpleRole.id)!.hash !== hash) {
					roles.push({
						... simpleRole,
						change_type: CHANGE_TYPE.UPDATE,
						hash: hash,
					});
				}
			} else {
				roles.push({
					... simpleRole,
					change_type: CHANGE_TYPE.CREATE,
					hash: hash,
				});
			}
		}

		for (let i = 0; i < guildChannels.length; i++) {
			const channel = guildChannels[i];
			if (!ALLOWED_CHANNEL_TYPES.has(channel.type)) continue; // skip non-guild channels

			const simpleChannel = SimplifyChannel(channel);
			const hash = HashObject(simpleChannel);
			processedChannels.add(simpleChannel.id);
			if (snapshotChannels.has(simpleChannel.id)) {
				if (snapshotChannels.get(simpleChannel.id)!.hash !== hash) {
					channels.push({
						... simpleChannel,
						change_type: CHANGE_TYPE.UPDATE,
						hash: hash,
					});
				}
			} else {
				channels.push({
					... simpleChannel,
					change_type: CHANGE_TYPE.CREATE,
					hash: hash,
				});
			}

			if (channel.permission_overwrites) {
				for (let j = 0; j < channel.permission_overwrites.length; j++) {
					const permission = channel.permission_overwrites[j];
					if (permission.allow === '0' && permission.deny === '0') continue; // default permissions, save storage lol
					const simplePermission = SimplifyPermission(channel.id, permission);
					// hash without bigint permissions
					const hash = HashObject({ ... simplePermission, allow: permission.allow, deny: permission.deny });
					processedPerms.add(simplePermission.id);
					if (snapshotPermissions.has(simplePermission.id)) {
						if (snapshotPermissions.get(simplePermission.id)!.hash !== hash) {
							permissions.push({
								... simplePermission,
								change_type: CHANGE_TYPE.UPDATE,
								hash: hash,
							});
						}
					} else {
						permissions.push({
							... simplePermission,
							change_type: CHANGE_TYPE.CREATE,
							hash: hash,
						});
					}
				}
			}
		}

		for (let i = 0; i < guildBans.length; i++) {
			const simpleBan = SimplifyBan(guildBans[i]);
			const hash = HashObject(simpleBan);
			processedBans.add(simpleBan.user_id);
			if (snapshotBans.has(simpleBan.user_id)) {
				if (snapshotBans.get(simpleBan.user_id)!.hash !== hash) {
					bans.push({
						... simpleBan,
						change_type: CHANGE_TYPE.UPDATE,
						hash: hash,
					});
				}
			} else {
				bans.push({
					... simpleBan,
					change_type: CHANGE_TYPE.CREATE,
					hash: hash,
				});
			}
		}

		for (const role of snapshotRoles.values()) {
			if (role.managed) continue; // cant delete a bot role lol
			if (!processedRoles.has(role.id)) {
				roles.push({
					... snapshotRoles.get(role.id)!,
					change_type: CHANGE_TYPE.DELETE,
				});
			}
		}

		for (const channel of snapshotChannels.values()) {
			if (!processedChannels.has(channel.id)) {
				channels.push({
					... snapshotChannels.get(channel.id)!,
					change_type: CHANGE_TYPE.DELETE,
				});
			}
		}

		for (const permission of snapshotPermissions.values()) {
			if (!processedPerms.has(permission.id)) {
				permissions.push({
					... snapshotPermissions.get(permission.id)!,
					change_type: CHANGE_TYPE.DELETE,
				});
			}
		}

		for (const ban of snapshotBans.values()) {
			if (!processedBans.has(ban.user_id)) {
				bans.push({
					...snapshotBans.get(ban.user_id)!,
					change_type: CHANGE_TYPE.DELETE,
				});
			}
		}
	}
	const diffEnd = process.hrtime.bigint();

	let dbStart, dbEnd;

	await connection.query('START TRANSACTION');

	dbStart = process.hrtime.bigint();

	await connection.query(`
		INSERT INTO FBI.Snapshots (guild_id, type)
		VALUES (?, ?)
	`, [guild.id, type]);

	const snapshotID = await connection.query('SELECT MAX(id) as id FROM FBI.Snapshots WHERE guild_id = ?', [guild.id]).then(rows => rows[0].id) as number;

	try {
		const promiseQueue = [];

		if (roles.length > 0) promiseQueue.push(
			connection.batch(`
                INSERT INTO FBI.SnapshotRoles (
					   snapshot_id,
					   id, name, color, hoist,
					   position, permissions, managed,
					   hash, deleted
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, roles.map(role => [
				snapshotID,
				role.id, role.name, role.color, +role.hoist,
				role.position, role.permissions, +role.managed,
				role.hash, role.change_type === CHANGE_TYPE.DELETE ? 1 : 0
			]))
		);

		if (channels.length > 0) promiseQueue.push(
			connection.batch(`
				INSERT INTO FBI.SnapshotChannels (
					snapshot_id,
					id, type, name, position,
					topic, nsfw, parent_id,
					hash, deleted
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, channels.map(channel => [
				snapshotID,
				channel.id, channel.type, channel.name, channel.position,
				channel.topic, +channel.nsfw, channel.parent_id,
				channel.hash, channel.change_type === CHANGE_TYPE.DELETE ? 1 : 0
			]))
		);

		if (permissions.length > 0) promiseQueue.push(
			connection.batch(`
				INSERT INTO FBI.SnapshotPermissions (
					snapshot_id,
					channel_id, role_id, allow, deny,
					hash, deleted
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`, permissions.map(permission => [
				snapshotID,
				permission.channel_id, permission.role_id, permission.allow, permission.deny,
				permission.hash, permission.change_type === CHANGE_TYPE.DELETE ? 1 : 0
			]))
		);

		if (bans.length > 0) promiseQueue.push(
			connection.batch(`
				INSERT INTO FBI.SnapshotBans (
					snapshot_id,
					user_id, reason,
					hash, deleted
				)
				VALUES (?, ?, ?, ?, ?)
			`, bans.map(ban => [
				snapshotID,
				ban.user_id, ban.reason,
				ban.hash, ban.change_type === CHANGE_TYPE.DELETE ? 1 : 0
			]))
		);

		await Promise.all(promiseQueue);

		await connection.query('COMMIT');
	} catch(error) {
		await connection.query('ROLLBACK');
		throw error;
	} finally {
		dbEnd = process.hrtime.bigint();
		Database.releaseConnection(connection);
	}

	const banDuration = Number(fetchEnd - fetchStart) / 1e6;
	const diffDuration = Number(diffEnd - diffStart) / 1e6;
	const dbDuration = Number(dbEnd - dbStart) / 1e6;

	Log('DEBUG', `Snapshot #${snapshotID} created for ${guild.name} (${guild.id})`);
	Log('DEBUG', `Fetching : ${banDuration.toFixed(2)}ms, Diffing : ${diffDuration.toFixed(2)}ms, DB : ${dbDuration.toFixed(2)}ms`);

	return snapshotID;
}