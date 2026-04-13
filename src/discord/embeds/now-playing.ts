import { EmbedBuilder } from 'discord.js';

import type { PlayerSnapshot } from '../../music/playback/player-manager';
import { formatDuration } from '../commands/music-command-support';

const LOOP_LABELS: Record<PlayerSnapshot['loopMode'], string> = {
  none: 'Nenhum',
  queue: 'Fila',
  track: 'Faixa'
};

const MAX_PENDING_PREVIEW = 5;

function formatPlaybackStatus(snapshot: PlayerSnapshot): string {
  if (snapshot.isPlaying) {
    return 'Tocando';
  }

  if (snapshot.isPaused) {
    return 'Pausado';
  }

  return 'Preparando';
}

function formatPendingTracks(snapshot: PlayerSnapshot): string {
  if (snapshot.pendingTracks.length === 0) {
    return 'Nenhuma faixa pendente.';
  }

  return snapshot.pendingTracks
    .slice(0, MAX_PENDING_PREVIEW)
    .map((track, index) => `${index + 1}. ${track.title} (${formatDuration(track.duration)})`)
    .join('\n');
}

export function createNowPlayingEmbed(snapshot: PlayerSnapshot): EmbedBuilder {
  if (!snapshot.currentTrack) {
    throw new Error('Nao existe faixa atual para montar o painel de reproducao.');
  }

  const currentTrack = snapshot.currentTrack;

  return new EmbedBuilder()
    .setColor(snapshot.isPaused ? 0xf59e0b : 0x22c55e)
    .setTitle(snapshot.isPaused ? 'Reproducao pausada' : 'Tocando agora')
    .setDescription(`**${currentTrack.title}**`)
    .addFields(
      { name: 'Status', value: formatPlaybackStatus(snapshot), inline: true },
      { name: 'Duracao', value: formatDuration(currentTrack.duration), inline: true },
      { name: 'Solicitada por', value: `<@${currentTrack.requestedBy}>`, inline: true },
      { name: 'Repeticao', value: LOOP_LABELS[snapshot.loopMode], inline: true },
      { name: 'Volume', value: `${snapshot.volume}%`, inline: true },
      { name: 'Proximas faixas', value: formatPendingTracks(snapshot) }
    )
    .setFooter({
      text: `${snapshot.pendingTracks.length} faixa(s) pendente(s) na fila`
    })
    .setTimestamp();
}
