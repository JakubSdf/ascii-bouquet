import { encodeConfig } from "../core/codec";
import type { BouquetConfig } from "../core/types";
import { h } from "./dom";
import { qrPng, qrSvg } from "./qr";

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

  const qrBox = h("div", { class: "share-qr", hidden: true });
  const qrBtn = h("button", { class: "btn", type: "button", "aria-expanded": "false" }, "◉ QR code");
  qrBtn.addEventListener("click", () => {
    const open = qrBox.hidden;
    if (open && !qrBox.firstChild) {
      const art = h("div", { class: "share-qr-art" });
      art.innerHTML = qrSvg(link);
      const save = h("button", { class: "link-btn accent", type: "button" }, "↓ Save image");
      save.addEventListener("click", async () => {
        const blob = await qrPng(link).catch(() => null);
        if (!blob) return;
        const a = h("a", { href: URL.createObjectURL(blob), download: `bouquet-for-${(c.to || "you").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      qrBox.append(art, h("div", { class: "share-qr-side" }, h("p", { class: "strong" }, "Scan to open"), h("p", { class: "muted small" }, "Print it on a card or tuck it into real flowers."), save));
    }
    qrBox.hidden = !open;
    qrBtn.setAttribute("aria-expanded", String(open));
  });

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
      qrBtn,
      h("a", { class: "btn", href: link, target: "_blank", rel: "noopener" }, `▶ Preview as ${c.to || "them"}`),
    ),
    qrBox,
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
