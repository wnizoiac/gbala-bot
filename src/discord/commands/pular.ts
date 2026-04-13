import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const pularCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('pular').setDescription('Pula para a proxima faixa'),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'Guild invalida para este comando.', ephemeral: true });
      return;
    }

    const sameChannel = requireSameChannel(interaction, services);

    if (!sameChannel.ok) {
      await interaction.reply({ content: sameChannel.error, ephemeral: true });
      return;
    }

    const queue = requireQueue(guildId, services);

    if (!queue.ok) {
      await interaction.reply({ content: queue.error, ephemeral: true });
      return;
    }

    const result = await services.playerManager.skip(guildId);

    if (!result.ok) {
      await interaction.reply({ content: result.error.message, ephemeral: true });
      return;
    }

    if (!result.value) {
      await interaction.reply('A fila terminou apos o skip.');
      return;
    }

    await interaction.reply(`Proxima faixa: ${formatTrack(result.value)}`);
  }
};
