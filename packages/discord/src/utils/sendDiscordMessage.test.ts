import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendDiscordMessage,
  createDiscordMessageUrl,
  type DiscordMessagePayload,
  type DiscordEmbed,
} from "./sendDiscordMessage";

describe("sendDiscordMessage()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a message with content only", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });

    const message: DiscordMessagePayload = {
      content: "Hello, Discord!",
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      createDiscordMessageUrl("test-channel"),
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bot test-token`,
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"content"'),
      }),
    );
  });

  it("should send a message with embeds only", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });

    const embed: DiscordEmbed = {
      title: "Test Embed",
      description: "This is a test embed",
      color: 0x3498db,
      timestamp: "2024-06-15T12:00:00.000Z",
    };

    const message: DiscordMessagePayload = {
      embeds: [embed],
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      createDiscordMessageUrl("test-channel"),
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bot test-token`,
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"embeds"'),
      }),
    );
  });

  it("should send a message with both content and embeds", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });

    const message: DiscordMessagePayload = {
      content: "Check out this embed!",
      embeds: [
        {
          title: "Test Embed",
          description: "This is a test embed",
          color: 0x3498db,
        },
      ],
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe(createDiscordMessageUrl("test-channel"));
    expect(JSON.parse(callArgs[1].body as string)).toEqual(message);
  });

  it("should send a message with multiple embeds", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });

    const message: DiscordMessagePayload = {
      embeds: [
        {
          title: "First Embed",
          description: "First embed description",
          color: 0x3498db,
        },
        {
          title: "Second Embed",
          description: "Second embed description",
          color: 0xe74c3c,
          fields: [
            {
              name: "Field 1",
              value: "Value 1",
              inline: true,
            },
            {
              name: "Field 2",
              value: "Value 2",
              inline: false,
            },
          ],
          footer: {
            text: "Footer text",
          },
        },
      ],
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(JSON.parse(callArgs[1].body as string)).toEqual(message);
  });

  it("should throw an error when the request fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          message: "Missing access",
        }),
      ),
    });

    const message: DiscordMessagePayload = {
      content: "Test message",
    };

    await expect(
      sendDiscordMessage("test-token", "test-channel", message, {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow("Failed to send Discord message");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw an error with error response text", async () => {
    const errorText = "Invalid channel";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockResolvedValue(errorText),
    });

    const message: DiscordMessagePayload = {
      content: "Test message",
    };

    await expect(
      sendDiscordMessage("test-token", "test-channel", message, {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow(`Failed to send Discord message. ${errorText}`);
  });

  it("should log success message when response parsing succeeds", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockMessageData = {
      id: "123456789",
      channel_id: "987654321",
      timestamp: "2024-06-15T12:00:00.000Z",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockMessageData)),
    });

    const message: DiscordMessagePayload = {
      content: "Test message",
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Discord message sent successfully",
      {
        messageId: mockMessageData.id,
        channelId: mockMessageData.channel_id,
        timestamp: mockMessageData.timestamp,
      },
    );

    consoleSpy.mockRestore();
  });

  it("should warn when response parsing fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("Invalid JSON"),
    });

    const message: DiscordMessagePayload = {
      content: "Test message",
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Discord message sent (response parsing failed)",
    );

    consoleWarnSpy.mockRestore();
  });

  it("should use global fetch when fetchFn is not provided", async () => {
    const originalFetch = global.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });
    global.fetch = mockFetch as typeof fetch;

    const message: DiscordMessagePayload = {
      content: "Test message",
    };

    try {
      await sendDiscordMessage("test-token", "test-channel", message);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("should construct the correct Discord API URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });

    const channelId = "123456789012345678";
    const message: DiscordMessagePayload = {
      content: "Test",
    };

    await sendDiscordMessage("test-token", channelId, message, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      createDiscordMessageUrl(channelId),
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bot test-token`,
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"content"'),
      }),
    );
  });

  it("should send a message with all embed fields", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123456789",
          channel_id: "987654321",
          timestamp: "2024-06-15T12:00:00.000Z",
        }),
      ),
    });

    const embed: DiscordEmbed = {
      title: "Full Embed",
      description: "Description with all fields",
      color: 0x3498db,
      fields: [
        {
          name: "Inline Field 1",
          value: "Value 1",
          inline: true,
        },
        {
          name: "Inline Field 2",
          value: "Value 2",
          inline: true,
        },
        {
          name: "Non-inline Field",
          value: "Value 3",
          inline: false,
        },
      ],
      timestamp: "2024-06-15T12:00:00.000Z",
      footer: {
        text: "Footer text",
      },
    };

    const message: DiscordMessagePayload = {
      embeds: [embed],
    };

    await sendDiscordMessage("test-token", "test-channel", message, {
      fetchFn: mockFetch as typeof fetch,
    });

    const callArgs = mockFetch.mock.calls[0];
    const sentMessage = JSON.parse(callArgs[1].body as string);
    expect(sentMessage.embeds[0]).toEqual(embed);
  });
});
