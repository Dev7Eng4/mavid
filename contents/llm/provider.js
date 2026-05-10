const raw = String(process.env.LLM_PROVIDER ?? 'gpt').toLowerCase();

/** @type {'gemini' | 'gpt'} */
export const LLM_PROVIDER = 'gemini';
