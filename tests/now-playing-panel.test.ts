import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NowPlayingPanelManager } from '../src/discord/panel/now-playing-panel';
import type { PlayerSnapshot } from '../src/music/playback/player-manager';

const logger = pino({ enabled: false });

function createSnapshot(title: string): PlayerSnapshot {
  return {
    guildId: 'guild',
    currentTrack: {
      id: `item-${title}`,
      trackId: `track-${title}`,
      title,
      duration: 180,
      filePath: `/tmp/${title}.mp3`,
      requestedBy: 'user-1',
      addedAt: 1
    },
    pendingTracks: [],
    loopMode: 'none',
    volume: 100,
    isPaused: false,
    isPlaying: true
  };
}

describe('NowPlayingPanelManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounce multipos syncs em uma unica criacao de painel', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'message-1' });
    const fetchChannel = vi.fn().mockResolvedValue({
      messages: {
        fetch: vi.fn()
      },
      send
    });
    const playerManager = {
      snapshot: vi.fn(() => createSnapshot('Faixa 1'))
    };
    const manager = new NowPlayingPanelManager(
      { channels: { fetch: fetchChannel } } as never,
      logger,
      playerManager as never,
      100
    );

    manager.rememberChannel('guild', 'channel-1');
    const first = manager.sync('guild');
    const second = manager.sync('guild');

    await vi.advanceTimersByTimeAsync(99);
    expect(send).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([first, second]);

    expect(send).toHaveBeenCalledTimes(1);
    expect(fetchChannel).toHaveBeenCalledTimes(1);
  });

  it('edita a mensagem existente no flush seguinte', async () => {
    const edit = vi.fn().mockResolvedValue(undefined);
    const message = {
      delete: vi.fn(),
      edit,
      id: 'message-1'
    };
    const send = vi.fn().mockResolvedValue(message);
    const fetchMessage = vi.fn().mockResolvedValue(message);
    const fetchChannel = vi.fn().mockResolvedValue({
      messages: {
        fetch: fetchMessage
      },
      send
    });
    const playerManager = {
      snapshot: vi
        .fn<() => PlayerSnapshot>()
        .mockReturnValueOnce(createSnapshot('Faixa 1'))
        .mockReturnValueOnce(createSnapshot('Faixa 2'))
    };
    const manager = new NowPlayingPanelManager(
      { channels: { fetch: fetchChannel } } as never,
      logger,
      playerManager as never,
      100
    );

    manager.rememberChannel('guild', 'channel-1');
    const first = manager.sync('guild');
    await vi.advanceTimersByTimeAsync(100);
    await first;

    const second = manager.sync('guild');
    await vi.advanceTimersByTimeAsync(100);
    await second;

    expect(send).toHaveBeenCalledTimes(1);
    expect(fetchMessage).toHaveBeenCalledWith('message-1');
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('clear cancela sync pendente antes de enviar painel', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'message-1' });
    const fetchChannel = vi.fn().mockResolvedValue({
      messages: {
        fetch: vi.fn()
      },
      send
    });
    const playerManager = {
      snapshot: vi.fn(() => createSnapshot('Faixa 1'))
    };
    const manager = new NowPlayingPanelManager(
      { channels: { fetch: fetchChannel } } as never,
      logger,
      playerManager as never,
      100
    );

    manager.rememberChannel('guild', 'channel-1');
    const syncPromise = manager.sync('guild');
    const clearPromise = manager.clear('guild');

    await vi.advanceTimersByTimeAsync(100);
    await Promise.all([syncPromise, clearPromise]);

    expect(send).not.toHaveBeenCalled();
  });
});
