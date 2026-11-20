import { FLOWERS } from "../core/catalog";
import { bloomEase, renderFrame, type Grid } from "../core/render";
import { buildScene } from "../core/scene";
import type { BouquetConfig } from "../core/types";
import { GridCanvas } from "./canvas";
import { colorSpans, h, onFrame, prefersReducedMotion } from "./dom";

const BUD_COLORS: Record<string, string> = { "(": "#ff87af", ")": "#ff87af", "@": "#ff5f87", o: "#ffd700", "|": "#5faf5f", "/": "#5faf5f", "\\": "#5faf5f", _: "#5faf5f", "=": "#d7afaf", "~": "#ff5f87", "·": "#ffafd7" };
const BUD = [
  "   ·         ·      ",
  "     (@)  (o)  (@)  ",
  "  (@) \\    |    / (o)",
  "    \\  \\   |   /  / ",
  "     \\__\\__|__/__/  ",
  "       \\=======/    ",
  "        \\==~==/     ",
  "         \\===/      ",
  "          \\=/       ",
  "           |        ",
];
const HEART_COLORS = ["#d7005f", "#ff5f87", "#ff87af", "#ff5faf", "#ffafd7", "#ffd7ff"];
const BLOOM_SECONDS = 6;
const TYPE_DELAY = 3;
const TYPE_MS = 40;

interface Heart { x: number; y: number; speed: number; phase: number; color: string }
interface Petal { x: number; y: number; vx: number; vy: number; ch: string; color: string; born: number }

export function legend(c: BouquetConfig): HTMLElement {
  const box = h("div", { class: "gift-legend" }, h("p", { class: "gift-legend-title" }, "what your flowers say"));
  for (const f of c.flowers) {
    const spec = FLOWERS[f.id];
    box.append(
      h("p", { class: "gift-legend-row" },
        h("span", { class: "gift-legend-glyph", style: `color:${spec.palette[spec.palette.length - 2]}` }, spec.glyph),
        h("span", {}, spec.name.toLowerCase()),
        h("span", { class: "muted" }, `— ${spec.meaning}`),
      ),
    );
  }
  return box;
}

function lost(root: HTMLElement): () => void {
  const view = h("main", { class: "gift gift-lost" },
    colorSpans(BUD.slice(4), BUD_COLORS),
    h("h1", { class: "serif" }, "This bouquet got lost."),
    h("p", { class: "muted" }, "The link looks broken or incomplete."),
    h("a", { class: "btn btn-primary", href: "/" }, "Make a new one"),
  );
  root.append(view);
  return () => view.remove();
}

export function mountGift(root: HTMLElement, c: BouquetConfig | null): () => void {
  if (!c) return lost(root);
  const reduced = prefersReducedMotion();
  const message = [...c.message];
  const view = h("main", { class: "gift" });
  root.append(view);
  let stop: (() => void) | null = null;
  let canvas: GridCanvas | null = null;

  const envelope = h("section", { class: "gift-envelope" },
    colorSpans(BUD, BUD_COLORS),
    h("p", { class: "muted" }, `${c.from || "Someone"} sent you`),
    h("h1", { class: "serif gift-title" }, "a bouquet"),
    h("button", { class: "btn btn-primary", type: "button", onclick: () => open() }, "✿ Open it"),
    h("p", { class: "muted small gift-footnote" }, "takes about 10 seconds ✿"),
  );
  view.append(envelope);

  function open() {
    envelope.remove();
    const canvasHost = h("div", { class: "gift-canvas" });
    const instant = reduced || message.length === 0;
    const msgEl = h("p", { class: "serif gift-message", "aria-live": "polite" }, instant ? c!.message : "");
    const caret = h("span", { class: "caret", "aria-hidden": "true" });
    const card = h("section", { class: "gift-card" },
      c!.to ? h("p", { class: "muted gift-to" }, `For ${c!.to}`) : null,
      h("div", { class: "gift-message-wrap" }, msgEl, instant ? null : caret),
      c!.from ? h("p", { class: "accent gift-from" }, `— ${c!.from}`) : null,
      legend(c!),
      h("footer", { class: "gift-footer" },
        h("span", { class: "muted small" }, "↻ drag · tap for petals"),
        h("a", { class: "accent small strong", href: "/" }, "send one too ✿"),
      ),
    );
    const stage = h("section", { class: "gift-stage" + (instant ? " is-done" : "") }, canvasHost, card);
    view.append(stage);
    canvas = new GridCanvas(canvasHost);
    stop = animate(c!, canvas, canvasHost, stage, msgEl, caret, message, reduced);
  }

  return () => {
    stop?.();
    canvas?.destroy();
    view.remove();
  };
}

