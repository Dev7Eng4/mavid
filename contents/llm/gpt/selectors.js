export const GPT_SELECTOR = {
  editor: 'div#prompt-textarea',
  /** Tin assistant — `.last()` sau mỗi lần gửi prompt */
  responseBlock: 'div[data-message-author-role="assistant"]',
  /** Khối code định dạng (JSON / fenced block) */
  responseCodeBlock: 'pre code',
  /** Khi đang stream, nút gửi đổi aria-label sang dạng Stop… */
  composerSendButton: 'button[data-testid="send-button"]',
};
