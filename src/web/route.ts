import { decodeConfig } from "../core/codec";
import type { BouquetConfig } from "../core/types";

export type Route = { kind: "builder" } | { kind: "gift"; config: BouquetConfig | null };

export function routeFor(hash: string, pathname = "/", injected?: string): Route {
  if (/^\/b\/[A-Za-z0-9]+\/?$/.test(pathname)) return { kind: "gift", config: injected ? decodeConfig(injected) : null };
  const raw = hash.replace(/^#/, "");
  if (!raw) return { kind: "builder" };
  try {
    return { kind: "gift", config: decodeConfig(decodeURIComponent(raw)) };
  } catch {
    return { kind: "gift", config: null };
  }
}
