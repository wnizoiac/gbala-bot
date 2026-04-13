import { SlashCommandBuilder } from 'discord.js';

import { formatInfoMessage } from '../responses';
import type { SlashCommand } from '../types';

function toMegabytes(value: number): string {
  return (value / 1024 / 1024).toFixed(2);
}

export const statusCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('status').setDescription('Exibe o status atual do bot'),
  async execute({ interaction, services }): Promise<void> {
    const uptimeSeconds = Math.floor(process.uptime());
    const guildCount = interaction.client.guilds.cache.size;
    const memory = process.memoryUsage();
    const indexedTracks = services.tracksRepository.count();
    const queueGuilds = services.queueManager.activeGuildCount();
    const playerSessions = services.playerManager.activeSessionCount();
    const activePlaybacks = services.playerManager.activePlaybackCount();

    const lines = [
      formatInfoMessage(`Uptime: ${uptimeSeconds}s`),
      `Guilds: ${guildCount}`,
      `Faixas indexadas: ${indexedTracks}`,
      `Guilds com fila ativa: ${queueGuilds}`,
      `Sessoes de voz ativas: ${playerSessions}`,
      `Reproducoes ativas: ${activePlaybacks}`,
      `Memoria RSS: ${toMegabytes(memory.rss)} MB`,
      `Memoria Heap: ${toMegabytes(memory.heapUsed)} MB / ${toMegabytes(memory.heapTotal)} MB`
    ];

    await interaction.reply(lines.join('\n'));
  }
};
