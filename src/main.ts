import "./styles.css";
import { decodeConfig } from "./core/codec";
import { mountBuilder } from "./web/builder";
import { fontsReady } from "./web/canvas";
import { mountGift } from "./web/gift";

const app = document.getElementById("app")!;
let unmount: (() => void) | null = null;

function route() {
  unmount?.();
  app.replaceChildren();
  window.scrollTo(0, 0);
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash) unmount = mountGift(app, decodeConfig(hash));
  else unmount = mountBuilder(app);
}

await fontsReady();
route();
window.addEventListener("hashchange", route);
