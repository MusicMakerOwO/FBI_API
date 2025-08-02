CREATE TABLE IF NOT EXISTS BotStats (
	shard_id INTEGER NOT NULL PRIMARY KEY,
	guilds INTEGER NOT NULL,
	messages INTEGER NOT NULL,
	users INTEGER NOT NULL,
    snapshots INTEGER NOT NULL,
	updated_at TEXT NOT NULL DEFAULT ({{ISO_TIMESTAMP}})
) STRICT;
CREATE INDEX IF NOT EXISTS idx_shard_id ON BotStats (shard_id);
CREATE INDEX IF NOT EXISTS idx_updated_at ON BotStats (updated_at);