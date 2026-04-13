import { randomUUID } from 'node:crypto';

import { searchCatalog } from '../../music/catalog/search';
import type { QueueItem } from '../../music/queue/queue-state';
import type { TrackRecord } from '../../storage/repositories/tracks-repo';

export function formatDuration(durationSeconds?: number): string {
  if (!durationSeconds || Number.isNaN(durationSeconds)) {
    return '--:--';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTrack(track: {
  title: string;
  artist?: string;
  durationSeconds?: number;
  duration?: number;
}): string {
  const duration = 'durationSeconds' in track ? track.durationSeconds : track.duration;
  return `${track.title} (${formatDuration(duration)})`;
}

export function createQueueItem(track: TrackRecord, requestedBy: string): QueueItem {
  return {
    id: randomUUID(),
    trackId: track.id,
    title: track.relativePath,
    duration: track.durationSeconds,
    filePath: track.filePath,
    requestedBy,
    addedAt: Date.now()
  };
}

export function findTracks(tracks: TrackRecord[], query: string): TrackRecord[] {
  return searchCatalog(tracks, query);
}
