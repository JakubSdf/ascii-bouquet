import { bloomEase, renderFrame, type Grid } from "./render";
import { buildScene } from "./scene";
import type { BouquetConfig } from "./types";

const ESC = "\x1b[";
const HIDE = `${ESC}?25l`;
const SHOW = `${ESC}?25h`;

const rgb = (hex: string) => `${parseInt(hex.slice(1, 3), 16)};${parseInt(hex.slice(3, 5), 16)};${parseInt(hex.slice(5, 7), 16)}`;
const color = (hex: string) => `${ESC}38;2;${rgb(hex)}m`;

export function gridToAnsi(g: Grid): string {
  let out = `${ESC}H`;
  let current = "";
  for (let r = 0; r < g.rows; r++) {
    if (r) out += "\n";
    for (let c = 0; c < g.cols; c++) {
      const i = r * g.cols + c;
      const col = g.colors[i];
      if (col && col !== current && g.chars[i] !== " ") {
        current = col;
        out += color(col);
      }
      out += g.chars[i];
    }
  }
  return out + `${ESC}0m`;
}

export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const chunks = [...word].length > width ? (word.match(new RegExp(`.{1,${width}}`, "gu")) ?? []) : [word];
    for (const chunk of chunks) {
      const next = line ? `${line} ${chunk}` : chunk;
      if ([...next].length > width && line) {
        lines.push(line);
        line = chunk;
      } else line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const center = (s: string, width: number) => " ".repeat(Math.max(0, Math.floor((width - [...s].length) / 2))) + s;

export interface StreamOpts {
  cols: number;
  rows: number;
  fps: number;
  seconds: number;
}

export function* streamFrames(c: BouquetConfig, o: StreamOpts): Generator<string> {
  const scene = buildScene(c);
  const base = { cols: o.cols, rows: o.rows, tilt: 0.3, cellAspect: 2 };
  const total = Math.round(o.fps * o.seconds);
  const bloomFor = Math.min(5, o.seconds * 0.4);
  yield `${HIDE}${ESC}2J`;
  for (let i = 0; i < total; i++) {
    const t = i / o.fps;
    yield gridToAnsi(renderFrame(scene, { ...base, t, angle: t * 0.6, bloom: bloomEase(t, bloomFor) }));
  }
  const width = o.cols - 4;
  const text: [string, string][] = [];
  if (c.to) text.push([`For ${c.to}`, "#8e879b"]);
  for (const l of wrapText(c.message, width)) text.push([l, "#ffafd7"]);
  if (c.from) text.push([`— ${c.from}`, "#ff87af"]);
  const t = total / o.fps;
  const g = renderFrame(scene, { ...base, rows: Math.max(8, o.rows - text.length - 1), t, angle: t * 0.6, bloom: 1 });
  const lines = text.map(([s, col]) => color(col) + center(s, o.cols)).join("\n");
  yield `${ESC}2J${gridToAnsi(g)}\n${lines}${ESC}0m\n${SHOW}`;
}
