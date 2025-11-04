import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDiscordChannelInfo } from "./getDiscordChannelInfo";
import { DISCORD_API_BASE_URL } from "../constants/api";

describe("getDiscordChannelInfo()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get channel info successfully", async () => {
    const mockChannelInfo = {
      id: "123456789",
      name: "general",
      type: 0,
      guild_id: "987654321",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockChannelInfo)),
    });

    const result = await getDiscordChannelInfo("test-token", "123456789", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "general",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${DISCORD_API_BASE_URL}/api/v10/channels/123456789`,
      {
        headers: {
          Authorization: "Bot test-token",
        },
      },
    );
  });

  it("should throw an error when the request fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          message: "Unknown Channel",
          code: 10003,
        }),
      ),
    });

    await expect(
      getDiscordChannelInfo("test-token", "invalid-channel-id", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow("Failed to get Discord channel info");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw an error with error response text", async () => {
    const errorText = JSON.stringify({
      message: "Missing Access",
      code: 50001,
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: vi.fn().mockResolvedValue(errorText),
    });

    await expect(
      getDiscordChannelInfo("test-token", "channel-id", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow(`Failed to get Discord channel info. ${errorText}`);
  });

  it("should throw an error when response parsing fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("Invalid JSON"),
    });

    await expect(
      getDiscordChannelInfo("test-token", "channel-id", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow("Failed to parse Discord channel info");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw an error with response text when parsing fails", async () => {
    const invalidJson = "Not a valid JSON";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(invalidJson),
    });

    await expect(
      getDiscordChannelInfo("test-token", "channel-id", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow(`Failed to parse Discord channel info. ${invalidJson}`);
  });

  it("should use global fetch when fetchFn is not provided", async () => {
    const originalFetch = global.fetch;
    const mockChannelInfo = {
      id: "123456789",
      name: "test-channel",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockChannelInfo)),
    });
    global.fetch = mockFetch as typeof fetch;

    try {
      const result = await getDiscordChannelInfo("test-token", "channel-id");
      expect(result).toEqual({
        name: "test-channel",
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("should use the correct Discord API URL with channel ID", async () => {
    const channelId = "987654321012345678";
    const mockChannelInfo = {
      id: channelId,
      name: "another-channel",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockChannelInfo)),
    });

    await getDiscordChannelInfo("test-token", channelId, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${DISCORD_API_BASE_URL}/api/v10/channels/${channelId}`,
      expect.objectContaining({
        headers: {
          Authorization: "Bot test-token",
        },
      }),
    );
  });

  it("should extract name from response", async () => {
    const mockChannelInfo = {
      id: "111222333",
      name: "my-awesome-channel",
      type: 0,
      guild_id: "444555666",
      topic: "Channel topic",
      position: 0,
      nsfw: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockChannelInfo)),
    });

    const result = await getDiscordChannelInfo("test-token", "channel-id", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "my-awesome-channel",
    });
  });

  it("should handle response with minimal channel info", async () => {
    const mockChannelInfo = {
      name: "minimal-channel",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockChannelInfo)),
    });

    const result = await getDiscordChannelInfo("test-token", "channel-id", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "minimal-channel",
    });
  });

  it("should handle different channel types", async () => {
    const mockChannelInfo = {
      id: "123456789",
      name: "voice-channel",
      type: 2, // Voice channel
      guild_id: "987654321",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockChannelInfo)),
    });

    const result = await getDiscordChannelInfo("test-token", "channel-id", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "voice-channel",
    });
  });
});
