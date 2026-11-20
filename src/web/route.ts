import { decodeConfig } from "../core/codec";
import type { BouquetConfig } from "../core/types";

export type Route = { kind: "builder" } | { kind: "gift"; config: BouquetConfig | null };

export function routeFor(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  if (!raw) return { kind: "builder" };
  try {
    return { kind: "gift", config: decodeConfig(decodeURIComponent(raw)) };
  } catch {
    return { kind: "gift", config: null };
  }
}
