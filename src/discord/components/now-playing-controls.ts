import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import type { PlayerSnapshot } from '../../music/playback/player-manager';

const LOOP_LABELS: Record<PlayerSnapshot['loopMode'], string> = {
  none: 'Nenhum',
  queue: 'Fila',
  track: 'Faixa'
};

export const NOW_PLAYING_BUTTON_IDS = {
  cycleLoop: 'music:cycle-loop',
  shuffle: 'music:shuffle',
  skip: 'music:skip',
  stop: 'music:stop',
  togglePause: 'music:toggle-pause'
} as const;

export function isNowPlayingButton(customId: string): boolean {
  return Object.values(NOW_PLAYING_BUTTON_IDS).includes(
    customId as (typeof NOW_PLAYING_BUTTON_IDS)[keyof typeof NOW_PLAYING_BUTTON_IDS]
  );
}

export function createNowPlayingControls(
  snapshot: PlayerSnapshot
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(NOW_PLAYING_BUTTON_IDS.togglePause)
        .setLabel(snapshot.isPaused ? 'Retomar' : 'Pausar')
        .setStyle(snapshot.isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(NOW_PLAYING_BUTTON_IDS.skip)
        .setLabel('Pular')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(NOW_PLAYING_BUTTON_IDS.stop)
        .setLabel('Parar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(NOW_PLAYING_BUTTON_IDS.shuffle)
        .setLabel('Embaralhar')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(snapshot.pendingTracks.length < 2),
      new ButtonBuilder()
        .setCustomId(NOW_PLAYING_BUTTON_IDS.cycleLoop)
        .setLabel(`Repetir: ${LOOP_LABELS[snapshot.loopMode]}`)
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}
