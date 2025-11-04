import type { Context } from "hono";
import type { Env } from "../index";
import {
  getDiscordBotInfo,
  getDiscordChannelInfo,
  type DiscordBotInfo,
  type DiscordChannelInfo,
} from "@packages/discord";

export type HealthStatus = "ok" | "config_error" | "external_connection_error";

export interface HealthInfo {
  status: HealthStatus;
  code: 200 | 500 | 503;
  details: {
    discord: {
      botInfo?: DiscordBotInfo;
      channelInfo?: DiscordChannelInfo;
      errors: string[];
    };
  };
}

export const getHealthInfo = async (
  c: Context<{ Bindings: Env }>,
): Promise<HealthInfo> => {
  const env = c.env;
  const health: HealthInfo = {
    status: "ok",
    code: 200,
    details: {
      discord: {
        botInfo: undefined,
        channelInfo: undefined,
        errors: [],
      },
    },
  };

  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CRON_CHANNEL_ID) {
    health.status = "config_error";
    health.code = 500;
    return health;
  }

  try {
    health.details.discord.botInfo = await getDiscordBotInfo(
      env.DISCORD_BOT_TOKEN,
    );
  } catch (error) {
    console.error(error);
    health.status = "external_connection_error";
    health.details.discord.errors.push(
      error instanceof Error ? error.message : "Failed to get Discord bot info",
    );
  }

  try {
    health.details.discord.channelInfo = await getDiscordChannelInfo(
      env.DISCORD_BOT_TOKEN,
      env.DISCORD_CRON_CHANNEL_ID,
    );
  } catch (error) {
    console.error(error);
    health.status = "external_connection_error";
    health.details.discord.errors.push(
      error instanceof Error
        ? error.message
        : "Failed to get Discord channel info",
    );
  }

  if (health.status !== "ok") {
    health.code = 503;
  }

  return health;
};
