import { Hono } from "hono";
import health from "./api/health";
import interaction from "./interaction";
import { sendServiceCostSummaryToDiscord } from "./scheduled/sendServiceCostSummaryToDiscord";
import type { Env } from "./type";

const app = new Hono<{ Bindings: Env }>();
app.route("/interaction", interaction);

const api = new Hono<{ Bindings: Env }>();
api.route("/health", health);

app.route("/api", api);

const scheduled: ExportedHandlerScheduledHandler<Env> = async (
  event,
  env,
  ctx,
) => {
  switch (event.cron) {
    case "0 1 * * *":
      ctx.waitUntil(sendServiceCostSummaryToDiscord(env));
      break;
    default:
      break;
  }
};

export default {
  fetch: app.fetch,
  scheduled,
};
