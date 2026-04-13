import {
  DiscordAPIError,
  Events,
  type ChatInputCommandInteraction,
  type Client,
  type InteractionReplyOptions
} from 'discord.js';
import type { Logger } from 'pino';

import type { CommandServices } from './types';
import type { SlashCommand } from './types';

function isInteractionAlreadyReplied(error: unknown): boolean {
  return error instanceof DiscordAPIError && error.code === 40060;
}

async function replyWithFallback(
  interaction: ChatInputCommandInteraction,
  content: string
): Promise<void> {
  const payload: InteractionReplyOptions = { content, ephemeral: true };

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

export function setupCommandHandler(
  client: Client,
  commands: SlashCommand[],
  logger: Logger,
  services: CommandServices
): void {
  const commandMap = new Map(commands.map((command) => [command.data.name, command]));

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
