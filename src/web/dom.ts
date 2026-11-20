type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function onFrame(cb: (now: number) => void): () => void {
  let id = 0;
  let stopped = false;
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (f: FrameRequestCallback) => setTimeout(() => f(performance.now()), 33) as unknown as number;
  const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (n: number) => clearTimeout(n);
  const tick = (now: number) => {
    if (stopped) return;
    cb(now);
    id = raf(tick);
  };
  id = raf(tick);
  return () => {
    stopped = true;
    caf(id);
  };
}

export function colorSpans(lines: string[], colors: Record<string, string>): HTMLElement {
  const pre = h("pre", { class: "ascii", "aria-hidden": "true" });
  for (const [i, line] of lines.entries()) {
    if (i) pre.append("\n");
    for (const ch of line) {
      const c = colors[ch];
      pre.append(c ? h("span", { style: `color:${c}` }, ch) : ch);
    }
  }
  return pre;
}
