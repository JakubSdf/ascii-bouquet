import { defineConfig } from "vitest/config";
import { siteOrigin, withAbsoluteOg } from "./build/og";

export default defineConfig({
  plugins: [
    {
      name: "absolute-open-graph",
      transformIndexHtml: (html) => withAbsoluteOg(html, siteOrigin(process.env)),
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "jsdom",
  },
});
