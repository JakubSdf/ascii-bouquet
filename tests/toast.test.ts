import { afterEach, describe, expect, test, vi } from "vitest";
import { showToast } from "../src/web/toast";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("showToast", () => {
  test("announces the message politely and goes away", () => {
    vi.useFakeTimers();
    showToast("Link copied ✓");
    const region = document.querySelector(".toast-region")!;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toContain("Link copied ✓");
    vi.advanceTimersByTime(3000);
    expect(region.textContent).not.toContain("Link copied ✓");
  });

  test("a new toast replaces the previous one", () => {
    showToast("one");
    showToast("two");
    expect(document.querySelectorAll(".toast").length).toBe(1);
    expect(document.querySelector(".toast")!.textContent).toBe("two");
  });
});
