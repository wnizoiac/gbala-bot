import { SlashCommandBuilder } from 'discord.js';

import type { LoopMode } from '../../music/queue/queue-state';
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
      await interaction.reply({ content: 'Guild invalida para este comando.', ephemeral: true });
      return;
    }

    services.queueManager.setLoopMode(guildId, mode);
    await interaction.reply(`Modo de repeticao atualizado para ${loopLabels[mode]}.`);
  }
};
