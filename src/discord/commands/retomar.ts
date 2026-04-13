import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const retomarCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('retomar').setDescription('Retoma a reproducao pausada'),
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

    const result = services.playerManager.resume(guildId);

    if (!result.ok || !result.value) {
      await interaction.reply(createEphemeralError('Nao foi possivel retomar o player.'));
      return;
    }

    await interaction.reply(formatSuccessMessage('Reproducao retomada.'));
  }
};
