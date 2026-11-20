import { afterEach, describe, expect, test } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/catalog";
import { openShareDialog } from "../src/web/share";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("openShareDialog", () => {
  test("terminal command keeps https and sizes to the terminal", () => {
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    const cmd = document.querySelector(".share-terminal")!.textContent!;
    expect(cmd).toMatch(/^\$ curl -sN "https:\/\/x\.test\/t\/v1\.[A-Za-z0-9_-]+\?cols=\$\(tput cols\)&rows=\$\(tput lines\)"$/);
  });

  test("opening twice keeps a single dialog", () => {
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    openShareDialog(DEFAULT_CONFIG, "https://x.test");
    expect(document.querySelectorAll(".share-dialog").length).toBe(1);
  });
});
