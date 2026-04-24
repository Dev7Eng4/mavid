/**
 * Base URL mặc định của GPM Local API.
 * Dùng chung cho mọi nơi cần gọi GPM API (Electron main, scripts, utils).
 */
export const GPM_API_VERSION = 'V2'; // 'V1' = bản cũ (base /api/v3), 'V2' = bản mới (base /api/v1)

export const GPM_API_DEFAULT_ORIGIN = GPM_API_VERSION === 'V2' ? 'http://127.0.0.1:9495/api/v1' : 'http://127.0.0.1:19995/api/v3';
