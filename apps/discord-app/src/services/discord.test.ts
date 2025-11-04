import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDiscordMessageApiUrl } from "@packages/discord";
import {
  formatDiscordMessage,
  formatErrorMessage,
  formatDescription,
  sendSummaryDiscordMessage,
} from "./discord";
import type { SummaryMessage } from "./summary";

describe("formatDescription()", () => {
  it("should generate a description from a summary message", () => {
    const summary: SummaryMessage = {
      title: "AWS 利用料金サマリー (2024年6月)",
      total: "$150.75",
      currency: "USD",
      updatedAt: "2024-06-15T12:00:00.000Z",
      services: [
        { name: "AmazonEC2", amount: "$100.50" },
        { name: "AmazonS3", amount: "$50.25" },
      ],
    };

    const result = formatDescription(summary);

    expect(result).toContain("💰 現在の利用額: $150.75 USD");
    expect(result).toContain("📁 主なサービス:");
    expect(result).toContain("- AmazonEC2: $100.50");
    expect(result).toContain("- AmazonS3: $50.25");
  });

  it("should display the updatedAt in Japanese time", () => {
    const summary: SummaryMessage = {
      title: "Test",
      total: "$100.00",
      currency: "USD",
      updatedAt: "2024-06-15T12:00:00.000Z",
      services: [],
    };

    const result = formatDescription(summary);

    expect(result).toContain("🕒 更新日:");
    expect(result).toMatch(/🕒 更新日: \d{4}\/\d{1,2}\/\d{1,2}/);
  });
});

describe("formatDiscordMessage()", () => {
  it("should generate a Discord message from a summary message", () => {
    const summary: SummaryMessage = {
      title: "AWS 利用料金サマリー (2024年6月)",
      total: "$150.75",
      currency: "USD",
      updatedAt: "2024-06-15T12:00:00.000Z",
      services: [{ name: "AmazonEC2", amount: "$100.50" }],
    };

    const result = formatDiscordMessage(summary);

    expect(result.type).toBe(4);
    expect(result.data?.embeds).toHaveLength(1);
    expect(result.data?.embeds?.[0]?.title).toBe(
      "AWS 利用料金サマリー (2024年6月)",
    );
    expect(result.data?.embeds?.[0]?.color).toBe(0x3498db);
    expect(result.data?.embeds?.[0]?.timestamp).toBe(
      "2024-06-15T12:00:00.000Z",
    );
    expect(result.data?.embeds?.[0]?.description).toContain(
      "💰 現在の利用額: $150.75 USD",
    );
  });

  it("should set the timestamp correctly", () => {
    const summary: SummaryMessage = {
      title: "Test",
      total: "$100.00",
      currency: "USD",
      updatedAt: "2024-01-01T00:00:00.000Z",
      services: [],
    };

    const result = formatDiscordMessage(summary);

    expect(result.data?.embeds?.[0]?.timestamp).toBe(
      "2024-01-01T00:00:00.000Z",
    );
  });
});

describe("formatErrorMessage()", () => {
  it("should format an error message in Discord format", () => {
    const result = formatErrorMessage("Something went wrong");

    expect(result.type).toBe(4);
    expect(result.data?.content).toBe("❌ エラー: Something went wrong");
    expect(result.data?.embeds).toBeUndefined();
  });

  it("should handle empty error messages", () => {
    const result = formatErrorMessage("");

    expect(result.type).toBe(4);
    expect(result.data?.content).toBe("❌ エラー: ");
  });
});

describe("sendSummaryDiscordMessage()", () => {
  const mockSummary: SummaryMessage = {
    title: "AWS 利用料金サマリー (2024年6月)",
    total: "$150.75",
    currency: "USD",
    updatedAt: "2024-06-15T12:00:00.000Z",
    services: [{ name: "AmazonEC2", amount: "$100.50" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send a Discord message successfully", async () => {
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

    await sendSummaryDiscordMessage("test-token", "test-channel", mockSummary, {
      fetchFn: mockFetch as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      createDiscordMessageApiUrl("test-channel"),
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bot test-token",
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"embeds"'),
      }),
    );
  });

  it("should handle a 403 error correctly", async () => {
    const errorResponse = JSON.stringify({
      code: 50001,
      message: "Missing access",
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: vi.fn().mockResolvedValue(errorResponse),
    });

    await expect(
      sendSummaryDiscordMessage("test-token", "test-channel", mockSummary, {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).rejects.toThrow("Failed to send Discord message");

    const error = await sendSummaryDiscordMessage(
      "test-token",
      "test-channel",
      mockSummary,
      {
        fetchFn: mockFetch as typeof fetch,
      },
    ).catch((e) => e);

    expect(error.message).toContain("Failed to send Discord message");
    expect(error.message).toContain(errorResponse);
  });

  it("should handle a 404 error correctly", async () => {
    const errorResponse = JSON.stringify({
      message: "Unknown Channel",
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockResolvedValue(errorResponse),
    });

    const error = await sendSummaryDiscordMessage(
      "test-token",
      "test-channel",
      mockSummary,
      {
        fetchFn: mockFetch as typeof fetch,
      },
    ).catch((e) => e);

    expect(error.message).toContain("Failed to send Discord message");
    expect(error.message).toContain(errorResponse);
  });

  it("should handle a JSON parse error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: vi.fn().mockResolvedValue("Invalid JSON response"),
    });

    const error = await sendSummaryDiscordMessage(
      "test-token",
      "test-channel",
      mockSummary,
      {
        fetchFn: mockFetch as typeof fetch,
      },
    ).catch((e) => e);

    expect(error.message).toContain("Failed to send Discord message");
    expect(error.message).toContain("Invalid JSON response");
  });

  it("should not throw an error if the success response parsing fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("Invalid JSON"),
    });

    await expect(
      sendSummaryDiscordMessage("test-token", "test-channel", mockSummary, {
        fetchFn: mockFetch as typeof fetch,
      }),
    ).resolves.toBeUndefined();
  });

  it("should use the global fetch by default", async () => {
    const originalFetch = global.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          id: "123",
          channel_id: "456",
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
      ),
    });
    global.fetch = mockFetch as typeof fetch;

    try {
      await sendSummaryDiscordMessage(
        "test-token",
        "test-channel",
        mockSummary,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