function animate(c: BouquetConfig, gc: GridCanvas, host: HTMLElement, stage: HTMLElement, msgEl: HTMLElement, caret: HTMLElement, message: string[], reduced: boolean): () => void {
  const scene = buildScene(c);
  const start = performance.now();
  const hearts: Heart[] = Array.from({ length: 18 }, () => ({ x: Math.random(), y: Math.random(), speed: 0.02 + Math.random() * 0.04, phase: Math.random() * 6.28, color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] }));
  const petals: Petal[] = [];
  let angle = 0;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  let typed = reduced || message.length === 0 ? message.length : 0;
  let last = start;
  const autoSpin = reduced ? 0.15 : 0.6;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = downX = e.clientX;
    downY = e.clientY;
    velocity = 0;
    host.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    angle += dx * 0.01;
    velocity = dx * 0.6;
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) spawnPetals(e.clientX, e.clientY);
  };
  const spawnPetals = (x: number, y: number) => {
    const { col, row } = gc.cellAt(x, y);
    const now = performance.now();
    for (let i = 0; i < 12; i++) {
      const f = FLOWERS[c.flowers[Math.floor(Math.random() * c.flowers.length)].id];
      petals.push({ x: col, y: row, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 6, ch: "+*%#"[Math.floor(Math.random() * 4)], color: f.palette[2 + Math.floor(Math.random() * (f.palette.length - 2))], born: now });
    }
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", () => (dragging = false));

  const stopLoop = onFrame((now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    const bloom = reduced ? 1 : bloomEase(t, BLOOM_SECONDS);
    if (!dragging) {
      angle += (autoSpin + velocity) * dt;
      velocity *= Math.pow(0.95, dt * 60);
    }
    if (!reduced && typed < message.length && t > TYPE_DELAY) {
      const next = Math.min(message.length, Math.floor(((t - TYPE_DELAY) * 1000) / TYPE_MS));
      if (next !== typed) {
        typed = next;
        msgEl.textContent = message.slice(0, typed).join("");
      }
      if (typed === message.length) {
        caret.remove();
        stage.classList.add("is-done");
      }
    }
    if (!gc.cols) return;
    const g = renderFrame(scene, { cols: gc.cols, rows: gc.rows, t, angle, tilt: 0.3, bloom, cellAspect: gc.cellAspect });
    if (bloom > 0.6) drawHearts(g, hearts, t, dt);
    drawPetals(g, petals, now, dt);
    gc.draw(g);
  });

  return () => {
    stopLoop();
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerup", onUp);
  };
}

function put(g: Grid, col: number, row: number, ch: string, color: string, overwrite = false) {
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return;
  const i = row * g.cols + col;
  if (!overwrite && g.chars[i] !== " ") return;
  g.chars[i] = ch;
  g.colors[i] = color;
}

function drawHearts(g: Grid, hearts: Heart[], t: number, dt: number) {
  for (const p of hearts) {
    p.y -= p.speed * dt;
    if (p.y < 0) {
      p.y = 1;
      p.x = Math.random();
    }
    put(g, Math.floor((p.x + 0.015 * Math.sin(t * 1.2 + p.phase)) * g.cols), Math.floor(p.y * g.rows), "♥", p.color);
  }
}

function drawPetals(g: Grid, petals: Petal[], now: number, dt: number) {
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    if (now - p.born > 1500) {
      petals.splice(i, 1);
      continue;
    }
    p.vy += 18 * dt;
    p.vx *= 0.98;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    put(g, Math.round(p.x), Math.round(p.y), p.ch, p.color, true);
  }
}
