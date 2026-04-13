CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  relative_path TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  duration_seconds REAL,
  file_size_bytes INTEGER NOT NULL,
  file_mtime_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
