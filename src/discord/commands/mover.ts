import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const moverCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('mover')
    .setDescription('Move uma faixa pendente para outra posicao')
    .addIntegerOption((option) =>
      option.setName('de').setDescription('Posicao de origem').setRequired(true).setMinValue(1)
    )
    .addIntegerOption((option) =>
      option.setName('para').setDescription('Nova posicao').setRequired(true).setMinValue(1)
    ),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;
    const from = interaction.options.getInteger('de', true);
    const to = interaction.options.getInteger('para', true);

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

    const result = services.queueManager.moveTo(guildId, from, to);

    if (!result.ok) {
      await interaction.reply(createEphemeralError(result.error.message));
      return;
    }

    await services.nowPlayingPanel.sync(guildId);
    await interaction.reply(formatSuccessMessage(`Faixa movida da posicao ${from} para ${to}.`));
  }
};
