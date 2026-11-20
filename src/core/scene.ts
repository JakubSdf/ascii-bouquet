import { FLOWERS, WRAPS } from "./catalog";
import type { BouquetConfig, FlowerId } from "./types";

export type Part = "stem" | "leaf" | "paper" | "ribbon" | "spike";

export interface Pt {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  palette: string[];
  tone: number;
  twoSided: boolean;
  glyph?: string;
  stage: number;
  part: Part;
}

export interface Head {
  x: number;
  y: number;
  z: number;
  flower: FlowerId;
  radius: number;
  seed: number;
  stage: number;
}

export interface Sparkle {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
}

export interface Scene {
  points: Pt[];
  heads: Head[];
  sparkles: Sparkle[];
  babies: Sparkle[];
}

type V3 = [number, number, number];

export const GREENS = ["#005f00", "#008700", "#008700", "#00af00", "#00af5f", "#5faf5f", "#5fd75f", "#87d787"];

const norm = (v: V3): V3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (p: V3, d: V3, k: number): V3 => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function stemOrder(c: BouquetConfig): FlowerId[] {
  const pools = c.flowers.filter((f) => f.id !== "babysbreath").map((f) => ({ id: f.id, left: f.count }));
  const out: FlowerId[] = [];
  while (pools.some((p) => p.left > 0)) {
    for (const p of pools) if (p.left > 0) out.push(p.id), p.left--;
  }
  return out;
}

