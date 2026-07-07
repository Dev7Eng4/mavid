/**
 * Mở Chrome profile Flow → lấy accessToken → lấy reCAPTCHA token → gọi batchGenerateImages.
 *
 * Chạy từ root repo:
 *   node contents/capcha/demo.js
 *
 * Toàn bộ cấu hình dùng giá trị default trong file này (không nhận tham số command).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import openChromeProfile from '../scripts/makeChromeProfile.js';
import { delay } from '../utils/dom.util.js';
import { DEFAULT_ENTERPRISE_ACTION, DEFAULT_SITE_KEY, executeEnterpriseRecaptchaOnPage } from './testExecute.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PROFILE = 1;
const FLOW_PROJECT_ID = '86a9d25a-4d73-468b-8419-77fb2127ad76';
const DEFAULT_FLOW_PROJECT_URL = `https://labs.google/fx/tools/flow/project/${FLOW_PROJECT_ID}`;
/** Bật/tắt dùng reference image cho batchGenerateImages. */
const USE_REFERENCE_IMAGE = true;
/** Ảnh reference sẽ upload khi USE_REFERENCE_IMAGE = true. */
const DEFAULT_REFERENCE_IMAGE_PATH = path.join(__dirname, 'Elderly_couple_eating_sugar_202607011716.jpeg');
/** Endpoint upload ảnh của Flow. */
const UPLOAD_IMAGE_URL = 'https://aisandbox-pa.googleapis.com/v1/flow/uploadImage';
/** Delay sau khi lấy được accessToken. */
const DELAY_AFTER_ACCESS_TOKEN_MS = 5_000;
/** Giữ browser mở sau khi gọi API xong. */
const KEEP_OPEN_MS = 3_000;
/** Timeout chung cho goto/recaptcha. */
const TIMEOUT_MS = 60_000;
/** Hiển thị browser hay chạy ẩn. */
const VISIBLE = true;
/** Endpoint next-auth của Flow để lấy accessToken. */
const FLOW_SESSION_URL = 'https://labs.google/fx/api/auth/session';
const BATCH_GENERATE_URL = `https://aisandbox-pa.googleapis.com/v1/projects/${FLOW_PROJECT_ID}/flowMedia:batchGenerateImages`;

const BATCH_GENERATE_HEADERS = {
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
  'content-type': 'text/plain;charset=UTF-8',
  origin: 'https://labs.google',
  priority: 'u=1, i',
  referer: 'https://labs.google/',
  'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'x-browser-channel': 'stable',
  'x-browser-copyright': 'Copyright 2026 Google LLC. All Rights Reserved.',
  'x-browser-validation': 'zyMeDuba02HE8LHzcfWdkJ+F6HE=',
  'x-browser-year': '2026',
  'x-client-data': 'CKmdygEIlqHLAQiFoM0B',
};

/** UUID v4 — format giống mock: c19654ed-4c96-4f97-91e8-9961f436f948 */
function randomBatchId() {
  return crypto.randomUUID();
}

/** Số nguyên ngẫu nhiên — format giống mock: 936317 */
function randomSeed() {
  return crypto.randomInt(0, 1_000_000);
}

/** Session id — format giống mock: ;1782989156942 (UTC epoch ms) */
function buildSessionId(nowMs = Date.now()) {
  return `;${nowMs}`;
}

/** Payload mẫu từ curl — chỉ thay recaptcha token khi gọi API. */
const BATCH_GENERATE_PAYLOAD_TEMPLATE = {
  clientContext: {
    recaptchaContext: {
      token: '__RECAPTCHA_TOKEN__',
      applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB',
    },
    projectId: FLOW_PROJECT_ID,
    tool: 'PINHOLE',
    sessionId: ';1782989156942',
  },
  mediaGenerationContext: {
    batchId: 'c19654ed-4c96-4f97-91e8-9961f436f948',
  },
  useNewMedia: true,
  requests: [
    {
      clientContext: {
        recaptchaContext: {
          token: '__RECAPTCHA_TOKEN__',
          applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB',
        },
        projectId: FLOW_PROJECT_ID,
        tool: 'PINHOLE',
        sessionId: ';1782989156942',
      },
      imageModelName: 'GEM_PIX_2',
      imageAspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      structuredPrompt: {
        parts: [
          {
            text: 'A soothing cinematic live-action scene of an elderly Japanese couple in their early 70s drinking green tea together beside a large window overlooking a peaceful garden. The wife gently smiles while pouring tea, and the husband looks at her with quiet gratitude. Warm morning sunlight, traditional Japanese interior mixed with a modern comfortable home, realistic elderly Japanese faces, natural wrinkles, soft emotional atmosphere, calm composition, warm film lighting, shallow depth of field, photorealistic, premium Japanese lifestyle documentary style, 16:9, no text, no anime, no exaggerated expressions.',
          },
        ],
      },
      seed: 936317,
      imageInputs: [],
    },
  ],
};

