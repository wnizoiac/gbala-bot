import { SlashCommandBuilder } from 'discord.js';

import { createEphemeralError, formatInfoMessage } from '../responses';
import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const historicoCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('historico').setDescription('Mostra as ultimas faixas tocadas'),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply(createEphemeralError('Guild invalida para este comando.'));
      return;
    }

    const history = services.queueManager.history(guildId).slice(0, 10);

    if (history.length === 0) {
      await interaction.reply(formatInfoMessage('Nenhuma faixa foi reproduzida ainda.'));
      return;
    }

    await interaction.reply(
      [formatInfoMessage('Ultimas faixas reproduzidas:'), history.map((item, index) => `${index + 1}. ${formatTrack(item)}`).join('\n')].join('\n')
    );
  }
};
