import type { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeConfig } from "../src/core/codec.js";
import { clientIp, RateLimited, saveBouquet, storeFromEnv, type Store } from "../src/server/store.js";

export function createShortHandler(getStore: () => Store | null) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const store = getStore();
    if (!store) return res.status(404).json({ error: "short links are not set up" });
    const body = typeof req.body === "string" ? safeJson(req.body) : req.body;
    const code = typeof body?.code === "string" ? body.code : "";
    if (code.length > 2000 || !decodeConfig(code)) return res.status(400).json({ error: "invalid bouquet" });
    try {
      const id = await saveBouquet(store, code, clientIp(req.headers));
      return res.status(201).json({ id });
    } catch (e) {
      if (e instanceof RateLimited) return res.status(429).json({ error: "too many bouquets, try again later" });
      return res.status(503).json({ error: "store unavailable" });
    }
  };
}

function safeJson(s: string): { code?: unknown } | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default createShortHandler(() => storeFromEnv(process.env));
