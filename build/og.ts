export function siteOrigin(env: Record<string, string | undefined>): string | null {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/+$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

export function withAbsoluteOg(html: string, origin: string | null): string {
  if (!origin) return html;
  return html
    .replaceAll('content="/og.png"', `content="${origin}/og.png"`)
    .replace('<meta property="og:image"', `<meta property="og:url" content="${origin}/" /><meta property="og:image"`);
}
