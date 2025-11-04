import { getAwsMonthlyCost, type AwsConfig } from "@packages/aws";
import { generateAwsConstSummary } from "../services/summary";
import { sendSummaryDiscordMessage } from "../services/discord";
import { createLogger } from "../services/logger";
import type { Env } from "../type";

const logger = createLogger();

export const sendServiceCostSummaryToDiscord = async (env: Env) => {
  logger.info("Cron trigger received");

  try {
    if (!env.AWS_ACCESS_KEY_ID) {
      throw new Error("required environment variable AWS_ACCESS_KEY_ID");
    }
    if (!env.AWS_SECRET_ACCESS_KEY) {
      throw new Error("required environment variable AWS_SECRET_ACCESS_KEY");
    }
    if (!env.DISCORD_BOT_TOKEN) {
      throw new Error("required environment variable DISCORD_BOT_TOKEN");
    }
    if (!env.DISCORD_CRON_CHANNEL_ID) {
      throw new Error("required environment variable DISCORD_CRON_CHANNEL_ID");
    }

    logger.info("Fetching AWS cost data...");

    const awsConfig: AwsConfig = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    };

    const awsCostData = await getAwsMonthlyCost(awsConfig);
    const awsCostSummary = generateAwsConstSummary(awsCostData);

    logger.info("Sending Discord message...", {
      channelId: env.DISCORD_CRON_CHANNEL_ID,
      summaryTitle: awsCostSummary.title,
    });

    await sendSummaryDiscordMessage(
      env.DISCORD_BOT_TOKEN,
      env.DISCORD_CRON_CHANNEL_ID,
      awsCostSummary,
    );

    logger.info("Discord message sent successfully", {
      channelId: env.DISCORD_CRON_CHANNEL_ID,
    });
  } catch (error) {
    throw new Error(
      `Error processing cron job: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
