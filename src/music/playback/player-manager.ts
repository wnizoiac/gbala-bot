import type { ChildProcess } from 'node:child_process';

import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  createAudioPlayer,
  type AudioPlayer,
  type AudioResource
} from '@discordjs/voice';
import type { Logger } from 'pino';

import type { QueueManager } from '../queue/queue-manager';
import type { LoopMode, QueueItem } from '../queue/queue-state';

import type { AudioResourceFactory } from './audio-resource';
import type { ConnectionManager } from './connection-manager';
import type { IdleHandler } from './idle-handler';

export type PlayerErrorCode =
  | 'PLAYER_UNAVAILABLE'
  | 'QUEUE_EMPTY'
  | 'VOICE_CONNECTION_MISSING'
  | 'PLAYBACK_FAILED';

export type PlayerOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: PlayerErrorCode; message: string } };

interface PlayerSession {
  consecutiveErrorSkips: number;
  currentProcess: ChildProcess | null;
  currentResource: AudioResource<QueueItem> | null;
  player: AudioPlayer;
  suppressNextIdleAdvance: boolean;
  volume: number;
}

export class PlayerManager {
  private readonly sessions = new Map<string, PlayerSession>();

  constructor(
    private readonly logger: Logger,
    private readonly queueManager: QueueManager,
    private readonly connectionManager: ConnectionManager,
    private readonly audioResourceFactory: AudioResourceFactory,
    private readonly idleHandler: IdleHandler,
    private readonly maxConsecutiveErrorSkips = 3
  ) {}

  async play(guildId: string): Promise<PlayerOperationResult<QueueItem>> {
    const connection = this.connectionManager.get(guildId);

    if (!connection) {
      return {
        ok: false,
        error: {
          code: 'VOICE_CONNECTION_MISSING',
          message: 'Nao existe conexao de voz ativa para esta guild.'
        }
      };
    }

    const session = this.getOrCreateSession(guildId);
    this.connectionManager.subscribe(guildId, session.player);

    const currentTrack = this.queueManager.current(guildId);
    const nextTrack = currentTrack ?? this.dequeueNextTrack(guildId);

    if (!nextTrack) {
      return {
        ok: false,
        error: {
          code: 'QUEUE_EMPTY',
          message: 'Nao ha faixas disponiveis para reproducao.'
        }
      };
    }

    const result = await this.startTrack(guildId, nextTrack);
    return result;
  }

  pause(guildId: string): PlayerOperationResult<boolean> {
    const session = this.sessions.get(guildId);

    if (!session) {
      return {
        ok: false,
        error: {
          code: 'PLAYER_UNAVAILABLE',
          message: 'Nao existe player ativo para esta guild.'
        }
      };
    }

    return { ok: true, value: session.player.pause() };
  }

  resume(guildId: string): PlayerOperationResult<boolean> {
    const session = this.sessions.get(guildId);

    if (!session) {
      return {
        ok: false,
        error: {
          code: 'PLAYER_UNAVAILABLE',
          message: 'Nao existe player ativo para esta guild.'
        }
      };
    }

    this.idleHandler.cancel(guildId);
    return { ok: true, value: session.player.unpause() };
  }

  async skip(guildId: string): Promise<PlayerOperationResult<QueueItem | null>> {
    const session = this.sessions.get(guildId);

    if (!session) {
      return {
        ok: false,
        error: {
          code: 'PLAYER_UNAVAILABLE',
          message: 'Nao existe player ativo para esta guild.'
        }
      };
    }

    const nextTrack = this.dequeueAdvancingTrack(guildId, this.queueManager.snapshot(guildId).loopMode);

    if (!nextTrack) {
      await this.stop(guildId, false);
      this.scheduleIdleDisconnect(guildId);
      return { ok: true, value: null };
    }

    const result = await this.startTrack(guildId, nextTrack);

    if (!result.ok) {
      return result;
    }

    return { ok: true, value: result.value };
  }

  async stop(guildId: string, clearQueue = true): Promise<PlayerOperationResult<boolean>> {
    const session = this.sessions.get(guildId);

    if (!session) {
      if (clearQueue) {
        this.queueManager.clear(guildId);
      }

      return { ok: true, value: false };
    }

    session.suppressNextIdleAdvance = true;
    this.stopProcess(session);
    session.player.stop(true);
    session.currentResource = null;

    if (clearQueue) {
      this.queueManager.clear(guildId);
    }

    this.scheduleIdleDisconnect(guildId);
    return { ok: true, value: true };
  }

  setVolume(guildId: string, volumePercent: number): PlayerOperationResult<number> {
    const session = this.getOrCreateSession(guildId);
    const normalized = Math.max(0, Math.min(volumePercent, 100)) / 100;
    session.volume = normalized;
    session.currentResource?.volume?.setVolume(normalized);

    return { ok: true, value: Math.round(normalized * 100) };
  }

  getVolume(guildId: string): number {
    return Math.round((this.sessions.get(guildId)?.volume ?? 1) * 100);
  }

  isPlaying(guildId: string): boolean {
    return this.sessions.get(guildId)?.player.state.status === AudioPlayerStatus.Playing;
  }

  handleVoiceDisconnected(guildId: string): void {
    const session = this.sessions.get(guildId);

    if (!session) {
      return;
    }

    this.idleHandler.cancel(guildId);
    this.stopProcess(session);
    session.player.stop(true);
    this.sessions.delete(guildId);
    this.queueManager.clear(guildId);
    this.logger.info({ guildId }, 'Player limpo apos desconexao de voz');
  }

