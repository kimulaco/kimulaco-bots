import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { sendServiceCostSummaryToDiscord } from "./sendServiceCostSummaryToDiscord";
import type { Env } from "../type";

// Mock dependencies
vi.mock("@packages/aws", async (importOriginal) => {
  const original = await importOriginal<typeof import("@packages/aws")>();
  return {
    ...original,
    getAwsMonthlyCost: vi.fn(),
  };
});

vi.mock("../services/discord", () => ({
  sendSummaryDiscordMessage: vi.fn(),
}));

vi.mock("../services/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { getAwsMonthlyCost } from "@packages/aws";
import { sendSummaryDiscordMessage } from "../services/discord";

const mockGetAwsMonthlyCost = getAwsMonthlyCost as Mock;
const mockSendSummaryDiscordMessage = sendSummaryDiscordMessage as Mock;

describe("sendServiceCostSummaryToDiscord", () => {
  const validEnv: Env = {
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    DISCORD_BOT_TOKEN: "test-bot-token",
    DISCORD_CRON_CHANNEL_ID: "test-channel-id",
    DISCORD_PUBLIC_KEY: "test-public-key",
    DISCORD_COMMAND_NAME: "herta",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful execution", () => {
    it("should fetch AWS cost and send Discord message", async () => {
      const mockCostData = {
        total: 150.0,
        currency: "USD",
        period: {
          start: "2024-01-01",
          end: "2024-01-31",
        },
        services: [{ name: "EC2", amount: 100.0 }],
      };
      mockGetAwsMonthlyCost.mockResolvedValue(mockCostData);
      mockSendSummaryDiscordMessage.mockResolvedValue(undefined);

      await sendServiceCostSummaryToDiscord(validEnv);

      expect(mockGetAwsMonthlyCost).toHaveBeenCalledWith({
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
      });
      expect(mockSendSummaryDiscordMessage).toHaveBeenCalledWith(
        "test-bot-token",
        "test-channel-id",
        expect.objectContaining({
          total: "$150.00",
          currency: "USD",
        }),
      );
    });
  });

  describe("environment variable validation", () => {
    it("should throw error when AWS_ACCESS_KEY_ID is missing", async () => {
      const env: Env = {
        ...validEnv,
        AWS_ACCESS_KEY_ID: "",
      };

      await expect(sendServiceCostSummaryToDiscord(env)).rejects.toThrow(
        "required environment variable AWS_ACCESS_KEY_ID",
      );
    });

    it("should throw error when AWS_SECRET_ACCESS_KEY is missing", async () => {
      const env: Env = {
        ...validEnv,
        AWS_SECRET_ACCESS_KEY: "",
      };

      await expect(sendServiceCostSummaryToDiscord(env)).rejects.toThrow(
        "required environment variable AWS_SECRET_ACCESS_KEY",
      );
    });

    it("should throw error when DISCORD_BOT_TOKEN is missing", async () => {
      const env: Env = {
        ...validEnv,
        DISCORD_BOT_TOKEN: "",
      };

      await expect(sendServiceCostSummaryToDiscord(env)).rejects.toThrow(
        "required environment variable DISCORD_BOT_TOKEN",
      );
    });

    it("should throw error when DISCORD_CRON_CHANNEL_ID is missing", async () => {
      const env: Env = {
        ...validEnv,
        DISCORD_CRON_CHANNEL_ID: "",
      };

      await expect(sendServiceCostSummaryToDiscord(env)).rejects.toThrow(
        "required environment variable DISCORD_CRON_CHANNEL_ID",
      );
    });
  });

  describe("error handling", () => {
    it("should wrap AWS API errors", async () => {
      mockGetAwsMonthlyCost.mockRejectedValue(new Error("AWS API Error"));

      await expect(sendServiceCostSummaryToDiscord(validEnv)).rejects.toThrow(
        "Error processing cron job: AWS API Error",
      );
    });

    it("should wrap Discord API errors", async () => {
      mockGetAwsMonthlyCost.mockResolvedValue({
        total: 100.0,
        currency: "USD",
        period: {
          start: "2024-01-01",
          end: "2024-01-31",
        },
        services: [],
      });
      mockSendSummaryDiscordMessage.mockRejectedValue(
        new Error("Discord API Error"),
      );

      await expect(sendServiceCostSummaryToDiscord(validEnv)).rejects.toThrow(
        "Error processing cron job: Discord API Error",
      );
    });

    it("should handle non-Error exceptions", async () => {
      mockGetAwsMonthlyCost.mockRejectedValue("Unknown exception");

      await expect(sendServiceCostSummaryToDiscord(validEnv)).rejects.toThrow(
        "Error processing cron job: Unknown error",
      );
    });
  });
});
