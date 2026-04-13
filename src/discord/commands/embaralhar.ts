import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const embaralharCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('embaralhar').setDescription('Embaralha as faixas pendentes'),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

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

    services.queueManager.shuffle(guildId);
    await services.nowPlayingPanel.sync(guildId);
    await interaction.reply(formatSuccessMessage('Fila embaralhada.'));
  }
};
