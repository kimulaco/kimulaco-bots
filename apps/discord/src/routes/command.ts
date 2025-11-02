import { Hono } from "hono";
import type { Env } from "../index";
import { getAwsMonthlyCost, type AwsConfig } from "@packages/aws";
import { generateAwsSummary } from "../services/summary";
import { formatDiscordMessage, formatErrorMessage } from "../services/discord";
import { createLogger } from "../services/logger";
import { verifyDiscordSignature } from "../utils/verify";

const logger = createLogger();
const command = new Hono<{ Bindings: Env }>();

command.post("/interaction", async (c) => {
  const env = c.env;
  const request = c.req.raw;

  if (env.DISCORD_PUBLIC_KEY) {
    const isValid = await verifyDiscordSignature(
      request,
      env.DISCORD_PUBLIC_KEY,
    );
    if (!isValid) {
      logger.error("Invalid Discord signature", {
        hasPublicKey: !!env.DISCORD_PUBLIC_KEY,
        hasSignature: !!request.headers.get("X-Signature-Ed25519"),
        hasTimestamp: !!request.headers.get("X-Signature-Timestamp"),
      });
      return c.json({ error: "Unauthorized" }, 401);
    }
  } else {
    logger.warn(
      "DISCORD_PUBLIC_KEY is not set. Skipping signature verification (development mode).",
    );
  }

  const body = (await request.json()) as {
    type?: number;
    data?: {
      name?: string;
      options?: Array<{
        name?: string;
        value?: string;
        type?: number;
        options?: Array<{ name?: string; value?: string }>;
      }>;
    };
  };

  logger.info("Received interaction request", {
    type: body.type,
    commandName: body.data?.name,
    subcommand: body.data?.options?.[0]?.name,
    option:
      body.data?.options?.[0]?.options?.[0]?.value ||
      body.data?.options?.[0]?.value,
  });

  if (body.type === 1) {
    logger.info("Responding to PING");
    return c.json({ type: 1 });
  }

  if (body.type === 2) {
    const commandName = body.data?.name;
    const subcommand = body.data?.options?.[0];
    const subcommandName = subcommand?.name;
    const serviceOption =
      subcommand?.type === 1
        ? subcommand.options?.[0]?.value
        : subcommand?.value;

    logger.info("Received slash command", {
      commandName,
      subcommandName,
      serviceOption,
      hasData: !!body.data,
    });

    try {
      if (
        (commandName === "herta-dev" &&
          subcommandName === "bill" &&
          serviceOption === "aws") ||
        (commandName === "bill" && serviceOption === "aws")
      ) {
        logger.info("Processing /bill aws command");

        if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
          logger.error("AWS credentials not configured");
          return c.json(
            formatErrorMessage("AWS認証情報が設定されていません。"),
            200,
          );
        }

        const awsConfig: AwsConfig = {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        };

        logger.info("Fetching AWS cost data...");
        const costData = await getAwsMonthlyCost(awsConfig);
        logger.info("AWS cost data fetched", {
          total: costData.total,
          currency: costData.currency,
          servicesCount: costData.services.length,
        });

        const summary = generateAwsSummary(costData);
        const response = formatDiscordMessage(summary);

        logger.info("Sending Discord response", {
          type: response.type,
          hasEmbeds: !!response.data?.embeds,
          embedTitle: response.data?.embeds?.[0]?.title,
        });

        return c.json(response);
      } else {
        logger.warn(
          `Unknown command: ${commandName} with service: ${serviceOption}`,
        );
        return c.json(
          formatErrorMessage(`不明なコマンドです: ${commandName}`),
          200,
        );
      }
    } catch (error) {
      logger.error("Error processing command", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error details", {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(formatErrorMessage(errorMessage), 200);
    }
  }

  logger.warn("Unhandled request type", { type: body.type });
  return c.json({ error: "Invalid request", receivedType: body.type }, 400);
});

export default command;
