import { DEFAULT_CONFIG, FLOWERS, LIMITS, OCCASIONS, WRAPS } from "../core/catalog";
import { decodeConfig, encodeConfig } from "../core/codec";
import { bloomEase, renderFrame } from "../core/render";
import { buildPortrait, buildScene, type Scene } from "../core/scene";
import type { BouquetConfig, FlowerId, OccasionId, WrapId } from "../core/types";
import { GridCanvas } from "./canvas";
import { h, onFrame, prefersReducedMotion } from "./dom";
import { REPO_URL } from "./links";
import { openShareDialog } from "./share";

const DRAFT_KEY = "ascii-bouquet:draft";
const STEPS = ["Flowers", "Wrap & palette", "Occasion", "Message"];

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

export function mountBuilder(root: HTMLElement): () => void {
  const draft = loadDraft();
  const state = draft.config;
  let step = 0;
  let scene: Scene = buildScene(state);
  let bloomStart = -1e9;
  const reduced = prefersReducedMotion();

  const persist = () => saveDraft({ config: state, touched: draft.touched });

  const peek = flowerPeek();
  const flowerCards = new Map<FlowerId, { card: HTMLElement; toggle: HTMLButtonElement; minus: HTMLButtonElement; plus: HTMLButtonElement; qty: HTMLElement }>();
  const flowerGrid = h("div", { class: "flower-grid" });
  const flowerTotal = h("span", { class: "flower-total muted small" });
  for (const [id, spec] of Object.entries(FLOWERS) as [FlowerId, (typeof FLOWERS)[FlowerId]][]) {
    const toggle = h("button", { class: "flower-toggle", type: "button", "aria-pressed": "false" },
      h("span", { class: "flower-glyph", style: `color:${spec.palette[spec.palette.length - 2]}` }, spec.glyph),
      h("span", { class: "flower-name" }, spec.name),
      h("span", { class: "flower-meaning" }, spec.meaning),
    );
    const minus = h("button", { class: "flower-minus", type: "button", "aria-label": `One ${spec.name.toLowerCase()} less` }, "−");
    const plus = h("button", { class: "flower-plus", type: "button", "aria-label": `One ${spec.name.toLowerCase()} more` }, "+");
    const qty = h("span", { class: "flower-qty", "aria-live": "polite" });
    const card = h("div", { class: "flower", "data-id": id }, toggle, h("div", { class: "flower-stepper" }, minus, qty, plus));
    toggle.addEventListener("click", () => toggleFlower(id, card));
    card.addEventListener("pointerenter", (e) => {
      if ((e as PointerEvent).pointerType !== "touch") peek.show(id, card);
    });
    card.addEventListener("pointerleave", () => peek.hide());
    toggle.addEventListener("focus", () => peek.show(id, card));
    toggle.addEventListener("blur", () => peek.hide());
    minus.addEventListener("click", () => adjustCount(id, -1));
    plus.addEventListener("click", () => adjustCount(id, 1, card));
    flowerCards.set(id, { card, toggle, minus, plus, qty });
    flowerGrid.append(card);
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

  const summaries: HTMLElement[] = [];
  const heads: HTMLButtonElement[] = [];
  const section = (i: number, hint: string | null, ...content: Node[]) => {
    const summary = h("span", { class: "step-summary" });
    const head = h("button", { class: "step-head", type: "button", "aria-expanded": "false", onclick: () => go(i) },
      h("span", { class: "accent step-num" }, String(i + 1).padStart(2, "0")),
      h("span", { class: "step-name" }, STEPS[i]),
      hint ? h("span", { class: "muted small step-hint" }, hint) : null,
      summary,
      h("span", { class: "step-chevron", "aria-hidden": "true" }, "›"),
    );
    summaries.push(summary);
    heads.push(head);
    return h("section", { class: "step", "data-step": i }, head, h("div", { class: "step-body" }, ...content));
  };

  const steps = [
    section(0, "up to 8 in total", flowerTotal, flowerGrid),
    section(1, null, swatchRow),
    section(2, null, chipRow),
    section(3, null,
      h("div", { class: "field-row" }, textField("to", "To", "Anna"), textField("from", "From", "Tom")),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Note ", counter), messageInput),
    ),
  ];

  const create = () => openShareDialog(state, location.origin);
  const createBtn = h("button", { class: "btn btn-primary create", type: "button", onclick: create }, "Create link →");
  const backBtn = h("button", { class: "btn", type: "button", "aria-label": "Previous step", onclick: () => go(step - 1) }, "←");
  const nextBtn = h("button", { class: "btn btn-primary", type: "button", onclick: () => (step < STEPS.length - 1 ? go(step + 1) : create()) });
  const progress = h("div", { class: "progress" });
  const progressLabel = h("span", { class: "progress-label" });

  const previewTitle = h("span", { class: "muted small" });
  const previewMsg = h("p", { class: "serif preview-message" });
  const previewFrom = h("p", { class: "accent preview-from" });
  const canvasHost = h("div", { class: "preview-canvas" });
  const preview = h("section", { class: "preview" },
    h("div", { class: "window" },
      h("div", { class: "window-bar" }, h("i", { class: "dot r" }), h("i", { class: "dot y" }), h("i", { class: "dot g" }), previewTitle),
      h("div", { class: "window-body" }, canvasHost, previewMsg, previewFrom),
    ),
    h("div", { class: "hints muted small" },
      h("span", {}, "↻ live preview"),
      h("button", { class: "link-btn", type: "button", onclick: () => (bloomStart = performance.now()) }, "▶ replay bloom"),
    ),
  );

  const view = h("main", { class: "builder" },
    h("header", { class: "topbar" },
      h("a", { class: "logo", href: "/" }, h("span", { class: "accent" }, "✿"), "ascii-bouquet"),
      h("nav", {},
        h("a", { href: `${REPO_URL}#how-it-works`, target: "_blank", rel: "noopener" }, "How it works"),
        h("a", { class: "hide-sm", href: `${REPO_URL}#open-one-in-your-terminal`, target: "_blank", rel: "noopener" }, "Run it in your terminal"),
        h("a", { href: REPO_URL, target: "_blank", rel: "noopener" }, "GitHub ★"),
      ),
    ),
    h("div", { class: "builder-body" },
      h("aside", { class: "controls" },
        h("div", { class: "intro" }, h("h1", {}, "Make someone a bouquet."), h("p", { class: "muted" }, "Pick flowers, write a note, send a link.")),
        h("div", { class: "wizard" }, progress, progressLabel),
        ...steps,
        h("div", { class: "spacer" }),
        createBtn,
        h("div", { class: "bottom-bar" }, backBtn, nextBtn),
      ),
      preview,
    ),
  );
  root.append(view);

  const totalCount = () => state.flowers.reduce((n, f) => n + f.count, 0);

  function shake(el: HTMLElement) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }

  function toggleFlower(id: FlowerId, card: HTMLElement) {
    const i = state.flowers.findIndex((f) => f.id === id);
    if (i >= 0) {
      if (state.flowers.length === 1) return shake(card);
      state.flowers.splice(i, 1);
    } else {
      if (totalCount() >= LIMITS.maxTotal) return shake(card);
      state.flowers.push({ id, count: 1 });
    }
    changed(true);
  }

  function adjustCount(id: FlowerId, delta: number, card?: HTMLElement) {
    const i = state.flowers.findIndex((f) => f.id === id);
    if (i < 0) return;
    const f = state.flowers[i];
    if (delta > 0) {
      if (totalCount() >= LIMITS.maxTotal) return card && shake(card);
      f.count += 1;
    } else if (f.count > 1) f.count -= 1;
    else if (state.flowers.length > 1) state.flowers.splice(i, 1);
    else return;
    changed(true);
  }

  function go(i: number) {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    sync();
  }

  function changed(geometry: boolean) {
    if (geometry) {
      scene = buildScene(state);
      if (!reduced) bloomStart = performance.now() - 2600;
    }
    persist();
    sync();
  }

  function sync() {
    const total = totalCount();
    flowerTotal.textContent = `${total} / ${LIMITS.maxTotal} flowers`;
    for (const [id, c] of flowerCards) {
      const f = state.flowers.find((x) => x.id === id);
      c.card.classList.toggle("is-picked", !!f);
      c.toggle.setAttribute("aria-pressed", String(!!f));
      c.qty.textContent = f ? String(f.count) : "";
      c.plus.disabled = !f || total >= LIMITS.maxTotal;
      c.minus.disabled = !f || (f.count === 1 && state.flowers.length === 1);
    }
    for (const [id, btn] of swatches) btn.setAttribute("aria-pressed", String(id === state.wrap));
    wrapLabel.textContent = WRAPS[state.wrap].label;
    for (const [id, btn] of chips) btn.setAttribute("aria-pressed", String(id === state.occasion));
    counter.textContent = `${[...state.message].length} / ${LIMITS.message}`;
    previewTitle.textContent = `~/for-${(state.to || "you").toLowerCase().replace(/\s+/g, "-")} — live preview`;
    previewMsg.textContent = state.message;
    previewFrom.textContent = state.from ? `— ${state.from}` : "";
    steps.forEach((s, i) => s.classList.toggle("is-active", i === step));
    heads.forEach((b, i) => b.setAttribute("aria-expanded", String(i === step)));
    summaries[0].textContent = `${state.flowers.map((f) => FLOWERS[f.id].name + (f.count > 1 ? ` ×${f.count}` : "")).join(", ")} · ${total}/${LIMITS.maxTotal}`;
    summaries[1].textContent = WRAPS[state.wrap].label;
    summaries[2].textContent = `${OCCASIONS[state.occasion].icon} ${OCCASIONS[state.occasion].label}`;
    summaries[3].textContent = [state.to && `to ${state.to}`, state.message && `“${state.message}”`].filter(Boolean).join(" · ") || "add a note";
    progress.replaceChildren(...STEPS.map((_, i) => h("i", { class: i === step ? "on" : i < step ? "done" : "" })));
    progressLabel.textContent = `${step + 1} / ${STEPS.length}  ${STEPS[step]}`;
    backBtn.disabled = step === 0;
    nextBtn.textContent = step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].toLowerCase()} →` : "Create link →";
  }

  sync();
  const gc = new GridCanvas(canvasHost, { targetCols: 96, targetRows: 44 });
  const start = performance.now();
  const stop = onFrame((now) => {
    const t = (now - start) / 1000;
    const bloom = reduced ? 1 : bloomEase((now - bloomStart) / 1000, 6);
    gc.draw(renderFrame(scene, { cols: gc.cols, rows: gc.rows, t, angle: t * (reduced ? 0.15 : 0.6), tilt: 0.3, bloom, cellAspect: gc.cellAspect }));
  });

  return () => {
    stop();
    gc.destroy();
    peek.destroy();
    view.remove();
  };
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
