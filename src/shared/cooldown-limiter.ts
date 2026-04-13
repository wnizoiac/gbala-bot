export interface CooldownHit {
  retryAfterMs: number;
}

export type CooldownResult =
  | { ok: true }
  | { ok: false; error: CooldownHit };

export class CooldownLimiter {
  private readonly entries = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  consume(key: string, cooldownMs: number): CooldownResult {
    const currentTime = this.now();
    const expiresAt = this.entries.get(key);

    if (expiresAt && expiresAt > currentTime) {
      return {
        ok: false,
        error: {
          retryAfterMs: expiresAt - currentTime
        }
      };
    }

    this.entries.set(key, currentTime + cooldownMs);
    this.compact(currentTime);
    return { ok: true };
  }

  private compact(currentTime: number): void {
    for (const [key, expiresAt] of this.entries.entries()) {
      if (expiresAt <= currentTime) {
        this.entries.delete(key);
      }
    }
  }
}
