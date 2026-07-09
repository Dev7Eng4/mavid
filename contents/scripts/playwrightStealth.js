/**
 * Playwright chromium + puppeteer-extra-plugin-stealth cho mọi profile persistent.
 * Import `chromium` từ đây thay vì `playwright` trong makeChromeProfile / openGpmPlaywright.
 */
import { chromium as chromiumExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromiumExtra.use(StealthPlugin());

export const chromium = chromiumExtra;
