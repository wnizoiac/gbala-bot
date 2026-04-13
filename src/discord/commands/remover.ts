import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const removerCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('remover')
    .setDescription('Remove uma faixa pendente da fila')
    .addIntegerOption((option) =>
      option.setName('posicao').setDescription('Posicao pendente na fila').setRequired(true).setMinValue(1)
    ),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;
    const position = interaction.options.getInteger('posicao', true);

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

    const result = services.queueManager.removeAt(guildId, position);

    if (!result.ok) {
      await interaction.reply({ content: result.error.message, ephemeral: true });
      return;
    }

    await interaction.reply(`Removida da fila: ${formatTrack(result.value)}`);
  }
};
