import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

export const pararCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('parar').setDescription('Para a reproducao e limpa a fila'),
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

    await services.playerManager.stop(guildId, true);
    await interaction.reply('Reproducao parada e fila limpa.');
  }
};
