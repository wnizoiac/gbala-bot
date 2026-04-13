import { describe, expect, it } from 'vitest';

import { CooldownLimiter } from '../src/shared/cooldown-limiter';

describe('CooldownLimiter', () => {
  it('permite o primeiro consumo de uma chave', () => {
    let now = 1000;
    const limiter = new CooldownLimiter(() => now);

    const result = limiter.consume('user:command', 2000);

    expect(result).toEqual({ ok: true });
  });

  it('bloqueia repeticao durante a janela de cooldown', () => {
    let now = 1000;
    const limiter = new CooldownLimiter(() => now);

    limiter.consume('user:command', 2000);
    now = 2500;

    const result = limiter.consume('user:command', 2000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryAfterMs).toBe(500);
    }
  });

  it('libera nova tentativa apos o cooldown expirar', () => {
    let now = 1000;
    const limiter = new CooldownLimiter(() => now);

    limiter.consume('user:command', 2000);
    now = 3000;

    const result = limiter.consume('user:command', 2000);

    expect(result).toEqual({ ok: true });
  });

  it('mantem cooldowns isolados por chave', () => {
    let now = 1000;
    const limiter = new CooldownLimiter(() => now);

    limiter.consume('user-a:command', 2000);

    const result = limiter.consume('user-b:command', 2000);

    expect(result).toEqual({ ok: true });
  });
});
