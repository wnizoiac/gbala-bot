import {
  DiscordAPIError,
  Events,
  type ChatInputCommandInteraction,
  type Client,
  type InteractionReplyOptions
} from 'discord.js';
import type { Logger } from 'pino';

import { CooldownLimiter } from '../shared/cooldown-limiter';

import { handleMusicButtonInteraction, isNowPlayingButton } from './interactions/buttons';
import { createEphemeralError } from './responses';
import type { CommandServices } from './types';
import type { SlashCommand } from './types';

const COMMAND_COOLDOWN_MS = 2000;
const BUTTON_COOLDOWN_MS = 750;

function isInteractionAlreadyReplied(error: unknown): boolean {
  return error instanceof DiscordAPIError && error.code === 40060;
}

async function replyWithFallback(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  const payload: InteractionReplyOptions = createEphemeralError(content);

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
      return;
    }

    await interaction.reply(payload);
  } catch (error) {
    if (isInteractionAlreadyReplied(error)) {
      await interaction.followUp(payload);
      return;
    }

    throw error;
  }
}

function formatRetryAfter(retryAfterMs: number): string {
  return (retryAfterMs / 1000).toFixed(retryAfterMs >= 1000 ? 1 : 2);
}

export function setupCommandHandler(
  client: Client,
  commands: SlashCommand[],
  logger: Logger,
  services: CommandServices
): void {
  const commandMap = new Map(commands.map((command) => [command.data.name, command]));
  const commandCooldownLimiter = new CooldownLimiter();
  const buttonCooldownLimiter = new CooldownLimiter();

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
      const command = commandMap.get(interaction.commandName);

      if (!command?.autocomplete) {
        return;
      }

      try {
        await command.autocomplete({ interaction, logger, services });
      } catch (err) {
        logger.error(
          {
            err,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            commandName: interaction.commandName
          },
          'Falha no autocomplete do comando'
        );
      }

      return;
    }

    if (interaction.isButton()) {
      if (!isNowPlayingButton(interaction.customId)) {
        return;
      }

      const buttonCooldown = buttonCooldownLimiter.consume(
        `${interaction.user.id}:${interaction.guildId ?? 'dm'}:${interaction.customId}`,
        BUTTON_COOLDOWN_MS
      );

      if (!buttonCooldown.ok) {
        await interaction.reply({
          ...createEphemeralError(
            `Espere ${formatRetryAfter(buttonCooldown.error.retryAfterMs)}s antes de repetir este botao.`
          )
        });
        return;
      }

      try {
        await handleMusicButtonInteraction({ interaction, logger, services });
      } catch (err) {
        logger.error(
          {
            err,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            customId: interaction.customId
          },
          'Falha ao executar acao de botao'
        );

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            ...createEphemeralError('Ocorreu um erro ao processar este botao.')
          });
          return;
        }

        await interaction.reply(createEphemeralError('Ocorreu um erro ao processar este botao.'));
      }

      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    logger.info(
      {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        commandName: interaction.commandName
      },
      'Interaction de comando recebida'
    );

    const command = commandMap.get(interaction.commandName);

    if (!command) {
      await replyWithFallback(interaction, 'Comando nao encontrado.');
      return;
    }

    const commandCooldown = commandCooldownLimiter.consume(
      `${interaction.user.id}:${interaction.guildId ?? 'dm'}:${interaction.commandName}`,
      COMMAND_COOLDOWN_MS
    );

    if (!commandCooldown.ok) {
      await replyWithFallback(
        interaction,
        `Espere ${formatRetryAfter(commandCooldown.error.retryAfterMs)}s antes de repetir /${interaction.commandName}.`
      );
      return;
    }

    try {
      await command.execute({ interaction, logger, services });
    } catch (err) {
      logger.error(
        {
          err,
          guildId: interaction.guildId,
          userId: interaction.user.id,
          commandName: interaction.commandName
        },
        'Falha ao executar comando'
      );

      await replyWithFallback(interaction, 'Ocorreu um erro ao executar este comando.');
    }
  });
}
