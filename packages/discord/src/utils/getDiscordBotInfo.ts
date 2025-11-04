import { DISCORD_API_BASE_URL } from "../constants/api";

export interface DiscordBotInfo {
  name: string;
}

export interface GetDiscordBotInfoOptions {
  fetchFn?: typeof fetch;
}

export const getDiscordBotInfo = async (
  botToken: string,
  options?: GetDiscordBotInfoOptions,
): Promise<DiscordBotInfo> => {
  const fetchFn = options?.fetchFn ?? fetch;

  const response = await fetchFn(`${DISCORD_API_BASE_URL}/api/v10/users/@me`, {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to get Discord bot info. ${responseText}`);
  }

  try {
    const json = JSON.parse(responseText);
    return {
      name: json.username,
    };
  } catch {
    throw new Error(`Failed to parse Discord bot info. ${responseText}`);
  }
};
