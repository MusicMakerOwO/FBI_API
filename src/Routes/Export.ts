import {IEndpoint} from "../Typings/Types";
import {Request, Response} from "express";
import {Export} from "../Utils/Processing/Export";
import {ResolveToken} from "../Utils/OAuth/ResolveToken";
import {GetGuilds} from "../Utils/OAuth/UserRoutes";
import {FetchDiscordChannel, FetchDiscordMember, FetchOAuthUser} from "../Utils/Discord/FetchDiscord";
import {ChannelMemberPermissions} from "../Utils/Discord/MemberPermissions";
import {DISCORD_PERMISSIONS} from "../Utils/Discord/Permissions";
import {Log} from "../Utils/Log";

export default {
	method: 'POST',
	route: '/export',
	params: {
		guild_id: 'string',
		channel_id: 'string',
		format: 'string',
		message_count: 'number',
	},
	handler: async (req: Request, res: Response) => {
		const {guild_id, channel_id, format, message_count} = req.body as { guild_id: string; channel_id: string; format: string; message_count: number };

		if (message_count < 20 || message_count > 10_000) {
			return { status: 400, message: 'Message count must be between 20 and 10,000' };
		}

		const [ token, expiresAt ] = ResolveToken(req);
		if (expiresAt < Date.now()) return res.status(401).send('Session expired');

		const guildList = await GetGuilds(token);
		if (!guildList.has(guild_id)) return res.status(401).send('You are not a member of this server');

		const guild = guildList.get(guild_id)!;
		const user = await FetchOAuthUser(token);
		const member = await FetchDiscordMember(guild_id, user.id);
		const targetChannel = await FetchDiscordChannel(channel_id);

		const permissions = await ChannelMemberPermissions(guild_id, member, targetChannel);
		if ((permissions & DISCORD_PERMISSIONS.VIEW_CHANNEL) === 0n) {
			return res.status(403).send('You do not have permission to access this channel');
		}

		// funky magic, converts the current timestamp and adds the max possible offset to get the latest possible message ID
		// essentially this is the max number that any given discord ID could be, everything must be lower than this value
		const last_message_id = String( (BigInt(Date.now() - 1420070400000) << 22n) | BigInt( 0b1_1111_11111111_11111111 ) );

		try {
			const exportData = await Export({
				guildID: guild.id,
				channelID: targetChannel.id,
				userID: user.id,
				format: format,
				messageCount: message_count,
				lastMessageID: last_message_id
			});
			if (!exportData) return res.status(500).send('Failed to export data');

			res.setHeader('Content-Disposition', `attachment; filename=${exportData.name}`);
			res.setHeader('Content-Type', 'application/octet-stream');
			return res.status(200).send(exportData.data);
		} catch (e) {
			Log('ERROR', e);
			return res.status(500).send('Internal server error');
		}
	}
} as IEndpoint<Response>;