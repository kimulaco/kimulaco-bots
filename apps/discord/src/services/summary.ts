import type { AwsCostResult } from "@packages/aws";

export interface SummaryMessage {
  title: string;
  total: string;
  currency: string;
  updatedAt: string;
  services: Array<{ name: string; amount: string }>;
}

export function generateAwsSummary(costData: AwsCostResult): SummaryMessage {
  const now = new Date();
  const updatedAt = now.toISOString();
  const periodDate = new Date(costData.period.start);
  const year = periodDate.getFullYear();
  const month = periodDate.getMonth() + 1;
  const periodLabel = `${year}年${month}月`;
  const topServices = costData.services.slice(0, 5);
  const otherAmount =
    costData.total -
    topServices.reduce((sum, service) => sum + service.amount, 0);

  const services = topServices.map((service) => ({
    name: service.name,
    amount: formatCurrency(service.amount, costData.currency),
  }));

  if (otherAmount > 0) {
    services.push({
      name: "Others",
      amount: formatCurrency(otherAmount, costData.currency),
    });
  }

  return {
    title: `AWS 利用料金サマリー (${periodLabel})`,
    total: formatCurrency(costData.total, costData.currency),
    currency: costData.currency,
    updatedAt,
    services,
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
