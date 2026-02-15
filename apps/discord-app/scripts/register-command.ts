/**
 * DISCORD_TOKEN=xxx CLIENT_ID=xxx DISCORD_COMMAND_NAME=xxx [GUILD_ID=xxx] pnpm tsx scripts/register-command.ts
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

async function registerCommand() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const commandName = process.env.DISCORD_COMMAND_NAME;

  if (!token || !clientId || !commandName) {
    console.error(
      "Error: DISCORD_TOKEN、CLIENT_ID、DISCORD_COMMAND_NAME 環境変数が必要です。",
    );
    console.error(
      "使用方法: DISCORD_TOKEN=xxx CLIENT_ID=xxx DISCORD_COMMAND_NAME=xxx [GUILD_ID=xxx] pnpm tsx scripts/register-command.ts",
    );
    process.exit(1);
  }

  const command: Command = {
    name: commandName,
    description: "Discord Bot",
    options: [
      {
        type: 1,
        name: "bill",
        description: "サービスの月額利用料金を取得します",
        options: [
          {
            type: 3,
            name: "service",
            description: "サービスを選択してください",
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
      {
        type: 1,
        name: "version",
        description: "Botのバージョンを表示します",
      },
    ],
  };

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
