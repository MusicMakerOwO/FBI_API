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
	avatar_decoration_data?: object | null;
	collectibles?: object | null;
	primary_guild?: object | null;
}

/**
 * This is only a partial guild object due to oauth restrictions.
 * The data contained here should be enough for most use cases but many items are missing.
 */
export type DiscordGuild = {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string; // bitfield as a string
	features: string[];
}