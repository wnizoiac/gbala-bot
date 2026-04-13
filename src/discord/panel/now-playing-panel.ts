import type { Client, MessageCreateOptions } from 'discord.js';
import type { Logger } from 'pino';

import type { PlayerManager } from '../../music/playback/player-manager';
import { createNowPlayingControls } from '../components/now-playing-controls';
import { createNowPlayingEmbed } from '../embeds/now-playing';

interface PanelMessage {
  id: string;
  delete(): Promise<unknown>;
  edit(options: MessageCreateOptions): Promise<unknown>;
}

interface PanelChannel {
  messages: {
    fetch(messageId: string): Promise<PanelMessage>;
  };
  send(options: MessageCreateOptions): Promise<PanelMessage>;
}

interface GuildPanelBinding {
  channelId: string;
  messageId?: string;
}

interface PendingSync {
  promise: Promise<void>;
  resolve(): void;
  timer: NodeJS.Timeout;
}

function isPanelChannel(channel: unknown): channel is PanelChannel {
  return typeof channel === 'object' && channel !== null && 'messages' in channel && 'send' in channel;
}

export class NowPlayingPanelManager {
  private readonly bindings = new Map<string, GuildPanelBinding>();
  private readonly operationChains = new Map<string, Promise<void>>();
  private readonly pendingSyncs = new Map<string, PendingSync>();

  constructor(
    private readonly client: Client,
    private readonly logger: Logger,
    private readonly playerManager: PlayerManager,
    private readonly syncDebounceMs = 350
  ) {}

  rememberChannel(guildId: string, channelId: string): void {
    const existing = this.bindings.get(guildId);

    this.bindings.set(guildId, {
      channelId,
      messageId: existing?.channelId === channelId ? existing.messageId : undefined
    });
  }

  async sync(guildId: string): Promise<void> {
    const pending = this.pendingSyncs.get(guildId) ?? this.createPendingSync(guildId);

    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      this.pendingSyncs.delete(guildId);

      void this.enqueueOperation(guildId, async () => {
        const binding = this.bindings.get(guildId);

        if (!binding) {
          return;
        }

        const snapshot = this.playerManager.snapshot(guildId);

        if (!snapshot.currentTrack) {
          await this.deletePanelMessage(binding);
          return;
        }

        const channel = await this.resolveChannel(binding.channelId);

        if (!channel) {
          this.bindings.delete(guildId);
          return;
        }

        const payload: MessageCreateOptions = {
          components: createNowPlayingControls(snapshot),
          embeds: [createNowPlayingEmbed(snapshot)]
        };

        if (binding.messageId) {
          const message = await this.fetchMessage(channel, binding.messageId);

          if (message) {
            await message.edit(payload);
            return;
          }

          binding.messageId = undefined;
        }

        const sentMessage = await channel.send(payload);
        binding.messageId = sentMessage.id;
      }).finally(() => {
        pending.resolve();
      });
    }, this.syncDebounceMs);

    pending.timer.unref();
    await pending.promise;
  }

  async clear(guildId: string): Promise<void> {
    const pending = this.cancelPendingSync(guildId);

    await this.enqueueOperation(guildId, async () => {
      const binding = this.bindings.get(guildId);

      if (!binding) {
        return;
      }

      await this.deletePanelMessage(binding);
    });

    pending?.resolve();
  }

  forget(guildId: string): void {
    this.cancelPendingSync(guildId)?.resolve();
    this.bindings.delete(guildId);
    this.operationChains.delete(guildId);
  }

  private async deletePanelMessage(binding: GuildPanelBinding): Promise<void> {
    if (!binding.messageId) {
      return;
    }

    const channel = await this.resolveChannel(binding.channelId);

    if (!channel) {
      binding.messageId = undefined;
      return;
    }

    const message = await this.fetchMessage(channel, binding.messageId);

    if (!message) {
      binding.messageId = undefined;
      return;
    }

    await message.delete();
    binding.messageId = undefined;
  }

  private async resolveChannel(channelId: string): Promise<PanelChannel | null> {
    const channel = await this.client.channels.fetch(channelId).catch((err: unknown) => {
      this.logger.warn({ err, channelId }, 'Falha ao buscar canal do painel');
      return null;
    });

    if (!isPanelChannel(channel)) {
      this.logger.warn({ channelId }, 'Canal nao suporta painel de reproducao');
      return null;
    }

    return channel;
  }

  private async fetchMessage(
    channel: PanelChannel,
    messageId: string
  ): Promise<PanelMessage | null> {
    return channel.messages.fetch(messageId).catch((err: unknown) => {
      this.logger.warn({ err, messageId }, 'Mensagem do painel nao encontrada');
      return null;
    });
  }

  private enqueueOperation(guildId: string, operation: () => Promise<void>): Promise<void> {
    const previous = this.operationChains.get(guildId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(operation)
      .catch((err: unknown) => {
        this.logger.error({ err, guildId }, 'Falha ao sincronizar painel now playing');
      })
      .finally(() => {
        if (this.operationChains.get(guildId) === current) {
          this.operationChains.delete(guildId);
        }
      });

    this.operationChains.set(guildId, current);
    return current;
  }

  private createPendingSync(guildId: string): PendingSync {
    let resolve = (): void => undefined;
    const promise = new Promise<void>((resolver) => {
      resolve = resolver;
    });
    const timer = setTimeout(() => undefined, this.syncDebounceMs);

    const pending: PendingSync = {
      promise,
      resolve,
      timer
    };

    this.pendingSyncs.set(guildId, pending);
    return pending;
  }

  private cancelPendingSync(guildId: string): PendingSync | undefined {
    const pending = this.pendingSyncs.get(guildId);

    if (!pending) {
      return undefined;
    }

    clearTimeout(pending.timer);
    this.pendingSyncs.delete(guildId);
    return pending;
  }
}
