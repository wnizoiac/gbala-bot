import { SlashCommandBuilder } from 'discord.js';

import { requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

export const volumeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ajusta o volume do player')
    .addIntegerOption((option) =>
      option.setName('valor').setDescription('Volume entre 0 e 100').setRequired(true).setMinValue(0).setMaxValue(100)
    ),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;
    const value = interaction.options.getInteger('valor', true);

    if (!guildId) {
      await interaction.reply(createEphemeralError('Guild invalida para este comando.'));
      return;
    }

    const sameChannel = requireSameChannel(interaction, services);

    if (!sameChannel.ok) {
      await interaction.reply(createEphemeralError(sameChannel.error));
      return;
    }

    const result = services.playerManager.setVolume(guildId, value);

    if (!result.ok) {
      await interaction.reply(createEphemeralError(result.error.message));
      return;
    }

    const currentLoopMode = services.queueManager.snapshot(guildId).loopMode;
    services.guildSettingsRepository.upsert(guildId, result.value, currentLoopMode);
    await services.nowPlayingPanel.sync(guildId);

    await interaction.reply(formatSuccessMessage(`Volume ajustado para ${result.value}%.`));
  }
};
