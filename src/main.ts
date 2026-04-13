import fs from 'node:fs';

import { Events } from 'discord.js';

import { loadEnv } from './config/env';
import { resolvePaths } from './config/paths';
import { createDiscordClient } from './discord/client';
import { setupCommandHandler } from './discord/command-handler';
import { slashCommands } from './discord/commands-registry';
import { registerCommands } from './discord/register-commands';
import { scanCatalog } from './music/catalog/scanner';
import { AudioResourceFactory } from './music/playback/audio-resource';
import { ConnectionManager } from './music/playback/connection-manager';
import { IdleHandler } from './music/playback/idle-handler';
import { PlayerManager } from './music/playback/player-manager';
import { QueueManager } from './music/queue/queue-manager';
import { createLogger } from './shared/logger';
import { createDatabase } from './storage/db';
import { TracksRepository } from './storage/repositories/tracks-repo';

let shutdownStarted = false;
type ShutdownReason = NodeJS.Signals | 'GUILD_REMOVED';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const paths = resolvePaths(env);
  const logger = createLogger(env);
  const client = createDiscordClient(logger);
  const database = createDatabase(paths.dbPath, logger);
  const tracksRepository = new TracksRepository(database.db);
  const queueManager = new QueueManager();
  const idleHandler = new IdleHandler(logger, env.PLAYER_IDLE_TIMEOUT_MS);
  const audioResourceFactory = new AudioResourceFactory(logger, paths.ffmpegPath);
  const connectionManager = new ConnectionManager(logger);
  const playerManager = new PlayerManager(
    logger,
    queueManager,
    connectionManager,
    audioResourceFactory,
    idleHandler
  );

  connectionManager.setDisconnectHandler((guildId) => {
    playerManager.handleVoiceDisconnected(guildId);
  });

  const shutdown = (reason: ShutdownReason, details?: Record<string, unknown>): void => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;
    logger.info({ reason, ...(details ?? {}) }, 'Iniciando graceful shutdown');
    playerManager.destroyAll();
    connectionManager.destroyAll();
    client.destroy();
    database.close();
    logger.info('Shutdown concluido');
    process.exit(0);
  };

  if (!fs.existsSync(paths.mediaRoot)) {
    logger.fatal({ mediaRoot: paths.mediaRoot }, 'MEDIA_ROOT nao existe');
    throw new Error('MEDIA_ROOT nao encontrado');
  }

  await scanCatalog(paths.mediaRoot, tracksRepository, logger);

  setupCommandHandler(client, slashCommands, logger, {
    connectionManager,
    playerManager,
    queueManager,
    tracksRepository
  });

  client.once(Events.ClientReady, async () => {
    try {
      await registerCommands(client, slashCommands, logger, env.DISCORD_GUILD_ID);
    } catch (err) {
      logger.fatal({ err }, 'Falha ao registrar comandos slash');
      process.exit(1);
    }
  });

  client.on(Events.GuildDelete, (guild) => {
    logger.warn({ guildId: guild.id }, 'Bot removido da guild; limpando recursos locais');
    playerManager.handleVoiceDisconnected(guild.id);
    connectionManager.disconnect(guild.id);
    queueManager.clear(guild.id);

    if (client.guilds.cache.size === 0) {
      shutdown('GUILD_REMOVED', { guildId: guild.id });
    }
  });

  await client.login(env.DISCORD_TOKEN);

  logger.info(
    {
      mediaRoot: paths.mediaRoot,
      dbPath: paths.dbPath,
      ffmpegPath: paths.ffmpegPath ?? 'PATH',
      idleTimeoutMs: env.PLAYER_IDLE_TIMEOUT_MS,
      nodeVersion: process.version,
      commands: slashCommands.map((command) => command.data.name)
    },
    'Bootstrap concluido'
  );

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'erro desconhecido';
  console.error(JSON.stringify({ level: 'fatal', msg: 'Falha no bootstrap', error: message }));
  process.exit(1);
});
