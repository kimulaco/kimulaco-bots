/**
 * DISCORD_TOKEN=xxx CLIENT_ID=xxx [GUILD_ID=xxx] pnpm tsx scripts/register-command.ts
 */

interface Command {
  name: string;
  description: string;
  options?: {
    type: number;
    name: string;
    description: string;
    required?: boolean;
    choices?: {
      name: string;
      value: string;
    }[];
    options?: {
      type: number;
      name: string;
      description: string;
      required?: boolean;
      choices?: {
        name: string;
        value: string;
      }[];
    }[];
  }[];
}

const command: Command = {
  name: "herta-dev",
  description: "Herta開発用のコマンド",
  options: [
    {
      type: 1,
      name: "bill",
      description: "クラウドサービスの月額利用料金を取得します",
      options: [
        {
          type: 3,
          name: "service",
          description: "クラウドサービスを選択してください",
          required: true,
          choices: [
            {
              name: "AWS",
              value: "aws",
            },
            // {
            //   name: 'Google Cloud',
            //   value: 'gcp',
            // },
            // {
            //   name: 'Cloudflare',
            //   value: 'cf',
            // },
          ],
        },
      ],
    },
  ],
};

async function registerCommand() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.error("Error: DISCORD_TOKEN と CLIENT_ID 環境変数が必要です。");
    console.error(
      "使用方法: DISCORD_TOKEN=xxx CLIENT_ID=xxx [GUILD_ID=xxx] pnpm tsx scripts/register-command.ts",
    );
    process.exit(1);
  }

  const url = guildId
    ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${clientId}/commands`;

  console.log(`Registering command to: ${url}`);
  console.log("Command:", JSON.stringify(command, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to register command:");
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error("Response:", errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log("Successfully registered command!");
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error registering command:", error);
    process.exit(1);
  }
}

registerCommand();
