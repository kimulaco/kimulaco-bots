import { describe, it, expect } from "vitest";
import type { AwsCostResult } from "@packages/aws";
import { generateAwsConstSummary } from "./summary";

describe("generateAwsConstSummary()", () => {
  const mockCostData: AwsCostResult = {
    total: 215.75,
    currency: "USD",
    period: {
      start: "2024-06-01",
      end: "2024-06-30",
    },
    services: [
      { name: "AmazonEC2", amount: 100.5 },
      { name: "AmazonS3", amount: 50.25 },
      { name: "AmazonRDS", amount: 30.0 },
      { name: "AmazonLambda", amount: 20.0 },
      { name: "AmazonCloudFront", amount: 10.0 },
      { name: "AmazonRoute53", amount: 5.0 },
    ],
  };

  it("should generate a summary message by AwsCostResult", () => {
    const result = generateAwsConstSummary(mockCostData);

    expect(result.title).toBe("AWS 利用料金サマリー (2024年6月)");
    expect(result.total).toBe("$215.75");
    expect(result.currency).toBe("USD");
    expect(result.services).toHaveLength(6);
  });

  it("should display the top 5 services and Others", () => {
    const result = generateAwsConstSummary(mockCostData);

    expect(result.services.slice(0, 5)).toEqual([
      { name: "AmazonEC2", amount: "$100.50" },
      { name: "AmazonS3", amount: "$50.25" },
      { name: "AmazonRDS", amount: "$30.00" },
      { name: "AmazonLambda", amount: "$20.00" },
      { name: "AmazonCloudFront", amount: "$10.00" },
    ]);
    expect(result.services[5].name).toBe("Others");
    expect(result.services[5].amount).toBe("$5.00");
  });

  it("should not add Others if the number of services is less than 5", () => {
    const smallCostData: AwsCostResult = {
      ...mockCostData,
      total: 150.0,
      services: [
        { name: "AmazonEC2", amount: 100.0 },
        { name: "AmazonS3", amount: 50.0 },
      ],
    };
    const result = generateAwsConstSummary(smallCostData);

    expect(result.services).toHaveLength(2);
    expect(result.services.find((s) => s.name === "Others")).toBeUndefined();
  });

  it("should not add Others if the number of services is exactly 5", () => {
    const exactFiveCostData: AwsCostResult = {
      ...mockCostData,
      total: 210.0,
      services: [
        { name: "AmazonEC2", amount: 100.0 },
        { name: "AmazonS3", amount: 50.0 },
        { name: "AmazonRDS", amount: 30.0 },
        { name: "AmazonLambda", amount: 20.0 },
        { name: "AmazonCloudFront", amount: 10.0 },
      ],
    };
    const result = generateAwsConstSummary(exactFiveCostData);

    expect(result.services).toHaveLength(5);
    expect(result.services.find((s) => s.name === "Others")).toBeUndefined();
  });

  it("should format the currency correctly if the currency is JPY", () => {
    const jpyCostData: AwsCostResult = {
      ...mockCostData,
      currency: "JPY",
      total: 15000,
      services: [{ name: "AmazonEC2", amount: 10000 }],
    };

    const result = generateAwsConstSummary(jpyCostData);

    expect(result.currency).toBe("JPY");
    expect(result.total).toBe("¥15,000.00");
    expect(result.services[0].amount).toBe("¥10,000.00");
  });

  it("should set the updatedAt using the specified date", () => {
    const referenceDate = new Date("2024-06-15T12:00:00Z");
    const result = generateAwsConstSummary(mockCostData, referenceDate);

    expect(result.updatedAt).toBe(referenceDate.toISOString());
  });

  it("should use the current date if no date is specified", () => {
    const before = new Date();
    const result = generateAwsConstSummary(mockCostData);
    const after = new Date();

    const updatedAt = new Date(result.updatedAt);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("should correctly handle zero amount", () => {
    const zeroCostData: AwsCostResult = {
      total: 0,
      currency: "USD",
      period: {
        start: "2024-06-01",
        end: "2024-06-30",
      },
      services: [],
    };

    const result = generateAwsConstSummary(zeroCostData);

    expect(result.total).toBe("$0.00");
    expect(result.services).toHaveLength(0);
  });

  it("should display the month correctly", () => {
    const januaryData: AwsCostResult = {
      ...mockCostData,
      period: {
        start: "2024-01-01",
        end: "2024-01-31",
      },
    };

    const result = generateAwsConstSummary(januaryData);

    expect(result.title).toBe("AWS 利用料金サマリー (2024年1月)");
  });

  it("should display the month correctly for December", () => {
    const decemberData: AwsCostResult = {
      ...mockCostData,
      period: {
        start: "2024-12-01",
        end: "2024-12-31",
      },
    };

    const result = generateAwsConstSummary(decemberData);

    expect(result.title).toBe("AWS 利用料金サマリー (2024年12月)");
  });
});
