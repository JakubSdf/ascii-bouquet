import "./styles.css";
import { mountBuilder } from "./web/builder";
import { fontsReady } from "./web/canvas";
import { mountGift } from "./web/gift";
import { routeFor } from "./web/route";

const app = document.getElementById("app")!;
let unmount: (() => void) | null = null;

function route() {
  unmount?.();
  for (const overlay of document.querySelectorAll(".share-overlay")) overlay.dispatchEvent(new CustomEvent("share-close"));
  app.replaceChildren();
  window.scrollTo(0, 0);
  const r = routeFor(location.hash);
  unmount = r.kind === "builder" ? mountBuilder(app) : mountGift(app, r.config);
}

window.addEventListener("hashchange", route);
await fontsReady();
route();
