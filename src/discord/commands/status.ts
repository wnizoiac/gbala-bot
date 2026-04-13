import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types';

function toMegabytes(value: number): string {
  return (value / 1024 / 1024).toFixed(2);
}

export const statusCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('status').setDescription('Exibe o status atual do bot'),
  async execute({ interaction }): Promise<void> {
    const uptimeSeconds = Math.floor(process.uptime());
    const guildCount = interaction.client.guilds.cache.size;
    const memory = process.memoryUsage();

    const lines = [
      `Uptime: ${uptimeSeconds}s`,
      `Guilds: ${guildCount}`,
      `Memoria RSS: ${toMegabytes(memory.rss)} MB`,
      `Memoria Heap: ${toMegabytes(memory.heapUsed)} MB / ${toMegabytes(memory.heapTotal)} MB`
    ];

    await interaction.reply(lines.join('\n'));
  }
};
