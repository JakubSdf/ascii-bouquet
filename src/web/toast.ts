import { h } from "./dom";

let timer: ReturnType<typeof setTimeout> | undefined;

function region(): HTMLElement {
  let el = document.querySelector<HTMLElement>(".toast-region");
  if (!el) {
    el = h("div", { class: "toast-region", "aria-live": "polite", role: "status" });
    document.body.append(el);
  }
  return el;
}

export function showToast(message: string, ms = 2200): void {
  const r = region();
  clearTimeout(timer);
  const toast = h("div", { class: "toast" }, message);
  r.replaceChildren(toast);
  timer = setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 200);
  }, ms);
}
