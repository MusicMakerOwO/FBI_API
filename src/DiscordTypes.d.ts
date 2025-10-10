export type DiscordGuild = {
	id: string;
	name: string;
	icon: string | null;
	icon_hash?: string;
	splash: string | null;
	discovery_splash?: string;
	owner: boolean | null;
	owner_id: string;
	permissions?: string; // bitfield as a string
	afk_channel_id?: string | null;
	afk_timeout: number;
	widget_enabled?: boolean;
	widget_channel_id?: string | null;
	verification_level: number;
	default_message_notifications: number;
	explicit_content_filter: number;
	roles: DiscordRole[];
	emojis: DiscordEmoji[];
	features: string[]; // array of guild feature strings
	mfa_level: number;
	application_id?: string | null;
	system_channel_id?: string | null;
	system_channel_flags: number;
	rules_channel_id?: string | null;
	max_presences?: number | null;
	max_members?: number;
	vanity_url_code?: string | null;
	description?: string | null;
	banner?: string | null;
	premium_tier: number;
	premium_subscription_count?: number;
	preferred_locale: string;
	public_updates_channel_id?: string | null;
	max_video_channel_users?: number;
	max_stage_video_channel_users?: number;
	approximate_member_count?: number;
	approximate_presence_count?: number;
	welcome_screen?: { description?: string; welcome_channels: DiscordWelcomeScreenChannel[] };
	nsfw_level: number;
	stickers?: DiscordSticker[];
	premium_progress_bar_enabled: boolean;
	safety_alerts_channel_id?: string | null;
	incidents_data?: DiscordGuildIncidents;
}

export type DiscordWelcomeScreenChannel = {
	channel_id: string;
	description: string;
	emoji_id?: string;
	emoji_name?: string;
}

export type DiscordRole = {
	id: string;
	name: string;
	color: number;
	hoist: boolean;
	icon?: string;
	unicode_emoji?: string;
	position: number;
	permissions: string;
	managed: boolean;
	mentionable: boolean;
	tags?: DiscordRoleTags;
	flags: number;
}

export type DiscordRoleTags = {
	bot_id?: string;
	integration_id?: string;
	premium_subscriber?: null;
	subscription_listing_id?: string;
	available_for_purchase?: null;
	guild_connections?: null;
}

export type DiscordEmoji = {
	id?: string;
	name?: string;
	roles?: string[];
	user?: DiscordUser;
	require_colons?: boolean;
	managed?: boolean;
	animated?: boolean;
	available?: boolean;
}

export type DiscordSticker = {
	id: string;
	pack_id?: string;
	name: string;
	description?: string;
	tags: string;
	type: number;
	format_type: number;
	available?: boolean;
	guild_id?: string;
	user?: DiscordUser;
	sort_value?: number;
}

export type DiscordGuildIncidents = {
	invites_disabled_until?: string;
	dms_disabled_until?: string;
	dm_spam_detected_at?: string;
	raid_detected_at?: string;
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
	avatar_decoration_data?: { asset: string; sku_id: string };
	collectibles?: { nameplate?: DiscordCollectibles[] };
	/**
	 * I don't know why but this is the user's badge
	 * Horrible name for the property, I know, blame Discord
	 */
	primary_guild?: {
		identity_guild_id?: string;
		identity_enabled?: boolean;
		tag?: string;
		badge?: string;
	}
}

export type DiscordCollectibles = {
	sku_id: string;
	asset: string;
	label: string;
	palette: string;
}

export type DiscordMember = {
	user?: DiscordUser;
	nick?: string;
	avatar?: string;
	banner?: string;
	roles: string[];
	joined_at?: string;
	premium_since?: string | null;
	deaf: boolean;
	mute: boolean;
	flags: number;
	pending?: boolean;
	permissions?: string;
	communication_disabled_until?: string | null;
	avatar_decoration_data?: { asset: string; sku_id: string };
}

export type DiscordChannel = {
	id: string;
	type: number;
	guild_id?: string;
	position?: number;
	permission_overwrites?: DiscordChannelOverwrite[];
	name?: string;
	topic?: string;
	nsfw?: boolean;
	last_message_id?: string;
	bitrate?: number;
	user_limit?: number;
	rate_limit_per_user?: number;
	recipients?: DiscordUser[];
	icon?: string;
	owner_id?: string;
	application_id?: string;
	managed?: boolean;
	parent_id?: string | null;
	last_pin_timestamp?: string | null;
	rtc_region?: string | null;
	video_quality_mode?: number;
	message_count?: number;
	member_count?: number;
	thread_metadata?: DiscordChannelThreadMetadata;
	member?: DiscordMember;
	default_auto_archive_duration?: number;
	permissions?: string;
	flags?: number;
	total_message_sent?: number;
	available_tags?: DiscordChannelTag[];
	applied_tags?: string[];
	default_reaction_emoji?: { emoji_id?: string; emoji_name?: string; };
	default_thread_rate_limit_per_user?: number | null;
	default_sort_order?: number | null;
	default_forum_layout?: number;
}

export type DiscordChannelTag = {
	id: string;
	name: string;
	moderated: boolean;
	emoji_id: string | null;
	emoji_name: string | null;
}

export type DiscordChannelThreadMetadata = {
	archived: boolean;
	auto_archive_duration: number;
	archived_at: string;
	locked: boolean;
	invitable?: boolean;
	create_timestamp?: string | null;
}

export type DiscordChannelOverwrite = {
	id: string;
	type: number;
	allow: string;
	deny: string;
}

/**
 * This is only a partial guild object due to oauth restrictions.
 * The data contained here should be enough for most use cases but many items are missing.
 */
export type DiscordGuild_Partial = Pick<DiscordGuild, 'id' | 'name' | 'icon' | 'owner' | 'permissions' | 'features'>;