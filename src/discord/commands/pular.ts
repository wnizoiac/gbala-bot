import { SlashCommandBuilder } from 'discord.js';

import { requireQueue, requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatInfoMessage, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const pularCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('pular').setDescription('Pula para a proxima faixa'),
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

    const result = await services.playerManager.skip(guildId);

    if (!result.ok) {
      await interaction.reply(createEphemeralError(result.error.message));
      return;
    }

    if (!result.value) {
      await interaction.reply(formatInfoMessage('A fila terminou apos o skip.'));
      return;
    }

    await interaction.reply(formatSuccessMessage(`Proxima faixa: ${formatTrack(result.value)}`));
  }
};