export function buildScene(c: BouquetConfig): Scene {
  const rnd = mulberry32(hashString(c.flowers.map((f) => f.id + f.count).join() + c.wrap));
  const uni = (a: number, b: number) => a + (b - a) * rnd();
  const wrap = WRAPS[c.wrap];
  const points: Pt[] = [];
  const heads: Head[] = [];
  const neck: V3 = [0, -0.12, 0];
  const center: V3 = [0, 0.12, 0];
  const order = stemOrder(c);
  const n = order.length;
  const golden = Math.PI * (3 - Math.sqrt(5));

  order.forEach((id, i) => {
    const el = ((88 - 60 * Math.sqrt(n > 1 ? i / (n - 1) : 0)) * Math.PI) / 180;
    const az = i * golden + 0.4;
    const axis = norm([Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)]);
    const pos = add(center, axis, 0.64 * uni(0.92, 1.05));
    const base = add(pos, axis, -0.03);
    for (let j = 0; j < 70; j++) {
      const t = j / 69;
      points.push({
        x: base[0] + (neck[0] - base[0]) * t,
        y: base[1] + (neck[1] - base[1]) * t,
        z: base[2] + (neck[2] - base[2]) * t,
        nx: axis[0], ny: 0, nz: axis[2],
        palette: GREENS, tone: -0.15, twoSided: true, part: "stem",
        stage: 0.05 + 0.3 * (1 - t),
      });
    }
    const headStage = 0.4 + 0.35 * (n > 1 ? i / (n - 1) : 0);
    const spec = FLOWERS[id];
    if (spec.kind === "spike") {
      for (let k = 0; k < 16; k++) {
        const t = k / 15;
        const p = add(pos, axis, 0.2 * t - 0.02);
        const r = 0.035 * (1 - 0.6 * t);
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * Math.PI * 2 + k;
          const [u, v] = basisOf(axis);
          const d = norm([u[0] * Math.cos(ang) + v[0] * Math.sin(ang), u[1] * Math.cos(ang) + v[1] * Math.sin(ang), u[2] * Math.cos(ang) + v[2] * Math.sin(ang)]);
          points.push({
            x: p[0] + d[0] * r, y: p[1] + d[1] * r, z: p[2] + d[2] * r,
            nx: d[0], ny: d[1], nz: d[2],
            palette: spec.palette, tone: 0.05, twoSided: true, part: "spike",
            stage: Math.min(1, headStage + 0.15 * t),
          });
        }
      }
    } else {
      heads.push({
        x: pos[0], y: pos[1], z: pos[2], flower: id,
        radius: spec.kind === "tulip" ? 0.11 : uni(0.12, 0.14),
        seed: uni(0, 6.28), stage: headStage,
      });
    }
  });

  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.4) / 8) * 2 * Math.PI;
    const co = Math.cos(a), si = Math.sin(a);
    const base: V3 = [0.26 * co, 0.3, 0.26 * si];
    const d = norm([co, 0.15, si]);
    const side: V3 = [-si, 0, co];
    const nn = norm(cross(side, d));
    for (let ti = 0; ti < 32; ti++) {
      const t = ti / 31;
      for (let wi = -5; wi <= 5; wi++) {
        const w = wi / 5;
        const curl = 0.025 * w * w;
        const width = 0.07 * Math.sin(Math.PI * t) * w;
        points.push({
          x: base[0] + d[0] * 0.3 * t + side[0] * width + nn[0] * curl,
          y: base[1] + d[1] * 0.3 * t - 0.1 * t * t + nn[1] * curl,
          z: base[2] + d[2] * 0.3 * t + side[2] * width + nn[2] * curl,
          nx: nn[0], ny: nn[1], nz: nn[2],
          palette: GREENS, tone: wi === 0 ? -0.25 : 0, twoSided: true, part: "leaf",
          stage: 0.3 + 0.2 * t,
        });
      }
    }
  }

  const y0 = -0.2, y1 = 0.3, r0 = 0.06, r1 = 0.36;
  const k = (r1 - r0) / (y1 - y0);
  for (let i = 0; i < 50; i++) {
    const t = i / 49;
    const r = r0 + (r1 - r0) * t;
    const count = Math.max(8, Math.floor(170 * r));
    for (let j = 0; j < count; j++) {
      const ph = ((j + rnd()) / count) * 2 * Math.PI;
      const co = Math.cos(ph), si = Math.sin(ph);
      let y = y0 + (y1 - y0) * t;
      if (t > 0.9) y += 0.03 * Math.sin(9 * ph);
      const nn = norm([co, -k, si]);
      points.push({
        x: r * co, y, z: r * si, nx: nn[0], ny: nn[1], nz: nn[2],
        palette: wrap.paper, tone: 0.3 * (Math.abs(Math.sin(5 * ph)) - 0.6), twoSided: false, part: "paper", stage: 0,
      });
    }
  }

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 2 * Math.PI;
    const sx = 0.025 * Math.cos(a), sz = 0.025 * Math.sin(a);
    for (let j = 0; j < 40; j++) {
      const t = j / 39;
      points.push({
        x: sx * (1 + 1.2 * t), y: -0.2 - 0.3 * t, z: sz * (1 + 1.2 * t),
        nx: Math.cos(a), ny: 0, nz: Math.sin(a),
        palette: GREENS, tone: -0.1, twoSided: true, part: "stem", stage: 0,
      });
    }
  }

  const by = -0.12;
  const br = r0 + k * (by - y0) + 0.01;
  for (let j = 0; j < 90; j++) {
    const ph = (j / 90) * 2 * Math.PI;
    for (const dy of [-0.012, 0, 0.012]) {
      points.push({
        x: br * Math.cos(ph), y: by + dy, z: br * Math.sin(ph),
        nx: Math.cos(ph), ny: 0, nz: Math.sin(ph),
        palette: wrap.ribbon, tone: 0, twoSided: false, part: "ribbon", stage: 0,
      });
    }
  }
  const knot: V3 = [0, by, br + 0.01];
  for (const side of [-1, 1]) {
    for (let j = 0; j < 70; j++) {
      const a = (j / 70) * 2 * Math.PI;
      const lx = side * (0.07 + 0.07 * Math.cos(a));
      const ly = 0.04 * Math.sin(a) + (0.02 * (0.07 + 0.07 * Math.cos(a))) / 0.14;
      for (const fill of [1, 0.7]) {
        points.push({
          x: knot[0] + lx * fill, y: knot[1] + ly * fill, z: knot[2] + 0.01,
          nx: side * 0.3, ny: 0.2, nz: 0.93,
          palette: wrap.ribbon, tone: 0.1, twoSided: true, part: "ribbon", stage: 0,
        });
      }
    }
    for (let j = 0; j < 30; j++) {
      const t = j / 29;
      points.push({
        x: knot[0] + side * 0.06 * t, y: knot[1] - 0.15 * t, z: knot[2] + 0.015,
        nx: side * 0.2, ny: 0, nz: 0.98,
        palette: wrap.ribbon, tone: -0.05 + 0.05 * Math.sin(t * 9), twoSided: true, part: "ribbon", stage: 0,
      });
    }
  }
  for (const dx of [-0.01, 0, 0.01]) {
    points.push({ x: dx, y: by, z: knot[2] + 0.02, nx: 0, ny: 0, nz: 1, palette: wrap.ribbon, tone: 0.2, twoSided: true, glyph: "@", part: "ribbon", stage: 0 });
  }

  const babies: Sparkle[] = [];
  const bb = c.flowers.find((f) => f.id === "babysbreath");
  if (bb) {
    for (let i = 0; i < 60 + 30 * (bb.count - 1); i++) {
      const a = rnd() * 2 * Math.PI;
      const el = uni(0.3, 1.4);
      const rr = uni(0.4, 0.58);
      babies.push({ x: rr * Math.cos(a) * Math.cos(el), y: center[1] + rr * Math.sin(el), z: rr * Math.sin(a) * Math.cos(el), phase: uni(0, 6.28), speed: 2 });
    }
  }

  const sparkles: Sparkle[] = [];
  for (let i = 0; i < 30; i++) {
    const a = rnd() * 2 * Math.PI;
    const rr = uni(0.75, 0.95);
    sparkles.push({ x: rr * Math.cos(a), y: uni(-0.3, 1), z: rr * Math.sin(a), phase: uni(0, 6.28), speed: uni(1.5, 4) });
  }

  return { points, heads, sparkles, babies };
}

function basisOf(axis: V3): [V3, V3] {
  const helper: V3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(helper, axis));
  return [u, cross(axis, u)];
}
