-- NodeJS can only make timers so long
-- For long-running tasks like channel purging we need a more permanent solution
-- This will keep the run time data even on restart
CREATE TABLE IF NOT EXISTS Timers (
	id VARCHAR(255) NOT NULL PRIMARY KEY,
	last_run BIGINT UNSIGNED NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS BotStats (
    shard_id INTEGER UNSIGNED NOT NULL PRIMARY KEY,
    guilds INTEGER UNSIGNED NOT NULL,
    messages INTEGER UNSIGNED NOT NULL,
    users INTEGER UNSIGNED NOT NULL,
    snapshots INTEGER UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shard_id ON BotStats (shard_id);
CREATE INDEX IF NOT EXISTS idx_updated_at ON BotStats (updated_at);