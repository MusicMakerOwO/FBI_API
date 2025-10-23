import { FORMAT } from "../../Constants";
import { Database } from "../../Database";
import { readFileSync } from "fs";
import { minify } from "html-minifier";
import { ResolveUserKeyBulk } from "../Encryption/ResolveUserKey";
import {
	SimplifyMessage,
	SimplifyUser,
	SimplifyGuild,
	SimpleUser,
	SimpleGuild,
	SimpleChannel,
	SimpleMessage, SimplifyChannel
} from "./Simplify";
import { UnwrapKey } from "../Encryption/KeyWrapper";
import { DecryptMessage } from "../Encryption/Messages";
import {PoolConnection} from "mariadb";
import {
	DB_Asset,
	DB_Attachment, DB_Channel,
	DB_Embed,
	DB_EmbedField,
	DB_Emoji, DB_Guild,
	DB_Message,
	DB_Sticker,
	DB_User
} from "../../Typings/DatabaseTypes";

const missingAsset = readFileSync(`${__dirname}/../../../missing.png`);

type DEFAULT_OPTIONS = {
	guildID: string;
	channelID: string;
	userID: string;
	format: string;
	messageCount: number
	lastMessageID: string;
}

async function BatchCache<T>(connection: PoolConnection, list: Record<string, unknown>[] | unknown[], property: string, table: string, column: string): Promise<Map<string, T>> {
	const IDs = new Set<unknown>();
	for (let i = 0; i < list.length; i++) {
		const entry = list[i] as { [key: string]: unknown };
		if (typeof entry === 'object' && entry !== null && property in entry) {
			IDs.add( entry[property] );
		} else {
			IDs.add( entry );
		}
	}
	const IDsArray = Array.from(IDs);
	if (list.length === 0) return new Map();
	const dbData: (T & { [key: string]: unknown })[] = await connection.query(`
		SELECT *
		FROM FBI.${table}
		WHERE ${column} IN ( ${'?,'.repeat(IDsArray.length - 1)}? )
	`, IDsArray);
	return new Map(dbData.map(x => [x[column] as string, x]));
}

const chars = 'ABCDEFGHKLMNPQRSTVWXYZ23456789';
async function GenerateExportID(connection: PoolConnection, attempts = 5): Promise<string> {
	if (attempts <= 0) throw new Error('Failed to generate export ID');
	// XXXX-XXXX-XXXX-XXXX
	const id = [];
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			id.push( chars[Math.floor(Math.random() * chars.length)] );
		}
		if (i !== 3) id.push('-');
	}
	const idString = id.join('');
	const [exists] = await connection.query(`SELECT id FROM FBI.Exports WHERE id = ?`, [idString]);
	return exists ? GenerateExportID(connection, attempts - 1) : idString;
}

type ExportContext = {
	Owner: SimpleUser,
	ID: string,
	Guild: SimpleGuild,
	Channel: SimpleChannel,

	Users: Map<string, SimpleUser>,
	Emojis: Map<string, DB_Emoji>,
	Stickers: Map<string, DB_Sticker>,
	Files: Map<string, DB_Attachment[]>,

	Assets: Map<string, DB_Asset>,
	Embeds: Map<string, DB_Embed[]>, // message_id -> embed[]
	EmbedFields: Map<number, DB_EmbedField[]>, // embed_id -> field[]

	Options: DEFAULT_OPTIONS,
	Messages: SimpleMessage[]
}

