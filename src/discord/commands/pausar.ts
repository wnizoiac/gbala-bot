import { SlashCommandBuilder } from 'discord.js';

import { requirePlaying, requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const pausarCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('pausar').setDescription('Pausa a reproducao atual'),
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

    const playing = requirePlaying(guildId, services);

    if (!playing.ok) {
      await interaction.reply(createEphemeralError(playing.error));
      return;
    }

    const result = services.playerManager.pause(guildId);

    if (!result.ok || !result.value) {
      await interaction.reply(createEphemeralError('Nao foi possivel pausar o player.'));
      return;
    }

    await interaction.reply(formatSuccessMessage('Reproducao pausada.'));
  }
};
