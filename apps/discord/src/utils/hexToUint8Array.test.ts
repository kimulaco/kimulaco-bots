import { describe, it, expect } from "vitest";
import { hexToUint8Array } from "./hexToUint8Array";

describe("hexToUint8Array()", () => {
  it("should convert a hex string to a Uint8Array", () => {
    const hex = "48656c6c6f";
    const result = hexToUint8Array(hex);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
    expect(Array.from(result)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  });

  it("should handle an empty string", () => {
    const result = hexToUint8Array("");

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });

  it("should handle an odd length hex string", () => {
    const hex = "123";
    const result = hexToUint8Array(hex);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(2);
    expect(Array.from(result)).toEqual([0x12, 0x3]);
  });

  it("should handle a complete hex string", () => {
    const hex = "0123456789abcdef";
    const result = hexToUint8Array(hex);

    expect(result.length).toBe(8);
    expect(Array.from(result)).toEqual([
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    ]);
  });

  it("should handle a mixed case hex string", () => {
    const hex = "AaBbCc";
    const result = hexToUint8Array(hex);

    expect(result.length).toBe(3);
    expect(Array.from(result)).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it("should handle a 64 character (32 byte) hex string", () => {
    const hex = "a".repeat(64);
    const result = hexToUint8Array(hex);

    expect(result.length).toBe(32);
    expect(result.every((byte) => byte === 0xaa)).toBe(true);
  });

  it("should handle a 128 character (64 byte) hex string", () => {
    const hex = "b".repeat(128);
    const result = hexToUint8Array(hex);

    expect(result.length).toBe(64);
    expect(result.every((byte) => byte === 0xbb)).toBe(true);
  });
});
