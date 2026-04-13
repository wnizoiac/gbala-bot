import type { ButtonInteraction, ChatInputCommandInteraction, VoiceBasedChannel } from 'discord.js';

import type { Result } from '../../shared/types';
import type { CommandServices } from '../types';

export function requireCachedGuild(
  interaction: ChatInputCommandInteraction
): Result<ChatInputCommandInteraction<'cached'>, string> {
  if (!interaction.inCachedGuild()) {
    return { ok: false, error: 'Este comando so pode ser usado dentro de uma guild.' };
  }

  return { ok: true, value: interaction };
}

export function requireVoiceChannel(
  interaction: ChatInputCommandInteraction
): Result<VoiceBasedChannel, string> {
  const cached = requireCachedGuild(interaction);

  if (!cached.ok) {
    return cached;
  }

  const channel = cached.value.member.voice.channel;

  if (!channel) {
    return { ok: false, error: 'Entre em um canal de voz antes de usar este comando.' };
  }

  return { ok: true, value: channel };
}

export function requireSameChannel(
  interaction: ChatInputCommandInteraction,
  services: CommandServices
): Result<VoiceBasedChannel, string> {
  const voiceChannel = requireVoiceChannel(interaction);

  if (!voiceChannel.ok) {
    return voiceChannel;
  }

  const guildId = interaction.guildId;

  if (!guildId) {
    return { ok: false, error: 'Guild invalida para esta interacao.' };
  }

  const botChannelId = services.connectionManager.getChannelId(guildId);

  if (botChannelId && botChannelId !== voiceChannel.value.id) {
    return {
      ok: false,
      error: 'Voce precisa estar no mesmo canal de voz que o bot.'
    };
  }

  return voiceChannel;
}

export function requireButtonSameChannel(
  interaction: ButtonInteraction,
  services?: CommandServices
): Result<VoiceBasedChannel, string> {
  if (!interaction.inCachedGuild()) {
    return { ok: false, error: 'Este botao so pode ser usado dentro de uma guild.' };
  }

  const channel = interaction.member.voice.channel;

  if (!channel) {
    return { ok: false, error: 'Entre em um canal de voz antes de usar este botao.' };
  }

  if (!services) {
    return { ok: true, value: channel };
  }

  const guildId = interaction.guildId;

  if (!guildId) {
    return { ok: false, error: 'Guild invalida para esta interacao.' };
  }

  const botChannelId = services.connectionManager.getChannelId(guildId);

  if (botChannelId && botChannelId !== channel.id) {
    return {
      ok: false,
      error: 'Voce precisa estar no mesmo canal de voz que o bot.'
    };
  }

  return { ok: true, value: channel };
}

export function requirePlaying(guildId: string, services: CommandServices): Result<void, string> {
  if (!services.playerManager.isPlaying(guildId)) {
    return { ok: false, error: 'Nao ha reproducao ativa nesta guild.' };
  }

  return { ok: true, value: undefined };
}

export function requireQueue(guildId: string, services: CommandServices): Result<void, string> {
  if (services.queueManager.isEmpty(guildId)) {
    return { ok: false, error: 'A fila esta vazia.' };
  }

  return { ok: true, value: undefined };
}
