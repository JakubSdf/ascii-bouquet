import { describe, expect, test } from "vitest";
import { qrMatrix, qrSvg } from "../src/web/qr";

const link = "https://ascii-bouquet.vercel.app/#v1.WyJyOjIsZDoxLHM6MSIsInBpbmsiLCJsb3ZlIiwiQW5uYSIsIlRvbSIsIkV2ZXJ5IGRheSB3aXRoIHlvdSBibG9vbXMuIl0";

describe("qr", () => {
  test("matrix is a valid QR size with finder patterns", () => {
    const m = qrMatrix(link);
    expect((m.length - 21) % 4).toBe(0);
    expect(m.every((row) => row.length === m.length)).toBe(true);
    for (const [r, c] of [[0, 0], [0, m.length - 7], [m.length - 7, 0]]) {
      expect(m[r][c]).toBe(true);
      expect(m[r + 1][c + 1]).toBe(false);
      expect(m[r + 3][c + 3]).toBe(true);
    }
  });

  test("svg is pink with dark modules and a quiet zone", () => {
    const svg = qrSvg(link);
    const size = qrMatrix(link).length + 8;
    expect(svg).toContain(`viewBox="0 0 ${size} ${size}"`);
    expect(svg).toContain('fill="#ff87af"');
    expect(svg).toContain('fill="#1a0a12"');
    expect(svg.startsWith("<svg")).toBe(true);
  });

  test("longest possible link still fits", () => {
    expect(() => qrMatrix(link + "A".repeat(700))).not.toThrow();
  });
});
