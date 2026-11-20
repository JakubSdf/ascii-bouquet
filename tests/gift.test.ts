import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_CONFIG, FLOWERS } from "../src/core/catalog";
import type { BouquetConfig } from "../src/core/types";
import { mountGift } from "../src/web/gift";

const cfg: BouquetConfig = { ...DEFAULT_CONFIG, to: "Anna", from: "Tom", message: "Every day with you blooms." };
let unmount: (() => void) | null = null;

function mount(c: BouquetConfig | null) {
  const root = document.createElement("div");
  document.body.appendChild(root);
  unmount = mountGift(root, c);
  return root;
}

function reducedMotion(on: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: on && q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
}

const openButton = (root: HTMLElement) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.includes("Open it")) as HTMLButtonElement;

afterEach(() => {
  unmount?.();
  unmount = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("mountGift", () => {
  test("lost bouquet", () => {
    const root = mount(null);
    expect(root.textContent).toContain("This bouquet got lost.");
    const link = [...root.querySelectorAll("a")].find((a) => a.textContent?.includes("Make a new one"));
    expect(link?.getAttribute("href")).toBe("/");
  });

  test("envelope names the sender", () => {
    reducedMotion(false);
    const root = mount(cfg);
    expect(root.textContent).toContain("Tom sent you");
    expect(openButton(root)).toBeTruthy();
  });

  test("anonymous sender", () => {
    reducedMotion(false);
    const root = mount({ ...cfg, from: "" });
    expect(root.textContent).toContain("Someone sent you");
  });

  test("opening removes the envelope", () => {
    reducedMotion(false);
    const root = mount(cfg);
    openButton(root).click();
    expect(root.querySelector(".gift-envelope")).toBeNull();
    expect(root.querySelector(".gift-stage")).not.toBeNull();
  });

  test("reduced motion shows the whole message at once", () => {
    reducedMotion(true);
    const root = mount(cfg);
    openButton(root).click();
    expect(root.querySelector(".gift-message")?.textContent).toBe(cfg.message);
    expect(root.textContent).toContain("For Anna");
    expect(root.textContent).toContain("— Tom");
  });

  test("an empty message still reveals the legend", () => {
    reducedMotion(false);
    const root = mount({ ...cfg, message: "" });
    openButton(root).click();
    expect(root.querySelector(".gift-stage")!.classList.contains("is-done")).toBe(true);
    expect(root.querySelector(".caret")).toBeNull();
  });

  test("legend lists exactly the picked flowers", () => {
    reducedMotion(true);
    const root = mount({ ...cfg, flowers: [{ id: "tulip", count: 1 }, { id: "lavender", count: 2 }] });
    openButton(root).click();
    const legend = root.querySelector(".gift-legend")!.textContent!;
    expect(legend).toContain(FLOWERS.tulip.meaning);
    expect(legend).toContain(FLOWERS.lavender.meaning);
    expect(legend).not.toContain(FLOWERS.sunflower.meaning);
    expect(legend).not.toContain(FLOWERS.rose.name.toLowerCase());
  });

  test("send one too links home", () => {
    reducedMotion(true);
    const root = mount(cfg);
    openButton(root).click();
    const link = [...root.querySelectorAll("a")].find((a) => a.textContent?.includes("send one too"));
    expect(link?.getAttribute("href")).toBe("/");
  });
});
