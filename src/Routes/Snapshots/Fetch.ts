import {IEndpoint} from '../../Typings/Types';
import {Request, Response} from 'express';
import {FetchSnapshot} from "../../Utils/SnapshotUtils";

export default {
	method: 'GET',
	route: '/snapshots',
	queries: [ 'id' ],
	handler: async function (req: Request, res: Response) {
		// the '0' forces everything to be a number instead of NaN
		const snapshotID = parseInt('0' + req.query.id, 10);
		if (snapshotID < 1) return { status: 400, message: 'Snapshot ID must be a positive integer' }

		console.time('Snapshot generation')
		const snapshot = await FetchSnapshot(snapshotID);
		console.timeEnd('Snapshot generation')

		return snapshot;
	}
} as IEndpoint;