function buildBatchGeneratePayload(recaptchaToken, primaryMediaId = null) {
  const payload = structuredClone(BATCH_GENERATE_PAYLOAD_TEMPLATE);
  const sessionId = buildSessionId();
  payload.clientContext.recaptchaContext.token = recaptchaToken;
  payload.mediaGenerationContext.batchId = randomBatchId();
  payload.clientContext.sessionId = sessionId;

  for (const request of payload.requests) {
    request.clientContext.recaptchaContext.token = recaptchaToken;
    request.seed = randomSeed();
    request.clientContext.sessionId = sessionId;

    if (primaryMediaId) {
      request.imageInputs = [{ imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE', name: primaryMediaId }];
    }
  }

  return payload;
}

/**
 * Upload ảnh reference lên Flow rồi trả về primaryMediaId để dùng cho batchGenerateImages.
 * @param {string} accessToken
 * @param {string} imagePath
 * @returns {Promise<string|null>}
 */
export async function uploadReferenceImage(accessToken, imagePath = DEFAULT_REFERENCE_IMAGE_PATH) {
  if (!accessToken?.trim()) {
    console.error('uploadReferenceImage: thiếu accessToken.');
    return null;
  }

  try {
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const fileName = path.basename(imagePath);

    const body = {
      clientContext: { projectId: FLOW_PROJECT_ID, tool: 'PINHOLE' },
      imageBytes: imageBase64,
      isUserUploaded: true,
      isHidden: false,
      mimeType: 'image/jpeg',
      fileName,
    };

    const response = await fetch(UPLOAD_IMAGE_URL, {
      method: 'POST',
      headers: {
        ...BATCH_GENERATE_HEADERS,
        authorization: `Bearer ${accessToken.trim()}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`uploadReferenceImage thất bại: HTTP ${response.status} ${response.statusText}`);
      console.error(responseText);
      return null;
    }

    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    const primaryMediaId = responseJson?.workflow?.metadata?.primaryMediaId || responseJson?.media?.name || null;

    if (!primaryMediaId) {
      console.error('uploadReferenceImage: không tìm thấy primaryMediaId trong response.');
      console.error(responseText);
    }

    return primaryMediaId;
  } catch (err) {
    console.error('uploadReferenceImage lỗi:', err.message || err);
    return null;
  }
}

function attachBearerCapture(page) {
  let bearerToken = '';

  const onRequest = request => {
    const url = request.url();
    if (!url.includes('aisandbox-pa.googleapis.com')) return;

    const auth = request.headers().authorization || request.headers().Authorization;
    if (!auth?.startsWith('Bearer ')) return;

    bearerToken = auth.slice('Bearer '.length).trim();
  };

  page.on('request', onRequest);

  return {
    getBearerToken: () => bearerToken,
    dispose: () => page.off('request', onRequest),
  };
}

/**
 * Lấy accessToken từ session next-auth của Flow (chạy fetch trong context của page).
 * @param {import('playwright').Page} page
 * @param {string} sessionUrl
 * @returns {Promise<string>}
 */
export async function getAccessTokenFromPage(page, sessionUrl = FLOW_SESSION_URL) {
  try {
    const session = await page.evaluate(async url => {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) return null;
      return res.json();
    }, sessionUrl);

    return session?.access_token || session?.accessToken || '';
  } catch {
    return '';
  }
}

/**
 * @param {string} recaptchaToken
 * @param {string} bearerToken
 * @param {string|null} primaryMediaId
 */
export async function callBatchGenerateImages(recaptchaToken, bearerToken, primaryMediaId = null) {
  if (!bearerToken?.trim()) {
    throw new Error('Thiếu Bearer token — đặt FLOW_BEARER_TOKEN hoặc --bearer-token');
  }

  const body = buildBatchGeneratePayload(recaptchaToken, primaryMediaId);

  const response = await fetch(BATCH_GENERATE_URL, {
    method: 'POST',
    headers: {
      ...BATCH_GENERATE_HEADERS,
      authorization: `Bearer ${bearerToken.trim()}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let responseJson;

  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    bodyText: responseText,
    body: responseJson,
  };
}

export async function openFlowAndGetRecaptchaToken() {
  const profile = DEFAULT_PROFILE;
  const projectUrl = DEFAULT_FLOW_PROJECT_URL;
  const siteKey = DEFAULT_SITE_KEY;
  const action = DEFAULT_ENTERPRISE_ACTION;
  const keepOpenMs = KEEP_OPEN_MS;
  const visible = VISIBLE;
  const timeoutMs = TIMEOUT_MS;

  const { context, page } = await openChromeProfile({ profile, visible });
  const bearerCapture = attachBearerCapture(page);

  try {
    console.log(`Đang mở Flow: ${projectUrl}`);
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');

    // Đã đăng nhập sẵn trong profile → lấy accessToken từ session của Flow.
    let accessToken = await getAccessTokenFromPage(page);

    // Fallback: nếu session không trả về, dùng token bắt từ request.
    if (!accessToken) {
      accessToken = bearerCapture.getBearerToken();
    }

    if (!accessToken) {
      throw new Error('Không lấy được accessToken. Kiểm tra profile đã đăng nhập Flow chưa.');
    }

    console.log('accessToken:', accessToken);

    let primaryMediaId = null;
    if (USE_REFERENCE_IMAGE) {
      console.log('Đang upload reference image...');
      primaryMediaId = await uploadReferenceImage(accessToken);
      if (primaryMediaId) {
        console.log('primaryMediaId:', primaryMediaId);
      } else {
        console.error('Không upload được reference image. Tiếp tục không dùng reference.');
      }
    }

    console.log(`Delay ${DELAY_AFTER_ACCESS_TOKEN_MS}ms...`);
    await delay(DELAY_AFTER_ACCESS_TOKEN_MS, 0);

    const result = await executeEnterpriseRecaptchaOnPage(page, {
      siteKey,
      action,
      timeoutMs,
      log: true,
    });

    if (!result.ok || !result.token) {
      throw new Error(result.error || `Không lấy được recaptcha token cho action ${action}`);
    }

    console.log('Đang gọi batchGenerateImages với accessToken...');
    const apiResponse = await callBatchGenerateImages(result.token, accessToken, primaryMediaId);

    console.log(`API status: ${apiResponse.status} ${apiResponse.statusText}`);
    if (apiResponse.body) {
      console.log('API response JSON:', JSON.stringify(apiResponse.body, null, 2));
    } else {
      console.log('API response text:', apiResponse.bodyText);
    }

    if (!apiResponse.ok) {
      throw new Error(`batchGenerateImages thất bại: HTTP ${apiResponse.status}`);
    }

    if (keepOpenMs > 0) {
      console.log(`Giữ browser mở ${keepOpenMs}ms...`);
      await delay(keepOpenMs, 0);
    }

    return {
      profile,
      projectUrl,
      accessToken,
      primaryMediaId,
      result,
      apiResponse,
    };
  } finally {
    bearerCapture.dispose();
    console.log('Đang đóng browser...');
    await context.close();
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  console.log(`Profile: ${DEFAULT_PROFILE}`);
  console.log(`Project: ${DEFAULT_FLOW_PROJECT_URL}`);
  console.log(`Site key: ${DEFAULT_SITE_KEY}`);
  console.log(`Action: ${DEFAULT_ENTERPRISE_ACTION}`);

  openFlowAndGetRecaptchaToken().catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}
