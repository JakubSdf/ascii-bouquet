import { h } from "./dom";

export function mountBuilder(root: HTMLElement): () => void {
  const view = h("main", { class: "gift gift-lost" }, h("p", {}, "Builder"));
  root.append(view);
  return () => view.remove();
}
