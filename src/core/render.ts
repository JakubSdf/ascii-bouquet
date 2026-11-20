import { FLOWERS } from "./catalog";
import type { Scene } from "./scene";

export interface Grid {
  cols: number;
  rows: number;
  chars: string[];
  colors: string[];
}

export interface FrameOpts {
  cols: number;
  rows: number;
  t: number;
  angle: number;
  tilt: number;
  bloom: number;
  cellAspect: number;
}

const SHADE = ".:-=+*%@";
const PETAL = "+*#%";
const LEAF = ".-~=";
const CAM = 4;
const PIVOT_Y = 0.2;
const LIGHT = (() => {
  const l = [-0.45, 0.6, 0.66];
  const m = Math.hypot(l[0], l[1], l[2]);
  return l.map((v) => v / m);
})();

const clamp01 = (v: number) => Math.min(0.999, Math.max(0, v));
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const pick = (pal: string[], b: number) => pal[Math.floor(clamp01(b) * pal.length)];

export function bloomEase(elapsed: number, duration = 5): number {
  const t = Math.min(1, Math.max(0, elapsed / duration));
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

export function emptyGrid(cols: number, rows: number): Grid {
  return { cols, rows, chars: new Array(cols * rows).fill(" "), colors: new Array(cols * rows).fill("") };
}

export function renderFrame(scene: Scene, o: FrameOpts): Grid {
  const { cols, rows, cellAspect } = o;
  const g = emptyGrid(cols, rows);
  const zbuf = new Float64Array(cols * rows).fill(-1e9);
  const scale = Math.max(1, Math.min((rows - 2) / 1.6, (cols / 2 - 1.5) / (0.9 * cellAspect)));
  const sx = scale * cellAspect;
  const cx = cols / 2;
  const cy = rows / 2 + 0.02 * scale;
  const ca = Math.cos(o.angle), sa = Math.sin(o.angle);
  const ct = Math.cos(o.tilt), st = Math.sin(o.tilt);

  const project = (x: number, y: number, z: number) => {
    const xr = x * ca - z * sa;
    const zr = x * sa + z * ca;
    const yp = y - PIVOT_Y;
    const yt = yp * ct - zr * st;
    const zt = yp * st + zr * ct;
    const f = CAM / (CAM - zt);
    return { fx: cx + xr * f * sx, fy: cy - yt * f * scale, zt, f };
  };

  const plot = (col: number, row: number, z: number, ch: string, color: string) => {
    if (row < 1 || row >= rows - 1 || col < 1 || col >= cols - 1) return;
    const i = row * cols + col;
    if (z > zbuf[i]) {
      zbuf[i] = z;
      g.chars[i] = ch;
      g.colors[i] = color;
    }
  };

  for (const p of scene.points) {
    if (p.stage > o.bloom) continue;
    const { fx, fy, zt } = project(p.x, p.y, p.z);
    const nxr = p.nx * ca - p.nz * sa;
    const nzr = p.nx * sa + p.nz * ca;
    const nyt = p.ny * ct - nzr * st;
    const nzt = p.ny * st + nzr * ct;
    let dot = nxr * LIGHT[0] + nyt * LIGHT[1] + nzt * LIGHT[2];
    if (p.twoSided && dot < 0) dot = -dot * 0.55;
    const b = clamp01(0.25 + 0.75 * Math.max(0, dot) + p.tone);
    const ramp = p.part === "spike" ? PETAL : p.part === "leaf" ? LEAF : SHADE;
    const ch = p.glyph ?? ramp[Math.floor(b * ramp.length)];
    plot(Math.floor(fx), Math.floor(fy), zt, ch, pick(p.palette, b));
  }

  const rot = o.angle * 0.7;
  for (const h of scene.heads) {
    const grow = smooth(h.stage, h.stage + 0.2, o.bloom);
    if (grow <= 0) continue;
    const spec = FLOWERS[h.flower];
    const { fx, fy, zt, f } = project(h.x, h.y, h.z);
    if (grow < 0.4) {
      const c = pick(spec.palette, 0.5);
      plot(Math.floor(fx) - 1, Math.floor(fy), zt + 0.03, "(", c);
      plot(Math.floor(fx), Math.floor(fy), zt + 0.03, spec.kind === "tulip" ? "v" : "o", pick(spec.palette, 0.7));
      plot(Math.floor(fx) + 1, Math.floor(fy), zt + 0.03, ")", c);
      continue;
    }
    const R = h.radius * (0.3 + 0.7 * smooth(0.4, 1, grow));
    const rx = R * f * sx, ry = R * f * scale;
    const dim = -0.4 * (1 - Math.min(1, Math.max(0, (zt + 0.6) / 1.2)));
    const spin = h.seed + rot;
    for (let row = Math.floor(fy - ry) - 1; row <= Math.floor(fy + ry) + 1; row++) {
      const dy = (row + 0.5 - fy) / ry;
      for (let col = Math.floor(fx - rx) - 1; col <= Math.floor(fx + rx) + 1; col++) {
        const dx = (col + 0.5 - fx) / rx;
        if (spec.kind === "disc") {
          const s = Math.hypot(dx, dy);
          if (s > 1) continue;
          if (s < 0.3) {
            const b = 0.55 - 0.35 * dx - 0.35 * dy + dim;
            plot(col, row, zt + 0.06, s < 0.17 ? "@" : "o", pick(spec.center, b));
            continue;
          }
          const reach = 0.32 + 0.68 * Math.abs(Math.cos((spec.petals * (Math.atan2(dy, dx) + spin)) / 2)) ** 0.7;
          if (s > reach) continue;
          const edge = s > reach - 0.14 ? -0.22 : 0;
          const b = 0.62 - 0.22 * dx - 0.28 * dy + 0.12 * s + edge + dim;
          plot(col, row, zt + 0.04 * (1 - s), PETAL[Math.floor(clamp01(b) * PETAL.length)], pick(spec.palette, b));
        } else {
          const v = (1 - dy) / 2;
          if (v < 0 || v > 1) continue;
          const hw = 0.62 * Math.sin(Math.PI * 0.5 * Math.min(1, v * 1.5 + 0.05));
          if (hw <= 0 || Math.abs(dx) > hw) continue;
          const xn = dx / hw;
          if (v > 0.72 + 0.28 * Math.cos(1.5 * Math.PI * xn) ** 2) continue;
          const seam = Math.abs(Math.abs(xn) - 0.33) < 0.12 && v > 0.3 ? -0.25 : 0;
          const b = 0.55 - 0.3 * xn + 0.1 * v + seam + dim;
          plot(col, row, zt + 0.03, PETAL[Math.floor(clamp01(b) * PETAL.length)], pick(spec.palette, b));
        }
      }
    }
  }

  if (o.bloom > 0.5) {
    for (const p of scene.babies) {
      const { fx, fy, zt } = project(p.x, p.y, p.z);
      const star = Math.sin(o.t * 2 + p.phase) > 0.6;
      plot(Math.floor(fx), Math.floor(fy), zt + 0.02, star ? "*" : "·", star ? "#ffffff" : "#eeeeee");
    }
  }

  if (o.bloom > 0.8) {
    for (const p of scene.sparkles) {
      const { fx, fy, zt } = project(p.x, p.y, p.z);
      const tw = Math.sin(o.t * p.speed + p.phase);
      if (tw > 0.85) plot(Math.floor(fx), Math.floor(fy), zt, "*", "#ffffff");
      else if (tw > 0.4) plot(Math.floor(fx), Math.floor(fy), zt, "+", "#ffd7ff");
      else if (tw > 0) plot(Math.floor(fx), Math.floor(fy), zt, "·", "#ffafd7");
    }
  }

  return g;
}

export function gridToText(g: Grid): string {
  const lines: string[] = [];
  for (let r = 0; r < g.rows; r++) lines.push(g.chars.slice(r * g.cols, (r + 1) * g.cols).join(""));
  return lines.join("\n");
}
