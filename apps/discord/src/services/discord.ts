import type { SummaryMessage } from './summary';

export interface DiscordInteractionResponse {
  type: number;
  data?: {
    content?: string;
    embeds?: Array<{
      title?: string;
      description?: string;
      color?: number;
      fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
      }>;
      timestamp?: string;
      footer?: {
        text?: string;
      };
    }>;
  };
}

function formatDescription(summary: SummaryMessage): string {
  const serviceList = summary.services
    .map((service) => `- ${service.name}: ${service.amount}`)
    .join('\n');

  return [
    `💰 現在の利用額: ${summary.total} ${summary.currency}`,
    `🕒 更新日: ${new Date(summary.updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
    '',
    '📁 主なサービス:',
    serviceList,
  ].join('\n');
}

export function formatDiscordMessage(summary: SummaryMessage): DiscordInteractionResponse {
  const description = formatDescription(summary);
  const timestamp = new Date(summary.updatedAt).toISOString();

  return {
    type: 4,
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

export function formatErrorMessage(message: string): DiscordInteractionResponse {
  return {
    type: 4,
    data: {
      content: `❌ エラー: ${message}`,
    },
  };
}

export async function sendDiscordMessage(
  botToken: string,
  channelId: string,
  summary: SummaryMessage
): Promise<void> {
  const description = formatDescription(summary);
  const timestamp = new Date(summary.updatedAt).toISOString();

  const embed = {
    title: summary.title,
    description,
    color: 0x3498db,
    timestamp: timestamp,
  };

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    const errorText = responseText;
    let errorMessage = `Failed to send Discord message: ${response.status} ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage += ` - ${errorData.message || errorText}`;

      if (response.status === 403 && errorData.code === 50001) {
        errorMessage += '\n\nトラブルシューティング:\n';
        errorMessage += '1. Botがサーバーに追加されているか確認してください\n';
        errorMessage += '2. Botがチャンネルにアクセスする権限があるか確認してください\n';
        errorMessage += '3. Bot Tokenが正しいか確認してください\n';
        errorMessage += '4. Channel IDが正しいか確認してください';
      } else if (response.status === 404) {
        errorMessage += '\n\nトラブルシューティング:\n';
        errorMessage += '1. Channel IDが正しいか確認してください\n';
        errorMessage += '2. Botがチャンネルにアクセスできるか確認してください';
      }
    } catch {
      errorMessage += ` - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  try {
    const messageData = JSON.parse(responseText) as {
      id: string;
      channel_id: string;
      timestamp: string;
    };
    console.log('Discord message sent successfully', {
      messageId: messageData.id,
      channelId: messageData.channel_id,
      timestamp: messageData.timestamp,
    });
  } catch {
    console.log('Discord message sent (response parsing failed)');
  }
}
