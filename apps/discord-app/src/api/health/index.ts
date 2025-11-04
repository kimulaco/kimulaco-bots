import { Hono } from "hono";
import { getHealthInfo } from "../../services/health";
import type { Env } from "../../type";

const api = new Hono<{ Bindings: Env }>();

api.get("/", async (c) => {
  const env = c.env;

  if (!env.BILL_API_PRIVATE_KEY) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  const apiPrivateKey = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!apiPrivateKey || apiPrivateKey !== env.BILL_API_PRIVATE_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const healthInfo = await getHealthInfo(c);
  return c.json(healthInfo, healthInfo.code);
});

export default api;
