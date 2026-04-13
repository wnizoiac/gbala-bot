import path from 'node:path';

import { parseFile } from 'music-metadata';
import type { Logger } from 'pino';

export interface TrackMetadata {
  title: string;
  artist?: string;
  durationSeconds?: number;
}

function fallbackTitleFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export async function readTrackMetadata(filePath: string, logger: Logger): Promise<TrackMetadata> {
  try {
    const metadata = await parseFile(filePath);
    const title = metadata.common.title?.trim() || fallbackTitleFromPath(filePath);
    const artist = metadata.common.artist?.trim() || undefined;
    const durationSeconds = metadata.format.duration
      ? Math.round(metadata.format.duration)
      : undefined;

    return {
      title,
      artist,
      durationSeconds
    };
  } catch (err) {
    logger.warn({ err, filePath }, 'Falha ao ler metadata do arquivo');
    throw err;
  }
}
