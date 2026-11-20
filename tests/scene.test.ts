import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, WRAPS } from "../src/core/catalog";
import { buildPortrait, buildScene } from "../src/core/scene";
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

  test("growth starts at the stem and the wrap comes after", () => {
    const s = buildScene(DEFAULT_CONFIG);
    const stems = s.points.filter((p) => p.part === "stem");
    expect(Math.min(...stems.map((p) => p.stage))).toBe(0);
    const lowest = stems.reduce((a, b) => (b.y < a.y ? b : a));
    const highest = stems.reduce((a, b) => (b.y > a.y ? b : a));
    expect(lowest.stage).toBeLessThan(highest.stage);
    const paper = s.points.filter((p) => p.part === "paper").map((p) => p.stage);
    const ribbon = s.points.filter((p) => p.part === "ribbon").map((p) => p.stage);
    expect(Math.min(...paper)).toBeGreaterThanOrEqual(0.4);
    expect(Math.min(...ribbon)).toBeGreaterThanOrEqual(Math.max(...paper) - 0.05);
  });

  test("lily gets its own heads", () => {
    const s = buildScene(cfg({ flowers: [{ id: "lily", count: 8 }] }));
    expect(s.heads.length).toBe(8);
    expect(s.heads.every((h) => h.flower === "lily")).toBe(true);
  });

  test("stages are ordered", () => {
    const s = buildScene(DEFAULT_CONFIG);
    for (const p of s.points) expect(p.stage).toBeGreaterThanOrEqual(0), expect(p.stage).toBeLessThanOrEqual(1);
    const stemStart = Math.max(...s.points.filter((p) => p.part === "stem").map((p) => p.stage));
    for (const h of s.heads) expect(h.stage).toBeGreaterThanOrEqual(stemStart);
  });
});

describe("buildPortrait", () => {
  test("a head flower gets one big head and a stem", () => {
    const s = buildPortrait("rose");
    expect(s.heads.length).toBe(1);
    expect(s.heads[0].flower).toBe("rose");
    expect(s.heads[0].radius).toBeGreaterThan(0.3);
    expect(s.points.some((p) => p.part === "stem")).toBe(true);
    expect(s.points.some((p) => p.part === "paper")).toBe(false);
  });

  test("lavender is a spike and baby's breath a cloud", () => {
    expect(buildPortrait("lavender").heads.length).toBe(0);
    expect(buildPortrait("lavender").points.filter((p) => p.part === "spike").length).toBeGreaterThan(40);
    expect(buildPortrait("babysbreath").babies.length).toBeGreaterThan(20);
  });
});
