import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';

import { StreamType, createAudioResource, type AudioResource } from '@discordjs/voice';
import type { Logger } from 'pino';

import type { QueueItem } from '../queue/queue-state';

export interface PlaybackResource {
  process: ChildProcess;
  resource: AudioResource<QueueItem>;
}

export class AudioResourceFactory {
  private ffmpegExecutable?: string;

  constructor(
    private readonly logger: Logger,
    ffmpegExecutable?: string
  ) {
    this.ffmpegExecutable = ffmpegExecutable;
  }

  private resolveExecutable(): string {
    if (this.ffmpegExecutable) {
      return this.ffmpegExecutable;
    }

    return 'ffmpeg';
  }

  private ensureExecutableAvailable(executable: string): void {
    const result = spawnSync(executable, ['-version'], { stdio: 'ignore' });

    if (result.error) {
      throw new Error(`FFmpeg indisponivel: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`FFmpeg retornou status invalido: ${result.status}`);
    }
  }

  async create(track: QueueItem): Promise<PlaybackResource> {
    await fs.promises.access(track.filePath, fs.constants.R_OK);

    const executable = this.resolveExecutable();
    this.ensureExecutableAvailable(executable);

    const process = spawn(
      executable,
      [
        '-loglevel',
        'error',
        '-i',
        track.filePath,
        '-f',
        's16le',
        '-ar',
        '48000',
        '-ac',
        '2',
        'pipe:1'
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    if (!process.stdout || !process.stderr) {
      throw new Error('Processo do FFmpeg nao forneceu stdout/stderr conforme esperado.');
    }

    process.stderr.setEncoding('utf8');
    process.stderr.on('data', (chunk: string) => {
      const message = chunk.trim();

      if (!message) {
        return;
      }

      this.logger.warn({ trackId: track.trackId, filePath: track.filePath, ffmpeg: message }, 'FFmpeg stderr');
    });

    const resource = createAudioResource(process.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      metadata: track,
      silencePaddingFrames: 5
    });

    return {
      process,
      resource
    };
  }
}
