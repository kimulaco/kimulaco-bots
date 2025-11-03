import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";
import type { AwsConfig } from "../config";
import { formatDate } from "./utils/formatDate";

const DEFAULT_REGION = "us-east-1";

export interface AwsCostService {
  name: string;
  amount: number;
}

export interface AwsCostResult {
  total: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  services: AwsCostService[];
}

export interface GetAwsMonthlyCostOptions {
  referenceDate?: Date;
  client?: CostExplorerClient;
}

export async function getAwsMonthlyCost(
  config: AwsConfig,
  options?: GetAwsMonthlyCostOptions,
): Promise<AwsCostResult> {
  const client =
    options?.client ??
    new CostExplorerClient({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: DEFAULT_REGION,
    });

  const now = options?.referenceDate ?? new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDate = formatDate(startOfMonth);
  const endDate = formatDate(endOfMonth);

  try {
    const serviceCommand = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
      GroupBy: [
        {
          Type: "DIMENSION",
          Key: "SERVICE",
        },
      ],
    });

    const serviceResponse = await client.send(serviceCommand);

    const totalCommand = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
    });

    const totalResponse = await client.send(totalCommand);

    const totalAmount =
      parseFloat(
        totalResponse.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || "0",
      ) || 0;
    const currency =
      totalResponse.ResultsByTime?.[0]?.Total?.UnblendedCost?.Unit || "";

    const services =
      serviceResponse.ResultsByTime?.[0]?.Groups?.map((group) => ({
        name: group.Keys?.[0] || "Unknown",
        amount: parseFloat(group.Metrics?.UnblendedCost?.Amount || "0") || 0,
      }))
        .filter((service) => service.amount > 0)
        .sort((a, b) => b.amount - a.amount) || [];

    return {
      total: totalAmount,
      currency,
      period: {
        start: startDate,
        end: endDate,
      },
      services,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch AWS cost data: ${message}`);
  }
}
