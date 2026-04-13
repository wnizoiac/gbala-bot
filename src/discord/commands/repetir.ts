import { SlashCommandBuilder } from 'discord.js';

import type { LoopMode } from '../../music/queue/queue-state';
import { requireSameChannel } from '../interactions/guards';
import { createEphemeralError, formatSuccessMessage } from '../responses';
import type { SlashCommand } from '../types';

const loopLabels: Record<LoopMode, string> = {
  none: 'nenhum',
  queue: 'fila',
  track: 'faixa'
};

export const repetirCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('repetir')
    .setDescription('Define o modo de repeticao')
    .addStringOption((option) =>
      option
        .setName('modo')
        .setDescription('Modo de repeticao')
        .setRequired(true)
        .addChoices(
          { name: 'nenhum', value: 'none' },
          { name: 'faixa', value: 'track' },
          { name: 'fila', value: 'queue' }
        )
    ),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;
    const mode = interaction.options.getString('modo', true) as LoopMode;

    if (!guildId) {
      await interaction.reply(createEphemeralError('Guild invalida para este comando.'));
      return;
    }

    const sameChannel = requireSameChannel(interaction, services);

    if (!sameChannel.ok) {
      await interaction.reply(createEphemeralError(sameChannel.error));
      return;
    }

    services.queueManager.setLoopMode(guildId, mode);
    const currentVolume = services.playerManager.getVolume(guildId);
    services.guildSettingsRepository.upsert(guildId, currentVolume, mode);
    await services.nowPlayingPanel.sync(guildId);
    await interaction.reply(formatSuccessMessage(`Modo de repeticao atualizado para ${loopLabels[mode]}.`));
  }
};
