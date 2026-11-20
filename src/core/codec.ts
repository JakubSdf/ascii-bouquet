import { FLOWERS, LIMITS, OCCASIONS, WRAPS } from "./catalog.js";
import type { BouquetConfig, FlowerId, FlowerPick, OccasionId, WrapId } from "./types.js";

const PREFIX = "v1.";
const BY_CODE = new Map(Object.entries(FLOWERS).map(([id, f]) => [f.code, id as FlowerId]));

const clip = (s: unknown, max: number): string =>
  typeof s === "string" ? [...s.replace(/[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/g, " ")].slice(0, max).join("") : "";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) return null;
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeConfig(c: BouquetConfig): string {
  const flowers = c.flowers.map((f) => `${FLOWERS[f.id].code}:${f.count}`).join(",");
  const tuple = [flowers, c.wrap, c.occasion, c.to, c.from, c.message];
  return PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify(tuple)));
}

export function decodeConfig(s: string): BouquetConfig | null {
  if (!s.startsWith(PREFIX)) return null;
  const bytes = fromBase64Url(s.slice(PREFIX.length));
  if (!bytes) return null;
  let tuple: unknown;
  try {
    tuple = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
  if (!Array.isArray(tuple) || tuple.length !== 6) return null;
  const [flowerStr, wrap, occasion, to, from, message] = tuple;
  if (typeof flowerStr !== "string" || typeof wrap !== "string" || !Object.hasOwn(WRAPS, wrap) || typeof occasion !== "string" || !Object.hasOwn(OCCASIONS, occasion)) return null;
  const flowers: FlowerPick[] = [];
  let left = LIMITS.maxTotal;
  for (const part of flowerStr.split(",")) {
    const m = /^([a-z]):(\d{1,3})$/.exec(part);
    const id = m && BY_CODE.get(m[1]);
    if (!m || !id) return null;
    if (left <= 0 || flowers.some((f) => f.id === id)) continue;
    const count = Math.min(left, Math.max(1, Number(m[2])));
    left -= count;
    flowers.push({ id, count });
  }
  if (!flowers.length) return null;
  return {
    flowers,
    wrap: wrap as WrapId,
    occasion: occasion as OccasionId,
    to: clip(to, LIMITS.name),
    from: clip(from, LIMITS.name),
    message: clip(message, LIMITS.message),
  };
}
