import {IEndpoint} from "../Types";
import {Request, Response} from "express";
import {Export} from "../Utils/Processing/Export";

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
		const user_id = "556949122003894296";
		const last_message_id = "1424608971028959345";

		try {
			const exportData = await Export({
				guildID: guild_id,
				channelID: channel_id,
				userID: user_id,
				format: format,
				messageCount: message_count,
				lastMessageID: last_message_id
			});
			if (!exportData) return res.status(500).json({error: 'Failed to export data'});

			res.setHeader('Content-Disposition', `attachment; filename=${exportData.name}`);
			res.setHeader('Content-Type', 'application/octet-stream');
			return res.status(200).send(exportData.data);
		} catch (e) {
			console.error(e);
			return res.status(500).json({error: 'Internal server error'});
		}
	}
} as IEndpoint<void | Response>;