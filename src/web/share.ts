import { encodeConfig } from "../core/codec";
import type { BouquetConfig } from "../core/types";
import { h } from "./dom";
import { qrPng, qrSvg } from "./qr";
import { showToast } from "./toast";

function copyButton(label: string, text: () => string, className: string, fallbackEl: HTMLElement, done: string): HTMLButtonElement {
  const btn = h("button", { class: className, type: "button" }, label);
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text());
      btn.textContent = "Copied ✓";
      showToast(done);
    } catch {
      getSelection()?.selectAllChildren(fallbackEl);
      btn.textContent = "Press ⌘C";
      showToast("Selected, press ⌘C or Ctrl+C to copy");
    }
    setTimeout(() => (btn.textContent = label), 2000);
  });
  return btn;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "you";

export type Shortener = (code: string) => Promise<string | null>;

export const shortenOnServer: Shortener = async (code) => {
  try {
    const res = await fetch("/api/b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: unknown };
    return typeof data.id === "string" ? data.id : null;
  } catch {
    return null;
  }
};

const terminalCommand = (origin: string, ref: string) => `curl -sN "${origin}/t/${ref}?cols=$(tput cols)&rows=$(tput lines)"`;

export function openShareDialog(c: BouquetConfig, origin: string, shorten: Shortener = shortenOnServer): () => void {
  for (const old of document.querySelectorAll(".share-overlay")) old.dispatchEvent(new CustomEvent("share-close"));
  const code = encodeConfig(c);
  let link = `${origin}/#${code}`;
  let command = terminalCommand(origin, code);
  const name = c.to || "them";
  const opener = document.activeElement as HTMLElement | null;

  const linkEl = h("code", { class: "share-link", tabindex: "0" }, link);
  const cmdEl = h("code", { class: "share-terminal" }, command);

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareBtn = canShare
    ? h("button", { class: "btn", type: "button", onclick: () => navigator.share({ title: "A bouquet for you ✿", url: link }).catch(() => undefined) }, "↗ Share…")
    : null;

  const art = h("div", { class: "share-qr-art" });
  art.innerHTML = qrSvg(link);
  const previewLink = h("a", { class: "btn", href: link, target: "_blank", rel: "noopener" }, `▶ Preview as ${c.to || "them"}`);
  const save = h("button", { class: "link-btn accent", type: "button" }, "↓ Save image");
  save.addEventListener("click", async () => {
    const blob = await qrPng(link).catch(() => null);
    if (!blob) return;
    const a = h("a", { href: URL.createObjectURL(blob), download: `bouquet-for-${slug(c.to)}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    opener?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  const copyLink = copyButton("Copy", () => link, "btn btn-primary", linkEl, "Link copied ✓");
  const dialog = h("div", { class: "share-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "share-title" },
    h("h2", { id: "share-title" }, h("span", { class: "accent" }, "✿ "), "Your bouquet is ready"),
    h("p", { class: "muted" }, `Send this link to ${name}. Everything lives inside the link, nothing is stored on our side.`),
    h("div", { class: "share-row" }, linkEl, copyLink),
    h("div", { class: "share-qr" },
      art,
      h("div", { class: "share-qr-side" },
        h("p", { class: "strong" }, "Scan to open"),
        h("p", { class: "muted small" }, "Print it on a card or tuck it into real flowers."),
        save,
        h("div", { class: "share-actions" },
          shareBtn,
          previewLink,
        ),
      ),
    ),
    h("div", { class: "share-term" },
      h("p", { class: "muted small" }, "For a nerd? They can open it in a terminal:"),
      h("div", { class: "share-term-row" }, cmdEl, copyButton("Copy", () => command, "btn btn-small", cmdEl, "Command copied ✓")),
    ),
    h("button", { class: "share-back muted small", type: "button", onclick: close }, "← back to edit"),
  );
  const overlay = h("div", { class: "share-overlay" }, dialog);
  overlay.addEventListener("share-close", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  linkEl.classList.add("is-pending");
  shorten(code).then((id) => {
    linkEl.classList.remove("is-pending");
    if (!id || !overlay.isConnected) return;
    link = `${origin}/b/${id}`;
    command = terminalCommand(origin, id);
    linkEl.textContent = link;
    cmdEl.textContent = command;
    previewLink.href = link;
    art.innerHTML = qrSvg(link);
  });
  copyLink.focus();
  return close;
}
