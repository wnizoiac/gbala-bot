import type { Client } from 'discord.js';
import type { Logger } from 'pino';

import type { SlashCommand } from './types';

export async function registerCommands(
  client: Client,
  commands: SlashCommand[],
  logger: Logger,
  guildId?: string
): Promise<void> {
  if (!client.application) {
    throw new Error('Cliente Discord sem application disponivel para registrar comandos');
  }

  const payload = commands.map((command) => command.data.toJSON());

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(payload);
    logger.info({ guildId, commandCount: payload.length }, 'Comandos registrados na guild');
    return;
  }

  await client.application.commands.set(payload);
  logger.info({ commandCount: payload.length }, 'Comandos registrados globalmente');
}
