import { describe, expect, test } from "vitest";
import handler from "../api/t/[code]";
import { DEFAULT_CONFIG } from "../src/core/catalog";
import { encodeConfig } from "../src/core/codec";

function fakeRes() {
  const r = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    ended: false,
    status(code: number) { r.statusCode = code; return r; },
    setHeader(k: string, v: string) { r.headers[k.toLowerCase()] = v; return r; },
    write(chunk: string) { r.body += chunk; return true; },
    end(chunk?: string) { if (chunk) r.body += chunk; r.ended = true; return r; },
  };
  return r;
}
const req = (code: string, ua: string, query: Record<string, string> = {}) =>
  ({ query: { code, ...query }, headers: { "user-agent": ua, host: "example.test" }, on() {} }) as never;

describe("terminal endpoint", () => {
  test("bad code answers 400 with a hint", async () => {
    const res = fakeRes();
    await handler(req("nope", "curl/8.0"), res as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain("This bouquet got lost. Make one at https://example.test/");
  });

  test("browsers are redirected to the gift page", async () => {
    const res = fakeRes();
    const code = encodeConfig(DEFAULT_CONFIG);
    await handler(req(code, "Mozilla/5.0"), res as never);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/#${code}`);
  });

  test("curl gets a finished stream", async () => {
    const res = fakeRes();
    await handler(req(encodeConfig(DEFAULT_CONFIG), "curl/8.0", { cols: "50", rows: "24", seconds: "0.2" }), res as never);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.ended).toBe(true);
    expect(res.body).toContain(DEFAULT_CONFIG.message);
    expect(res.body).toContain("\x1b[?25h");
  });
});
