import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []));

describe("server-side imports", () => {
  test("relative imports in api, src/core and src/server carry a .js extension for Node ESM", () => {
    const bad = [...files("api"), ...files("src/core"), ...files("src/server")].flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/from "(\.{1,2}\/[^"]+)"/g)].filter((m) => !m[1].endsWith(".js")).map((m) => `${f}: ${m[1]}`),
    );
    expect(bad).toEqual([]);
  });
});
