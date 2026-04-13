import type { Logger } from 'pino';

export class IdleHandler {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly logger: Logger,
    private readonly idleTimeoutMs = 300000
  ) {}

  schedule(guildId: string, onIdle: () => void | Promise<void>): void {
    this.cancel(guildId);

    const timer = setTimeout(() => {
      this.timers.delete(guildId);
      this.logger.info({ guildId, idleTimeoutMs: this.idleTimeoutMs }, 'Timeout de inatividade atingido');
      void onIdle();
    }, this.idleTimeoutMs);

    timer.unref();
    this.timers.set(guildId, timer);
  }

  cancel(guildId: string): void {
    const timer = this.timers.get(guildId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.timers.delete(guildId);
  }

  cancelAll(): void {
    for (const guildId of this.timers.keys()) {
      this.cancel(guildId);
    }
  }
}
