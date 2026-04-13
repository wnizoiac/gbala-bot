import { SlashCommandBuilder } from 'discord.js';

import { createEphemeralError, formatInfoMessage } from '../responses';
import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const agoraCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('agora').setDescription('Mostra a faixa atual'),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply(createEphemeralError('Guild invalida para este comando.'));
      return;
    }

    const current = services.queueManager.current(guildId);

    if (!current) {
      await interaction.reply(formatInfoMessage('Nenhuma faixa esta tocando agora.'));
      return;
    }

    await interaction.reply(formatInfoMessage(`Tocando agora: ${formatTrack(current)}`));
  }
};
