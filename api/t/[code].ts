import type { VercelRequest, VercelResponse } from "@vercel/node";
import { streamFrames } from "../../src/core/ansi.js";
import { decodeConfig } from "../../src/core/codec.js";
import { loadBouquet, storeFromEnv, type Store } from "../../src/server/store.js";

export const config = { maxDuration: 30 };

const FPS = 15;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? Math.min(max, Math.max(min, n)) : fallback;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SHORT_ID = /^[A-Za-z0-9]{6,10}$/;

export function createTerminalHandler(getStore: () => Store | null) {
  return (req: VercelRequest, res: VercelResponse) => handle(req, res, getStore);
}

export default createTerminalHandler(() => storeFromEnv(process.env));

async function handle(req: VercelRequest, res: VercelResponse, getStore: () => Store | null) {
  const raw = one(req.query.code);
  const isShort = SHORT_ID.test(raw);
  const store = isShort ? getStore() : null;
  const code = isShort ? ((store && (await loadBouquet(store, raw).catch(() => null))) ?? "") : raw;
  const host = one(req.headers["x-forwarded-host"]) || one(req.headers.host) || "ascii-bouquet.vercel.app";
  const ua = one(req.headers["user-agent"]).toLowerCase();
  const cfg = decodeConfig(code);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!cfg) {
    res.status(400).end(`This bouquet got lost. Make one at https://${host}/\n`);
    return;
  }
  if (!ua.includes("curl") && !ua.includes("wget") && !ua.includes("httpie")) {
    res.setHeader("Location", isShort ? `/b/${raw}` : `/#${code}`);
    res.status(302).end();
    return;
  }
  let closed = false;
  req.on?.("close", () => {
    closed = true;
  });
  const opts = {
    cols: Math.round(num(one(req.query.cols), 60, 30, 160)),
    rows: Math.round(num(one(req.query.rows), 24, 16, 60)),
    fps: FPS,
    seconds: num(one(req.query.seconds), 18, 0.2, 18),
  };
  res.status(200);
  for (const frame of streamFrames(cfg, opts)) {
    if (closed) break;
    res.write(frame);
    await sleep(1000 / FPS);
  }
  res.end();
}
