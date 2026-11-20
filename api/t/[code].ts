import type { VercelRequest, VercelResponse } from "@vercel/node";
import { streamFrames } from "../../src/core/ansi";
import { decodeConfig } from "../../src/core/codec";

export const config = { maxDuration: 30 };

const FPS = 15;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? Math.min(max, Math.max(min, n)) : fallback;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = one(req.query.code);
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
    res.setHeader("Location", `/#${code}`);
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
