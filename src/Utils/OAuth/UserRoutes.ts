import {DiscordGuild, DiscordUser} from "../../Types";
import {TTLCache} from "../Cache/TTLCache";

const userCache = new TTLCache<DiscordUser>(1000 * 60 * 5); // token -> DiscordUser
const userGuildsCache = new TTLCache<PartialGuild[]>(1000 * 60 * 30); // token -> DiscordGuild[]

export async function GetUser(token: string): Promise<DiscordUser | null> {
	if (userCache.has(token)) return userCache.get(token);

	const response = await fetch('https://discord.com/api/v10/users/@me', {
		headers: {
			Authorization: `Bearer ${token}`,
		}
	}).then(res => res.json()) as DiscordUser | { error: string, error_description: string };

	if ('error' in response) {
		console.log(response);
		throw new Error(`Error fetching user: ${response.error} - ${response.error_description}`);
	}

	userCache.set(token, response); // 30 minutes cache
	return response;
}

type PartialGuild = Pick<DiscordGuild, 'id' | 'name' | 'icon' | 'owner' | 'permissions'>;

export async function GetGuilds(token: string): Promise< Map<string, PartialGuild> > {
	if (userGuildsCache.has(token)) {
		const guilds = userGuildsCache.get(token)!;
		return new Map(guilds.map(g => [g.id, g]));
	}

	const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
		headers: {
			Authorization: `Bearer ${token}`,
		}
	}).then(res => res.json()) as PartialGuild[] | { error: string, error_description: string };

	if ('error' in response) {
		console.log(response);
		throw new Error(`Error fetching user guilds: ${response.error} - ${response.error_description}`);
	}

	for (let i = 0; i < response.length; i++) {
		const guild = response[i];
		response[i] = {
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			owner: guild.owner,
			permissions: guild.permissions,
		}
	}

	userGuildsCache.set(token, response); // 30 seconds cache
	return new Map(response.map(g => [g.id, g]));
}