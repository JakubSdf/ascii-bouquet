import { createHash } from "node:crypto";

export interface Store {
  command(args: (string | number)[]): Promise<unknown>;
}

export class RateLimited extends Error {}

const ID_LENGTH = 6;
const LIMIT_PER_HOUR = 30;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function storeFromEnv(env: Record<string, string | undefined>): Store | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return {
    async command(args) {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(args) });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || `store ${res.status}`);
      return data.result ?? null;
    },
  };
}

export function memoryStore(): Store {
  const data = new Map<string, string>();
  return {
    async command([cmd, key, value, flag]) {
      const k = String(key);
      switch (String(cmd).toUpperCase()) {
        case "GET":
          return data.get(k) ?? null;
        case "SET":
          if (flag === "NX" && data.has(k)) return null;
          data.set(k, String(value));
          return "OK";
        case "INCR": {
          const n = Number(data.get(k) ?? 0) + 1;
          data.set(k, String(n));
          return n;
        }
        case "EXPIRE":
          return 1;
        default:
          throw new Error(`unsupported ${cmd}`);
      }
    },
  };
}

function idFor(code: string, length: number): string {
  const bytes = createHash("sha256").update(code).digest();
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

export async function saveBouquet(store: Store, code: string, ip: string): Promise<string> {
  for (let length = ID_LENGTH; length <= ID_LENGTH + 4; length++) {
    const id = idFor(code, length);
    const existing = await store.command(["GET", `b:${id}`]);
    if (existing === code) return id;
    if (existing !== null) continue;
    const used = Number(await store.command(["INCR", `rl:${ip}`]));
    if (used === 1) await store.command(["EXPIRE", `rl:${ip}`, 3600]);
    if (used > LIMIT_PER_HOUR) throw new RateLimited("too many bouquets");
    if ((await store.command(["SET", `b:${id}`, code, "NX"])) === "OK") return id;
    if ((await store.command(["GET", `b:${id}`])) === code) return id;
  }
  throw new Error("no free id");
}

export async function loadBouquet(store: Store, id: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{6,10}$/.test(id)) return null;
  const v = await store.command(["GET", `b:${id}`]);
  return typeof v === "string" ? v : null;
}

export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers["x-forwarded-for"];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(",")[0]?.trim();
  return first || "unknown";
}
