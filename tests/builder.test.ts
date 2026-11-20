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

const flower = (id: string) => root.querySelector<HTMLButtonElement>(`.flower[data-id="${id}"]`)!;
const badge = (id: string) => flower(id).querySelector(".flower-count")?.textContent ?? "";
const button = (text: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const field = (name: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const shareCode = () => {
  button("Create link").click();
  const link = document.querySelector(".share-link")!.textContent!;
  return decodeConfig(link.split("#")[1]);
};

describe("mountBuilder", () => {
  test("starts from the default bouquet", () => {
    expect(flower("rose").getAttribute("aria-pressed")).toBe("true");
    expect(badge("rose")).toBe("×2");
    expect(flower("tulip").getAttribute("aria-pressed")).toBe("false");
  });

  test("tapping a flower cycles 1 → 2 → 3 → removed", () => {
    flower("tulip").click();
    expect(badge("tulip")).toBe("×1");
    flower("tulip").click();
    expect(badge("tulip")).toBe("×2");
    flower("tulip").click();
    expect(badge("tulip")).toBe("×3");
    flower("tulip").click();
    expect(flower("tulip").getAttribute("aria-pressed")).toBe("false");
  });

  test("a sixth flower is ignored", () => {
    for (const id of ["tulip", "lavender"]) flower(id).click();
    expect(root.querySelectorAll('.flower[aria-pressed="true"]').length).toBe(5);
    flower("babysbreath").click();
    expect(root.querySelectorAll('.flower[aria-pressed="true"]').length).toBe(5);
    expect(flower("babysbreath").getAttribute("aria-pressed")).toBe("false");
  });

  test("the last flower cannot be removed", () => {
    for (let i = 0; i < 3; i++) flower("daisy").click();
    for (let i = 0; i < 3; i++) flower("sunflower").click();
    expect(root.querySelectorAll('.flower[aria-pressed="true"]').length).toBe(1);
    for (let i = 0; i < 4; i++) flower("rose").click();
    expect(flower("rose").getAttribute("aria-pressed")).toBe("true");
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
