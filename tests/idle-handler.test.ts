import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IdleHandler } from '../src/music/playback/idle-handler';

const logger = pino({ enabled: false });

describe('IdleHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executa callback ao atingir timeout', async () => {
    const handler = new IdleHandler(logger, 1000);
    const callback = vi.fn();

    handler.schedule('guild', callback);
    await vi.advanceTimersByTimeAsync(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancel impede execucao do callback', async () => {
    const handler = new IdleHandler(logger, 1000);
    const callback = vi.fn();

    handler.schedule('guild', callback);
    handler.cancel('guild');
    await vi.advanceTimersByTimeAsync(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('reagendamento substitui timer anterior', async () => {
    const handler = new IdleHandler(logger, 1000);
    const callback = vi.fn();

    handler.schedule('guild', callback);
    await vi.advanceTimersByTimeAsync(500);
    handler.schedule('guild', callback);
    await vi.advanceTimersByTimeAsync(999);

    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
