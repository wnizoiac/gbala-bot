import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

export const retomarCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('retomar').setDescription('Retoma a reproducao pausada'),
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

    const result = services.playerManager.resume(guildId);

    if (!result.ok || !result.value) {
      await interaction.reply({ content: 'Nao foi possivel retomar o player.', ephemeral: true });
      return;
    }

    await interaction.reply('Reproducao retomada.');
  }
};
