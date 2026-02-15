import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  InteractionType,
  InteractionResponseType,
  ApplicationCommandOptionType,
} from "@packages/discord";
import { VERSION } from "../version";

// Mock dependencies
vi.mock("@packages/discord", async (importOriginal) => {
  const original = await importOriginal<typeof import("@packages/discord")>();
  return {
    ...original,
    verifyDiscordSignature: vi.fn(),
  };
});

vi.mock("@packages/aws", () => ({
  getAwsMonthlyCost: vi.fn(),
}));

vi.mock("../services/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { verifyDiscordSignature } from "@packages/discord";
import { getAwsMonthlyCost } from "@packages/aws";

// Import the api handler dynamically to apply mocks
import api from "./index";

const mockVerifyDiscordSignature = verifyDiscordSignature as Mock;
const mockGetAwsMonthlyCost = getAwsMonthlyCost as Mock;

interface TestEnv {
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_COMMAND_NAME?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  [key: string]: string | undefined;
}

describe("interaction handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyDiscordSignature.mockResolvedValue(true);
  });

  const createRequest = (body: object) => {
    return new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature-Ed25519": "valid-signature",
        "X-Signature-Timestamp": "123456789",
      },
      body: JSON.stringify(body),
    });
  };

  const fetchWithEnv = async (request: Request, env: TestEnv) => {
    // Hono's fetch accepts (request, env, executionContext) as arguments
    return api.fetch(request, env);
  };

  describe("PING handling", () => {
    it("should respond with PONG for PING request", async () => {
      const request = createRequest({
        type: InteractionType.PING,
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ type: InteractionResponseType.PONG });
    });
  });

  describe("signature verification", () => {
    it("should return 401 for invalid signature", async () => {
      mockVerifyDiscordSignature.mockResolvedValue(false);

      const request = createRequest({
        type: InteractionType.PING,
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("should skip verification if DISCORD_PUBLIC_KEY is not set", async () => {
      const request = createRequest({ type: InteractionType.PING });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "",
        DISCORD_COMMAND_NAME: "herta",
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ type: InteractionResponseType.PONG });
      expect(mockVerifyDiscordSignature).not.toHaveBeenCalled();
    });
  });

  describe("version command", () => {
    it("should return VERSION for version subcommand", async () => {
      const request = createRequest({
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: "herta",
          options: [
            {
              type: ApplicationCommandOptionType.SUB_COMMAND,
              name: "version",
            },
          ],
        },
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
      });
      const json = (await res.json()) as {
        type: number;
        data: { content: string };
      };

      expect(res.status).toBe(200);
      expect(json.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      );
      expect(json.data.content).toBe(`Bot Version: ${VERSION}`);
    });
  });

  describe("bill aws command", () => {
    it("should return AWS cost for bill aws subcommand", async () => {
      mockGetAwsMonthlyCost.mockResolvedValue({
        total: "123.45",
        currency: "USD",
        services: [{ name: "EC2", amount: "100.00" }],
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      const request = createRequest({
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: "herta",
          options: [
            {
              type: ApplicationCommandOptionType.SUB_COMMAND,
              name: "bill",
              options: [
                {
                  type: 3,
                  name: "service",
                  value: "aws",
                },
              ],
            },
          ],
        },
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
        AWS_ACCESS_KEY_ID: "test-access-key",
        AWS_SECRET_ACCESS_KEY: "test-secret-key",
      });
      const json = (await res.json()) as { type: number; data: object };

      expect(res.status).toBe(200);
      expect(json.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      );
      expect(mockGetAwsMonthlyCost).toHaveBeenCalledWith({
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
      });
    });

    it("should return error when AWS credentials are not configured", async () => {
      const request = createRequest({
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: "herta",
          options: [
            {
              type: ApplicationCommandOptionType.SUB_COMMAND,
              name: "bill",
              options: [
                {
                  type: 3,
                  name: "service",
                  value: "aws",
                },
              ],
            },
          ],
        },
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
        AWS_ACCESS_KEY_ID: "",
        AWS_SECRET_ACCESS_KEY: "",
      });
      const json = (await res.json()) as {
        type: number;
        data: { content: string };
      };

      expect(res.status).toBe(200);
      expect(json.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      );
      expect(json.data.content).toContain("AWS認証情報が設定されていません");
    });

    it("should handle AWS API errors gracefully", async () => {
      mockGetAwsMonthlyCost.mockRejectedValue(new Error("AWS API Error"));

      const request = createRequest({
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: "herta",
          options: [
            {
              type: ApplicationCommandOptionType.SUB_COMMAND,
              name: "bill",
              options: [
                {
                  type: 3,
                  name: "service",
                  value: "aws",
                },
              ],
            },
          ],
        },
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
        AWS_ACCESS_KEY_ID: "test-access-key",
        AWS_SECRET_ACCESS_KEY: "test-secret-key",
      });
      const json = (await res.json()) as {
        type: number;
        data: { content: string };
      };

      expect(res.status).toBe(200);
      expect(json.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      );
      expect(json.data.content).toContain("AWS API Error");
    });
  });

  describe("error handling", () => {
    it("should return error when DISCORD_COMMAND_NAME is not configured", async () => {
      const request = createRequest({
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: "herta",
          options: [
            {
              type: ApplicationCommandOptionType.SUB_COMMAND,
              name: "version",
            },
          ],
        },
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "",
      });
      const json = (await res.json()) as {
        type: number;
        data: { content: string };
      };

      expect(res.status).toBe(200);
      expect(json.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      );
      expect(json.data.content).toContain("コマンド名が設定されていません");
    });

    it("should return error for unknown command", async () => {
      const request = createRequest({
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: "herta",
          options: [
            {
              type: ApplicationCommandOptionType.SUB_COMMAND,
              name: "unknown",
            },
          ],
        },
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
      });
      const json = (await res.json()) as {
        type: number;
        data: { content: string };
      };

      expect(res.status).toBe(200);
      expect(json.type).toBe(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      );
      expect(json.data.content).toContain("不明なコマンドです");
    });
  });

  describe("invalid request handling", () => {
    it("should return 400 for unhandled interaction type", async () => {
      const request = createRequest({
        type: 999,
      });

      const res = await fetchWithEnv(request, {
        DISCORD_PUBLIC_KEY: "test-public-key",
        DISCORD_COMMAND_NAME: "herta",
      });
      const json = (await res.json()) as {
        error: string;
        receivedType: number;
      };

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid request");
      expect(json.receivedType).toBe(999);
    });
  });
});
