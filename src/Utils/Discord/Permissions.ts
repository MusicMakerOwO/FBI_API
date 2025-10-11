export const DISCORD_PERMISSIONS = {
	/** Allows creation of instant invites */
	CREATE_INSTANT_INVITE:        1n << 0n,
	/** Allows kicking members */
	KICK_MEMBERS:                 1n << 1n,
	/** Allows banning members */
	BAN_MEMBERS:                  1n << 2n,
	/** Allows all permissions and bypasses channel permission overwrites */
	ADMINISTRATOR:                1n << 3n,
	/** Allows management and editing of channels */
	MANAGE_CHANNELS:              1n << 4n,
	/** Allows management and editing of the guild */
	MANAGE_GUILD:                 1n << 5n,
	/** Allows for adding new reactions to messages. This permission does not apply to reacting with an existing reaction on a message. */
	ADD_REACTIONS:                1n << 6n,
	/** Allows for viewing of audit logs */
	VIEW_AUDIT_LOG:               1n << 7n,
	/** Allows for using priority speaker in a voice channel */
	PRIORITY_SPEAKER:             1n << 8n,
	/** Allows the user to go live */
	STREAM:                       1n << 9n,
	/** Allows guild members to view a channel, which includes reading messages in text channels and joining voice channels */
	VIEW_CHANNEL:                 1n << 10n,
	/** Allows for sending messages in a channel and creating threads in a forum (does not allow sending messages in threads) */
	SEND_MESSAGES:                1n << 11n,
	/** Allows for sending of /tts messages */
	SEND_TTS_MESSAGES:            1n << 12n,
	/** Allows for deletion of other users messages */
	MANAGE_MESSAGES:              1n << 13n,
	/** Links sent by users with this permission will be auto-embedded */
	EMBED_LINKS:                  1n << 14n,
	/** Allows for uploading images and files */
	ATTACH_FILES:                 1n << 15n,
	/** Allows for reading of message history */
	READ_MESSAGE_HISTORY:         1n << 16n,
	/** Allows for using the @everyone tag to notify all users in a channel, and the @here tag to notify all online users in a channel */
	MENTION_EVERYONE:             1n << 17n,
	/** Allows the usage of custom emojis from other servers */
	USE_EXTERNAL_EMOJIS:          1n << 18n,
	/** Allows for viewing guild insights */
	VIEW_GUILD_INSIGHTS:          1n << 19n,
	/** Allows for joining of a voice channel */
	CONNECT:                      1n << 20n,
	/** Allows for speaking in a voice channel */
	SPEAK:                        1n << 21n,
	/** Allows for muting members in a voice channel */
	MUTE_MEMBERS:                 1n << 22n,
	/** Allows for deafening of members in a voice channel */
	DEAFEN_MEMBERS:               1n << 23n,
	/** Allows for moving of members between voice channels */
	MOVE_MEMBERS:                 1n << 24n,
	/** Allows for using voice-activity-detection in a voice channel */
	USE_VAD:                      1n << 25n,
	/** Allows for modification of own nickname */
	CHANGE_NICKNAME:              1n << 26n,
	/** Allows for modification of other users nicknames */
	MANAGE_NICKNAMES:             1n << 27n,
	/** Allows management and editing of roles */
	MANAGE_ROLES:				1n << 28n,
	/** Allows management and editing of webhooks */
	MANAGE_WEBHOOKS:              1n << 29n,
	/** Allows for editing and deleting emojis, stickers, and soundboard sounds created by all users */
	MANAGE_GUILD_EXPRESSIONS:     1n << 30n,
	/** Allows members to use application commands, including slash commands and context menu commands. */
	USE_APPLICATION_COMMANDS:     1n << 31n,
	/** Allows for requesting to speak in stage channels. (This permission is under active development and may be changed or removed.) */
	REQUEST_TO_SPEAK:             1n << 32n,
	/** Allows for editing and deleting scheduled events created by all users */
	MANAGE_EVENTS:                1n << 33n,
	/** Allows for deleting and archiving threads, and viewing all private threads */
	MANAGE_THREADS:               1n << 34n,
	/** Allows for creating public and announcement threads */
	CREATE_PUBLIC_THREADS:        1n << 35n,
	/** Allows for creating private threads */
	CREATE_PRIVATE_THREADS:       1n << 36n,
	/** Allows the usage of custom stickers from other servers */
	USE_EXTERNAL_STICKERS:        1n << 37n,
	/** Allows for sending messages in threads */
	SEND_MESSAGES_IN_THREADS:     1n << 38n,
	/** Allows for using Activities (applications with the EMBEDDED flag) */
	USE_EMBEDDED_ACTIVITIES:      1n << 39n,
	/** Allows for timing out users to prevent them from sending or reacting to messages in chat and threads, and from speaking in voice and stage channels */
	MODERATE_MEMBERS:             1n << 40n,
	/** Allows for viewing role subscription insights */
	VIEW_CREATOR_MONETIZATION_ANALYTICS: 1n << 41n,
	/** Allows for using soundboard in a voice channel */
	USE_SOUNDBOARD:               1n << 42n,
	/** Allows for creating emojis, stickers, and soundboard sounds, and editing and deleting those created by the current user. Not yet available to developers, see changelog. */
	CREATE_GUILD_EXPRESSIONS:     1n << 43n,
	/** Allows for creating scheduled events, and editing and deleting those created by the current user. Not yet available to developers, see changelog. */
	CREATE_EVENTS:                1n << 44n,
	/** Allows the usage of custom soundboard sounds from other servers */
	USE_EXTERNAL_SOUNDS:          1n << 45n,
	/** Allows sending voice messages */
	SEND_VOICE_MESSAGES:          1n << 46n,
	/** Allows sending polls */
	SEND_POLLS:                   1n << 49n,
	/** Allows user-installed apps to send public responses. When disabled, users will still be allowed to use their apps but the responses will be ephemeral. This only applies to apps not also installed to the server. */
	USE_EXTERNAL_APPS:            1n << 50n,
	/** Allows pinning and unpinning messages */
	PIN_MESSAGES:                 1n << 51n
}