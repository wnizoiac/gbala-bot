import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const sairCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('sair').setDescription('Desconecta o bot do canal de voz'),
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

    services.connectionManager.disconnect(guildId);
    await interaction.reply(formatSuccessMessage('Bot desconectado do canal de voz.'));
  }
};
