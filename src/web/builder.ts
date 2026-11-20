import { DEFAULT_CONFIG, FLOWERS, LIMITS, OCCASIONS, WRAPS } from "../core/catalog";
import { decodeConfig, encodeConfig } from "../core/codec";
import { bloomFrom, renderFrame, type Grid } from "../core/render";
import { buildPortrait, buildScene, type Scene } from "../core/scene";
import type { BouquetConfig, FlowerId, OccasionId, WrapId } from "../core/types";
import { GridCanvas } from "./canvas";
import { h, onFrame, prefersReducedMotion } from "./dom";
import { REPO_URL } from "./links";
import { openShareDialog } from "./share";
import { showToast } from "./toast";

const DRAFT_KEY = "ascii-bouquet:draft";
const STEPS = ["Flowers", "Wrap", "Message"];

interface Draft {
  config: BouquetConfig;
  touched: boolean;
}

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      const config = decodeConfig(encodeConfig(d.config));
      if (config) return { config, touched: !!d.touched };
    }
  } catch {
    return { config: structuredClone(DEFAULT_CONFIG), touched: false };
  }
  return { config: structuredClone(DEFAULT_CONFIG), touched: false };
}

function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    return;
  }
}

const clip = (s: string, max: number) => [...s].slice(0, max).join("");

export function snapPreview(height: number, velocity: number, min: number, max: number): number {
  if (Math.abs(velocity) > 0.5) return velocity > 0 ? max : min;
  return height - min < max - height ? min : max;
}

const glyphColor = (id: FlowerId) => FLOWERS[id].palette[FLOWERS[id].palette.length - 2];

