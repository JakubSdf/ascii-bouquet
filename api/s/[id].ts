import type { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeConfig } from "../../src/core/codec.js";
import { loadBouquet, storeFromEnv, type Store } from "../../src/server/store.js";

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function createPageHandler(getStore: () => Store | null, loadIndex: (origin: string) => Promise<string>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const host = one(req.headers["x-forwarded-host"]) || one(req.headers.host);
    const origin = `${one(req.headers["x-forwarded-proto"]) || "https"}://${host}`;
    const store = getStore();
    let code = "";
    try {
      code = (store && (await loadBouquet(store, one(req.query.id)))) || "";
    } catch {
      code = "";
    }
    const config = code ? decodeConfig(code) : null;
    if (!config) code = "";
    let html = await loadIndex(origin);
    if (config) {
      const title = escapeHtml(`${config.from || "Someone"} sent you a bouquet ✿`);
      html = html.replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*"/g, `$1${title}"`);
      if (config.to) {
        const desc = escapeHtml(`For ${config.to}. Tap to open it.`);
        html = html.replace(/(<meta (?:property="og:description"|name="twitter:description") content=")[^"]*"/g, `$1${desc}"`);
      }
    }
    const inject = `<script>window.__BOUQUET__=${JSON.stringify(code).replace(/</g, "\\u003c")}</script>`;
    html = html.replace("</head>", `${inject}</head>`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", config ? "public, max-age=0, s-maxage=86400" : "no-store");
    res.status(config ? 200 : 404).end(html);
  };
}

export default createPageHandler(
  () => storeFromEnv(process.env),
  async (origin) => (await fetch(`${origin}/`)).text(),
);