export async function Export(options: DEFAULT_OPTIONS) : Promise<{ id: string, name: string, data: Buffer }> {

	if (options.messageCount < 1) throw new Error('Cannot export 0 messages');

	const connection = await Database.getConnection();

	const guild: DB_Guild = await connection.query(`SELECT * FROM FBI.Guilds WHERE id = ?`, [options.guildID]).then(res => res[0]);
	const channel: DB_Channel = await connection.query(`SELECT * FROM FBI.Channels WHERE id = ? AND guild_id = ?`, [options.channelID, options.guildID]).then(res => res[0]);
	const user: DB_User = await connection.query(`SELECT * FROM FBI.Users WHERE id = ?`, [options.userID]).then(res => res[0]);
	const ID = await GenerateExportID(connection);

	const selectedMessageIDs: string[] = await connection.query(`
		SELECT id
		FROM FBI.Messages
		WHERE channel_id = ?
		ORDER BY id DESC
		LIMIT ?
	`, [options.channelID, options.messageCount]).then(rows => rows.map((r: { id: string}) => r.id));

	const messages: DB_Message[] = await connection.query(`
		SELECT *
		FROM FBI.Messages
		WHERE id IN ( ${'?,'.repeat(selectedMessageIDs.length - 1)}? )
	`, selectedMessageIDs);

	console.log(`Decrypting ${messages.length} messages...`);

	const encryptedUserIDs = messages.filter(m => m.encrypted === 1 && m.content !== null).map(m => m.user_id as string);
	const keys = await ResolveUserKeyBulk(encryptedUserIDs);

	const decryptStart = process.hrtime.bigint();
	for (let i = 0; i < messages.length; i++) {
		const message = messages[i];
		if (!message.encrypted) continue;
		if (message.content === null) continue;

		const wrappedUserKey = keys[message.user_id];
		if (!wrappedUserKey) throw new Error(`Failed to get key for user ${message.user_id}`);

		const userKey = UnwrapKey(wrappedUserKey);

		const { iv, tag, wrapped_dek } = message;
		const dek = UnwrapKey(wrapped_dek!, userKey);

		message.content = DecryptMessage(message.content as Buffer, tag, iv, dek);
	}
	const decryptEnd = process.hrtime.bigint();
	const decryptTime = Number(decryptEnd - decryptStart) / 1e6;
	console.log(`Decrypted ${messages.length} messages in ${decryptTime.toFixed(2)}ms (${(messages.length / (decryptTime * 1000)).toFixed(2)} msg/s)`);

	const users = await BatchCache<DB_User>(connection, messages, 'user_id', 'Users', 'id');
	const Stickers = await BatchCache<DB_Sticker>(connection, messages, 'sticker_id', 'Stickers', 'id');

	const messageIDs = messages.map(m => m.id);

	const EmojiIDs = await connection.query(`
		SELECT emoji_id
		FROM FBI.MessageEmojis
		WHERE message_id IN ( ${'?,'.repeat(messages.length - 1)}? )
	`, messageIDs);
	const Emojis = await BatchCache<DB_Emoji>(connection, EmojiIDs, 'emoji_id', 'Emojis', 'id');

	const AttachmentIDs = await connection.query(`
		SELECT id
		FROM FBI.Attachments
		WHERE message_id IN ( ${'?,'.repeat(messages.length - 1)}? )
	`, messageIDs);

	const Files = await BatchCache<DB_Attachment>(connection, AttachmentIDs, 'id', 'Attachments', 'id'); // fileID -> file
	const MessageAttachments = new Map<string, DB_Attachment[]>(); // messageID -> file[]
	for (const file of Files.values()) {
		if (!MessageAttachments.has(file.message_id)) {
			MessageAttachments.set(file.message_id, [file]);
		} else {
			MessageAttachments.get(file.message_id)!.push(file);
		}
	}

	const EmbedIDs: number[] = await connection.query(`
		SELECT id
		FROM FBI.Embeds
		WHERE message_id IN ( ${'?,'.repeat(messages.length - 1)}? )
	`, messageIDs).then(rows => rows.map((r: { id: number}) => r.id) );
	const Embeds = await BatchCache<DB_Embed>(connection, EmbedIDs, 'id', 'Embeds', 'id');
	const MessageEmbeds = new Map<string, DB_Embed[]>(); // messageID -> embed[]
	const MessageEmbedFields = new Map<number, DB_EmbedField[]>(); // embedID -> field[]
	for (const embed of Embeds.values()) {
		// Map() : message_id -> embed[]
		if (!MessageEmbeds.has(embed.message_id)) {
			MessageEmbeds.set(embed.message_id, [embed]);
		} else {
			MessageEmbeds.get(embed.message_id)!.push(embed);
		}
	}

	if (EmbedIDs.length > 0) {
		const EmbedFieldIDs = await connection.query(`
			SELECT id
			FROM FBI.EmbedFields
			WHERE embed_id IN ( ${'?,'.repeat(EmbedIDs.length - 1)}? )
		`, EmbedIDs );
		const Fields = await BatchCache<DB_EmbedField>(connection, EmbedFieldIDs, 'id', 'EmbedFields', 'id');
		for (const field of Fields.values()) {
			// Map() : embed_id -> field[]
			if (!MessageEmbedFields.has(field.embed_id)) {
				MessageEmbedFields.set(field.embed_id, [field]);
			} else {
				MessageEmbedFields.get(field.embed_id)!.push(field);
			}
		}
	}

	const AssetIDs = [
		... Array.from(users.values()	).map(x => x.asset_id),
		... Array.from(Stickers.values()).map(x => x.asset_id),
		... Array.from(Emojis.values()	).map(x => x.asset_id),
		// files are unique, it's an array of files, we need to extract the asset_id from each
		... Array.from(MessageAttachments.values()	).map(x => x.map(f => f.asset_id)).flat()
	].filter(x => x !== null);

	const Assets = await BatchCache<DB_Asset>(connection, AssetIDs, 'id', 'Assets', 'asset_id');

	const Context: ExportContext = {
		Owner: SimplifyUser(user),
		ID: ID,
		Guild: SimplifyGuild(guild),
		Channel: SimplifyChannel(channel),

		Users: new Map(),
		Emojis: new Map(),
		Stickers: new Map(),
		Files: new Map(),

		Assets: Assets,
		Embeds: MessageEmbeds,
		EmbedFields: MessageEmbedFields,

		Options: options,
		Messages: messages.map(SimplifyMessage)
	}

	console.log(Context.Owner);

	// strip out sensitive or useless data
	for (const [userID, user] of users) {
		Context.Users.set(userID, SimplifyUser(user));
	}

	let fileData = Buffer.from(''); // empty buffer
	switch (options.format) {
		case FORMAT.TEXT : fileData = ExportText(Context); break;
		case FORMAT.JSON : fileData = ExportJSON(Context); break;
		case FORMAT.HTML : fileData = ExportHTML(Context); break;
		case FORMAT.CSV  : fileData = ExportCSV(Context);  break;
		default: throw new Error('Invalid format');
	}

	// memes_export.txt
	const fileName = Context.Channel.name + '_export.' + options.format.toLowerCase();

	Database.releaseConnection(connection);

	return {
		id: Context.ID,
		name: fileName,
		data: fileData
	}
}

