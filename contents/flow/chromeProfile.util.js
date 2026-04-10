/**
 * Profile Playwright cho Flow (chrome-profile/profile{N}). Ưu tiên env MAVID_CHROME_PROFILE.
 * @param {{ FLOW_CHROME_PROFILE?: number }} cfg
 */
export function resolveFlowChromeProfile(cfg) {
  const raw = process.env.MAVID_CHROME_PROFILE ?? cfg.FLOW_CHROME_PROFILE ?? 1;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}
