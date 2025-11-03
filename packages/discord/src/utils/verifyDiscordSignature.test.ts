import { describe, it, expect, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import { verifyDiscordSignature } from "./verifyDiscordSignature";
import { DISCORD_HEADERS } from "../constants/verify";
import * as hexToUint8ArrayModule from "./hexToUint8Array";

const TEST_BASE_URL = "https://test.invalid";

describe("verifyDiscordSignature()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify a valid signature", async () => {
    const timestamp = "1234567890";
    const body = '{"type":1}';
    const message = timestamp + body;
    const messageBytes = new TextEncoder().encode(message);
    const keyPair = nacl.sign.keyPair();
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
    const signature = Array.from(signatureBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: timestamp,
      },
      body,
    });

    const isValid = await verifyDiscordSignature(
      request,
      Array.from(keyPair.publicKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );

    expect(isValid).toBe(true);
  });

  it("should return true for an empty body", async () => {
    const timestamp = "1234567890";
    const body = "";

    const message = timestamp + body;
    const messageBytes = new TextEncoder().encode(message);
    const keyPair = nacl.sign.keyPair();
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
    const signature = Array.from(signatureBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: timestamp,
      },
      body,
    });

    const isValid = await verifyDiscordSignature(
      request,
      Array.from(keyPair.publicKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );

    expect(isValid).toBe(true);
  });

  it("should return false for an invalid signature", async () => {
    const publicKey = "a".repeat(64);
    const timestamp = "1234567890";
    const body = '{"type":1}';
    const invalidSignature = "b".repeat(128);

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: invalidSignature,
        [DISCORD_HEADERS.TIMESTAMP]: timestamp,
      },
      body,
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false for an undefined public key", async () => {
    const request = new Request(TEST_BASE_URL, {
      method: "POST",
    });

    const isValid = await verifyDiscordSignature(request, undefined);

    expect(isValid).toBe(false);
  });

  it("should return false for an empty public key", async () => {
    const request = new Request(TEST_BASE_URL, {
      method: "POST",
    });

    const isValid = await verifyDiscordSignature(request, "");

    expect(isValid).toBe(false);
  });

  it("should return false for an invalid public key", async () => {
    const request = new Request(TEST_BASE_URL, {
      method: "POST",
    });

    const isValid = await verifyDiscordSignature(request, "invalid");

    expect(isValid).toBe(false);
  });

  it("should return false for a missing signature header", async () => {
    const publicKey = "a".repeat(64);
    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false for a missing timestamp header", async () => {
    const publicKey = "a".repeat(64);
    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: "a".repeat(128),
      },
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false for an invalid signature length", async () => {
    const publicKey = "a".repeat(64);
    const invalidSignature = "a".repeat(64);

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: invalidSignature,
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false for an invalid public key length", async () => {
    const invalidPublicKey = "a".repeat(32);

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: "a".repeat(128),
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    const isValid = await verifyDiscordSignature(request, invalidPublicKey);

    expect(isValid).toBe(false);
  });

  it("should return false for an error", async () => {
    const publicKey = "a".repeat(64);

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: "invalid".repeat(20),
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false when signature bytes length is not 64", async () => {
    const publicKey = "a".repeat(64);
    const signature = "a".repeat(128);

    vi.spyOn(hexToUint8ArrayModule, "hexToUint8Array")
      .mockReturnValueOnce(new Uint8Array(63))
      .mockReturnValueOnce(new Uint8Array(32));

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false when public key bytes length is not 32", async () => {
    const publicKey = "a".repeat(64);
    const signature = "a".repeat(128);

    vi.spyOn(hexToUint8ArrayModule, "hexToUint8Array")
      .mockReturnValueOnce(new Uint8Array(64))
      .mockReturnValueOnce(new Uint8Array(31));

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false when request clone fails", async () => {
    const publicKey = "a".repeat(64);
    const signature = "a".repeat(128);

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    vi.spyOn(request, "clone").mockImplementation(() => {
      throw new Error("Clone failed");
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });

  it("should return false when text() call fails", async () => {
    const publicKey = "a".repeat(64);
    const signature = "a".repeat(128);

    const originalRequest = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    const clonedRequest = originalRequest.clone();
    vi.spyOn(clonedRequest, "text").mockRejectedValue(
      new Error("Text reading failed"),
    );

    vi.spyOn(originalRequest, "clone").mockReturnValue(
      clonedRequest as unknown as Request,
    );

    const isValid = await verifyDiscordSignature(originalRequest, publicKey);

    expect(isValid).toBe(false);
  });

  it("should handle non-Error exceptions in catch block", async () => {
    const publicKey = "a".repeat(64);
    const signature = "a".repeat(128);

    const request = new Request(TEST_BASE_URL, {
      method: "POST",
      headers: {
        [DISCORD_HEADERS.SIGNATURE]: signature,
        [DISCORD_HEADERS.TIMESTAMP]: "1234567890",
      },
      body: '{"type":1}',
    });

    vi.spyOn(request, "clone").mockImplementation(() => {
      throw "String error";
    });

    const isValid = await verifyDiscordSignature(request, publicKey);

    expect(isValid).toBe(false);
  });
});
