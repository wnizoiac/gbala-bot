import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
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
      await interaction.reply(createEphemeralError('Guild invalida para este comando.'));
      return;
    }

    const sameChannel = requireSameChannel(interaction, services);

    if (!sameChannel.ok) {
      await interaction.reply(createEphemeralError(sameChannel.error));
      return;
    }

    const queue = requireQueue(guildId, services);

    if (!queue.ok) {
      await interaction.reply(createEphemeralError(queue.error));
      return;
    }

    const result = services.queueManager.removeAt(guildId, position);

    if (!result.ok) {
      await interaction.reply(createEphemeralError(result.error.message));
      return;
    }

    await services.nowPlayingPanel.sync(guildId);
    await interaction.reply(formatSuccessMessage(`Removida da fila: ${formatTrack(result.value)}`));
  }
};
