/**

 * Test grecaptcha.execute với các action (mặc định: login, generate).

 *

 * Chạy từ root repo:

 *   node contents/capcha/testExecute.js

 *   node contents/capcha/testExecute.js --headless

 *   node contents/capcha/testExecute.js --site-key <key> --actions login,generate

 *

 * Yêu cầu: domain 127.0.0.1 phải được whitelist trong Google reCAPTCHA Admin.

 */



import http from 'http';

import path from 'path';

import { fileURLToPath } from 'url';

import { chromium } from '../scripts/playwrightStealth.js';



export const DEFAULT_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
export const DEFAULT_ACTIONS = ['login', 'generate'];
export const DEFAULT_ENTERPRISE_ACTION = 'IMAGE_GENERATION';

const CHROME_USER_AGENT =

  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RECAPTCHA_READY_SHORT_TIMEOUT_MS = 5_000;



function buildTestHtml(siteKey) {

  return `<!DOCTYPE html>

<html>

<head>

  <meta charset="utf-8">

  <script src="https://www.google.com/recaptcha/api.js?render=${siteKey}"></script>

</head>

<body></body>

</html>`;

}



function startLocalServer(html) {

  return new Promise((resolve, reject) => {

    const server = http.createServer((_req, res) => {

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

      res.end(html);

    });



    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {

      const address = server.address();

      if (!address || typeof address === 'string') {

        server.close();

        reject(new Error('Không lấy được cổng HTTP local'));

        return;

      }



      resolve({

        server,

        origin: `http://127.0.0.1:${address.port}`,

      });

    });

  });

}



function tokenPreview(token) {

  if (!token || typeof token !== 'string') return '';

  return token.length <= 24 ? token : `${token.slice(0, 24)}...`;

}



function isGrecaptchaReady() {

  return typeof window.grecaptcha?.execute === 'function';

}

function isEnterpriseReady() {

  return typeof window.grecaptcha?.enterprise?.execute === 'function';

}



/**

 * @param {import('playwright').Page} page

 * @param {string} siteKey

 * @param {number} [timeoutMs]

 */

export async function ensureRecaptchaReady(page, siteKey, timeoutMs = 60_000) {

  page.setDefaultTimeout(timeoutMs);



  try {

    await page.waitForFunction(isGrecaptchaReady, { timeout: RECAPTCHA_READY_SHORT_TIMEOUT_MS });

    return;

  } catch {

    await page.addScriptTag({

      url: `https://www.google.com/recaptcha/api.js?render=${siteKey}`,

    });

    await page.waitForFunction(isGrecaptchaReady, { timeout: timeoutMs });

  }

}



/**

 * @param {import('playwright').Page} page

 * @param {object} params

 * @param {string} params.siteKey

 * @param {string[]} [params.actions]

 * @param {number} [params.timeoutMs]

 * @param {boolean} [params.log]

 * @returns {Promise<Array<{ action: string, ok: boolean, token?: string, tokenLength?: number, error?: string }>>}

 */

export async function executeRecaptchaOnPage(page, {

  siteKey,

  actions = DEFAULT_ACTIONS,

  timeoutMs = 60_000,

  log = true,

}) {

  if (!siteKey?.trim()) {

    throw new Error('siteKey là bắt buộc');

  }



  await ensureRecaptchaReady(page, siteKey, timeoutMs);



  const results = [];



  for (const action of actions) {

    try {

      const token = await page.evaluate(async ({ key, actionName }) => {

        await new Promise((resolve) => window.grecaptcha.ready(resolve));

        return window.grecaptcha.execute(key, { action: actionName });

      }, { key: siteKey, actionName: action });



      if (!token || typeof token !== 'string') {

        throw new Error('Token trả về không hợp lệ');

      }



      const entry = {

        action,

        ok: true,

        token,

        tokenLength: token.length,

      };

      results.push(entry);



      if (log) {

        console.log(`[${action}] OK — token length: ${entry.tokenLength}, preview: ${tokenPreview(token)}`);

      }

    } catch (err) {

      const message = err instanceof Error ? err.message : String(err);

      const entry = { action, ok: false, error: message };

      results.push(entry);



      if (log) {

        console.error(`[${action}] FAIL — ${message}`);

      }

    }

  }



  return results;

}



/**
 * @param {import('playwright').Page} page
 * @param {string} siteKey
 * @param {number} [timeoutMs]
 */
