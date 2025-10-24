import {IEndpoint} from '../../Typings/Types';
import {Request, Response} from 'express';
import {CreateSnapshot} from "../../Utils/SnapshotUtils";
import {DISCORD_PERMISSIONS} from "../../Utils/Discord/Permissions";
import {ResolvePermissionsFromRequest} from "../../Utils/Discord/ResolvePermissionsFromRequest";
import {SNAPSHOT_TYPE} from "../../Constants";
import {ObjectValues} from "../../Typings/HelperTypes";

export default {
	method: 'POST',
	route: '/snapshot',
	queries: [ 'guild_id', 'type' ],
	handler: async function (req: Request, res: Response) {
		const guildID = req.query.guild_id as string;
		// the '0' forces everything to be a number instead of NaN
		const snapshotType = parseInt('0' + req.query.type, 10) as ObjectValues<typeof SNAPSHOT_TYPE>;
		if (!Object.values(SNAPSHOT_TYPE).includes(snapshotType) ) {
			return { status: 400, message: `Invalid snapshot type, must be one of ${Object.values(SNAPSHOT_TYPE).join(", ")}` };
		}

		const permissions = await ResolvePermissionsFromRequest(req, guildID);
		if (typeof permissions === 'object') return permissions;

		if ((permissions & DISCORD_PERMISSIONS.MANAGE_GUILD) === 0n) {
			return { status: 403, message: 'You do not have permission to access snapshots' };
		}

		const snapshotID = await CreateSnapshot(guildID, snapshotType);

		return { status: 200, id: snapshotID };
	}
} as IEndpoint;