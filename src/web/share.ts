import { encodeConfig } from "../core/codec";
import type { BouquetConfig } from "../core/types";
import { h } from "./dom";

export function openShareDialog(c: BouquetConfig, origin: string): () => void {
  for (const old of document.querySelectorAll(".share-overlay")) old.dispatchEvent(new CustomEvent("share-close"));
  const code = encodeConfig(c);
  const link = `${origin}/#${code}`;
  const command = `curl -sN "${origin}/t/${code}?cols=$(tput cols)&rows=$(tput lines)"`;
  const name = c.to || "them";
  const opener = document.activeElement as HTMLElement | null;

  const copyBtn = h("button", { class: "btn btn-primary", type: "button" }, "Copy");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = "Copied ✓";
    } catch {
      linkEl.focus();
      getSelection()?.selectAllChildren(linkEl);
      copyBtn.textContent = "Select & copy";
    }
    setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
  });

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareBtn = canShare
    ? h("button", { class: "btn", type: "button", onclick: () => navigator.share({ title: "A bouquet for you ✿", url: link }).catch(() => undefined) }, "↗ Share…")
    : null;

  const linkEl = h("code", { class: "share-link", tabindex: "0" }, link);
  const cmdEl = h("code", { class: "share-terminal" }, h("span", { class: "accent" }, "$ "), command);
  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    opener?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  const dialog = h("div", { class: "share-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "share-title" },
    h("h2", { id: "share-title" }, h("span", { class: "accent" }, "✿ "), "Your bouquet is ready"),
    h("p", { class: "muted" }, `Send this link to ${name}. Everything lives inside the link, nothing is stored on our side.`),
    h("div", { class: "share-row" }, linkEl, copyBtn),
    h("div", { class: "share-actions" },
      shareBtn,
      h("a", { class: "btn", href: link, target: "_blank", rel: "noopener" }, `▶ Preview as ${c.to || "them"}`),
    ),
    h("div", { class: "share-term" }, h("p", { class: "muted small" }, "For a nerd? They can open it in a terminal:"), cmdEl),
    h("button", { class: "share-back muted small", type: "button", onclick: close }, "← back to edit"),
  );
  const overlay = h("div", { class: "share-overlay" }, dialog);
  overlay.addEventListener("share-close", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  copyBtn.focus();
  return close;
}
