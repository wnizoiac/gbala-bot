import type { TrackRecord } from '../../storage/repositories/tracks-repo';

export interface CatalogSearchResult extends TrackRecord {
  score: number;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTrack(track: TrackRecord, normalizedQuery: string): number {
  const title = normalizeText(track.title);
  const artist = normalizeText(track.artist ?? '');
  const relativePath = normalizeText(track.relativePath);
  const haystack = `${relativePath} ${title} ${artist}`.trim();

  if (title === normalizedQuery) {
    return 100;
  }

  if (haystack === normalizedQuery) {
    return 95;
  }

  if (title.startsWith(normalizedQuery)) {
    return 90;
  }

  if (haystack.includes(normalizedQuery)) {
    return 75;
  }

  const queryTokens = normalizedQuery.split(' ');
  const matches = queryTokens.filter((token) => haystack.includes(token)).length;

  if (matches === queryTokens.length) {
    return 60;
  }

  return 0;
}

export function searchCatalog(tracks: TrackRecord[], query?: string): CatalogSearchResult[] {
  if (!query || !query.trim()) {
    return tracks.map((track) => ({ ...track, score: 1 }));
  }

  const normalizedQuery = normalizeText(query);

  return tracks
    .map((track) => ({
      ...track,
      score: scoreTrack(track, normalizedQuery)
    }))
    .filter((track) => track.score > 0)
    .sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath));
}

export function normalizeCatalogQuery(query: string): string {
  return normalizeText(query);
}
