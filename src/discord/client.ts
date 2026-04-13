import { Client, GatewayIntentBits } from 'discord.js';
import type { Logger } from 'pino';

export function createDiscordClient(logger: Logger): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

  client.once('ready', () => {
    logger.info({ userTag: client.user?.tag ?? 'desconhecido' }, 'Cliente Discord conectado');
  });

  client.on('error', (err) => {
    logger.error({ err }, 'Erro no cliente Discord');
  });

  client.on('warn', (message) => {
    logger.warn({ message }, 'Aviso do cliente Discord');
  });

  return client;
}
