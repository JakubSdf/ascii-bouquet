import qrcode from "qrcode-generator";

const PINK = "#ff87af";
const INK = "#1a0a12";
const QUIET = 4;

export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

const inFinder = (r: number, c: number, n: number) =>
  (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

export function qrSvg(text: string): string {
  const m = qrMatrix(text);
  const n = m.length;
  const size = n + QUIET * 2;
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!m[r][c] || inFinder(r, c, n)) continue;
      parts.push(`<rect x="${c + QUIET + 0.06}" y="${r + QUIET + 0.06}" width="0.88" height="0.88" rx="0.32"/>`);
    }
  }
  const finders = [[0, 0], [0, n - 7], [n - 7, 0]]
    .map(([r, c]) => {
      const x = c + QUIET;
      const y = r + QUIET;
      return `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="${INK}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision" role="img" aria-label="QR code"><rect width="${size}" height="${size}" rx="${QUIET * 0.75}" fill="${PINK}"/><g fill="${INK}">${parts.join("")}${finders}</g></svg>`;
}

export async function qrPng(text: string, px = 1024): Promise<Blob | null> {
  const url = URL.createObjectURL(new Blob([qrSvg(text)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = px;
    canvas.getContext("2d")?.drawImage(img, 0, 0, px, px);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
