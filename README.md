# ✿ ascii-bouquet

Make someone a spinning 3D bouquet out of text characters, write them a note, and send it as a link. They open it, the buds grow and bloom, the bouquet spins, and your message types itself out underneath.

![ascii-bouquet](public/og.png)

## Send a bouquet

1. Open the site and tap flowers to add them: rose, daisy, tulip, sunflower, lavender, lily, forget-me-not or baby's breath. Each tap puts one stem into **Your bouquet** (up to 8, all of one kind if you like). Tap a stem there to take it out. Hover a flower to see it up close.
2. Go through the three steps (flowers, wrap, message). You can jump back to any step from the progress bar. Write who it's for, who it's from, and a short note (up to 120 characters).
3. Press **Create link →**, then copy the link and send it, or open **QR code** for a pink code you can scan, save or print on a card.

The recipient sees a small envelope first and opens it with a tap, so the bloom starts while they're looking.

## Open one in your terminal

Every bouquet link also works in a terminal, no install needed:

```bash
curl -sN "https://<your-domain>/t/<code>?cols=$(tput cols)&rows=$(tput lines)"
```

`<code>` is everything after `#` in the bouquet link. The share dialog shows the exact command. The animation runs for about 18 seconds, then prints the message and exits. `cols` (30–160) and `rows` (16–60) size it to your terminal. Without them it uses 60×24. If you stop it early with Ctrl-C and the cursor stays hidden, run `tput cnorm`.

Opening a `/t/...` link in a browser redirects to the normal gift page.

## Run it locally

You need Node.js 20 or newer.

```bash
git clone https://github.com/JakubSdf/ascii-bouquet.git
cd ascii-bouquet
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Runs the test suite (Vitest) |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the built site |

The terminal endpoint is a Vercel Function, so `npm run dev` serves only the website. To try `curl` locally, use `npx vercel dev`.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JakubSdf/ascii-bouquet)

No environment variables, database or accounts are needed. Vercel detects Vite, builds the site and deploys `api/t/[code].ts` as the terminal endpoint. `vercel.json` maps `/t/:code` to it.

## Customize

Flowers, wraps and occasions live in [`src/core/catalog.ts`](src/core/catalog.ts).

- **Add a flower:** add an id to `FlowerId` in [`src/core/types.ts`](src/core/types.ts), then an entry to `FLOWERS` with a unique one-letter `code` (used in links), a `kind` (`disc`, `tulip`, `lily`, `spike` or `cloud`), a petal count and color ramps from dark to light.
- **Add a wrap:** add an id to `WrapId` and an entry to `WRAPS` with paper and ribbon color ramps.
- **Change default messages:** edit `OCCASIONS`.
- **Colors and fonts of the page:** CSS custom properties at the top of [`src/styles.css`](src/styles.css).

Never change an existing flower `code`. Links that were already sent would point to a different flower.

## How it works

**The link is the bouquet.** The chosen flowers, wrap, occasion, names and message are packed into a small JSON tuple, encoded as URL-safe base64 and put after `#v1.` in the URL. The part after `#` never reaches a server, so nothing is stored anywhere. Links don't expire and can't be edited. Decoding validates every field and caps the text lengths. Anything broken shows a friendly "This bouquet got lost." page.

**Scene.** [`src/core/scene.ts`](src/core/scene.ts) turns a config into 3D points: stems from each flower head down to a neck, eight leaves, a paper cone with folds, a ribbon with a bow, and twinkling sparkles. Flower heads are placed on a golden-angle spiral. The layout is seeded from the flowers and wrap, so the same bouquet always looks the same. Each point has a `stage` that says when it appears during the bloom. The stem grows up from its tip, branches out to every flower, then the leaves unfold, the paper wraps around ring by ring, the ribbon ties, and the heads open one by one.

**Renderer.** [`src/core/render.ts`](src/core/render.ts) rotates and tilts every point, projects it with perspective onto a character grid, and keeps the nearest point per cell with a depth buffer. Brightness comes from a fixed light direction and picks both a character (`.:-=+*%@`) and a color from the part's ramp. Flower heads are drawn as flat shapes that always face you, so the petals stay readable while the bouquet spins. The output is a plain grid of characters and colors, with no browser APIs.

**Web.** [`src/web/canvas.ts`](src/web/canvas.ts) draws that grid onto a `<canvas>` in JetBrains Mono. It picks a font size that gives roughly 90 columns, so phones get as much detail as desktops. The gift page ([`src/web/gift.ts`](src/web/gift.ts)) adds the envelope, the bloom timing, the typewriter message, floating hearts, drag-to-spin and tap-for-petals. People who prefer reduced motion get the finished bouquet and message right away, with a slow spin.

**Terminal.** [`api/t/[code].ts`](api/t/[code].ts) reuses the same renderer. It writes each frame as 24-bit ANSI color escapes, streams 15 frames per second for about 18 seconds, then prints the message and restores the cursor.

## Privacy

Website links keep the bouquet after `#`, which browsers don't send to servers. Terminal links (`/t/<code>`) carry the code in the path, so the server handling that request sees it, as usual for any URL. Nothing is logged or stored by this app.

## Credits

The 3D point-cloud bouquet, its lighting and the flower-head shapes are based on [Ascii-Flower-Bouquet-](https://github.com/alishsharma17/Ascii-Flower-Bouquet-) by [@alishsharma](https://www.tiktok.com/@alishsharma), released under the MIT License.

QR codes are generated with [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT).

## License

MIT, see [LICENSE](LICENSE).
