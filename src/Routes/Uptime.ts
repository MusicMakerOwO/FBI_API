import {IEndpoint} from "../Typings/Types";

export default {
	route: '/uptime',
	method: 'GET',
	authenticated: false,
	handler: async () => {
		const uptime = process.uptime();
		const days = ~~(uptime / 86400);
		const hours = ~~((uptime % 86400) / 3600);
		const minutes = ~~((uptime % 3600) / 60);
		const seconds = ~~(uptime % 60);

		return { days, hours, minutes, seconds }
	}
} as IEndpoint;