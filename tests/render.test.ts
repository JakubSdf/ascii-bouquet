import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, FLOWERS } from "../src/core/catalog";
import { bloomEase, renderFrame, type FrameOpts } from "../src/core/render";
import { buildScene, GREENS } from "../src/core/scene";

const scene = buildScene(DEFAULT_CONFIG);
const opts = (p: Partial<FrameOpts> = {}): FrameOpts => ({ cols: 80, rows: 40, t: 1, angle: 0.5, tilt: 0.3, bloom: 1, cellAspect: 2, ...p });
const roseColors = new Set(FLOWERS.rose.palette);

describe("renderFrame", () => {
  test("grid size", () => {
    const g = renderFrame(scene, opts());
    expect(g.cols).toBe(80);
    expect(g.chars.length).toBe(3200);
    expect(g.colors.length).toBe(3200);
  });

  test("bloom 0 shows no flowers, bloom 1 does", () => {
    const count = (b: number) => renderFrame(scene, opts({ bloom: b })).colors.filter((c) => roseColors.has(c)).length;
    expect(count(0)).toBe(0);
    expect(count(1)).toBeGreaterThanOrEqual(50);
  });

  test("bloom 0 is empty and early bloom is only stem", () => {
    expect(renderFrame(scene, opts({ bloom: 0, t: 0 })).chars.filter((c) => c !== " ").length).toBe(0);
    const early = renderFrame(scene, opts({ bloom: 0.1 }));
    const used = early.colors.filter(Boolean);
    expect(used.length).toBeGreaterThan(3);
    for (const c of used) expect(GREENS).toContain(c);
  });

  test("lily renders in its palette", () => {
    const s = buildScene({ ...DEFAULT_CONFIG, flowers: [{ id: "lily", count: 3 }] });
    const lily = new Set(FLOWERS.lily.palette);
    expect(renderFrame(s, opts()).colors.filter((c) => lily.has(c)).length).toBeGreaterThanOrEqual(40);
  });

  test("fits a small terminal with a margin", () => {
    const g = renderFrame(scene, opts({ cols: 40, rows: 20 }));
    for (let r = 0; r < 20; r++) {
      expect(g.chars[r * 40]).toBe(" ");
      expect(g.chars[r * 40 + 39]).toBe(" ");
    }
    for (let c = 0; c < 40; c++) expect(g.chars[c]).toBe(" ");
  });

  test("spins and is deterministic", () => {
    const a = renderFrame(scene, opts({ angle: 0 }));
    expect(renderFrame(scene, opts({ angle: Math.PI })).chars.join("")).not.toBe(a.chars.join(""));
    expect(renderFrame(scene, opts({ angle: 0 }))).toEqual(a);
  });
});

describe("bloomEase", () => {
  test("clamped and monotonic", () => {
    expect(bloomEase(0)).toBe(0);
    expect(bloomEase(5)).toBe(1);
    expect(bloomEase(10)).toBe(1);
    expect(bloomEase(-1)).toBe(0);
    let prev = 0;
    for (let t = 0; t <= 5; t += 0.25) {
      expect(bloomEase(t)).toBeGreaterThanOrEqual(prev);
      prev = bloomEase(t);
    }
    expect(bloomEase(2, 4)).toBeCloseTo(0.5);
    expect(bloomEase(1, 4)).toBeCloseTo(0.0625);
  });
});
