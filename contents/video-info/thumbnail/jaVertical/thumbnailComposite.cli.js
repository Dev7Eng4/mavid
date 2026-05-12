import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(__dirname, 'thumbnailVerticalFlowComposite.html');

/** Tránh chuỗi JSON làm đóng thẻ <script> sớm trong HTML. */
function payloadForInlineScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/**
 * Ghép ảnh Flow + chữ (top_quote tùy chọn + bottom_line_1/2) từ JSON `promptToCreateBottomTextThumbnailSpec`.
 *
 * @param {object} opts
 * @param {string} opts.backgroundImagePath — ảnh JPG từ Flow (vd. flow-thumbnail.jpg)
 * @param {Record<string, unknown>} opts.flowLayout — JSON Gemini (thumbnail_copy, text_color, visual_prompt, …)
 * @param {string} opts.outPath — file đích (.jpg/.jpeg → sharp; .png → PNG)
 */
export async function renderThumbnailVerticalFlowCompositeToPath({ backgroundImagePath, flowLayout, outPath }) {
  const absBg = path.resolve(backgroundImagePath);
  const abs = path.resolve(outPath);
  if (!fs.existsSync(absBg)) {
    throw new Error(`renderThumbnailVerticalFlowCompositeToPath: không tìm thấy ảnh nền: ${absBg}`);
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const buf = fs.readFileSync(absBg);
  const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;

  let html = fs.readFileSync(HTML_PATH, 'utf8');
  const snippet = `<script>window.__BG_DATA_URL__=${JSON.stringify(dataUrl)};window.__FLOW_LAYOUT__=${payloadForInlineScript(flowLayout)};<\/script>\n`;
  html = html.replace('<body>', `<body>\n${snippet}`);

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
    console.log('Đã ghép thumbnail vertical (bottom text):', abs);
  } finally {
    await browser.close();
  }
}
