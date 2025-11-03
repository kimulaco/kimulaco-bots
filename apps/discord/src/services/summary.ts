import type { AwsCostResult } from "@packages/aws";
import { formatCurrency } from "../utils/formatCurrency";

export interface SummaryService {
  name: string;
  amount: string;
}

export interface SummaryMessage {
  title: string;
  total: string;
  currency: string;
  updatedAt: string;
  services: SummaryService[];
}

export function generateAwsConstSummary(
  awsCostResult: AwsCostResult,
  referenceDate?: Date,
): SummaryMessage {
  const now = referenceDate ?? new Date();
  const updatedAt = now.toISOString();
  const periodDate = new Date(awsCostResult.period.start);
  const year = periodDate.getFullYear();
  const month = periodDate.getMonth() + 1;
  const periodLabel = `${year}年${month}月`;
  const topServices = awsCostResult.services.slice(0, 5);
  const otherAmount =
    awsCostResult.total -
    topServices.reduce((sum, service) => sum + service.amount, 0);

  const services = topServices.map((service) => ({
    name: service.name,
    amount: formatCurrency(service.amount, awsCostResult.currency),
  }));

  if (otherAmount > 0) {
    services.push({
      name: "Others",
      amount: formatCurrency(otherAmount, awsCostResult.currency),
    });
  }

  return {
    title: `AWS 利用料金サマリー (${periodLabel})`,
    total: formatCurrency(awsCostResult.total, awsCostResult.currency),
    currency: awsCostResult.currency,
    updatedAt,
    services,
  };
}
