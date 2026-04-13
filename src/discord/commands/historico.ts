import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

export const historicoCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('historico').setDescription('Mostra as ultimas faixas tocadas'),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'Guild invalida para este comando.', ephemeral: true });
      return;
    }

    const history = services.queueManager.history(guildId).slice(0, 10);

    if (history.length === 0) {
      await interaction.reply('Nenhuma faixa foi reproduzida ainda.');
      return;
    }

    await interaction.reply(history.map((item, index) => `${index + 1}. ${formatTrack(item)}`).join('\n'));
  }
};
