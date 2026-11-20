import { describe, expect, test } from "vitest";
import { createShortHandler } from "../api/b";
import { createPageHandler } from "../api/s/[id]";
import { DEFAULT_CONFIG } from "../src/core/catalog";
import { encodeConfig } from "../src/core/codec";
import { memoryStore, saveBouquet } from "../src/server/store";

function fakeRes() {
  const r = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    status(code: number) { r.statusCode = code; return r; },
    setHeader(k: string, v: string) { r.headers[k.toLowerCase()] = v; return r; },
    end(chunk?: string) { if (chunk) r.body += chunk; return r; },
    json(v: unknown) { r.headers["content-type"] = "application/json"; r.body = JSON.stringify(v); return r; },
  };
  return r;
}
const INDEX = '<html><head><meta property="og:title" content="Someone sent you a bouquet ✿" /><meta name="twitter:title" content="Someone sent you a bouquet ✿" /></head><body></body></html>';

describe("POST /api/b", () => {
  test("stores a valid bouquet and answers with the short id", async () => {
    const store = memoryStore();
    const res = fakeRes();
    await createShortHandler(() => store)({ method: "POST", body: { code: encodeConfig(DEFAULT_CONFIG) }, headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } } as never, res as never);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).id).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  test("rejects broken codes", async () => {
    const res = fakeRes();
    await createShortHandler(() => memoryStore())({ method: "POST", body: { code: "v1.nope" }, headers: {} } as never, res as never);
    expect(res.statusCode).toBe(400);
  });

  test("says so when short links are not set up", async () => {
    const res = fakeRes();
    await createShortHandler(() => null)({ method: "POST", body: { code: encodeConfig(DEFAULT_CONFIG) }, headers: {} } as never, res as never);
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /b/:id", () => {
  test("serves the app with the bouquet and a personal preview", async () => {
    const store = memoryStore();
    const code = encodeConfig({ ...DEFAULT_CONFIG, from: "Tom <3", to: "Anna" });
    const id = await saveBouquet(store, code, "ip");
    const res = fakeRes();
    await createPageHandler(() => store, async () => INDEX)({ query: { id }, headers: { host: "x.test" } } as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain(`window.__BOUQUET__="${code}"`);
    expect(res.body).toContain('content="Tom &lt;3 sent you a bouquet ✿"');
    expect(res.body).not.toContain("Tom <3");
  });

  test("an unknown id still serves the app, which shows the lost page", async () => {
    const res = fakeRes();
    await createPageHandler(() => memoryStore(), async () => INDEX)({ query: { id: "nothere" }, headers: { host: "x.test" } } as never, res as never);
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('window.__BOUQUET__=""');
  });
});
