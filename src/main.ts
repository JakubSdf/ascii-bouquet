import { DEFAULT_CONFIG } from "./core/catalog";
import { renderFrame } from "./core/render";
import { buildScene } from "./core/scene";
import { fontsReady, GridCanvas } from "./web/canvas";

const app = document.getElementById("app")!;
app.style.height = "100dvh";
await fontsReady();
const gc = new GridCanvas(app);
const scene = buildScene(DEFAULT_CONFIG);
const start = performance.now();
const loop = (now: number) => {
  const t = (now - start) / 1000;
  gc.draw(renderFrame(scene, { cols: gc.cols, rows: gc.rows, t, angle: t * 0.6, tilt: 0.3, bloom: 1, cellAspect: gc.cellAspect }));
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
