import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

export const embaralharCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('embaralhar').setDescription('Embaralha as faixas pendentes'),
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

    services.queueManager.shuffle(guildId);
    await interaction.reply('Fila embaralhada.');
  }
};
