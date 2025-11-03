import { describe, it, expect, vi, beforeEach } from "vitest";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { getAwsMonthlyCost } from "./";
import type { AwsConfig } from "../config";

describe("getAwsMonthlyCost()", () => {
  const mockConfig: AwsConfig = {
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch monthly cost data correctly", async () => {
    const mockClient = {
      send: vi.fn(),
    } as unknown as CostExplorerClient;

    const mockServiceResponse = {
      ResultsByTime: [
        {
          Groups: [
            {
              Keys: ["AmazonEC2"],
              Metrics: {
                UnblendedCost: {
                  Amount: "100.50",
                  Unit: "USD",
                },
              },
            },
            {
              Keys: ["AmazonS3"],
              Metrics: {
                UnblendedCost: {
                  Amount: "50.25",
                  Unit: "USD",
                },
              },
            },
          ],
        },
      ],
    };

    const mockTotalResponse = {
      ResultsByTime: [
        {
          Total: {
            UnblendedCost: {
              Amount: "150.75",
              Unit: "USD",
            },
          },
        },
      ],
    };

    mockClient.send = vi
      .fn()
      .mockResolvedValueOnce(mockServiceResponse)
      .mockResolvedValueOnce(mockTotalResponse);

    const referenceDate = new Date(2024, 5, 15);
    const result = await getAwsMonthlyCost(mockConfig, {
      referenceDate,
      client: mockClient,
    });

    expect(result.total).toBe(150.75);
    expect(result.currency).toBe("USD");
    expect(result.period.start).toBe("2024-06-01");
    expect(result.period.end).toBe("2024-06-30");
    expect(result.services).toHaveLength(2);
    expect(result.services[0].name).toBe("AmazonEC2");
    expect(result.services[0].amount).toBe(100.5);
    expect(result.services[1].name).toBe("AmazonS3");
    expect(result.services[1].amount).toBe(50.25);
  });

  it("should sort services by amount in descending order", async () => {
    const mockClient = {
      send: vi.fn(),
    } as unknown as CostExplorerClient;

    const mockServiceResponse = {
      ResultsByTime: [
        {
          Groups: [
            {
              Keys: ["AmazonEC2"],
              Metrics: {
                UnblendedCost: {
                  Amount: "50.00",
                  Unit: "USD",
                },
              },
            },
            {
              Keys: ["AmazonS3"],
              Metrics: {
                UnblendedCost: {
                  Amount: "100.00",
                  Unit: "USD",
                },
              },
            },
          ],
        },
      ],
    };

    const mockTotalResponse = {
      ResultsByTime: [
        {
          Total: {
            UnblendedCost: {
              Amount: "150.00",
              Unit: "USD",
            },
          },
        },
      ],
    };

    mockClient.send = vi
      .fn()
      .mockResolvedValueOnce(mockServiceResponse)
      .mockResolvedValueOnce(mockTotalResponse);

    const result = await getAwsMonthlyCost(mockConfig, {
      client: mockClient,
    });

    expect(result.services[0].name).toBe("AmazonS3");
    expect(result.services[0].amount).toBe(100);
    expect(result.services[1].name).toBe("AmazonEC2");
    expect(result.services[1].amount).toBe(50);
  });

  it("should exclude services with 0 amount", async () => {
    const mockClient = {
      send: vi.fn(),
    } as unknown as CostExplorerClient;

    const mockServiceResponse = {
      ResultsByTime: [
        {
          Groups: [
            {
              Keys: ["AmazonEC2"],
              Metrics: {
                UnblendedCost: {
                  Amount: "100.00",
                  Unit: "USD",
                },
              },
            },
            {
              Keys: ["AmazonS3"],
              Metrics: {
                UnblendedCost: {
                  Amount: "0.00",
                  Unit: "USD",
                },
              },
            },
          ],
        },
      ],
    };

    const mockTotalResponse = {
      ResultsByTime: [
        {
          Total: {
            UnblendedCost: {
              Amount: "100.00",
              Unit: "USD",
            },
          },
        },
      ],
    };

    mockClient.send = vi
      .fn()
      .mockResolvedValueOnce(mockServiceResponse)
      .mockResolvedValueOnce(mockTotalResponse);

    const result = await getAwsMonthlyCost(mockConfig, {
      client: mockClient,
    });

    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe("AmazonEC2");
  });

  it("should handle errors correctly", async () => {
    const mockClient = {
      send: vi.fn(),
    } as unknown as CostExplorerClient;

    mockClient.send = vi.fn().mockRejectedValue(new Error("AWS API error"));

    await expect(
      getAwsMonthlyCost(mockConfig, {
        client: mockClient,
      }),
    ).rejects.toThrow("Failed to fetch AWS cost data: AWS API error");
  });
});
