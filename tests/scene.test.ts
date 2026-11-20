import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, WRAPS } from "../src/core/catalog";
import { buildScene } from "../src/core/scene";
import type { BouquetConfig } from "../src/core/types";

const cfg = (p: Partial<BouquetConfig>): BouquetConfig => ({ ...DEFAULT_CONFIG, ...p });

describe("buildScene", () => {
  test("head count follows flower counts", () => {
    const s = buildScene(cfg({ flowers: [{ id: "rose", count: 2 }, { id: "daisy", count: 1 }] }));
    expect(s.heads.length).toBe(3);
    expect(s.heads.filter((h) => h.flower === "rose").length).toBe(2);
  });

  test("deterministic and independent of text", () => {
    const a = buildScene(DEFAULT_CONFIG);
    expect(buildScene(DEFAULT_CONFIG)).toEqual(a);
    expect(buildScene(cfg({ message: "other", to: "X" }))).toEqual(a);
  });

  test("wrap colors come from the chosen wrap", () => {
    const s = buildScene(cfg({ wrap: "lilac" }));
    const paper = s.points.filter((p) => p.part === "paper");
    expect(paper.length).toBeGreaterThan(100);
    for (const p of paper) expect(p.palette).toBe(WRAPS.lilac.paper);
  });

  test("baby's breath adds a cloud only when picked", () => {
    expect(buildScene(DEFAULT_CONFIG).babies.length).toBe(0);
    const s = buildScene(cfg({ flowers: [{ id: "rose", count: 1 }, { id: "babysbreath", count: 1 }] }));
    expect(s.babies.length).toBeGreaterThanOrEqual(60);
  });

  test("lavender is a spike, not a head", () => {
    const s = buildScene(cfg({ flowers: [{ id: "lavender", count: 2 }] }));
    expect(s.heads.length).toBe(0);
    expect(s.points.filter((p) => p.part === "spike").length).toBeGreaterThan(20);
  });

  test("stages are ordered", () => {
    const s = buildScene(DEFAULT_CONFIG);
    for (const p of s.points) expect(p.stage).toBeGreaterThanOrEqual(0), expect(p.stage).toBeLessThanOrEqual(1);
    const stemStart = Math.max(...s.points.filter((p) => p.part === "stem").map((p) => p.stage));
    for (const h of s.heads) expect(h.stage).toBeGreaterThanOrEqual(stemStart);
  });
});
