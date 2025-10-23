import {IEndpoint} from '../../Typings/Types';
import {Request, Response} from 'express';
import {FetchSnapshot, ResolveGuildIDFromSnapshot} from "../../Utils/SnapshotUtils";
import {ResolveToken} from "../../Utils/OAuth/ResolveToken";
import {GetGuilds} from "../../Utils/OAuth/UserRoutes";

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

		const guilds = await GetGuilds(token);

		if (!guilds.has(guildID)) return { status: 401, message: 'You are not a member of this server' }

		return await FetchSnapshot(snapshotID);
	}
} as IEndpoint;