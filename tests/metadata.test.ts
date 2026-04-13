import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readTrackMetadata } from '../src/music/catalog/metadata';

const parseFileMock = vi.fn();

vi.mock('music-metadata', () => ({
  parseFile: (...args: unknown[]) => parseFileMock(...args)
}));

const logger = pino({ enabled: false });

describe('readTrackMetadata', () => {
  afterEach(() => {
    parseFileMock.mockReset();
  });

  it('usa fallback do nome do arquivo quando a tag de titulo nao existe', async () => {
    parseFileMock.mockResolvedValue({
      common: {},
      format: { duration: 125.2 }
    });

    const result = await readTrackMetadata('/tmp/Minha Musica.mp3', logger);

    expect(result).toEqual({
      title: 'Minha Musica',
      artist: undefined,
      durationSeconds: 125
    });
  });

  it('retorna metadados quando disponiveis', async () => {
    parseFileMock.mockResolvedValue({
      common: { title: 'Faixa 1', artist: 'Artista 1' },
      format: { duration: 90.8 }
    });

    const result = await readTrackMetadata('/tmp/faixa-1.mp3', logger);

    expect(result).toEqual({
      title: 'Faixa 1',
      artist: 'Artista 1',
      durationSeconds: 91
    });
  });

  it('propaga falha para o scanner decidir pular o arquivo', async () => {
    parseFileMock.mockRejectedValue(new Error('arquivo invalido'));

    await expect(readTrackMetadata('/tmp/quebrado.mp3', logger)).rejects.toThrow('arquivo invalido');
  });
});