  destroyAll(): void {
    this.idleHandler.cancelAll();

    for (const [guildId, session] of this.sessions.entries()) {
      session.suppressNextIdleAdvance = true;
      this.stopProcess(session);
      session.player.stop(true);
      this.sessions.delete(guildId);
    }
  }

  private getOrCreateSession(guildId: string): PlayerSession {
    const existing = this.sessions.get(guildId);

    if (existing) {
      return existing;
    }

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    const session: PlayerSession = {
      consecutiveErrorSkips: 0,
      currentProcess: null,
      currentResource: null,
      player,
      suppressNextIdleAdvance: false,
      volume: 1
    };

    this.bindPlayerEvents(guildId, session);
    this.sessions.set(guildId, session);
    return session;
  }

  private bindPlayerEvents(guildId: string, session: PlayerSession): void {
    session.player.on(AudioPlayerStatus.Playing, () => {
      this.idleHandler.cancel(guildId);
      this.logger.info({ guildId, trackId: this.queueManager.current(guildId)?.trackId }, 'Playback iniciado');
    });

    session.player.on(AudioPlayerStatus.Idle, () => {
      void this.handleIdle(guildId);
    });

    session.player.on('error', (err) => {
      void this.handlePlayerError(guildId, err);
    });
  }

  private async startTrack(
    guildId: string,
    track: QueueItem
  ): Promise<PlayerOperationResult<QueueItem>> {
    const session = this.getOrCreateSession(guildId);

    try {
      this.idleHandler.cancel(guildId);
      session.suppressNextIdleAdvance = true;
      this.stopProcess(session);
      session.player.stop(true);
      session.suppressNextIdleAdvance = false;

      const playback = await this.audioResourceFactory.create(track);
      session.currentProcess = playback.process;
      session.currentResource = playback.resource;
      session.currentResource.volume?.setVolume(session.volume);
      session.player.play(playback.resource);
      session.consecutiveErrorSkips = 0;

      this.logger.info({ guildId, trackId: track.trackId, title: track.title }, 'Faixa enviada ao player');
      return { ok: true, value: track };
    } catch (err) {
      this.logger.error({ err, guildId, trackId: track.trackId }, 'Falha ao iniciar reproducao da faixa');
      return {
        ok: false,
        error: {
          code: 'PLAYBACK_FAILED',
          message: 'Nao foi possivel iniciar a reproducao da faixa.'
        }
      };
    }
  }

  private async handleIdle(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);

    if (!session) {
      return;
    }

    if (session.suppressNextIdleAdvance) {
      session.suppressNextIdleAdvance = false;
      return;
    }

    this.stopProcess(session);
    session.currentResource = null;

    const nextTrack = this.dequeueAdvancingTrack(guildId, this.queueManager.snapshot(guildId).loopMode);

    if (!nextTrack) {
      this.scheduleIdleDisconnect(guildId);
      return;
    }

    await this.startTrack(guildId, nextTrack);
  }

  private async handlePlayerError(guildId: string, err: Error): Promise<void> {
    const session = this.sessions.get(guildId);

    if (!session) {
      return;
    }

    this.logger.error(
      { err, guildId, trackId: this.queueManager.current(guildId)?.trackId },
      'Erro durante reproducao'
    );

    this.stopProcess(session);
    session.currentResource = null;
    session.consecutiveErrorSkips += 1;

    if (session.consecutiveErrorSkips >= this.maxConsecutiveErrorSkips) {
      this.logger.error({ guildId }, 'Limite de erros consecutivos atingido; encerrando playback');
      await this.stop(guildId, true);
      return;
    }

    const nextTrack = this.dequeueAdvancingTrack(guildId, this.queueManager.snapshot(guildId).loopMode);

    if (!nextTrack) {
      this.scheduleIdleDisconnect(guildId);
      return;
    }

    await this.startTrack(guildId, nextTrack);
  }

  private dequeueNextTrack(guildId: string): QueueItem | null {
    const result = this.queueManager.dequeue(guildId);

    if (!result.ok) {
      return null;
    }

    return result.value;
  }

  private dequeueAdvancingTrack(guildId: string, loopMode: LoopMode): QueueItem | null {
    const snapshot = this.queueManager.snapshot(guildId);
    const shouldBypassTrackLoop = loopMode === 'track' && snapshot.items.length > 0;

    if (shouldBypassTrackLoop) {
      this.queueManager.setLoopMode(guildId, 'none');
    }

    const result = this.queueManager.skip(guildId);

    if (shouldBypassTrackLoop) {
      this.queueManager.setLoopMode(guildId, loopMode);
    }

    if (!result.ok) {
      return null;
    }

    return result.value;
  }

  private scheduleIdleDisconnect(guildId: string): void {
    this.idleHandler.schedule(guildId, async () => {
      this.logger.info({ guildId }, 'Desconectando por inatividade');
      this.connectionManager.disconnect(guildId);
    });
  }

  private stopProcess(session: PlayerSession): void {
    if (!session.currentProcess) {
      return;
    }

    session.currentProcess.kill('SIGKILL');
    session.currentProcess.removeAllListeners();
    session.currentProcess = null;
  }
}
