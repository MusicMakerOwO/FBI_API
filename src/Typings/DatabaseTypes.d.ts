export type DB_Asset = {
	asset_id: number;
	discord_id: string;
	type: number;

	discord_url: string;

	name: string;
	extension: string;
	/** name.extension */
	fileName: string;

	width: number | null;
	height: number | null;
	/** In bytes */
	size: number;

	hash: string;
	uploaded: 1 | 0;
}

export type DB_Guild = {
	id: string;
	name: string;
	asset_id: number | null;

	accepted_terms: 1 | 0;
	snapshots_enabled: 1 | 0;

	last_restore: bigint | null;
}

export type DB_GuildBlock = {
	guild_id: string;
	user_id: string;
	moderator_id: string | null;
}

export type DB_Channel = {
	guild_id: string;

	id: string;
	name: string;
	type: number;

	block_exports: 1 | 0;
	last_purge: number | null;
}

export type DB_User = {
	id: string;
	username: string;
	bot: 1 | 0;
	asset_id: number | null;
	accepted_terms: 1 | 0;
	wrapped_key: Buffer | null;
	rotation_hour: number;
}

export type DB_Emoji = {
	id: string;
	name: string
	animated: 1 | 0;
	asset_id: number | null;
}

export type DB_Sticker = {
	id: string;
	name: string;
	asset_id: number | null;
}

export type DB_Message = {
	id: string;
	guild_id: string;
	channel_id: string;
	user_id: string;

	/** String if not encrypted, Buffer if encrypted, null if no content */
	content: Buffer | string | null;
	sticker_id: string | null;
	reply_to: string | null;

	/**
	 * If the `encrypted` flag is set to 1, all the below fields will be non-null.
	 * Otherwise, if it is 0, they will all be null.
	 */
	encrypted: 1 | 0;
	iv: Buffer | null;
	tag: Buffer | null;
	wrapped_dek: Buffer | null;
	encryption_version: number | null;

	/** Original length of the message before encryption */
	length: number;

	created_at: string;
}

export type DB_Attachment = {
	id: string;
	message_id: string;
	name: string;
	asset_id: number | null;
}

export type DB_Embed = {
	id: number;
	message_id: string;

	title: string | null;
	description: string | null;
	url: string | null;
	timestamp: string | null;
	color: number | null; // RGB integer

	footer_text: string | null;
	footer_icon: string | null;
	thumbnail_url: string | null;
	image_url: string | null;

	author_name: string | null;
	author_url: string | null;
	author_icon: string | null;
}

export type DB_EmbedField = {
	id: number;
	embed_id: number;

	name: string;
	value: string;
	inline: 1 | 0;
}

export type DB_MessageEmoji = {
	message_id: string;
	emoji_id: string;
	count: number;
}

export type DB_Snapshot = {
	id: number;
	guild_id: string;
	type: number;
	pinned: 1 | 0;
	created_at: string;
}

type SNAPSHOT_ENTITY = {
	snapshot_id: number;
	deleted: 1 | 0;
	needs_update: 1 | 0;
	hash: string;
}

export type DB_Snapshot_Channel = SNAPSHOT_ENTITY & {
	id: string;
	type: number;
	name: string;
	position: number;
	topic: string | null;
	nsfw: 1 | 0;

	parent_id: string | null;
}

export type DB_Snapshot_Role = SNAPSHOT_ENTITY & {
	id: string;
	name: string;
	color: number;
	hoist: 1 | 0;
	position: number;
	permissions: string;
	managed: 1 | 0;
}

export type DB_Snapshot_Permission = SNAPSHOT_ENTITY & {
	channel_id: string;
	role_id: string;
	id: string; // channelID-roleID
	allow: bigint;
	deny: bigint;
}

// does not extend SNAPSHOT_ENTITY because bans are not editable, only added/removed
export type DB_Snapshot_Ban = {
	snapshot_id: number;
	deleted: 1 | 0;
	hash: string;

	user_id: string;
	reason: string | null;
}