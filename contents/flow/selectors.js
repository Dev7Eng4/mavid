/**
 * XPath / selector Playwright cho Google Flow (labs.google/fx).
 */
export const FLOW_SELECTOR = {
  btnCreateWithFlow: '/html/body/div[1]/div[1]/div/section[1]/div[1]/div[2]/button',
  btnNewProject: '/html/body/div[1]/div[2]/div/div/button',
  btnConfig: '/html/body/div[1]/div[1]/div[5]/div/div/div/div/div[2]/div[2]/button[1]',
  btnOptionImage: '/html/body/div[4]/div/div[1]/div/button[1]',
  btnOptionRatio: '/html/body/div[3]/div/div[2]/div/button[1]',
  btnOptionQuantity: '/html/body/div[3]/div/div[3]/div/button[1]',
  btnOptionModel: '/html/body/div[3]/div/button',
  btnOptionModelPro: '/html/body/div[4]/div/div[1]/div/button',
  btnAttach: 'div button[aria-haspopup="dialog"]',
  btnUploadImage: '/html/body/div[1]/div[2]/div/div/div/div[1]/button[2]',
  btnCreate: '/html/body/div[1]/div[1]/div[5]/div/div/div/div/div[2]/div[2]/button[2]',
  btnCreateHaveImage: '/html/body/div[1]/div[1]/div[5]/div/div/div[3]/div[2]/button[2]',
  textbox: 'div[role="textbox"]',

  // tools — nút có icon Material apps_spark_2 + nhãn ẩn "Tools"
  btnTools: 'button:has(i.google-symbols:text-is("apps_spark_2"))',
  btnToolsWrapper: '/html/body/div[1]/div[1]/div[4]/div[1]/div[6]/button',

  /** iframe chứa UI tool MaVid (sau khi mở MavidMedia). */
  toolIframe: 'iframe',
  toolEditorPrompt: 'textarea#mavid-editor-prompt',
  btnToolGenerate: 'button#mavid-create',
};
