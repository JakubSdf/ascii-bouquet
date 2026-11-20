import { describe, expect, test } from "vitest";
import { siteOrigin, withAbsoluteOg } from "../build/og";

const html = '<head><meta property="og:image" content="/og.png" /><meta name="twitter:image" content="/og.png" /></head>';

describe("open graph urls", () => {
  test("image and page url become absolute", () => {
    const out = withAbsoluteOg(html, "https://bouquet.example");
    expect(out).toContain('<meta property="og:image" content="https://bouquet.example/og.png" />');
    expect(out).toContain('<meta name="twitter:image" content="https://bouquet.example/og.png" />');
    expect(out).toContain('<meta property="og:url" content="https://bouquet.example/" />');
  });

  test("without a known origin the html is untouched", () => {
    expect(withAbsoluteOg(html, null)).toBe(html);
  });

  test("origin comes from SITE_URL, then the Vercel production domain", () => {
    expect(siteOrigin({ SITE_URL: "https://my.site/" })).toBe("https://my.site");
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "ascii-bouquet.vercel.app" })).toBe("https://ascii-bouquet.vercel.app");
    expect(siteOrigin({})).toBeNull();
  });
});
