import type { ButtonInteraction, InteractionReplyOptions } from 'discord.js';
import type { Logger } from 'pino';

import type { LoopMode } from '../../music/queue/queue-state';
import { NOW_PLAYING_BUTTON_IDS, isNowPlayingButton } from '../components/now-playing-controls';
import { createEphemeralError, formatInfoMessage } from '../responses';
import type { CommandServices } from '../types';

import { requireButtonSameChannel, requireQueue } from './guards';

interface ButtonContext {
  interaction: ButtonInteraction;
  logger: Logger;
  services: CommandServices;
}

const LOOP_SEQUENCE: LoopMode[] = ['none', 'track', 'queue'];

function nextLoopMode(current: LoopMode): LoopMode {
  const currentIndex = LOOP_SEQUENCE.indexOf(current);
  return LOOP_SEQUENCE[(currentIndex + 1) % LOOP_SEQUENCE.length] ?? 'none';
}

async function replyWithFallback(
  interaction: ButtonInteraction,
  content: string
): Promise<void> {
  const payload: InteractionReplyOptions = createEphemeralError(content);

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}

export async function handleMusicButtonInteraction({
  interaction,
  services
}: ButtonContext): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await replyWithFallback(interaction, 'Guild invalida para esta interacao.');
    return;
  }

  const sameChannel = requireButtonSameChannel(interaction, services);

  if (!sameChannel.ok) {
    await replyWithFallback(interaction, sameChannel.error);
    return;
  }

  const playerSnapshot = services.playerManager.snapshot(guildId);

  if (!playerSnapshot.currentTrack) {
    await replyWithFallback(interaction, 'Nao ha reproducao ativa para controlar.');
    return;
  }

  switch (interaction.customId) {
    case NOW_PLAYING_BUTTON_IDS.togglePause: {
      await interaction.deferUpdate();

      if (playerSnapshot.isPaused) {
        const result = services.playerManager.resume(guildId);

        if (!result.ok || !result.value) {
          await replyWithFallback(interaction, 'Nao foi possivel retomar a reproducao.');
        }

        return;
      }

      const result = services.playerManager.pause(guildId);

      if (!result.ok || !result.value) {
        await replyWithFallback(interaction, 'Nao foi possivel pausar a reproducao.');
      }

      return;
    }
    case NOW_PLAYING_BUTTON_IDS.skip: {
      await interaction.deferUpdate();
      const result = await services.playerManager.skip(guildId);

      if (!result.ok) {
        await replyWithFallback(interaction, result.error.message);
        return;
      }

      if (!result.value) {
        await interaction.followUp({
          content: formatInfoMessage('A fila terminou apos o skip.'),
          ephemeral: true
        });
      }

      return;
    }
    case NOW_PLAYING_BUTTON_IDS.stop: {
      await interaction.deferUpdate();
      await services.playerManager.stop(guildId, true);
      return;
    }
    case NOW_PLAYING_BUTTON_IDS.shuffle: {
      const queue = requireQueue(guildId, services);

      if (!queue.ok) {
        await replyWithFallback(interaction, queue.error);
        return;
      }

      await interaction.deferUpdate();
      services.queueManager.shuffle(guildId);
      await services.nowPlayingPanel.sync(guildId);
      return;
    }
    case NOW_PLAYING_BUTTON_IDS.cycleLoop: {
      await interaction.deferUpdate();
      const nextMode = nextLoopMode(playerSnapshot.loopMode);
      services.queueManager.setLoopMode(guildId, nextMode);
      services.guildSettingsRepository.upsert(
        guildId,
        services.playerManager.getVolume(guildId),
        nextMode
      );
      await services.nowPlayingPanel.sync(guildId);
      return;
    }
    default:
      await replyWithFallback(interaction, 'Botao de musica nao reconhecido.');
  }
}

export { isNowPlayingButton };
