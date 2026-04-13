CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  default_volume INTEGER NOT NULL DEFAULT 100 CHECK(default_volume >= 0 AND default_volume <= 100),
  preferred_loop_mode TEXT NOT NULL DEFAULT 'none' CHECK(preferred_loop_mode IN ('none', 'track', 'queue')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
