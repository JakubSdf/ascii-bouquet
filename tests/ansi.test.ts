import { describe, expect, test } from "vitest";
import { gridToAnsi, streamFrames } from "../src/core/ansi";
import { DEFAULT_CONFIG } from "../src/core/catalog";

const strip = (s: string) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
const cfg = { ...DEFAULT_CONFIG, to: "Anička", from: "Tom", message: "Příliš žluťoučký kůň 💐" };

describe("gridToAnsi", () => {
  test("emits truecolor only on color change", () => {
    expect(gridToAnsi({ cols: 2, rows: 1, chars: ["a", "b"], colors: ["#ff0000", "#ff0000"] })).toBe("\x1b[H\x1b[38;2;255;0;0mab\x1b[0m");
  });

  test("blank cells keep the current color and rows are joined", () => {
    const out = gridToAnsi({ cols: 2, rows: 2, chars: ["a", " ", " ", "b"], colors: ["#000001", "", "", "#000002"] });
    expect(out).toBe("\x1b[H\x1b[38;2;0;0;1ma \n \x1b[38;2;0;0;2mb\x1b[0m");
  });
});

describe("streamFrames", () => {
  test("intro, frames and a final card", () => {
    const frames = [...streamFrames(cfg, { cols: 60, rows: 30, fps: 5, seconds: 1 })];
    expect(frames.length).toBe(7);
    expect(frames[0]).toContain("\x1b[?25l");
    const last = frames[frames.length - 1];
    expect(strip(last)).toContain("Příliš žluťoučký kůň 💐");
    expect(strip(last)).toContain("For Anička");
    expect(strip(last)).toContain("— Tom");
    expect(last).toContain("\x1b[?25h");
  });

  test("respects small sizes", () => {
    for (const f of streamFrames(cfg, { cols: 40, rows: 20, fps: 5, seconds: 1 })) {
      for (const line of strip(f).split("\n")) expect([...line].length).toBeLessThanOrEqual(40);
    }
  });
});
