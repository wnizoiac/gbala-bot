import { Readable } from 'node:stream';

import { StreamType, createAudioResource } from '@discordjs/voice';
import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';

import type { PlaybackResource } from '../src/music/playback/audio-resource';
import { IdleHandler } from '../src/music/playback/idle-handler';
import { PlayerManager } from '../src/music/playback/player-manager';
import { QueueManager } from '../src/music/queue/queue-manager';
import type { QueueItem } from '../src/music/queue/queue-state';

const logger = pino({ enabled: false });

function createItem(id: string): QueueItem {
  return {
    id,
    trackId: `track-${id}`,
    title: `Faixa ${id}`,
    duration: 180,
    filePath: `/tmp/${id}.mp3`,
    requestedBy: 'user-1',
    addedAt: Number(id.replace(/\D/g, '')) || 1
  };
}

function createPlaybackResource(track: QueueItem): PlaybackResource {
  return {
    process: {
      kill: vi.fn(),
      removeAllListeners: vi.fn()
    } as never,
    resource: createAudioResource(Readable.from(Buffer.from('audio')), {
      inlineVolume: true,
      inputType: StreamType.Arbitrary,
      metadata: track
    })
  };
}

function createHarness() {
  const queueManager = new QueueManager();
  const connectionManager = {
    disconnect: vi.fn(),
    get: vi.fn(() => ({}) as never),
    subscribe: vi.fn(() => true)
  };
  const idleHandler = new IdleHandler(logger, 50);
  const scheduleSpy = vi.spyOn(idleHandler, 'schedule');
  const audioResourceFactory = {
    create: vi.fn<(track: QueueItem) => Promise<PlaybackResource>>()
  };
  const playerManager = new PlayerManager(
    logger,
    queueManager,
    connectionManager as never,
    audioResourceFactory as never,
    idleHandler,
    3
  );

  return {
    audioResourceFactory,
    connectionManager,
    playerManager,
    queueManager,
    scheduleSpy
  };
}

describe('PlayerManager', () => {
  it('recupera playback quando a primeira faixa falha antes de iniciar', async () => {
    const harness = createHarness();
    const first = createItem('1');
    const second = createItem('2');

    harness.queueManager.enqueue('guild', first);
    harness.queueManager.enqueue('guild', second);

    harness.audioResourceFactory.create.mockImplementation(async (track) => {
      if (track.id === '1') {
        throw new Error('arquivo ausente');
      }

      return createPlaybackResource(track);
    });

    const result = await harness.playerManager.play('guild');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('2');
    }
    expect(harness.queueManager.current('guild')?.id).toBe('2');
    expect(harness.queueManager.history('guild')).toEqual([]);
    expect(harness.connectionManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it('remove a faixa quebrada e agenda idle quando nao ha fallback', async () => {
    const harness = createHarness();
    const only = createItem('1');

    harness.queueManager.enqueue('guild', only);
    harness.audioResourceFactory.create.mockRejectedValue(new Error('arquivo removido'));

    const result = await harness.playerManager.play('guild');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PLAYBACK_FAILED');
    }
    expect(harness.queueManager.current('guild')).toBeNull();
    expect(harness.queueManager.isEmpty('guild')).toBe(true);
    expect(harness.scheduleSpy).toHaveBeenCalledTimes(1);
  });

  it('setVolume sem playback nao cria sessao fantasma', () => {
    const harness = createHarness();

    const result = harness.playerManager.setVolume('guild', 35);

    expect(result.ok).toBe(true);
    expect(harness.playerManager.getVolume('guild')).toBe(35);
    expect(harness.playerManager.activeSessionCount()).toBe(0);
  });

  it('skip pula faixas quebradas sem poluir o historico', async () => {
    const harness = createHarness();
    const first = createItem('1');
    const second = createItem('2');
    const third = createItem('3');

    harness.queueManager.enqueue('guild', first);
    harness.queueManager.enqueue('guild', second);
    harness.queueManager.enqueue('guild', third);

    harness.audioResourceFactory.create.mockImplementation(async (track) => {
      if (track.id === '2') {
        throw new Error('arquivo corrompido');
      }

      return createPlaybackResource(track);
    });

    const firstPlay = await harness.playerManager.play('guild');
    expect(firstPlay.ok).toBe(true);

    const result = await harness.playerManager.skip('guild');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.id).toBe('3');
    }
    expect(harness.queueManager.current('guild')?.id).toBe('3');
    expect(harness.queueManager.history('guild').map((item) => item.id)).toEqual(['1']);
  });
});
