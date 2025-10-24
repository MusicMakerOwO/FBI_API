import {IEndpoint} from '../../Typings/Types';
import {Request, Response} from 'express';
import {ListSnapshots} from "../../Utils/SnapshotUtils";
import {ResolvePermissionsFromRequest} from "../../Utils/Discord/ResolvePermissionsFromRequest";

export default {
	method: 'GET',
	route: '/snapshots/list',
	queries: [ 'guild_id' ],
	handler: async function (req: Request, res: Response) {
		const guildID = String(req.query.guild_id);

		const permissions = await ResolvePermissionsFromRequest(req, guildID);
		if (typeof permissions === 'object') return permissions;

		const snapshots = await ListSnapshots(guildID);

		return { status: 200, available_snapshots: snapshots };
	}
} as IEndpoint;