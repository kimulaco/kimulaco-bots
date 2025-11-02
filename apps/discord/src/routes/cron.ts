import { Hono } from "hono";
import type { Env } from "../index";
import { getAwsMonthlyCost, type AwsConfig } from "@packages/aws";
import { generateAwsSummary } from "../services/summary";
import { sendDiscordMessage } from "../services/discord";
import { createLogger } from "../services/logger";

const logger = createLogger();
const cron = new Hono<{ Bindings: Env }>();

cron.get("/health", async (c) => {
  const env = c.env;
  const health: {
    status: "healthy" | "degraded" | "unhealthy";
    checks: {
      discord?: {
        botToken: boolean;
        channelAccess: boolean;
        botInfo?: { id: string; username: string };
        channelInfo?: { id: string; name: string; type: number };
        error?: string;
      };
      aws?: {
        credentials: boolean;
        error?: string;
      };
    };
    message?: string;
  } = {
    status: "healthy",
    checks: {},
  };

  if (env.DISCORD_BOT_TOKEN && env.DISCORD_CRON_CHANNEL_ID) {
    try {
      const botInfoResponse = await fetch(
        "https://discord.com/api/v10/users/@me",
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          },
        },
      );

      if (!botInfoResponse.ok) {
        health.checks.discord = {
          botToken: false,
          channelAccess: false,
          error: `Invalid Bot Token: ${botInfoResponse.status}`,
        };
        health.status = "unhealthy";
      } else {
        const botInfo = (await botInfoResponse.json()) as {
          id: string;
          username: string;
        };

        const channelResponse = await fetch(
          `https://discord.com/api/v10/channels/${env.DISCORD_CRON_CHANNEL_ID}`,
          {
            headers: {
              Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
            },
          },
        );

        if (!channelResponse.ok) {
          const errorText = await channelResponse.text();
          let errorMessage = `Cannot access channel: ${channelResponse.status}`;
          try {
            const errorData = JSON.parse(errorText) as { message?: string };
            errorMessage += ` - ${errorData.message || errorText}`;
          } catch {}

          health.checks.discord = {
            botToken: true,
            channelAccess: false,
            botInfo: {
              id: botInfo.id,
              username: botInfo.username,
            },
            error: errorMessage,
          };
          health.status = "degraded";
        } else {
          const channelInfo = (await channelResponse.json()) as {
            id: string;
            name: string;
            type: number;
          };
          health.checks.discord = {
            botToken: true,
            channelAccess: true,
            botInfo: {
              id: botInfo.id,
              username: botInfo.username,
            },
            channelInfo: {
              id: channelInfo.id,
              name: channelInfo.name,
              type: channelInfo.type,
            },
          };
        }
      }
    } catch (error) {
      health.checks.discord = {
        botToken: false,
        channelAccess: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      health.status = "unhealthy";
    }
  } else {
    health.checks.discord = {
      botToken: !!env.DISCORD_BOT_TOKEN,
      channelAccess: false,
      error: "Missing credentials",
    };
    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CRON_CHANNEL_ID) {
      health.status = "degraded";
    }
  }

  health.checks.aws = {
    credentials: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
  };
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    health.status = health.status === "healthy" ? "degraded" : health.status;
  }

  const httpStatus =
    health.status === "healthy"
      ? 200
      : health.status === "degraded"
        ? 200
        : 503;

  return c.json(health, httpStatus);
});

cron.post("/bill", async (c) => {
  const env = c.env;

  logger.info("Cron trigger received");

  if (!env.BILL_API_PRIVATE_KEY) {
    logger.error("BILL_API_PRIVATE_KEY is not configured");
    return c.json({ error: "Server configuration error" }, 500);
  }

  const apiPrivateKey = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!apiPrivateKey || apiPrivateKey !== env.BILL_API_PRIVATE_KEY) {
    logger.error("Invalid API key", {
      hasApiPrivateKey: !!apiPrivateKey,
    });
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      logger.error("AWS credentials not configured");
      return c.json({ error: "AWS credentials not configured" }, 500);
    }

    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CRON_CHANNEL_ID) {
      logger.error("Discord credentials not configured", {
        hasBotToken: !!env.DISCORD_BOT_TOKEN,
        hasChannelId: !!env.DISCORD_CRON_CHANNEL_ID,
      });
      return c.json(
        {
          error: "Discord credentials not configured",
          hasBotToken: !!env.DISCORD_BOT_TOKEN,
          hasChannelId: !!env.DISCORD_CRON_CHANNEL_ID,
        },
        500,
      );
    }

    logger.info("Fetching AWS cost data...");

    const awsConfig: AwsConfig = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    };

    const costData = await getAwsMonthlyCost(awsConfig);
    logger.info("AWS cost data fetched", {
      total: costData.total,
      currency: costData.currency,
      servicesCount: costData.services.length,
    });

    const summary = generateAwsSummary(costData);

    logger.info("Sending Discord message...", {
      channelId: env.DISCORD_CRON_CHANNEL_ID,
      summaryTitle: summary.title,
    });

    await sendDiscordMessage(
      env.DISCORD_BOT_TOKEN,
      env.DISCORD_CRON_CHANNEL_ID,
      summary,
    );

    logger.info("Discord message sent successfully", {
      channelId: env.DISCORD_CRON_CHANNEL_ID,
    });

    return c.json({
      success: true,
      message: "AWS cost notification sent to Discord",
    });
  } catch (error) {
    logger.error("Error processing cron job", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, 500);
  }
});

export default cron;
