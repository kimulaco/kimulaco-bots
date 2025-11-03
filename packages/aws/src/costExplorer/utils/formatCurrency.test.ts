import { describe, it, expect } from "vitest";
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency()", () => {
  it("should format USD currency", () => {
    expect(formatCurrency(100, "USD")).toBe("$100.00");
    expect(formatCurrency(150.75, "USD")).toBe("$150.75");
    expect(formatCurrency(0.99, "USD")).toBe("$0.99");
  });

  it("should format JPY currency", () => {
    expect(formatCurrency(1000, "JPY")).toBe("¥1,000.00");
    expect(formatCurrency(15000, "JPY")).toBe("¥15,000.00");
    expect(formatCurrency(1234567, "JPY")).toBe("¥1,234,567.00");
  });

  it("should format EUR currency", () => {
    expect(formatCurrency(100, "EUR")).toBe("€100.00");
    expect(formatCurrency(150.75, "EUR")).toBe("€150.75");
  });

  it("should format GBP currency", () => {
    expect(formatCurrency(100, "GBP")).toBe("£100.00");
    expect(formatCurrency(150.75, "GBP")).toBe("£150.75");
  });

  it("should format zero amount", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
    expect(formatCurrency(0, "JPY")).toBe("¥0.00");
    expect(formatCurrency(0, "EUR")).toBe("€0.00");
  });

  it("should always show 2 decimal places", () => {
    expect(formatCurrency(100, "USD")).toBe("$100.00");
    expect(formatCurrency(100.5, "USD")).toBe("$100.50");
    expect(formatCurrency(100.1, "USD")).toBe("$100.10");
    expect(formatCurrency(100.9, "USD")).toBe("$100.90");
  });

  it("should round to 2 decimal places", () => {
    expect(formatCurrency(100.994, "USD")).toBe("$100.99");
    expect(formatCurrency(100.995, "USD")).toBe("$101.00"); // Standard rounding (round half to even)
    expect(formatCurrency(100.996, "USD")).toBe("$101.00");
    expect(formatCurrency(100.993, "USD")).toBe("$100.99");
  });

  it("should handle large numbers with thousands separators", () => {
    expect(formatCurrency(1000, "USD")).toBe("$1,000.00");
    expect(formatCurrency(1000000, "USD")).toBe("$1,000,000.00");
    expect(formatCurrency(1234567.89, "USD")).toBe("$1,234,567.89");
  });

  it("should handle negative amounts", () => {
    expect(formatCurrency(-100, "USD")).toBe("-$100.00");
    expect(formatCurrency(-150.75, "USD")).toBe("-$150.75");
    expect(formatCurrency(-0.99, "USD")).toBe("-$0.99");
  });

  it("should handle very small amounts", () => {
    expect(formatCurrency(0.01, "USD")).toBe("$0.01");
    expect(formatCurrency(0.1, "USD")).toBe("$0.10");
  });

  it("should format with different locale formatting (en-US)", () => {
    // en-US locale uses comma for thousands separator and period for decimal
    const result = formatCurrency(1234.56, "USD");
    expect(result).toContain("1,234");
    expect(result).toContain("234.56");
  });
});
