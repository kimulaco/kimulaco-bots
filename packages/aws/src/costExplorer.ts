import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";
import type { AwsConfig } from "./config";

const DEFAULT_REGION = "us-east-1";

export interface AwsCostResult {
  total: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  services: Array<{
    name: string;
    amount: number;
  }>;
}

export async function getAwsMonthlyCost(
  config: AwsConfig,
): Promise<AwsCostResult> {
  const client = new CostExplorerClient({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    region: DEFAULT_REGION,
  });

  const now = new Date();
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
      totalResponse.ResultsByTime?.[0]?.Total?.UnblendedCost?.Unit || "USD";

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

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
