import { describe, expect, test } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/catalog";
import { encodeConfig } from "../src/core/codec";
import { routeFor } from "../src/web/route";

describe("routeFor", () => {
  test("empty hash opens the builder", () => {
    expect(routeFor("")).toEqual({ kind: "builder" });
    expect(routeFor("#")).toEqual({ kind: "builder" });
  });

  test("valid code opens the gift", () => {
    expect(routeFor("#" + encodeConfig(DEFAULT_CONFIG))).toEqual({ kind: "gift", config: DEFAULT_CONFIG });
  });

  test("malformed percent-encoding is a lost bouquet, not an exception", () => {
    expect(routeFor("#%E0%A4%A")).toEqual({ kind: "gift", config: null });
    expect(routeFor("#v1.%zz")).toEqual({ kind: "gift", config: null });
  });
});
