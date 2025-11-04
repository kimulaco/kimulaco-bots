import { DISCORD_API_BASE_URL } from "../constants/api";

export interface DiscordChannelInfo {
  name: string;
}

export interface GetDiscordChannelInfoOptions {
  fetchFn?: typeof fetch;
}

export const getDiscordChannelInfo = async (
  botToken: string,
  channelId: string,
  options?: GetDiscordChannelInfoOptions,
): Promise<DiscordChannelInfo> => {
  const fetchFn = options?.fetchFn ?? fetch;

  const response = await fetchFn(
    `${DISCORD_API_BASE_URL}/api/v10/channels/${channelId}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to get Discord channel info. ${responseText}`);
  }

  try {
    const json = JSON.parse(responseText);
    return {
      name: json.name,
    };
  } catch {
    throw new Error(`Failed to parse Discord channel info. ${responseText}`);
  }
};
