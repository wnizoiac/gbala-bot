import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase, type DatabaseContext } from '../src/storage/db';
import { TracksRepository } from '../src/storage/repositories/tracks-repo';

const logger = pino({ enabled: false });

describe('TracksRepository', () => {
  let database: DatabaseContext;
  let repository: TracksRepository;

  beforeEach(() => {
    database = createDatabase(':memory:', logger);
    repository = new TracksRepository(database.db);
  });

  afterEach(() => {
    database.close();
  });

  it('insere e lista faixas indexadas', () => {
    repository.upsert({
      id: 'track-1',
      relativePath: 'rock/track-1.mp3',
      filePath: '/tmp/rock/track-1.mp3',
      title: 'Track 1',
      artist: 'Artista',
      durationSeconds: 180,
      fileSizeBytes: 123,
      fileMtimeMs: 999
    });

    expect(repository.count()).toBe(1);
    expect(repository.listAll()[0]?.title).toBe('Track 1');
  });

  it('atualiza faixa existente sem duplicar', () => {
    repository.upsert({
      id: 'track-1',
      relativePath: 'rock/track-1.mp3',
      filePath: '/tmp/rock/track-1.mp3',
      title: 'Track 1',
      fileSizeBytes: 123,
      fileMtimeMs: 999
    });

    repository.upsert({
      id: 'track-1',
      relativePath: 'rock/track-1.mp3',
      filePath: '/tmp/rock/track-1.mp3',
      title: 'Track 1 Remaster',
      fileSizeBytes: 456,
      fileMtimeMs: 1000
    });

    expect(repository.count()).toBe(1);
    expect(repository.findById('track-1')?.title).toBe('Track 1 Remaster');
  });

  it('remove faixas ausentes em reindexacao incremental', () => {
    repository.upsert({
      id: 'track-1',
      relativePath: 'rock/track-1.mp3',
      filePath: '/tmp/rock/track-1.mp3',
      title: 'Track 1',
      fileSizeBytes: 123,
      fileMtimeMs: 999
    });

    repository.upsert({
      id: 'track-2',
      relativePath: 'rock/track-2.mp3',
      filePath: '/tmp/rock/track-2.mp3',
      title: 'Track 2',
      fileSizeBytes: 123,
      fileMtimeMs: 999
    });

    const removed = repository.deleteMissing(['track-2']);

    expect(removed).toBe(1);
    expect(repository.count()).toBe(1);
    expect(repository.findById('track-1')).toBeNull();
    expect(repository.findById('track-2')).not.toBeNull();
  });
});
