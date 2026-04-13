import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
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

    const result = services.queueManager.moveTo(guildId, from, to);

    if (!result.ok) {
      await interaction.reply({ content: result.error.message, ephemeral: true });
      return;
    }

    await interaction.reply(`Faixa movida da posicao ${from} para ${to}.`);
  }
};
