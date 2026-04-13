import type Database from 'better-sqlite3';

export interface TrackRecord {
  id: string;
  relativePath: string;
  filePath: string;
  title: string;
  artist?: string;
  durationSeconds?: number;
  fileSizeBytes: number;
  fileMtimeMs: number;
  createdAt: string;
  updatedAt: string;
}

interface TrackRow {
  id: string;
  relative_path: string;
  file_path: string;
  title: string;
  artist: string | null;
  duration_seconds: number | null;
  file_size_bytes: number;
  file_mtime_ms: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertTrackInput {
  id: string;
  relativePath: string;
  filePath: string;
  title: string;
  artist?: string;
  durationSeconds?: number;
  fileSizeBytes: number;
  fileMtimeMs: number;
}

function mapRow(row: TrackRow): TrackRecord {
  return {
    id: row.id,
    relativePath: row.relative_path,
    filePath: row.file_path,
    title: row.title,
    artist: row.artist ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    fileSizeBytes: row.file_size_bytes,
    fileMtimeMs: row.file_mtime_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TracksRepository {
  private readonly findByIdStatement;
  private readonly listAllStatement;
  private readonly upsertStatement;
  private readonly countStatement;

  constructor(private readonly db: Database.Database) {
    this.findByIdStatement = this.db.prepare('SELECT * FROM tracks WHERE id = ?');
    this.listAllStatement = this.db.prepare('SELECT * FROM tracks ORDER BY title COLLATE NOCASE, relative_path');
    this.upsertStatement = this.db.prepare(`
      INSERT INTO tracks (
        id,
        relative_path,
        file_path,
        title,
        artist,
        duration_seconds,
        file_size_bytes,
        file_mtime_ms,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @relative_path,
        @file_path,
        @title,
        @artist,
        @duration_seconds,
        @file_size_bytes,
        @file_mtime_ms,
        @created_at,
        @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        relative_path = excluded.relative_path,
        file_path = excluded.file_path,
        title = excluded.title,
        artist = excluded.artist,
        duration_seconds = excluded.duration_seconds,
        file_size_bytes = excluded.file_size_bytes,
        file_mtime_ms = excluded.file_mtime_ms,
        updated_at = excluded.updated_at
    `);
    this.countStatement = this.db.prepare('SELECT COUNT(*) as total FROM tracks');
  }

  findById(id: string): TrackRecord | null {
    const row = this.findByIdStatement.get(id) as TrackRow | undefined;
    return row ? mapRow(row) : null;
  }

  listAll(): TrackRecord[] {
    const rows = this.listAllStatement.all() as TrackRow[];
    return rows.map(mapRow);
  }

  count(): number {
    const row = this.countStatement.get() as { total: number };
    return row.total;
  }

  upsert(input: UpsertTrackInput): void {
    const timestamp = new Date().toISOString();
    const existing = this.findById(input.id);

    this.upsertStatement.run({
      id: input.id,
      relative_path: input.relativePath,
      file_path: input.filePath,
      title: input.title,
      artist: input.artist ?? null,
      duration_seconds: input.durationSeconds ?? null,
      file_size_bytes: input.fileSizeBytes,
      file_mtime_ms: input.fileMtimeMs,
      created_at: existing?.createdAt ?? timestamp,
      updated_at: timestamp
    });
  }

  deleteMissing(validIds: string[]): number {
    if (validIds.length === 0) {
      return this.db.prepare('DELETE FROM tracks').run().changes;
    }

    const placeholders = validIds.map(() => '?').join(', ');
    const statement = this.db.prepare(`DELETE FROM tracks WHERE id NOT IN (${placeholders})`);
    return statement.run(...validIds).changes;
  }
}