function ExportText(Context: ExportContext) {
	const output = [];

	/*
	[2025-03-23T18:56:56.000Z] username: message
	?[STICKER] <sticker name>
	?[ATTACHMENTS] <n> files
	?[EMBEDS] <n> embeds
	\n
	*/

	output.push(`Exported by @${Context.Owner.username} (${Context.Owner.id})`);
	output.push(`Guild: ${Context.Guild.name} (${Context.Guild.id})`);
	output.push(`Channel: #${Context.Channel.name} (${Context.Channel.id})`);
	output.push(`=========================`);
	output.push(`Export ID: ${Context.ID}`);
	output.push('This file has been generated by FBI - https://www.notfbi.dev/invite');
	output.push('You can check if the export has been tampered with by using /verify and the ID above\n');

	for (const message of Context.Messages) {
		const user = Context.Users.get(message.user_id)!;
		const sticker = Context.Stickers.get(message.sticker_id!);
		const attachments = Context.Files.get(message.id);

		let line = `[${message.created_at}] @${user.username}\n`;
		if (message.content) line += message.content + '\n';
		if (sticker) line += `<STICKER> ${sticker.name}\n`;
		if (attachments) line += `<ATTACHMENTS> ${attachments.length} files\n`;
		output.push(line);
	}

	return Buffer.from( output.join('\n').trim() );
}

