import {DiscordChannel, DiscordGuild, DiscordMember} from "../../DiscordTypes";
import {FetchDiscordRole} from "./FetchDiscord";
import {DISCORD_PERMISSIONS} from "./Permissions";

const ADMIN_PERMISSIONS = Object.values(DISCORD_PERMISSIONS).reduce((a, b) => a | b, 0n);

export async function GlobalMemberPermissions(guild: DiscordGuild, member: DiscordMember) {
	let permissionsBitfield = 0n;

	const everyoneRole = await FetchDiscordRole(guild.id, guild.id);
	permissionsBitfield |= BigInt(everyoneRole.permissions);

	// everyone has admin, no need to check roles
	if (permissionsBitfield & DISCORD_PERMISSIONS.ADMINISTRATOR) {
		return ADMIN_PERMISSIONS;
	}

	for (const roleID of member.roles) {
		const role = await FetchDiscordRole(guild.id, roleID);
		permissionsBitfield |= BigInt(role.permissions);

		// a role grants the user admin, we can skip everything else
		if (permissionsBitfield & DISCORD_PERMISSIONS.ADMINISTRATOR) {
			return ADMIN_PERMISSIONS;
		}
	}

	return permissionsBitfield;
}

export async function ChannelMemberPermissions(guild: DiscordGuild, member: DiscordMember, channel: DiscordChannel) {
	let permissionsBitfield = await GlobalMemberPermissions(guild, member);
	if (permissionsBitfield & DISCORD_PERMISSIONS.ADMINISTRATOR) {
		return ADMIN_PERMISSIONS;
	}

	if (!channel.permission_overwrites) {
		return permissionsBitfield;
	}

	// index the overwrites for faster read access
	const channelOverwrites = new Map<string, { type: number; allow: bigint; deny: bigint }>();
	for (const overwrite of channel.permission_overwrites) {
		channelOverwrites.set(overwrite.id, {
			type: overwrite.type,
			allow: BigInt(overwrite.allow),
			deny: BigInt(overwrite.deny)
		});
	}

	// apply everyone overwrite
	const everyoneOverwrite = channelOverwrites.get(guild.id);
	if (everyoneOverwrite) {
		permissionsBitfield &= ~everyoneOverwrite.deny;
		permissionsBitfield |= everyoneOverwrite.allow;
	}

	// apply role overwrites
	let allow = 0n;
	let deny = 0n;
	for (const roleID of member.roles) {
		const roleOverwrite = channelOverwrites.get(roleID);
		if (roleOverwrite) {
			allow |= roleOverwrite.allow;
			deny |= roleOverwrite.deny;
		}
	}
	permissionsBitfield &= ~deny;
	permissionsBitfield |= allow;

	// apply member overwrite
	const memberOverwrite = channelOverwrites.get(member.user!.id);
	if (memberOverwrite) {
		permissionsBitfield &= ~memberOverwrite.deny;
		permissionsBitfield |= memberOverwrite.allow;
	}

	return permissionsBitfield;
}