export function mountBuilder(root: HTMLElement): () => void {
  const draft = loadDraft();
  const state = draft.config;
  let step = 0;
  let scene: Scene = buildScene(state);
  let replay = { start: -1e9, from: 1, dur: 1 };
  let burstStart = -1e9;
  let typeStart = -1e9;
  const reduced = prefersReducedMotion();

  const persist = () => saveDraft({ config: state, touched: draft.touched });
  const totalCount = () => state.flowers.reduce((n, f) => n + f.count, 0);

  const peek = flowerPeek();
  const trayCount = h("span", { class: "tray-count" });
  const traySlots = h("div", { class: "tray-slots" });
  const tray = h("div", { class: "tray" },
    h("div", { class: "tray-head" }, h("span", { class: "strong" }, "Your bouquet"), trayCount),
    traySlots,
    h("p", { class: "muted small tray-hint" }, "Tap a flower to add it. Tap a stem above to take it out."),
  );

  const flowerCards = new Map<FlowerId, { card: HTMLButtonElement; count: HTMLElement; remove: HTMLButtonElement; cell: HTMLElement }>();
  const flowerGrid = h("div", { class: "flower-grid" });
  for (const [id, spec] of Object.entries(FLOWERS) as [FlowerId, (typeof FLOWERS)[FlowerId]][]) {
    const count = h("span", { class: "flower-count" });
    const card = h("button", { class: "flower", type: "button", "data-id": id, "aria-pressed": "false", "aria-label": `Add a ${spec.name.toLowerCase()}` },
      h("span", { class: "flower-glyph", style: `color:${glyphColor(id)}` }, spec.glyph),
      h("span", { class: "flower-name" }, spec.name),
      h("span", { class: "flower-meaning" }, spec.meaning),
      count,
    );
    card.addEventListener("click", () => addFlower(id, card));
    card.addEventListener("pointerenter", (e) => {
      if ((e as PointerEvent).pointerType !== "touch") peek.show(id, card);
    });
    card.addEventListener("pointerleave", () => peek.hide());
    card.addEventListener("focus", () => peek.show(id, card));
    card.addEventListener("blur", () => peek.hide());
    const remove = h("button", { class: "flower-remove", type: "button", "data-id": id, "aria-label": `Take out a ${spec.name.toLowerCase()}`, hidden: true }, "−");
    remove.addEventListener("click", () => removeStem(id, cell));
    const cell = h("div", { class: "flower-cell" }, card, remove);
    flowerCards.set(id, { card, count, remove, cell });
    flowerGrid.append(cell);
  }

  const swatches = new Map<WrapId, HTMLButtonElement>();
  const wrapLabel = h("span", { class: "muted small" });
  const swatchRow = h("div", { class: "swatch-row" });
  for (const [id, w] of Object.entries(WRAPS) as [WrapId, (typeof WRAPS)[WrapId]][]) {
    const btn = h("button", { class: "swatch", type: "button", "data-id": id, "aria-label": w.label, "aria-pressed": "false", style: `--swatch:${w.swatch}` });
    btn.addEventListener("click", () => {
      state.wrap = id;
      changed(true);
    });
    swatches.set(id, btn);
    swatchRow.append(btn);
  }
  swatchRow.append(wrapLabel);

  const chips = new Map<OccasionId, HTMLButtonElement>();
  const chipRow = h("div", { class: "chip-row" });
  for (const [id, o] of Object.entries(OCCASIONS) as [OccasionId, (typeof OCCASIONS)[OccasionId]][]) {
    const btn = h("button", { class: "chip", type: "button", "aria-pressed": "false" }, `${o.icon} ${o.label}`);
    btn.addEventListener("click", () => {
      state.occasion = id;
      if (!draft.touched) {
        state.message = o.defaultMessage;
        messageInput.value = state.message;
      }
      changed(false);
    });
    chips.set(id, btn);
    chipRow.append(btn);
  }

  const textField = (name: "to" | "from", label: string, placeholder: string) => {
    const input = h("input", { name, type: "text", autocomplete: "off", maxlength: LIMITS.name * 2, placeholder, value: state[name] });
    input.addEventListener("input", () => {
      state[name] = clip(input.value, LIMITS.name);
      if (input.value !== state[name]) input.value = state[name];
      changed(false);
    });
    return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input);
  };
  const messageInput = h("textarea", { name: "message", rows: 3, maxlength: LIMITS.message * 2 });
  messageInput.value = state.message;
  const counter = h("span", { class: "counter" });
  messageInput.addEventListener("input", () => {
    draft.touched = true;
    state.message = clip(messageInput.value, LIMITS.message);
    if (messageInput.value !== state.message) messageInput.value = state.message;
    changed(false);
  });

  const STEP_HINTS = ["Pick up to 8 flowers.", "Choose the paper and ribbon.", "Pick the occasion, then write your note."];
  const section = (i: number, ...content: Node[]) =>
    h("section", { class: "step", "data-step": i }, h("p", { class: "step-hint muted" }, STEP_HINTS[i]), ...content);

  const stepsEl = h("div", { class: "steps" });
  const steps = [
    section(0, tray, flowerGrid),
    section(1, swatchRow),
    section(2,
      h("div", { class: "field" }, h("span", { class: "field-label" }, "Occasion"), chipRow),
      h("div", { class: "field-row" }, textField("to", "To", "Anna"), textField("from", "From", "Tom")),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Note ", counter), messageInput),
    ),
  ];

  stepsEl.append(...steps);
  const create = () => openShareDialog(state, location.origin);
  const backBtn = h("button", { class: "btn", type: "button", "aria-label": "Previous step", onclick: () => go(step - 1) }, "←");
  const nextBtn = h("button", { class: "btn btn-primary", type: "button", onclick: () => (step < STEPS.length - 1 ? go(step + 1) : create()) });
  const tabs = STEPS.map((name, i) =>
    h("button", { class: "progress-step", type: "button", onclick: () => go(i) },
      h("i", { "aria-hidden": "true" }),
      h("span", { class: "progress-num" }, String(i + 1)),
      h("span", { class: "progress-name" }, name),
    ),
  );
  const progress = h("nav", { class: "progress", "aria-label": "Steps" }, ...tabs);

  const handle = h("button", { class: "preview-handle", type: "button", "aria-label": "Resize the preview", "aria-expanded": "false" }, h("span", { class: "preview-grip" }));
  const previewTitle = h("span", { class: "muted small" });
  const previewMsg = h("p", { class: "serif preview-message" });
  const previewFrom = h("p", { class: "accent preview-from" });
  const canvasHost = h("div", { class: "preview-canvas" });
  const preview = h("section", { class: "preview" },
    h("div", { class: "window" },
      h("div", { class: "window-bar" }, h("i", { class: "dot r" }), h("i", { class: "dot y" }), h("i", { class: "dot g" }), previewTitle),
      h("div", { class: "window-body" }, canvasHost, previewMsg, previewFrom),
    ),
    handle,
    h("div", { class: "hints muted small" },
      h("span", {}, "↻ live preview"),
      h("button", { class: "link-btn", type: "button", onclick: () => (replay = { start: performance.now(), from: 0, dur: 5 }) }, "▶ replay bloom"),
    ),
  );

  const view = h("main", { class: "builder" },
    h("header", { class: "topbar" },
      h("a", { class: "logo", href: "/" }, h("span", { class: "accent" }, "✿"), "ascii-bouquet"),
      h("nav", {},
        h("a", { class: "hide-xs", href: REPO_URL, target: "_blank", rel: "noopener" }, "How it works"),
        h("a", { class: "hide-sm", href: `${REPO_URL}#open-a-bouquet-in-your-terminal`, target: "_blank", rel: "noopener" }, "Run it in your terminal"),
        h("a", { href: REPO_URL, target: "_blank", rel: "noopener" }, "GitHub ★"),
      ),
    ),
    h("div", { class: "builder-body" },
      h("aside", { class: "controls" },
        h("div", { class: "intro" }, h("h1", {}, "Make someone a bouquet."), h("p", { class: "muted" }, "Three quick steps, then send a link.")),
        progress,
        stepsEl,
        h("div", { class: "bottom-bar" }, backBtn, nextBtn),
      ),
      preview,
    ),
  );
  root.append(view);

  const sizes = () => {
    const vh = window.innerHeight || 700;
    const min = Math.round(vh * 0.24);
    return { min, max: Math.max(min + 80, Math.min(Math.round(vh * 0.68), vh - 250)) };
  };
  let expanded = false;
  let drag: { y: number; h: number; t: number; v: number; moved: boolean } | null = null;
  let suppressClick = false;
  const setHeight = (px: number) => view.style.setProperty("--preview-h", `${Math.round(px)}px`);
  const setExpanded = (on: boolean) => {
    const { min, max } = sizes();
    expanded = on;
    setHeight(on ? max : min);
    handle.setAttribute("aria-expanded", String(on));
  };
  handle.addEventListener("pointerdown", (e) => {
    drag = { y: e.clientY, h: canvasHost.getBoundingClientRect().height, t: performance.now(), v: 0, moved: false };
    handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 6 && !drag.moved) {
      drag.moved = true;
      view.classList.add("is-dragging");
    }
    if (!drag.moved) return;
    const { min, max } = sizes();
    const now = performance.now();
    const next = Math.min(max * 1.06, Math.max(min * 0.85, drag.h + dy));
    const prev = parseFloat(view.style.getPropertyValue("--preview-h")) || drag.h;
    drag.v = (next - prev) / Math.max(1, now - drag.t);
    drag.t = now;
    setHeight(next);
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) {
      const { min, max } = sizes();
      const current = parseFloat(view.style.getPropertyValue("--preview-h")) || min;
      view.classList.remove("is-dragging");
      setExpanded(snapPreview(current, drag.v, min, max) === max);
      suppressClick = true;
    }
    drag = null;
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);
  handle.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setExpanded(!expanded);
  });
  handle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") setExpanded(true);
    else if (e.key === "ArrowUp") setExpanded(false);
    else return;
    e.preventDefault();
  });

  function shake(el: HTMLElement) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }

  function addFlower(id: FlowerId, card: HTMLElement) {
    if (totalCount() >= LIMITS.maxTotal) {
      shake(card);
      shake(traySlots);
      showToast(`The bouquet is full (${LIMITS.maxTotal}/${LIMITS.maxTotal}). Tap a stem to take one out.`);
      return;
    }
    const f = state.flowers.find((x) => x.id === id);
    if (f) f.count += 1;
    else state.flowers.push({ id, count: 1 });
    changed(true);
  }

  function removeStem(id: FlowerId, slot: HTMLElement) {
    const i = state.flowers.findIndex((x) => x.id === id);
    if (i < 0) return;
    if (totalCount() <= 1) {
      shake(slot);
      showToast("A bouquet needs at least one flower.");
      return;
    }
    const f = state.flowers[i];
    if (f.count > 1) f.count -= 1;
    else state.flowers.splice(i, 1);
    changed(true);
  }

  function go(i: number) {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    const forward = next > step;
    const left = step;
    step = next;
    stepsEl.dataset.dir = forward ? "forward" : "back";
    sync();
    if (!forward || reduced) return;
    const now = performance.now();
    burstStart = now;
    const done = tabs[left];
    done.classList.remove("just-done");
    void done.offsetWidth;
    done.classList.add("just-done");
    if (left === 0) replay = { start: now, from: 0.15, dur: 3 };
    else replay = { start: now, from: 0.4, dur: 2.2 };
    if (step === STEPS.length - 1) typeStart = now + 400;
  }

  function changed(geometry: boolean) {
    if (geometry) {
      scene = buildScene(state);
      if (!reduced) replay = { start: performance.now(), from: 0.5, dur: 1.6 };
    }
    typeStart = -1e9;
    persist();
    sync();
  }

  function renderTray() {
    const stems = state.flowers.flatMap((f) => Array.from({ length: f.count }, () => f.id));
    traySlots.replaceChildren(
      ...Array.from({ length: LIMITS.maxTotal }, (_, i) => {
        const id = stems[i];
        if (!id) return h("span", { class: "tray-slot", "aria-hidden": "true" });
        const slot = h("button", { class: "tray-slot is-filled", type: "button", "data-id": id, "aria-label": `Take out a ${FLOWERS[id].name.toLowerCase()}`, title: `Take out ${FLOWERS[id].name.toLowerCase()}`, style: `--stem:${glyphColor(id)}` },
          h("span", { style: `color:${glyphColor(id)}` }, FLOWERS[id].glyph),
        );
        slot.addEventListener("click", () => removeStem(id, slot));
        return slot;
      }),
    );
  }

  function sync() {
    const total = totalCount();
    trayCount.textContent = `${total} / ${LIMITS.maxTotal}`;
    renderTray();
    for (const [id, c] of flowerCards) {
      const f = state.flowers.find((x) => x.id === id);
      c.card.setAttribute("aria-pressed", String(!!f));
      c.count.textContent = f ? `×${f.count}` : "";
      c.card.classList.toggle("is-full", total >= LIMITS.maxTotal);
      c.remove.hidden = !f;
      c.cell.classList.toggle("is-picked", !!f);
    }
    for (const [id, btn] of swatches) btn.setAttribute("aria-pressed", String(id === state.wrap));
    wrapLabel.textContent = WRAPS[state.wrap].label;
    for (const [id, btn] of chips) btn.setAttribute("aria-pressed", String(id === state.occasion));
    counter.textContent = `${[...state.message].length} / ${LIMITS.message}`;
    previewTitle.textContent = `~/for-${(state.to || "you").toLowerCase().replace(/\s+/g, "-")} — live preview`;
    previewFrom.textContent = state.from ? `— ${state.from}` : "";
    steps.forEach((s, i) => s.classList.toggle("is-active", i === step));
    tabs.forEach((t, i) => {
      t.classList.toggle("on", i === step);
      t.classList.toggle("done", i < step);
      t.querySelector(".progress-num")!.textContent = i < step ? "✓" : String(i + 1);
      if (i === step) t.setAttribute("aria-current", "step");
      else t.removeAttribute("aria-current");
    });
    backBtn.disabled = step === 0;
    nextBtn.textContent = step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].toLowerCase()} →` : "Create link →";
  }

  sync();
  const gc = new GridCanvas(canvasHost, { targetCols: 96, targetRows: 44 });
  const start = performance.now();
  const stop = onFrame((now) => {
    const t = (now - start) / 1000;
    const bloom = reduced ? 1 : bloomFrom((now - replay.start) / 1000, replay.from, replay.dur);
    const g = renderFrame(scene, { cols: gc.cols, rows: gc.rows, t, angle: t * (reduced ? 0.15 : 0.6), tilt: 0.3, bloom, cellAspect: gc.cellAspect });
    const since = now - burstStart;
    if (since < 1100) drawBurst(g, since / 1100, gc.cellAspect);
    gc.draw(g);
    const chars = [...state.message];
    const n = now < typeStart ? 0 : typeStart > 0 ? Math.min(chars.length, Math.floor((now - typeStart) / 28)) : chars.length;
    const shown = chars.slice(0, n).join("");
    if (previewMsg.textContent !== shown) previewMsg.textContent = shown;
  });

  return () => {
    stop();
    gc.destroy();
    peek.destroy();
    view.remove();
  };
}

const BURST = ["*", "+", "·", "*", "♥"];
const BURST_COLORS = ["#ffd7ff", "#ffafd7", "#ff87af", "#ff5f87", "#d7005f"];

function drawBurst(g: Grid, p: number, aspect: number) {
  const ease = 1 - (1 - p) ** 3;
  const cx = g.cols / 2;
  const cy = g.rows / 2;
  const R = Math.min(g.rows * 0.48, g.cols / aspect / 2);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2 + (k % 2) * 0.11;
    const r = R * (0.55 + 0.45 * ease) * (k % 3 === 0 ? 1 : 0.86);
    const col = Math.round(cx + Math.cos(a) * r * aspect);
    const row = Math.round(cy + Math.sin(a) * r);
    if (col < 1 || row < 1 || col >= g.cols - 1 || row >= g.rows - 1) continue;
    const i = row * g.cols + col;
    if (g.chars[i] !== " ") continue;
    g.chars[i] = BURST[(k + Math.floor(p * 6)) % BURST.length];
    g.colors[i] = BURST_COLORS[Math.min(BURST_COLORS.length - 1, Math.floor(p * BURST_COLORS.length))];
  }
}

function flowerPeek() {
  const name = h("p", { class: "strong" });
  const meaning = h("p", { class: "muted small" });
  const host = h("div", { class: "flower-peek-canvas" });
  const el = h("div", { class: "flower-peek", hidden: true, "aria-hidden": "true" }, host, h("div", { class: "flower-peek-text" }, name, meaning));
  document.body.append(el);
  let gc: GridCanvas | null = null;
  let stop: (() => void) | null = null;
  let current: FlowerId | null = null;

  const hide = () => {
    el.hidden = true;
    current = null;
    stop?.();
    stop = null;
  };

  const show = (id: FlowerId, anchor: HTMLElement) => {
    if (current === id && !el.hidden) return;
    hide();
    current = id;
    const spec = FLOWERS[id];
    name.textContent = spec.name;
    meaning.textContent = spec.meaning;
    el.hidden = false;
    const r = anchor.getBoundingClientRect();
    const panel = anchor.closest(".controls")?.getBoundingClientRect() ?? r;
    const w = 240;
    const left = panel.right + 16 + w < window.innerWidth ? panel.right + 16 : Math.max(8, r.left - w - 12);
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - 220, r.top - 20))}px`;
    gc ??= new GridCanvas(host, { targetCols: 40, targetRows: 18, maxFontSize: 10, minFontSize: 6 });
    gc.fit();
    const scene = buildPortrait(id);
    const start = performance.now();
    const reduced = prefersReducedMotion();
    stop = onFrame((now) => {
      const t = (now - start) / 1000;
      gc!.draw(renderFrame(scene, { cols: gc!.cols, rows: gc!.rows, t, angle: 0.4 + t * (reduced ? 0 : 0.8), tilt: 0.15, bloom: 1, cellAspect: gc!.cellAspect }));
    });
  };

  return { show, hide, destroy: () => (hide(), gc?.destroy(), el.remove()) };
}
