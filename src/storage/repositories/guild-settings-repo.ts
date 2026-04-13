import type Database from 'better-sqlite3';

import type { LoopMode } from '../../music/queue/queue-state';

export interface GuildSettingsRecord {
  guildId: string;
  defaultVolume: number;
  preferredLoopMode: LoopMode;
  createdAt: string;
  updatedAt: string;
}

interface GuildSettingsRow {
  guild_id: string;
  default_volume: number;
  preferred_loop_mode: LoopMode;
  created_at: string;
  updated_at: string;
}

interface UpsertGuildSettingsParams {
  guild_id: string;
  default_volume: number;
  preferred_loop_mode: LoopMode;
  created_at: string;
  updated_at: string;
}

function mapRow(row: GuildSettingsRow): GuildSettingsRecord {
  return {
    guildId: row.guild_id,
    defaultVolume: row.default_volume,
    preferredLoopMode: row.preferred_loop_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class GuildSettingsRepository {
  private readonly findByGuildIdStatement;
  private readonly upsertStatement;

  constructor(private readonly db: Database.Database) {
    this.findByGuildIdStatement = this.db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
    this.upsertStatement = this.db.prepare(`
      INSERT INTO guild_settings (
        guild_id,
        default_volume,
        preferred_loop_mode,
        created_at,
        updated_at
      ) VALUES (
        @guild_id,
        @default_volume,
        @preferred_loop_mode,
        @created_at,
        @updated_at
      )
      ON CONFLICT(guild_id) DO UPDATE SET
        default_volume = excluded.default_volume,
        preferred_loop_mode = excluded.preferred_loop_mode,
        updated_at = excluded.updated_at
    `);
  }

  findByGuildId(guildId: string): GuildSettingsRecord | null {
    const row = this.findByGuildIdStatement.get(guildId) as GuildSettingsRow | undefined;
    return row ? mapRow(row) : null;
  }

  upsert(guildId: string, defaultVolume: number, preferredLoopMode: LoopMode): GuildSettingsRecord {
    const normalizedVolume = Math.max(0, Math.min(Math.round(defaultVolume), 100));
    const now = new Date().toISOString();
    const existing = this.findByGuildId(guildId);
    const params: UpsertGuildSettingsParams = {
      guild_id: guildId,
      default_volume: normalizedVolume,
      preferred_loop_mode: preferredLoopMode,
      created_at: existing?.createdAt ?? now,
      updated_at: now
    };

    this.upsertStatement.run(params);

    return {
      guildId,
      defaultVolume: normalizedVolume,
      preferredLoopMode,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  }
}
