import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const agoraCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('agora').setDescription('Mostra a faixa atual'),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'Guild invalida para este comando.', ephemeral: true });
      return;
    }

    const current = services.queueManager.current(guildId);

    if (!current) {
      await interaction.reply('Nenhuma faixa esta tocando agora.');
      return;
    }

    await interaction.reply(`Tocando agora: ${formatTrack(current)}`);
  }
};
