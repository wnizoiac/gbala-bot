import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { Logger } from 'pino';

import type { TracksRepository } from '../../storage/repositories/tracks-repo';

import { readTrackMetadata } from './metadata';

const ACCEPTED_EXTENSIONS = new Set(['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.opus']);

export interface CatalogScanSummary {
  indexed: number;
  updated: number;
  removed: number;
  skipped: number;
  total: number;
}

function createTrackId(relativePath: string): string {
  return crypto.createHash('sha1').update(relativePath).digest('hex');
}

async function collectFiles(rootPath: string): Promise<string[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      return [fullPath];
    })
  );

  return files.flat();
}

export async function scanCatalog(
  mediaRoot: string,
  tracksRepository: TracksRepository,
  logger: Logger
): Promise<CatalogScanSummary> {
  const discoveredFiles = await collectFiles(mediaRoot);
  const audioFiles = discoveredFiles.filter((filePath) =>
    ACCEPTED_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  );

  let indexed = 0;
  let updated = 0;
  let skipped = 0;
  const validIds: string[] = [];

  for (const filePath of audioFiles) {
    const relativePath = path.relative(mediaRoot, filePath).split(path.sep).join('/');
    const id = createTrackId(relativePath);
    const stats = await fs.stat(filePath);
    const existing = tracksRepository.findById(id);

    validIds.push(id);

    if (
      existing &&
      existing.fileMtimeMs === Math.trunc(stats.mtimeMs) &&
      existing.fileSizeBytes === stats.size
    ) {
      continue;
    }

    try {
      const metadata = await readTrackMetadata(filePath, logger);

      tracksRepository.upsert({
        id,
        relativePath,
        filePath,
        title: metadata.title,
        artist: metadata.artist,
        durationSeconds: metadata.durationSeconds,
        fileSizeBytes: stats.size,
        fileMtimeMs: Math.trunc(stats.mtimeMs)
      });

      if (existing) {
        updated += 1;
      } else {
        indexed += 1;
      }
    } catch (err) {
      skipped += 1;
      logger.error({ err, filePath }, 'Falha ao indexar arquivo de audio');
    }
  }

  const removed = tracksRepository.deleteMissing(validIds);

  logger.info(
    { indexed, updated, removed, skipped, total: audioFiles.length },
    'Scan de catalogo concluido'
  );

  return {
    indexed,
    updated,
    removed,
    skipped,
    total: audioFiles.length
  };
}
