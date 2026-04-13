import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase, type DatabaseContext } from '../src/storage/db';
import { GuildSettingsRepository } from '../src/storage/repositories/guild-settings-repo';

const logger = pino({ enabled: false });

describe('GuildSettingsRepository', () => {
  let database: DatabaseContext;
  let repository: GuildSettingsRepository;

  beforeEach(() => {
    database = createDatabase(':memory:', logger);
    repository = new GuildSettingsRepository(database.db);
  });

  afterEach(() => {
    database.close();
  });

  it('persiste volume padrao e modo de repeticao por guild', () => {
    repository.upsert('guild-1', 35, 'queue');

    expect(repository.findByGuildId('guild-1')).toEqual(
      expect.objectContaining({
        guildId: 'guild-1',
        defaultVolume: 35,
        preferredLoopMode: 'queue'
      })
    );
  });

  it('atualiza settings existentes sem criar outro registro', () => {
    const first = repository.upsert('guild-1', 80, 'none');
    const second = repository.upsert('guild-1', 55, 'track');

    expect(repository.findByGuildId('guild-1')).toEqual(
      expect.objectContaining({
        guildId: 'guild-1',
        defaultVolume: 55,
        preferredLoopMode: 'track',
        createdAt: first.createdAt,
        updatedAt: second.updatedAt
      })
    );
    expect(second.updatedAt >= first.updatedAt).toBe(true);
  });
});
