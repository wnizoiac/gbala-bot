import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types';

export const volumeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ajusta o volume do player')
    .addIntegerOption((option) =>
      option.setName('valor').setDescription('Volume entre 0 e 100').setRequired(true).setMinValue(0).setMaxValue(100)
    ),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;
    const value = interaction.options.getInteger('valor', true);

    if (!guildId) {
      await interaction.reply({ content: 'Guild invalida para este comando.', ephemeral: true });
      return;
    }

    const result = services.playerManager.setVolume(guildId, value);

    if (!result.ok) {
      await interaction.reply({ content: result.error.message, ephemeral: true });
      return;
    }

    await interaction.reply(`Volume ajustado para ${result.value}%.`);
  }
};
