import { TTLCache } from '../Cache/TTLCache.js';
import {DiscordChannel, DiscordGuild, DiscordMember, DiscordRole, DiscordUser} from "../../Typings/DiscordTypes";

function StringConcat( ... args: string[]) {
	return args.join('-');
}

const MINUTE = 1000 * 60;

const GuildCache   = new TTLCache<DiscordGuild  >(MINUTE * 30);
const UserCache    = new TTLCache<DiscordUser   >(MINUTE * 5 );
const MemberCache  = new TTLCache<DiscordMember >(MINUTE     ); // 1 minute ttl, use sparingly
const ChannelCache = new TTLCache<DiscordChannel>(MINUTE * 10);
const RoleCache    = new TTLCache<DiscordRole   >(MINUTE * 10);

type API_Error = {
	code: number;
	message: string;
}

async function MakeDiscordRequest(endpoint: string) {
	const response = await fetch(`https://discord.com/api/v10/${endpoint}`, {
		headers: {
			Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		return await response.json() as Promise<API_Error>;
	}

	return response.json();
}

function CreateFetchFunction<T extends {}>(cache: TTLCache<T>, endpoint: string, hook?: (data: T) => void) {
	return async function ( ... ids: string[] ): Promise<T> {
		const cacheKey = StringConcat( ... ids );
		if (cache.has(cacheKey)) return cache.get(cacheKey)!;

		const endpointFormatted = endpoint.replace(/{(\d+)}/g, (_, index) => ids[parseInt(index)]);
		const response = await MakeDiscordRequest(endpointFormatted) as T | API_Error;
		if ('code' in response) {
			throw new Error(`Discord API error: ${response.code} - ${response.message}`);
		}

		cache.set(cacheKey, response);

		if (hook) hook(response);

		return response;
	}
}

function GuildHook(guild: DiscordGuild) {
	// guild data contains roles additionally, cache them too
	for (const role of guild.roles) {
		const key = StringConcat(guild.id, role.id);
		RoleCache.set(key, role);
	}
}

function MemberHook(member: DiscordMember) {
	// member data contains user additionally, cache them too
	if (member.user) {
		UserCache.set(member.user.id, member.user);
	}
}

function ChannelHook(channel: DiscordChannel) {
	// channel data contains recipients (users) additionally, cache them too
	if (channel.member && channel.member.user) {
		const key = StringConcat(channel.guild_id!, channel.member.user.id);
		MemberCache.set(key, channel.member);
	}
}

export const FetchDiscordGuild   = CreateFetchFunction<DiscordGuild  >(GuildCache  , 'guilds/{0}'            , GuildHook  ) as (id: string) => Promise<DiscordGuild>;
export const FetchDiscordUser    = CreateFetchFunction<DiscordUser   >(UserCache   , 'users/{0}'             ,            ) as (id: string) => Promise<DiscordUser>;
export const FetchDiscordMember  = CreateFetchFunction<DiscordMember >(MemberCache , 'guilds/{0}/members/{1}', MemberHook ) as (guildID: string, userID: string) => Promise<DiscordMember>;
export const FetchDiscordChannel = CreateFetchFunction<DiscordChannel>(ChannelCache, 'channels/{0}'          , ChannelHook) as (id: string) => Promise<DiscordChannel>;
export const FetchDiscordRole    = CreateFetchFunction<DiscordRole   >(RoleCache   , 'guilds/{0}/roles/{1}'  ,            ) as (guildID: string, roleID: string) => Promise<DiscordRole>;