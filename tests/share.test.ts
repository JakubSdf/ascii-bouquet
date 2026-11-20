import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/catalog";
import { openShareDialog } from "../src/web/share";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("openShareDialog", () => {
  test("terminal command keeps https and sizes to the terminal", () => {
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    const cmd = document.querySelector(".share-terminal")!.textContent!;
    expect(cmd).toMatch(/^curl -sN "https:\/\/x\.test\/t\/v1\.[A-Za-z0-9_-]+\?cols=\$\(tput cols\)&rows=\$\(tput lines\)"$/);
  });

  test("copying the link shows a toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    document.querySelector<HTMLButtonElement>(".share-row button")!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText.mock.calls[0][0]).toMatch(/^https:\/\/x\.test\/#v1\./);
    expect(document.querySelector(".toast")!.textContent).toBe("Link copied ✓");
    vi.unstubAllGlobals();
  });

  test("QR code is shown right away", () => {
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    expect(document.querySelector(".share-qr svg")).not.toBeNull();
    expect(document.querySelector(".share-qr")!.textContent).toContain("Scan to open");
  });

  test("terminal command has its own copy button without the prompt", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    document.querySelector<HTMLButtonElement>(".share-term button")!.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/^curl -sN "https:\/\/x\.test\/t\/v1\./);
    await Promise.resolve();
    expect(document.querySelector(".toast")!.textContent).toBe("Command copied ✓");
    vi.unstubAllGlobals();
  });

  test("opening twice keeps a single dialog", () => {
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    expect(document.querySelectorAll(".share-dialog").length).toBe(1);
  });
});
