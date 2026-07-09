import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_URL =
  'https://www.gstatic.com/recaptcha/releases/TnA7HacJFoBWt9hnlunBlYfK/recaptcha__en.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = path.join(__dirname, 'recaptcha__en.js');

/**
 * Gọi URL recaptcha JS trên gstatic và lưu response vào file.
 *
 * @param {string} [url]
 * @param {string} [outputPath]
 * @returns {Promise<{ url: string, outputPath: string, bytes: number }>}
 */
export async function downloadRecaptchaJs(
  url = DEFAULT_URL,
  outputPath = DEFAULT_OUTPUT,
) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  }

  const body = await res.text();
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, body, 'utf8');

  return {
    url,
    outputPath,
    bytes: Buffer.byteLength(body, 'utf8'),
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const [, , urlArg, outputArg] = process.argv;

  downloadRecaptchaJs(urlArg, outputArg)
    .then(({ url, outputPath, bytes }) => {
      console.log(`URL: ${url}`);
      console.log(`Saved ${bytes} bytes → ${outputPath}`);
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}
