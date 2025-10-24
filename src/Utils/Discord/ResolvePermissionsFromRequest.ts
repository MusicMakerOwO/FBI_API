import {ResolveToken} from "../OAuth/ResolveToken";
import {GetGuilds} from "../OAuth/UserRoutes";
import {FetchDiscordGuild, FetchDiscordMember, FetchOAuthUser} from "./FetchDiscord";
import {GlobalMemberPermissions} from "./MemberPermissions";

import {Request} from "express";

/**
 * Returns a bigint of permissions if successful or an error object to respond with
 * @param req
 * @param guildID
 * @constructor
 */
export async function ResolvePermissionsFromRequest(req: Request, guildID: string): Promise<{ status: number, message: string } | bigint> {
	const [ token, expiresAt ] = ResolveToken(req);
	if (expiresAt < Date.now()) return { status: 401, message: 'Session expired' };

	const userGuilds = await GetGuilds(token);
	if (!userGuilds.has(guildID)) return { status: 401, message: 'You are not a member of this server' }

	// guild data includes a list of every single role
	// we can cache everything to avoid repeated role fetching later
	await FetchDiscordGuild(guildID);

	// so many API calls sob
	const user = await FetchOAuthUser(token);
	const member = await FetchDiscordMember(guildID, user.id);

	// can be very expensive to call in some cases
	// thankfully guild fetching caches all roles automatically
	return await GlobalMemberPermissions(guildID, member);
}