import {
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  type DiscordGatewayAdapterCreator,
  type AudioPlayer,
  type VoiceConnection
} from '@discordjs/voice';
import type { Logger } from 'pino';

export interface VoiceJoinRequest {
  adapterCreator: DiscordGatewayAdapterCreator;
  channelId: string;
  guildId: string;
  selfDeaf?: boolean;
  selfMute?: boolean;
}

interface ManagedConnection {
  channelId: string;
  connection: VoiceConnection;
  reconnectAttempts: number;
  reconnectTimer?: NodeJS.Timeout;
}

export class ConnectionManager {
  private readonly connections = new Map<string, ManagedConnection>();
  private onDisconnect?: (guildId: string) => void;

  constructor(
    private readonly logger: Logger,
    private readonly reconnectBaseDelayMs = 1000,
    private readonly maxReconnectAttempts = 3
  ) {}

  setDisconnectHandler(handler: (guildId: string) => void): void {
    this.onDisconnect = handler;
  }

  async join(request: VoiceJoinRequest): Promise<VoiceConnection> {
    const existing = this.connections.get(request.guildId);

    if (existing?.channelId === request.channelId) {
      return existing.connection;
    }

    if (existing) {
      existing.connection.destroy();
    }

    const connection = joinVoiceChannel({
      adapterCreator: request.adapterCreator,
      channelId: request.channelId,
      guildId: request.guildId,
      selfDeaf: request.selfDeaf ?? true,
      selfMute: request.selfMute ?? false
    });

    const managed: ManagedConnection = {
      channelId: request.channelId,
      connection,
      reconnectAttempts: 0
    };

    this.connections.set(request.guildId, managed);
    this.bindLifecycle(request.guildId, managed);

    await entersState(connection, VoiceConnectionStatus.Ready, 20000);

    return connection;
  }

  get(guildId: string): VoiceConnection | null {
    return this.connections.get(guildId)?.connection ?? null;
  }

  getChannelId(guildId: string): string | null {
    return this.connections.get(guildId)?.channelId ?? null;
  }

  subscribe(guildId: string, player: AudioPlayer): boolean {
    const connection = this.get(guildId);

    if (!connection) {
      return false;
    }

    connection.subscribe(player);
    return true;
  }

  disconnect(guildId: string): void {
    const managed = this.connections.get(guildId);

    if (!managed) {
      return;
    }

    if (managed.reconnectTimer) {
      clearTimeout(managed.reconnectTimer);
      managed.reconnectTimer = undefined;
    }

    managed.connection.destroy();
  }

  destroyAll(): void {
    for (const guildId of [...this.connections.keys()]) {
      this.disconnect(guildId);
    }
  }

  private bindLifecycle(guildId: string, managed: ManagedConnection): void {
    managed.connection.on(VoiceConnectionStatus.Ready, () => {
      managed.reconnectAttempts = 0;
      this.logger.info({ guildId, channelId: managed.channelId }, 'Conexao de voz pronta');
    });

    managed.connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.logger.warn({ guildId, channelId: managed.channelId }, 'Conexao de voz desconectada');
      this.scheduleReconnect(guildId, managed);
    });

    managed.connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.cleanup(guildId, managed);
    });

    managed.connection.on('error', (err) => {
      this.logger.error({ err, guildId }, 'Erro na conexao de voz');
    });
  }

  private scheduleReconnect(guildId: string, managed: ManagedConnection): void {
    if (this.connections.get(guildId) !== managed || managed.reconnectTimer) {
      return;
    }

    if (managed.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error({ guildId }, 'Limite de reconexao atingido; destruindo conexao');
      managed.connection.destroy();
      return;
    }

    managed.reconnectAttempts += 1;
    const delayMs = this.reconnectBaseDelayMs * 2 ** (managed.reconnectAttempts - 1);

    managed.reconnectTimer = setTimeout(() => {
      managed.reconnectTimer = undefined;
      managed.connection.rejoin();

      void entersState(managed.connection, VoiceConnectionStatus.Ready, 10000).catch((err) => {
        this.logger.warn({ err, guildId, attempt: managed.reconnectAttempts }, 'Reconexao de voz falhou');
        this.scheduleReconnect(guildId, managed);
      });
    }, delayMs);

    managed.reconnectTimer.unref();
    this.logger.warn({ guildId, delayMs, attempt: managed.reconnectAttempts }, 'Agendada tentativa de reconexao');
  }

  private cleanup(guildId: string, managed: ManagedConnection): void {
    if (this.connections.get(guildId) !== managed) {
      return;
    }

    if (managed.reconnectTimer) {
      clearTimeout(managed.reconnectTimer);
    }

    this.connections.delete(guildId);
    this.logger.info({ guildId }, 'Conexao de voz destruida');
    this.onDisconnect?.(guildId);
  }
}
