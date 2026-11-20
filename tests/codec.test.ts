import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, LIMITS } from "../src/core/catalog";
import { decodeConfig, encodeConfig } from "../src/core/codec";
import type { BouquetConfig } from "../src/core/types";

const withText = (patch: Partial<BouquetConfig>): BouquetConfig => ({ ...DEFAULT_CONFIG, ...patch });

describe("codec", () => {
  test("roundtrip", () => {
    expect(decodeConfig(encodeConfig(DEFAULT_CONFIG))).toEqual(DEFAULT_CONFIG);
  });

  test("unicode", () => {
    const c = withText({ to: "Anička", from: "Tom", message: "Příliš žluťoučký kůň 💐" });
    expect(decodeConfig(encodeConfig(c))).toEqual(c);
  });

  test("url-safe", () => {
    expect(encodeConfig(withText({ message: "a+b/c=d ?#&" }))).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });

  test("compact", () => {
    expect(encodeConfig(DEFAULT_CONFIG).length).toBeLessThanOrEqual(120);
  });

  test("rejects", () => {
    const good = encodeConfig(withText({ to: "Anna", message: "hello there" }));
    const cut = good.slice(0, 12) + good.slice(13);
    const unknown = "v1." + Buffer.from(JSON.stringify(["x:1", "pink", "love", "", "", ""])).toString("base64url");
    const proto = "v1." + Buffer.from(JSON.stringify(["r:1", "toString", "__proto__", "", "", ""])).toString("base64url");
    for (const bad of ["", "v1.", "v2.abc", "v1.%%%", cut, unknown, proto]) {
      expect(decodeConfig(bad), bad).toBeNull();
    }
  });

  test("clamps", () => {
    const raw = ["r:9,d:1,t:1,s:1,l:1,b:1,r:1", "pink", "love", "A", "B", "x".repeat(200)];
    const c = decodeConfig("v1." + Buffer.from(JSON.stringify(raw)).toString("base64url"));
    expect(c).not.toBeNull();
    expect([...c!.message].length).toBe(LIMITS.message);
    expect(c!.flowers.length).toBe(LIMITS.maxFlowers);
    expect(c!.flowers[0]).toEqual({ id: "rose", count: 3 });
  });
});
