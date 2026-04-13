import { SlashCommandBuilder } from 'discord.js';

import { searchCatalog } from '../../music/catalog/search';
import { formatErrorMessage, formatInfoMessage } from '../responses';
import type { SlashCommand } from '../types';

const PAGE_SIZE = 10;

function formatDuration(durationSeconds?: number): string {
  if (!durationSeconds || Number.isNaN(durationSeconds)) {
    return '--:--';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const catalogoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('catalogo')
    .setDescription('Lista ou busca faixas indexadas no catalogo local')
    .addStringOption((option) =>
      option.setName('busca').setDescription('Termo para buscar no catalogo').setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName('pagina').setDescription('Pagina da listagem').setMinValue(1).setRequired(false)
    ),
  async execute({ interaction, services }): Promise<void> {
    await interaction.deferReply();

    const busca = interaction.options.getString('busca') ?? undefined;
    const pagina = interaction.options.getInteger('pagina') ?? 1;
    const tracks = services.tracksRepository.listAll();
    const results = searchCatalog(tracks, busca);

    if (results.length === 0) {
      await interaction.editReply(formatInfoMessage('Nenhuma faixa encontrada no catalogo.'));
      return;
    }

    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

    if (pagina > totalPages) {
      await interaction.editReply(
        formatErrorMessage(`Pagina invalida. Total de paginas disponiveis: ${totalPages}.`)
      );
      return;
    }

    const start = (pagina - 1) * PAGE_SIZE;
    const pageItems = results.slice(start, start + PAGE_SIZE);
    const lines = pageItems.map((track, index) => {
      const position = start + index + 1;
      return `${position}. ${track.relativePath} (${formatDuration(track.durationSeconds)})`;
    });

    const heading = busca
      ? `Resultados para "${busca}" - pagina ${pagina}/${totalPages}`
      : `Catalogo - pagina ${pagina}/${totalPages}`;

    await interaction.editReply([heading, ...lines].join('\n'));
  }
};
