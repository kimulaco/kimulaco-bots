import type { SummaryMessage } from "./summary";
import {
  sendDiscordMessage,
  InteractionResponseType,
  type SendDiscordMessageOptions,
  type DiscordInteractionResponse,
} from "@packages/discord";

export function formatDescription(summary: SummaryMessage): string {
  const serviceList = summary.services
    .map((service) => `- ${service.name}: ${service.amount}`)
    .join("\n");

  return [
    `💰 現在の利用額: ${summary.total} ${summary.currency}`,
    `🕒 更新日: ${new Date(summary.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    "",
    "📁 主なサービス:",
    serviceList,
  ].join("\n");
}

export function formatDiscordMessage(
  summary: SummaryMessage,
): DiscordInteractionResponse {
  const description = formatDescription(summary);
  const timestamp = new Date(summary.updatedAt).toISOString();

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: summary.title,
          description,
          color: 0x3498db,
          timestamp: timestamp,
        },
      ],
    },
  };
}

export function formatErrorMessage(
  message: string,
): DiscordInteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `❌ エラー: ${message}`,
    },
  };
}

export async function sendSummaryDiscordMessage(
  botToken: string,
  channelId: string,
  summary: SummaryMessage,
  options?: SendDiscordMessageOptions,
): Promise<void> {
  const description = formatDescription(summary);
  const timestamp = new Date(summary.updatedAt).toISOString();
  const embed = {
    title: summary.title,
    description,
    color: 0x3498db,
    timestamp: timestamp,
  };

  await sendDiscordMessage(
    botToken,
    channelId,
    {
      embeds: [embed],
    },
    options,
  );
}
