import { SlashCommandBuilder } from 'discord.js';

import { requirePlaying, requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

export const pausarCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('pausar').setDescription('Pausa a reproducao atual'),
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

    const playing = requirePlaying(guildId, services);

    if (!playing.ok) {
      await interaction.reply({ content: playing.error, ephemeral: true });
      return;
    }

    const result = services.playerManager.pause(guildId);

    if (!result.ok || !result.value) {
      await interaction.reply({ content: 'Nao foi possivel pausar o player.', ephemeral: true });
      return;
    }

    await interaction.reply('Reproducao pausada.');
  }
};
