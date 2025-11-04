import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDiscordBotInfo } from "./getDiscordBotInfo";
import { DISCORD_API_BASE_URL } from "../constants/api";

describe("getDiscordBotInfo()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get bot info successfully", async () => {
    const mockBotInfo = {
      id: "123456789",
      username: "TestBot",
      discriminator: "0000",
      avatar: null,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockBotInfo)),
    });

    const result = await getDiscordBotInfo("test-token", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "TestBot",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${DISCORD_API_BASE_URL}/api/v10/users/@me`,
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
      status: 401,
      statusText: "Unauthorized",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          message: "401: Unauthorized",
        }),
      ),
    });

    await expect(
      getDiscordBotInfo("invalid-token", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow("Failed to get Discord bot info");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw an error with error response text", async () => {
    const errorText = JSON.stringify({
      message: "Invalid token",
      code: 0,
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: vi.fn().mockResolvedValue(errorText),
    });

    await expect(
      getDiscordBotInfo("invalid-token", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow(`Failed to get Discord bot info. ${errorText}`);
  });

  it("should throw an error when response parsing fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("Invalid JSON"),
    });

    await expect(
      getDiscordBotInfo("test-token", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow("Failed to parse Discord bot info");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw an error with response text when parsing fails", async () => {
    const invalidJson = "Not a valid JSON";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(invalidJson),
    });

    await expect(
      getDiscordBotInfo("test-token", {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow(`Failed to parse Discord bot info. ${invalidJson}`);
  });

  it("should use global fetch when fetchFn is not provided", async () => {
    const originalFetch = global.fetch;
    const mockBotInfo = {
      id: "123456789",
      username: "TestBot",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockBotInfo)),
    });
    global.fetch = mockFetch as typeof fetch;

    try {
      const result = await getDiscordBotInfo("test-token");
      expect(result).toEqual({
        name: "TestBot",
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("should use the correct Discord API URL", async () => {
    const mockBotInfo = {
      id: "987654321",
      username: "AnotherBot",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockBotInfo)),
    });

    await getDiscordBotInfo("test-token", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${DISCORD_API_BASE_URL}/api/v10/users/@me`,
      expect.objectContaining({
        headers: {
          Authorization: "Bot test-token",
        },
      }),
    );
  });

  it("should extract username from response", async () => {
    const mockBotInfo = {
      id: "111222333",
      username: "MyAwesomeBot",
      discriminator: "1234",
      avatar: "avatar-hash",
      bot: true,
      verified: true,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockBotInfo)),
    });

    const result = await getDiscordBotInfo("test-token", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "MyAwesomeBot",
    });
  });

  it("should handle response with minimal bot info", async () => {
    const mockBotInfo = {
      username: "MinimalBot",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockBotInfo)),
    });

    const result = await getDiscordBotInfo("test-token", {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(result).toEqual({
      name: "MinimalBot",
    });
  });
});
