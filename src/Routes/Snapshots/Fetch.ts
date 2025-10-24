import {IEndpoint} from '../../Typings/Types';
import {Request, Response} from 'express';
import {FetchSnapshot, ResolveGuildIDFromSnapshot} from "../../Utils/SnapshotUtils";
import {DISCORD_PERMISSIONS} from "../../Utils/Discord/Permissions";
import {ResolvePermissionsFromRequest} from "../../Utils/Discord/ResolvePermissionsFromRequest";

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

		const permissions = await ResolvePermissionsFromRequest(req, guildID);
		if (typeof permissions === 'object') return permissions;

		if ((permissions & DISCORD_PERMISSIONS.MANAGE_GUILD) === 0n) {
			return { status: 403, message: 'You do not have permission to access snapshots' };
		}

		return await FetchSnapshot(snapshotID);
	}
} as IEndpoint;