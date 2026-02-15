import type { DiscordEmbed } from "../utils/sendDiscordMessage";

/**
 * Discord Interaction Types
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-interaction-type
 */
export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

/**
 * Discord Interaction Response Types
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
 */
export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
} as const;

/**
 * Discord Application Command Option Type
 * @see https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
 */
export const ApplicationCommandOptionType = {
  SUB_COMMAND: 1,
  SUB_COMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
  NUMBER: 10,
  ATTACHMENT: 11,
} as const;

export interface DiscordInteractionOption {
  name: string;
  value?: string;
  type: number;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteractionData {
  name: string;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteraction {
  type: number;
  data?: DiscordInteractionData;
}

export interface DiscordInteractionResponseData {
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordInteractionResponse {
  type: number;
  data?: DiscordInteractionResponseData;
}
