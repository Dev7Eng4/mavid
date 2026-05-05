import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(__dirname, 'thumbnailFullText.html');

/** Tên file mặc định khi chạy CLI không truyền đường dẫn (PNG). */
const CLI_DEFAULT_BASENAME = 'flow-thumbnail-fulltext';

function defaultOutPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(process.cwd(), `${CLI_DEFAULT_BASENAME}-${stamp}.png`);
}

function parseArgs(argv) {
  const args = argv.filter(a => a !== '--');
  let outPath = defaultOutPath();
  let configPath = null;

  if (args.length === 1) {
    if (args[0].toLowerCase().endsWith('.json')) {
      configPath = path.resolve(args[0]);
    } else {
      outPath = path.resolve(args[0]);
    }
  } else if (args.length >= 2) {
    outPath = path.resolve(args[0]);
    configPath = path.resolve(args[1]);
  }

  return { outPath, configPath };
}

function readPayload(configPath) {
  if (!configPath) return null;
  const raw = fs.readFileSync(configPath, 'utf8');
  const data = JSON.parse(raw);
  if (data.lines == null || data.colors == null) {
    throw new Error('thumbnail JSON cần có "lines" và "colors".');
  }
  return { lines: data.lines, colors: data.colors };
}

/** Tránh chuỗi JSON làm đóng thẻ <script> sớm trong HTML. */
function payloadForInlineScript(payload) {
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

function injectPayload(html, payload) {
  const snippet = `<script>window.__THUMB_PAYLOAD__=${payloadForInlineScript(payload)};<\/script>\n`;
  return html.replace('<body>', `<body>\n${snippet}`);
}

/**
 * @param {object} opts
 * @param {string} opts.outPath
 * @param {{ lines: Record<string, string>, colors: Record<string, string> } | null} [opts.payload] — null = dùng default trong HTML
 */
async function renderThumbnailFromPayload({ outPath, payload }) {
  const abs = path.resolve(outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  let html = fs.readFileSync(HTML_PATH, 'utf8');
  if (payload) html = injectPayload(html, payload);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(html, { waitUntil: 'load' });

    await page.waitForFunction(() => window.__THUMBNAIL_READY__ === true || window.__THUMBNAIL_ERROR__, {
      timeout: 60_000,
    });

    const err = await page.evaluate(() => window.__THUMBNAIL_ERROR__);
    if (err) throw new Error(err);

    const canvas = page.locator('#thumbCanvas');
    const pngBuf = await canvas.screenshot({ type: 'png' });

    const lower = abs.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      const sharp = (await import('sharp')).default;
      await sharp(pngBuf).jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:2:0' }).toFile(abs);
    } else {
      fs.writeFileSync(abs, pngBuf);
    }
    console.log('Đã lưu:', abs);
  } finally {
    await browser.close();
  }
}

/**
 * Render thumbnail full-text (Playwright + canvas trong thumbnailFullText.html).
 *
 * @param {object} opts
 * @param {Record<string, string>} opts.lines
 * @param {Record<string, string>} opts.colors
 * @param {string} opts.outPath — đường dẫn file đích (.png ghi trực tiếp; .jpg/.jpeg chuyển qua sharp)
 */
export async function renderThumbnailFullTextToPath({ lines, colors, outPath }) {
  return renderThumbnailFromPayload({ outPath, payload: { lines, colors } });
}

async function main() {
  const { outPath, configPath } = parseArgs(process.argv.slice(2));
  const payload = readPayload(configPath);
  await renderThumbnailFromPayload({ outPath, payload });
}

const isCliEntry =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCliEntry) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}

