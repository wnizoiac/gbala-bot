import { SlashCommandBuilder } from 'discord.js';

import { createEphemeralError, formatErrorMessage, formatInfoMessage } from '../responses';
import type { SlashCommand } from '../types';

import { formatTrack } from './music-command-support';

const PAGE_SIZE = 10;

export const filaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('fila')
    .setDescription('Mostra a fila atual')
    .addIntegerOption((option) =>
      option.setName('pagina').setDescription('Pagina da fila').setMinValue(1).setRequired(false)
    ),
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply(createEphemeralError('Guild invalida para este comando.'));
      return;
    }

    const current = services.queueManager.current(guildId);
    const pending = services.queueManager.snapshot(guildId).items;
    const page = interaction.options.getInteger('pagina') ?? 1;

    if (!current && pending.length === 0) {
      await interaction.reply(formatInfoMessage('A fila esta vazia.'));
      return;
    }

    const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));

    if (page > totalPages) {
      await interaction.reply(formatErrorMessage(`Pagina invalida. Total de paginas: ${totalPages}.`));
      return;
    }

    const start = (page - 1) * PAGE_SIZE;
    const lines = [current ? `Atual: ${formatTrack(current)}` : 'Atual: nenhuma'];
    const pageItems = pending.slice(start, start + PAGE_SIZE);

    if (pageItems.length === 0) {
      lines.push('Sem itens pendentes nesta pagina.');
    } else {
      lines.push(
        ...pageItems.map((item, index) => `${start + index + 1}. ${formatTrack(item)}`)
      );
    }

    await interaction.reply(lines.join('\n'));
  }
};
