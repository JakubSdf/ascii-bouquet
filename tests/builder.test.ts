import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DEFAULT_CONFIG, LIMITS, OCCASIONS } from "../src/core/catalog";
import { decodeConfig } from "../src/core/codec";
import { mountBuilder } from "../src/web/builder";

let root: HTMLElement;
let unmount: () => void;

beforeEach(() => {
  sessionStorage.clear();
  root = document.createElement("div");
  document.body.appendChild(root);
  unmount = mountBuilder(root);
});

afterEach(() => {
  unmount();
  document.body.innerHTML = "";
});

const card = (id: string) => root.querySelector<HTMLButtonElement>(`.flower[data-id="${id}"]`)!;
const badge = (id: string) => card(id).querySelector(".flower-count")!.textContent;
const slots = () => [...root.querySelectorAll<HTMLElement>(".tray-slot")];
const stems = () => [...root.querySelectorAll<HTMLButtonElement>(".tray-slot.is-filled")];
const stemsOf = (id: string) => stems().filter((b) => b.dataset.id === id);
const total = () => root.querySelector(".tray-count")!.textContent;
const tab = (i: number) => root.querySelectorAll<HTMLButtonElement>(".progress-step")[i];
const activeStep = () => root.querySelector(".step.is-active")!.getAttribute("data-step");
const button = (text: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const field = (name: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const shareCode = () => {
  tab(2).click();
  button("Create link").click();
  const link = document.querySelector(".share-link")!.textContent!;
  return decodeConfig(link.split("#")[1]);
};

describe("mountBuilder", () => {
  test("starts from the default bouquet", () => {
    expect(slots().length).toBe(8);
    expect(stems().length).toBe(4);
    expect(stemsOf("rose").length).toBe(2);
    expect(badge("rose")).toBe("×2");
    expect(badge("tulip")).toBe("");
    expect(total()).toBe("4 / 8");
  });

  test("tapping a flower adds one stem", () => {
    card("tulip").click();
    card("tulip").click();
    expect(stemsOf("tulip").length).toBe(2);
    expect(badge("tulip")).toBe("×2");
    expect(total()).toBe("6 / 8");
  });

  test("tapping a stem in the bouquet removes it", () => {
    stemsOf("daisy")[0].click();
    expect(stemsOf("daisy").length).toBe(0);
    expect(card("daisy").getAttribute("aria-pressed")).toBe("false");
    stemsOf("rose")[0].click();
    expect(stemsOf("rose").length).toBe(1);
  });

  test("a full bouquet ignores more flowers and says why", () => {
    for (let i = 0; i < 6; i++) card("lily").click();
    expect(total()).toBe("8 / 8");
    expect(stemsOf("lily").length).toBe(4);
    expect(document.querySelector(".toast")!.textContent).toContain("full (8/8)");
  });

  test("eight of the same flower", () => {
    stemsOf("daisy")[0].click();
    stemsOf("sunflower")[0].click();
    for (let i = 0; i < 6; i++) card("rose").click();
    expect(stemsOf("rose").length).toBe(8);
    expect(shareCode()!.flowers).toEqual([{ id: "rose", count: 8 }]);
  });

  test("the last stem cannot be removed", () => {
    stemsOf("daisy")[0].click();
    stemsOf("sunflower")[0].click();
    stemsOf("rose")[0].click();
    stemsOf("rose")[0].click();
    expect(stems().length).toBe(1);
  });

  test("each picked flower has a remove button that takes one stem out", () => {
    const remove = (id: string) => root.querySelector<HTMLButtonElement>(`.flower-remove[data-id="${id}"]`)!;
    expect(remove("tulip").hidden).toBe(true);
    expect(remove("rose").hidden).toBe(false);
    remove("rose").click();
    expect(stemsOf("rose").length).toBe(1);
    expect(remove("rose").getAttribute("aria-label")).toBe("Take out a rose");
    remove("rose").click();
    expect(remove("rose").hidden).toBe(true);
  });

  test("forget-me-not is offered", () => {
    card("forgetmenot").click();
    expect(stemsOf("forgetmenot").length).toBe(1);
  });

  test("hovering a flower previews it", () => {
    const peek = () => document.querySelector<HTMLElement>(".flower-peek")!;
    card("lily").dispatchEvent(new Event("pointerenter"));
    expect(peek().hidden).toBe(false);
    expect(peek().textContent).toContain("Lily");
    expect(peek().textContent).toContain("renewal");
    card("lily").dispatchEvent(new Event("pointerleave"));
    expect(peek().hidden).toBe(true);
  });

  test("three steps: flowers, wrap, then occasion with the message", () => {
    expect(root.querySelectorAll(".progress-step").length).toBe(3);
    expect([...root.querySelectorAll(".progress-name")].map((n) => n.textContent)).toEqual(["Flowers", "Wrap", "Message"]);
    const last = root.querySelector('.step[data-step="2"]')!;
    expect(last.querySelector(".chip")).not.toBeNull();
    expect(last.querySelector('[name="message"]')).not.toBeNull();
  });

  test("a step-by-step wizard that can always go back", () => {
    expect(activeStep()).toBe("0");
    button("Next").click();
    expect(activeStep()).toBe("1");
    expect(tab(0).classList.contains("done")).toBe(true);
    expect(tab(0).querySelector(".progress-num")!.textContent).toBe("✓");
    tab(2).click();
    expect(activeStep()).toBe("2");
    expect(button("Create link")).toBeTruthy();
    tab(0).click();
    expect(activeStep()).toBe("0");
    expect(tab(0).querySelector(".progress-num")!.textContent).toBe("1");
    expect(tab(0).getAttribute("aria-current")).toBe("step");
  });

  test("message is limited to 120 characters", () => {
    type(field("message"), "x".repeat(130));
    expect([...field("message").value].length).toBe(LIMITS.message);
    expect(root.querySelector(".counter")!.textContent).toBe("120 / 120");
  });

  test("occasion fills an untouched message only", () => {
    button(OCCASIONS.birthday.label).click();
    expect(field("message").value).toBe(OCCASIONS.birthday.defaultMessage);
    type(field("message"), "My own words");
    button(OCCASIONS.sorry.label).click();
    expect(field("message").value).toBe("My own words");
  });

  test("create link encodes the current state", () => {
    type(field("to"), "Anička");
    type(field("from"), "Tom");
    root.querySelector<HTMLButtonElement>('.swatch[data-id="lilac"]')!.click();
    const c = shareCode();
    expect(c).toEqual({ ...DEFAULT_CONFIG, to: "Anička", from: "Tom", wrap: "lilac" });
    expect(document.querySelector(".share-terminal")!.textContent).toContain("/t/v1.");
  });

  test("escape closes the share dialog", () => {
    tab(2).click();
    button("Create link").click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector(".share-dialog")).toBeNull();
  });

  test("draft survives a remount", () => {
    type(field("to"), "Eva");
    unmount();
    unmount = mountBuilder(root);
    expect(field("to").value).toBe("Eva");
  });
});
