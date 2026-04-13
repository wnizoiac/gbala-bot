import { describe, expect, it } from 'vitest';

import { normalizeCatalogQuery, searchCatalog } from '../src/music/catalog/search';
import type { TrackRecord } from '../src/storage/repositories/tracks-repo';

const tracks: TrackRecord[] = [
  {
    id: '1',
    relativePath: 'artistas/joao/cancao.mp3',
    filePath: '/tmp/cancao.mp3',
    title: 'Canção do João',
    artist: 'João Silva',
    durationSeconds: 180,
    fileSizeBytes: 100,
    fileMtimeMs: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    relativePath: 'rock/noite.wav',
    filePath: '/tmp/noite.wav',
    title: 'Noite Sem Fim',
    artist: 'Banda Solar',
    durationSeconds: 200,
    fileSizeBytes: 100,
    fileMtimeMs: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

describe('searchCatalog', () => {
  it('normaliza acentos e caracteres especiais', () => {
    expect(normalizeCatalogQuery('  Canção! do João  ')).toBe('cancao do joao');
  });

  it('retorna todos os itens quando busca esta vazia', () => {
    expect(searchCatalog(tracks).length).toBe(2);
  });

  it('encontra por titulo com acento normalizado', () => {
    const results = searchCatalog(tracks, 'cancao joao');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('1');
  });

  it('encontra por artista', () => {
    const results = searchCatalog(tracks, 'banda solar');
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('2');
  });

  it('prioriza correspondencia exata antes de parcial', () => {
    const results = searchCatalog(
      [
        tracks[1],
        {
          ...tracks[1],
          id: '3',
          title: 'Noite'
        }
      ].filter(Boolean) as TrackRecord[],
      'noite'
    );

    expect(results[0]?.id).toBe('3');
  });
});
