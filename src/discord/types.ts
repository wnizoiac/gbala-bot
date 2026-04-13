import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import type { Logger } from 'pino';

import type { ConnectionManager } from '../music/playback/connection-manager';
import type { PlayerManager } from '../music/playback/player-manager';
import type { QueueManager } from '../music/queue/queue-manager';
import type { TracksRepository } from '../storage/repositories/tracks-repo';

export interface CommandServices {
  connectionManager: ConnectionManager;
  playerManager: PlayerManager;
  queueManager: QueueManager;
  tracksRepository: TracksRepository;
}

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  logger: Logger;
  services: CommandServices;
}

export interface AutocompleteContext {
  interaction: AutocompleteInteraction;
  logger: Logger;
  services: CommandServices;
}

export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  autocomplete?(context: AutocompleteContext): Promise<void>;
  execute(context: CommandContext): Promise<void>;
}
