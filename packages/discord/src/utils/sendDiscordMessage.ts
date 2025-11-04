import { DISCORD_API_BASE_URL } from "../constants/api";

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedFooter {
  text?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: DiscordEmbedFooter;
}

export interface DiscordMessagePayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface SendDiscordMessageOptions {
  fetchFn?: typeof fetch;
}

export const createDiscordMessageApiUrl = (channelId: string): string => {
  return `${DISCORD_API_BASE_URL}/api/v10/channels/${channelId}/messages`;
};

export const sendDiscordMessage = async (
  botToken: string,
  channelId: string,
  message: DiscordMessagePayload,
  options?: SendDiscordMessageOptions,
): Promise<void> => {
  const fetchFn = options?.fetchFn ?? fetch;

  const response = await fetchFn(createDiscordMessageApiUrl(channelId), {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const errorMessage = `Failed to send Discord message. ${responseText}`;
    throw new Error(errorMessage);
  }

  try {
    const messageData = JSON.parse(responseText) as {
      id: string;
      channel_id: string;
      timestamp: string;
    };
    console.log("Discord message sent successfully", {
      messageId: messageData.id,
      channelId: messageData.channel_id,
      timestamp: messageData.timestamp,
    });
  } catch {
    console.warn("Discord message sent (response parsing failed)");
  }
};
