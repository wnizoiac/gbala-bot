import path from 'node:path';

import type { AppEnv } from './env';

export interface AppPaths {
  projectRoot: string;
  mediaRoot: string;
  dbPath: string;
  ffmpegPath?: string;
}

export function resolvePaths(env: AppEnv): AppPaths {
  const projectRoot = process.cwd();
  const mediaRoot = path.resolve(projectRoot, env.MEDIA_ROOT);
  const dbPath = path.resolve(projectRoot, env.DB_PATH);

  return {
    projectRoot,
    mediaRoot,
    dbPath,
    ffmpegPath: env.FFMPEG_PATH ? path.resolve(projectRoot, env.FFMPEG_PATH) : undefined
  };
}
