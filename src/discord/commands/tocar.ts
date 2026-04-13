import type { DiscordGatewayAdapterCreator } from '@discordjs/voice';
import { SlashCommandBuilder } from 'discord.js';

import { requireCachedGuild, requireSameChannel } from '../interactions/guards';
import type { SlashCommand } from '../types';

import { createQueueItem, findTracks, formatTrack } from './music-command-support';

function buildChoiceValue(trackId: string): string {
  return `id:${trackId}`;
}

export const tocarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('tocar')
    .setDescription('Busca no catalogo, enfileira e toca uma faixa')
    .addStringOption((option) =>
      option
        .setName('busca')
        .setDescription('Nome da musica que voce quer tocar')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete({ interaction, services }): Promise<void> {
    const focused = interaction.options.getFocused();
    const tracks = services.tracksRepository.listAll();
    const matches = findTracks(tracks, focused).slice(0, 25);

    await interaction.respond(
      matches.map((track) => ({
        name: track.relativePath,
        value: buildChoiceValue(track.id)
      }))
    );
  },
  async execute({ interaction, services }): Promise<void> {
    const guildId = interaction.guildId;
    const query = interaction.options.getString('busca', true);

    if (!guildId) {
      await interaction.reply({ content: 'Guild invalida para este comando.', ephemeral: true });
      return;
    }

    const cachedGuild = requireCachedGuild(interaction);

    if (!cachedGuild.ok) {
      await interaction.reply({ content: cachedGuild.error, ephemeral: true });
      return;
    }

    const voiceChannel = requireSameChannel(interaction, services);

    if (!voiceChannel.ok) {
      await interaction.reply({ content: voiceChannel.error, ephemeral: true });
      return;
    }

    const tracks = services.tracksRepository.listAll();
    const selectedById = query.startsWith('id:')
      ? tracks.find((candidate) => buildChoiceValue(candidate.id) === query)
      : undefined;
    const matches = selectedById ? [selectedById] : findTracks(tracks, query);
    const track = matches[0];

    if (!track) {
      await interaction.reply(`Nenhuma faixa encontrada para "${query}".`);
      return;
    }

    await interaction.deferReply();

    try {
      await services.connectionManager.join({
        adapterCreator: cachedGuild.value.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        channelId: voiceChannel.value.id,
        guildId
      });
    } catch {
      await interaction.editReply(
        'Nao foi possivel conectar no canal de voz. Verifique permissoes de conectar/falar e tente novamente.'
      );
      return;
    }

    const wasEmpty = services.queueManager.isEmpty(guildId);
    const queueItem = createQueueItem(track, interaction.user.id);
    services.queueManager.enqueue(guildId, queueItem);

    if (wasEmpty) {
      const playback = await services.playerManager.play(guildId);

      if (!playback.ok) {
        await interaction.editReply(playback.error.message);
        return;
      }

      await interaction.editReply(`Tocando agora: ${formatTrack(queueItem)}`);
      return;
    }

    await interaction.editReply(`Faixa adicionada a fila: ${formatTrack(queueItem)}`);
  }
};
