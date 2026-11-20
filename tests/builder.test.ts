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

const card = (id: string) => root.querySelector<HTMLElement>(`.flower[data-id="${id}"]`)!;
const toggle = (id: string) => card(id).querySelector<HTMLButtonElement>(".flower-toggle")!;
const plus = (id: string) => card(id).querySelector<HTMLButtonElement>(".flower-plus")!;
const minus = (id: string) => card(id).querySelector<HTMLButtonElement>(".flower-minus")!;
const qty = (id: string) => card(id).querySelector(".flower-qty")!.textContent;
const picked = (id: string) => toggle(id).getAttribute("aria-pressed") === "true";
const total = () => root.querySelector(".flower-total")!.textContent;
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
    expect(picked("rose")).toBe(true);
    expect(qty("rose")).toBe("2");
    expect(picked("tulip")).toBe(false);
    expect(total()).toBe("4 / 8 flowers");
  });

  test("tap adds one, plus and minus change the count, minus at one removes", () => {
    toggle("tulip").click();
    expect(qty("tulip")).toBe("1");
    plus("tulip").click();
    plus("tulip").click();
    expect(qty("tulip")).toBe("3");
    minus("tulip").click();
    expect(qty("tulip")).toBe("2");
    minus("tulip").click();
    minus("tulip").click();
    expect(picked("tulip")).toBe(false);
  });

  test("tapping a picked flower removes it", () => {
    toggle("daisy").click();
    expect(picked("daisy")).toBe(false);
    expect(total()).toBe("3 / 8 flowers");
  });

  test("never more than eight flowers in total", () => {
    for (let i = 0; i < 10; i++) plus("rose").click();
    expect(total()).toBe("8 / 8 flowers");
    expect(qty("rose")).toBe("6");
    expect(plus("rose").disabled).toBe(true);
    toggle("lily").click();
    expect(picked("lily")).toBe(false);
  });

  test("eight of the same flower", () => {
    toggle("daisy").click();
    toggle("sunflower").click();
    for (let i = 0; i < 6; i++) plus("rose").click();
    expect(qty("rose")).toBe("8");
    expect(shareCode()!.flowers).toEqual([{ id: "rose", count: 8 }]);
  });

  test("the last flower cannot be removed", () => {
    toggle("daisy").click();
    toggle("sunflower").click();
    toggle("rose").click();
    minus("rose").click();
    minus("rose").click();
    expect(picked("rose")).toBe(true);
    expect(qty("rose")).toBe("1");
    expect(minus("rose").disabled).toBe(true);
  });

  test("lily is offered", () => {
    toggle("lily").click();
    expect(picked("lily")).toBe(true);
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
