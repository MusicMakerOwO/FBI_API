import {
	DB_Channel,
	DB_Guild,
	DB_Message, DB_Snapshot_Ban,
	DB_Snapshot_Channel,
	DB_Snapshot_Permission,
	DB_Snapshot_Role,
	DB_User
} from "../../Typings/DatabaseTypes";

export type SimpleGuild = Pick<DB_Guild, 'id' | 'name' | 'asset_id'>;
export type SimpleChannel = Pick<DB_Snapshot_Channel, 'id' | 'type' | 'name' | 'position' | 'topic' | 'nsfw' | 'parent_id'>;
export type SimpleUser = Pick<DB_User, 'id' | 'username' | 'bot' | 'asset_id'>;
export type SimpleMessage = Pick<DB_Message, 'id' | 'user_id' | 'content' | 'sticker_id' | 'created_at' | 'reply_to'>;
export type SimpleRole = Pick<DB_Snapshot_Role, 'id' | 'name' | 'color' | 'hoist' | 'position' | 'permissions' | 'managed'>;
export type SimplePermission = Pick<DB_Snapshot_Permission, 'id' | 'channel_id' | 'role_id' | 'allow' | 'deny'>;
export type SimpleBan = Pick<DB_Snapshot_Ban, 'user_id' | 'reason'>;

export function PermKey(channelID: string, roleID: string) {
	return `${channelID}-${roleID}`;
}

export function SimplifyChannel(channel: DB_Channel | DB_Snapshot_Channel): SimpleChannel {
	return {
		id: channel.id,
		type: channel.type ?? 0,
		name: channel.name ?? 'Unknown',
		position: 'position' in channel ? channel.position : 0,
		topic: 'topic' in channel ? channel.topic : null,
		nsfw: 'nsfw' in channel ? (channel.nsfw ? 1 : 0) : 0,
		parent_id: 'parent_id' in channel ? channel.parent_id : null
	}
}

export function SimplifyRole(role: DB_Snapshot_Role): SimpleRole {
	return {
		id: role.id,
		name: role.name ?? 'Unknown',
		color: role.color ?? 0,
		hoist: role.hoist ? 1 : 0,
		position: role.position ?? 0,
		permissions: role.permissions ?? '0',
		managed: role.managed ? 1 : 0
	}
}

export function SimplifyPermission(channelID: string, permission: DB_Snapshot_Permission): SimplePermission {
	return {
		id: PermKey(channelID, permission.role_id as string),
		channel_id: channelID,
		role_id: permission.role_id,
		allow: permission.allow ?? 0n,
		deny: permission.deny ?? 0n
	}
}

export function SimplifyBan(ban: DB_Snapshot_Ban): SimpleBan {
	return {
		user_id: ban.user_id,
		reason: ban.reason ?? 'No reason provided',
	}
}

export function SimplifyMessage(message: DB_Message): SimpleMessage {
	return {
		id: message.id,
		user_id: message.user_id,
		content: message.content || null,
		sticker_id: message.sticker_id,
		created_at: message.created_at,
		reply_to: message.reply_to || null // assuming reply_to is a field in the message
	};
}

export function SimplifyUser(user: DB_User): SimpleUser {
	return {
		id: user.id,
		username: user.username,
		bot: user.bot,
		asset_id: user.asset_id
	}
}

export function SimplifyGuild(guild: DB_Guild): SimpleGuild {
	return {
		id: guild.id,
		name: guild.name,
		asset_id: guild.asset_id
	}
}