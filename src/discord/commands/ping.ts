import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types';

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Verifica se o bot esta online'),
  async execute({ interaction }): Promise<void> {
    const latencyMs = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`Pong! Latencia: ${latencyMs}ms`);
  }
};
