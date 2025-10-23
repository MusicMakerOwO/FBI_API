import {IEndpoint} from '../../Typings/Types';
import {Request, Response} from 'express';
import {FetchSnapshot, ResolveGuildIDFromSnapshot} from "../../Utils/SnapshotUtils";
import {ResolveToken} from "../../Utils/OAuth/ResolveToken";
import {GetGuilds} from "../../Utils/OAuth/UserRoutes";
import {FetchDiscordGuild, FetchDiscordMember, FetchOAuthUser} from "../../Utils/Discord/FetchDiscord";
import {GlobalMemberPermissions} from "../../Utils/Discord/MemberPermissions";
import {DISCORD_PERMISSIONS} from "../../Utils/Discord/Permissions";

export default {
	method: 'GET',
	route: '/snapshots',
	queries: [ 'id' ],
	handler: async function (req: Request, res: Response) {
		// the '0' forces everything to be a number instead of NaN
		const snapshotID = parseInt('0' + req.query.id, 10);
		if (snapshotID < 1) return { status: 400, message: 'Snapshot ID must be a positive integer' }

		const guildID = await ResolveGuildIDFromSnapshot(snapshotID);
		if (!guildID) return { status: 404, message: 'Snapshot not found' };

		const [ token, expiresAt ] = ResolveToken(req);
		if (expiresAt < Date.now()) return { status: 401, message: 'Session expired' };

		const userGuilds = await GetGuilds(token);
		if (!userGuilds.has(guildID)) return { status: 401, message: 'You are not a member of this server' }

		// so many API calls sob
		const user = await FetchOAuthUser(token);
		const guild = await FetchDiscordGuild(guildID);
		const member = await FetchDiscordMember(guildID, user.id);

		// can be very expensive to call in some cases
		// thankfully guild fetching caches all roles automatically
		const permissions = await GlobalMemberPermissions(guild, member);

		if ((permissions & DISCORD_PERMISSIONS.MANAGE_GUILD) === 0n) {
			return { status: 403, message: 'You do not have permission to access snapshots' };
		}

		return await FetchSnapshot(snapshotID);
	}
} as IEndpoint;