function ExportJSON(Context: ExportContext) {
	const output = {
		export: {
			owner: `@${Context.Owner.username} (${Context.Owner.id})`,
			guild: `${Context.Guild.name} (${Context.Guild.id})`,
			channel: `#${Context.Channel.name} (${Context.Channel.id})`,
			id: Context.ID,
			warning: `
This export has been generated by FBI : https://www.notfbi.dev/invite
You can check if the export has been tampered with by using /verify and the ID above`.trim()
		},
		guild: Context.Guild,
		channel: Context.Channel,
		users: Object.fromEntries(Context.Users),
		emojis: Object.fromEntries(Context.Emojis),
		stickers: Object.fromEntries(Context.Stickers),
		files: Object.fromEntries(Context.Files),
		assets: Object.fromEntries(Context.Assets),
		messages: Context.Messages
	}

	return Buffer.from(JSON.stringify(output));
}

function ExportCSV(Context: ExportContext) {
	const output = [];

	output.push(`Exported by @${Context.Owner.username} (${Context.Owner.id})`);
	output.push(`Guild: ${Context.Guild.name} (${Context.Guild.id})`);
	output.push(`Channel: #${Context.Channel.name} (${Context.Channel.id})`);
	output.push(`=========================`);
	output.push(`Export ID: ${Context.ID}`);
	output.push('This file has been generated by FBI - https://www.notfbi.dev/invite');
	output.push('You can check if the export has been tampered with by using /verify and the ID above\n');

	// header
	output.push('created_at, user_id, content, sticker_name, attachment_count');

	for (const message of Context.Messages) {
		const user = Context.Users.get(message.user_id)!;
		const sticker = Context.Stickers.get(message.sticker_id!);
		const attachments = Context.Files.get(message.id)!;

		const line = [
			message.created_at,
			'"' + user.id.toString() + '"',
			message.content === null ? '""' : '"' + (message.content as string).replace(/\n/g, '\\n') + '"',
			sticker ? '"' + sticker.name + '"' : '""',
			attachments?.length ?? 0
		].join(',');

		output.push(line);
	}

	return Buffer.from( output.join('\n').trim() );
}

function ExportHTML(Context: ExportContext) {
	const Lookups = {
		users: Object.fromEntries(Context.Users) as Record<string, SimpleUser & { color: string }>, // defined below
		emojis: Object.fromEntries(Context.Emojis),
		stickers: Object.fromEntries(Context.Stickers),
		files: Object.fromEntries(Context.Files),
		assets: Object.fromEntries(Context.Assets),
		embeds: Object.fromEntries(Context.Embeds),
		fields: Object.fromEntries(Context.EmbedFields)
	}

	for (const user of Object.values(Lookups.users)) {
		// generate a random color for each user
		const r = Math.floor(64 + Math.random() * 192).toString(16).padStart(2, '0');
		const g = Math.floor(64 + Math.random() * 192).toString(16).padStart(2, '0');
		const b = Math.floor(64 + Math.random() * 192).toString(16).padStart(2, '0');
		user.color = `#${r}${g}${b}`; // #000000 -> #ffffff
	}

	const TEMPLATES: Record<string, string> = {
		username: Context.Owner.username,
		userid: Context.Owner.id,
		guildname: Context.Guild.name,
		guildid: Context.Guild.id,
		channelid: Context.Channel.id,
		channelname: Context.Channel.name,
		exportid: Context.ID,
		lookups: JSON.stringify(Lookups),
		messages: JSON.stringify(Context.Messages),
		missing: missingAsset.toString('base64'),
	}

	let page = readFileSync(`${__dirname}/../../../page.html`, 'utf-8');

	// {{name}}
	const templateRegex = /\{\{([a-zA-Z0-9_]+)}}/g;
	const templatesUsed = page.match(templateRegex) ?? [];
	for (const template of templatesUsed) {
		const key = template.replace(templateRegex, '$1');
		if (TEMPLATES[key]) {
			page = page.replace(template, TEMPLATES[key]);
		} else {
			throw new Error(`Template ${key} not found`);
		}
	}

	page = minify(page, {
		collapseWhitespace: true,
		minifyCSS: true,
		minifyJS: true,
		removeComments: true
	});

	return Buffer.from(page);
}