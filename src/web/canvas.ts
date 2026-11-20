import type { Grid } from "../core/render";

export interface GridCanvasOpts {
  maxFontSize?: number;
  minFontSize?: number;
  targetCols?: number;
  targetRows?: number;
}

export class GridCanvas {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private observer: ResizeObserver | null = null;
  private cellW = 8.4;
  private cellH = 16.8;
  private fontSize = 14;
  private opts: Required<GridCanvasOpts>;
  cols = 0;
  rows = 0;

  constructor(host: HTMLElement, opts: GridCanvasOpts = {}) {
    this.opts = { maxFontSize: opts.maxFontSize ?? 14, minFontSize: opts.minFontSize ?? 7, targetCols: opts.targetCols ?? 90, targetRows: opts.targetRows ?? 46 };
    this.el = document.createElement("div");
    this.el.className = "grid-canvas";
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.el.appendChild(this.canvas);
    host.appendChild(this.el);
    this.ctx = this.safeContext();
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.fit());
      this.observer.observe(this.el);
    }
    this.fit();
  }

  get cellAspect(): number {
    return this.cellH / this.cellW;
  }

  private safeContext(): CanvasRenderingContext2D | null {
    try {
      return this.canvas.getContext("2d");
    } catch {
      return null;
    }
  }

  private font(): string {
    return `500 ${this.fontSize}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
  }

  fit(): { cols: number; rows: number } {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    const ideal = Math.min(w / (this.opts.targetCols * 0.6), h / (this.opts.targetRows * 1.2));
    this.fontSize = Math.max(this.opts.minFontSize, Math.min(this.opts.maxFontSize, Math.floor(ideal || this.opts.maxFontSize)));
    if (this.ctx) {
      this.ctx.font = this.font();
      this.cellW = this.ctx.measureText("M").width || this.fontSize * 0.6;
    } else {
      this.cellW = this.fontSize * 0.6;
    }
    this.cellH = Math.round(this.fontSize * 1.2);
    const dpr = Math.min(3, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.font = this.font();
      this.ctx.textBaseline = "top";
    }
    this.cols = Math.max(10, Math.floor(w / this.cellW));
    this.rows = Math.max(6, Math.floor(h / this.cellH));
    return { cols: this.cols, rows: this.rows };
  }

  cellAt(clientX: number, clientY: number): { col: number; row: number } {
    const r = this.canvas.getBoundingClientRect();
    const ox = (r.width - this.cols * this.cellW) / 2;
    const oy = (r.height - this.rows * this.cellH) / 2;
    return { col: Math.floor((clientX - r.left - ox) / this.cellW), row: Math.floor((clientY - r.top - oy) / this.cellH) };
  }

  draw(g: Grid): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const ox = (w - g.cols * this.cellW) / 2;
    const oy = (h - g.rows * this.cellH) / 2;
    let current = "";
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const i = r * g.cols + c;
        const ch = g.chars[i];
        if (ch === " ") continue;
        const col = g.colors[i] || "#f4eff8";
        if (col !== current) {
          ctx.fillStyle = col;
          current = col;
        }
        ctx.fillText(ch, ox + c * this.cellW, oy + r * this.cellH);
      }
    }
  }

  destroy(): void {
    this.observer?.disconnect();
    this.el.remove();
  }
}

export async function fontsReady(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('500 14px "JetBrains Mono"'), document.fonts.load('italic 32px "Instrument Serif"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    return;
  }
}
