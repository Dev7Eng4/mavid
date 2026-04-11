/**
 * Đẩy dòng lên tab Logs (LogsPage) khi script chạy trong MaVid Electron
 * (`npm run …` do app spawn). Dùng stderr + tiền tố đặc biệt; main process
 * nhận và ghi `mavid-error-logs.json` + broadcast UI.
 *
 * Chạy `node` thuần ngoài app: chỉ in ra terminal, không có UI.
 *
 * @param {string} message
 * @param {'log' | 'warn' | 'error'} [level='log'] — `log` → màu accent, `warn` → vàng, `error` → đỏ trên LogsPage
 */
export function logToLogsPage(message, level = 'log') {
  const text = typeof message === 'string' ? message : String(message);
  const marker =
    level === 'warn' ? '[mavid-warn] ' : level === 'error' ? '[mavid-err] ' : '[mavid-log] ';
  console.error(`${marker}${text}`);
}
