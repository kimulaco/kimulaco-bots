import { Hono } from "hono";
import { cors } from "hono/cors";
import command from "./routes/command";
import cron from "./routes/cron";

export interface Env {
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_CRON_CHANNEL_ID?: string;
  DISCORD_COMMAND_NAME?: string;

  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;

  BILL_API_PRIVATE_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.route("/", command);
app.route("/", cron);

export default app;