export async function ensureEnterpriseRecaptchaReady(page, siteKey, timeoutMs = 60_000) {
  page.setDefaultTimeout(timeoutMs);

  try {
    await page.waitForFunction(isEnterpriseReady, { timeout: RECAPTCHA_READY_SHORT_TIMEOUT_MS });
    return;
  } catch {
    await page.addScriptTag({
      url: `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`,
    });
    await page.waitForFunction(isEnterpriseReady, { timeout: timeoutMs });
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {object} params
 * @param {string} params.siteKey
 * @param {string} [params.action]
 * @param {number} [params.timeoutMs]
 * @param {boolean} [params.log]
 * @returns {Promise<{ action: string, ok: boolean, token?: string, tokenLength?: number, error?: string }>}
 */
export async function executeEnterpriseRecaptchaOnPage(page, {
  siteKey,
  action = DEFAULT_ENTERPRISE_ACTION,
  timeoutMs = 60_000,
  log = true,
}) {
  if (!siteKey?.trim()) {
    throw new Error('siteKey là bắt buộc');
  }

  await ensureEnterpriseRecaptchaReady(page, siteKey, timeoutMs);

  try {
    const token = await page.evaluate(async ({ key, actionName }) => {
      const execute = () => window.grecaptcha.enterprise.execute(key, { action: actionName });

      if (typeof window.grecaptcha?.ready === 'function') {
        await new Promise((resolve) => window.grecaptcha.ready(resolve));
      }

      return execute();
    }, { key: siteKey, actionName: action });

    if (!token || typeof token !== 'string') {
      throw new Error('Token trả về không hợp lệ');
    }

    const result = {
      action,
      ok: true,
      token,
      tokenLength: token.length,
    };

    if (log) {
      console.log(`[${action}] OK — token length: ${result.tokenLength}`);
      console.log(`Token: ${token}`);
      console.log(`Preview: ${tokenPreview(token)}`);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const result = { action, ok: false, error: message };

    if (log) {
      console.error(`[${action}] FAIL — ${message}`);
    }

    return result;
  }
}

function parseCliArgs(argv) {

  const options = {

    siteKey: process.env.RECAPTCHA_SITE_KEY?.trim() || DEFAULT_SITE_KEY,

    actions: [...DEFAULT_ACTIONS],

    headless: false,

    timeoutMs: 60_000,

  };



  for (let i = 0; i < argv.length; i++) {

    const arg = argv[i];



    if (arg === '--headless') {

      options.headless = true;

      continue;

    }



    if (arg === '--site-key') {

      const value = argv[++i];

      if (!value) throw new Error('Thiếu giá trị cho --site-key');

      options.siteKey = value;

      continue;

    }



    if (arg === '--actions') {

      const value = argv[++i];

      if (!value) throw new Error('Thiếu giá trị cho --actions');

      options.actions = value

        .split(',')

        .map((item) => item.trim())

        .filter(Boolean);

      if (!options.actions.length) {

        throw new Error('--actions phải có ít nhất một action');

      }

      continue;

    }



    if (arg === '--timeout') {

      const value = Number(argv[++i]);

      if (!Number.isFinite(value) || value <= 0) {

        throw new Error('--timeout phải là số dương (ms)');

      }

      options.timeoutMs = value;

      continue;

    }



    throw new Error(`Tham số không hỗ trợ: ${arg}`);

  }



  return options;

}



/**

 * @param {object} params

 * @param {string} params.siteKey

 * @param {string[]} [params.actions]

 * @param {boolean} [params.headless]

 * @param {number} [params.timeoutMs]

 * @returns {Promise<{ siteKey: string, origin: string, headless: boolean, results: Array<{ action: string, ok: boolean, token?: string, tokenLength?: number, error?: string }> }>}

 */

export async function runExecuteTests({

  siteKey,

  actions = DEFAULT_ACTIONS,

  headless = false,

  timeoutMs = 60_000,

}) {

  if (!siteKey?.trim()) {

    throw new Error('siteKey là bắt buộc');

  }



  const html = buildTestHtml(siteKey);

  const { server, origin } = await startLocalServer(html);



  let browser;



  try {

    browser = await chromium.launch({ headless });

    const page = await browser.newPage({

      userAgent: CHROME_USER_AGENT,

    });



    await page.goto(origin, { waitUntil: 'domcontentloaded' });



    const results = await executeRecaptchaOnPage(page, {

      siteKey,

      actions,

      timeoutMs,

      log: true,

    });



    return {

      siteKey,

      origin,

      headless,

      results,

    };

  } finally {

    if (browser) {

      await browser.close();

    }

    await new Promise((resolve, reject) => {

      server.close((err) => (err ? reject(err) : resolve()));

    });

  }

}



const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);



if (isCli) {

  try {

    const options = parseCliArgs(process.argv.slice(2));



    console.log(`Site key: ${options.siteKey}`);

    console.log(`Actions: ${options.actions.join(', ')}`);

    console.log(`Headless: ${options.headless}`);



    runExecuteTests(options)

      .then(({ origin, results }) => {

        const failed = results.filter((item) => !item.ok);

        console.log(`Origin: ${origin}`);

        console.log(`Kết quả: ${results.length - failed.length}/${results.length} action thành công`);



        if (failed.length) {

          process.exit(1);

        }

      })

      .catch((err) => {

        console.error(err.message || err);

        process.exit(1);

      });

  } catch (err) {

    console.error(err.message || err);

    process.exit(1);

  }

}


