import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context } from "hono";
import type { Env } from "../index";
import { getHealthInfo } from "./health";
import {
  getDiscordBotInfo,
  getDiscordChannelInfo,
  type DiscordBotInfo,
  type DiscordChannelInfo,
} from "@packages/discord";

// Mock the Discord package functions
vi.mock("@packages/discord", () => ({
  getDiscordBotInfo: vi.fn(),
  getDiscordChannelInfo: vi.fn(),
}));

describe("getHealthInfo()", () => {
  const mockBotInfo: DiscordBotInfo = {
    name: "TestBot",
  };

  const mockChannelInfo: DiscordChannelInfo = {
    name: "test-channel",
  };

  const createMockContext = (env: Partial<Env>): Context<{ Bindings: Env }> => {
    return {
      env: env as Env,
    } as Context<{ Bindings: Env }>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return ok status when all checks pass", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    mockGetDiscordBotInfo.mockResolvedValue(mockBotInfo);
    mockGetDiscordChannelInfo.mockResolvedValue(mockChannelInfo);

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "ok",
      code: 200,
      details: {
        discord: {
          botInfo: mockBotInfo,
          channelInfo: mockChannelInfo,
          errors: [],
        },
      },
    });
    expect(mockGetDiscordBotInfo).toHaveBeenCalledWith("test-token");
    expect(mockGetDiscordChannelInfo).toHaveBeenCalledWith(
      "test-token",
      "channel-id",
    );
  });

  it("should return config_error when DISCORD_BOT_TOKEN is missing", async () => {
    const env: Env = {
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "config_error",
      code: 500,
      details: {
        discord: {
          botInfo: undefined,
          channelInfo: undefined,
          errors: [],
        },
      },
    });
    expect(getDiscordBotInfo).not.toHaveBeenCalled();
    expect(getDiscordChannelInfo).not.toHaveBeenCalled();
  });

  it("should return config_error when DISCORD_CRON_CHANNEL_ID is missing", async () => {
    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "config_error",
      code: 500,
      details: {
        discord: {
          botInfo: undefined,
          channelInfo: undefined,
          errors: [],
        },
      },
    });
    expect(getDiscordBotInfo).not.toHaveBeenCalled();
    expect(getDiscordChannelInfo).not.toHaveBeenCalled();
  });

  it("should return config_error when both DISCORD_BOT_TOKEN and DISCORD_CRON_CHANNEL_ID are missing", async () => {
    const env: Env = {};

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "config_error",
      code: 500,
      details: {
        discord: {
          botInfo: undefined,
          channelInfo: undefined,
          errors: [],
        },
      },
    });
  });

  it("should return external_connection_error when getDiscordBotInfo fails", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    const error = new Error("Failed to get Discord bot info");
    mockGetDiscordBotInfo.mockRejectedValue(error);
    mockGetDiscordChannelInfo.mockResolvedValue(mockChannelInfo);

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "external_connection_error",
      code: 503,
      details: {
        discord: {
          botInfo: undefined,
          channelInfo: mockChannelInfo,
          errors: ["Failed to get Discord bot info"],
        },
      },
    });
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("should return external_connection_error when getDiscordChannelInfo fails", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    mockGetDiscordBotInfo.mockResolvedValue(mockBotInfo);
    const error = new Error("Failed to get Discord channel info");
    mockGetDiscordChannelInfo.mockRejectedValue(error);

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "external_connection_error",
      code: 503,
      details: {
        discord: {
          botInfo: mockBotInfo,
          channelInfo: undefined,
          errors: ["Failed to get Discord channel info"],
        },
      },
    });
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("should return external_connection_error when both Discord API calls fail", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    const botError = new Error("Bot API error");
    const channelError = new Error("Channel API error");
    mockGetDiscordBotInfo.mockRejectedValue(botError);
    mockGetDiscordChannelInfo.mockRejectedValue(channelError);

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "external_connection_error",
      code: 503,
      details: {
        discord: {
          botInfo: undefined,
          channelInfo: undefined,
          errors: ["Bot API error", "Channel API error"],
        },
      },
    });
    expect(console.error).toHaveBeenCalledWith(botError);
    expect(console.error).toHaveBeenCalledWith(channelError);
  });

  it("should handle non-Error exceptions in getDiscordBotInfo", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    mockGetDiscordBotInfo.mockRejectedValue("String error");
    mockGetDiscordChannelInfo.mockResolvedValue(mockChannelInfo);

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "external_connection_error",
      code: 503,
      details: {
        discord: {
          botInfo: undefined,
          channelInfo: mockChannelInfo,
          errors: ["Failed to get Discord bot info"],
        },
      },
    });
  });

  it("should handle non-Error exceptions in getDiscordChannelInfo", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    mockGetDiscordBotInfo.mockResolvedValue(mockBotInfo);
    mockGetDiscordChannelInfo.mockRejectedValue("String error");

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result).toEqual({
      status: "external_connection_error",
      code: 503,
      details: {
        discord: {
          botInfo: mockBotInfo,
          channelInfo: undefined,
          errors: ["Failed to get Discord channel info"],
        },
      },
    });
  });

  it("should set code to 503 when status is not ok", async () => {
    const mockGetDiscordBotInfo = vi.mocked(getDiscordBotInfo);
    const mockGetDiscordChannelInfo = vi.mocked(getDiscordChannelInfo);

    const error = new Error("API error");
    mockGetDiscordBotInfo.mockRejectedValue(error);
    mockGetDiscordChannelInfo.mockResolvedValue(mockChannelInfo);

    const env: Env = {
      DISCORD_BOT_TOKEN: "test-token",
      DISCORD_CRON_CHANNEL_ID: "channel-id",
    };

    const result = await getHealthInfo(createMockContext(env));

    expect(result.code).toBe(503);
    expect(result.status).toBe("external_connection_error");
  });
});
