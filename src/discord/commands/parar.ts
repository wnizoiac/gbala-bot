import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const pararCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('parar').setDescription('Para a reproducao e limpa a fila'),
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

    await services.playerManager.stop(guildId, true);
    await interaction.reply(formatSuccessMessage('Reproducao parada e fila limpa.'));
  }
};
