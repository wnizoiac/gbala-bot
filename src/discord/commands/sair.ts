import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

export const sairCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('sair').setDescription('Desconecta o bot do canal de voz'),
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

    services.connectionManager.disconnect(guildId);
    await interaction.reply('Bot desconectado do canal de voz.');
  }
};
