import { describe, it, expect } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate()", () => {
  it("should return the formatted date string", () => {
    const date = new Date(2024, 0, 15);
    expect(formatDate(date)).toBe("2024-01-15");
  });

  it("should pad the month and day with 0", () => {
    const date = new Date(2024, 0, 5);
    expect(formatDate(date)).toBe("2024-01-05");
  });

  it("should handle December 31st", () => {
    const date = new Date(2024, 11, 31);
    expect(formatDate(date)).toBe("2024-12-31");
  });
});
