import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/catalog";
import { encodeConfig } from "../src/core/codec";
import { loadBouquet, memoryStore, RateLimited, saveBouquet, storeFromEnv } from "../src/server/store";

const code = encodeConfig(DEFAULT_CONFIG);

describe("short link store", () => {
  test("saves a bouquet under a short id and loads it back", async () => {
    const store = memoryStore();
    const id = await saveBouquet(store, code, "1.1.1.1");
    expect(id).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(await loadBouquet(store, id)).toBe(code);
  });

  test("the same bouquet gets the same id", async () => {
    const store = memoryStore();
    expect(await saveBouquet(store, code, "a")).toBe(await saveBouquet(store, code, "b"));
  });

  test("unknown ids load nothing", async () => {
    expect(await loadBouquet(memoryStore(), "zzzzzz")).toBeNull();
    expect(await loadBouquet(memoryStore(), "../etc")).toBeNull();
  });

  test("one address can make at most 30 links an hour", async () => {
    const store = memoryStore();
    for (let i = 0; i < 30; i++) await saveBouquet(store, encodeConfig({ ...DEFAULT_CONFIG, to: `n${i}` }), "9.9.9.9");
    await expect(saveBouquet(store, encodeConfig({ ...DEFAULT_CONFIG, to: "x" }), "9.9.9.9")).rejects.toBeInstanceOf(RateLimited);
    await expect(saveBouquet(store, encodeConfig({ ...DEFAULT_CONFIG, to: "x" }), "8.8.8.8")).resolves.toMatch(/^[A-Za-z0-9]{6}$/);
  });

  test("store is configured from Vercel or Upstash variables", () => {
    expect(storeFromEnv({})).toBeNull();
    expect(storeFromEnv({ KV_REST_API_URL: "https://x.upstash.io", KV_REST_API_TOKEN: "t" })).not.toBeNull();
    expect(storeFromEnv({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" })).not.toBeNull();
  });
});
