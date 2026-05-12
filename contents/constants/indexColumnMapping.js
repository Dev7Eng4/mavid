/**
 * Mapping 2 chiều giữa Excel column header (index.xlsx) ↔ camelCase property name.
 * Dùng chung cho Electron main + frontend.
 *
 * Excel header (dòng 1)  →  Property name (trong ChannelRow)
 * ─────────────────────────────────────────────────────────
 * CHANNEL                →  channel
 * LINK                   →  link
 * ID                     →  id
 * EMAIL                  →  email
 * KÊNH CỦA TÔI          →  myChannel
 * LOẠI VIDEO             →  videoType
 * THỜI GIAN VIDEO        →  videoDuration
 * BACKGROUND             →  background
 * LAST UPLOAD            →  lastUpload
 * STATUS                 →  status
 * Group (tùy tệp: GROUP ID cũ) →  mavidGroupId
 */

/** Excel header (UPPER) → camelCase prop name. */
export const INDEX_HEADER_TO_PROP = {
  CHANNEL: 'channel',
  LINK: 'link',
  ID: 'id',
  EMAIL: 'email',
  'KÊNH CỦA TÔI': 'myChannel',
  'LOẠI VIDEO': 'videoType',
  'THỜI GIAN VIDEO': 'videoDuration',
  BACKGROUND: 'background',
  'LAST UPLOAD': 'lastUpload',
  STATUS: 'status',
  /** File mới: cột cuối; `GROUP ID` = file cũ vẫn đọc được. */
  'GROUP ID': 'mavidGroupId',
  Group: 'mavidGroupId',
};

/** camelCase prop name → Excel header (viết hoa / tiếng Việt gốc). */
export const INDEX_PROP_TO_HEADER = Object.fromEntries(Object.entries(INDEX_HEADER_TO_PROP).map(([k, v]) => [v, k]));

/** Lookup nhanh: uppercase header → prop (để so khớp case-insensitive). */
const _headerUpperMap = Object.fromEntries(Object.entries(INDEX_HEADER_TO_PROP).map(([k, v]) => [k.toUpperCase(), v]));

/**
 * Map một header sang prop name (case-insensitive).
 * Trả nguyên header nếu không có trong bảng mapping.
 * @param {string} header
 * @returns {string}
 */
export function mapHeaderToProp(header) {
  const norm = String(header ?? '')
    .trim()
    .toUpperCase();
  return _headerUpperMap[norm] ?? header;
}

/**
 * Map một prop name ngược lại thành Excel header.
 * Trả nguyên prop nếu không có trong bảng mapping.
 * @param {string} prop
 * @returns {string}
 */
export function mapPropToHeader(prop) {
  return INDEX_PROP_TO_HEADER[prop] ?? prop;
}

/**
 * Convert mảng headers gốc (từ Excel) sang mảng prop names.
 * @param {string[]} headers
 * @returns {string[]}
 */
export function mapHeadersToPropNames(headers) {
  return headers.map(mapHeaderToProp);
}

/**
 * Convert mảng prop names ngược lại thành Excel headers.
 * @param {string[]} propNames
 * @returns {string[]}
 */
export function mapPropNamesToHeaders(propNames) {
  return propNames.map(mapPropToHeader);
}

/**
 * Convert toàn bộ ChannelData (headers + rows) từ Excel format sang prop format.
 * @param {{ headers: string[], rows: Record<string, unknown>[] }} data
 * @returns {{ headers: string[], rows: Record<string, unknown>[] }}
 */
export function mapIndexDataToProps(data) {
  if (!data || !data.headers?.length) return data;

  const mappedHeaders = mapHeadersToPropNames(data.headers);
  console.log('🚀 ~ mapIndexDataToProps ~ mappedHeaders:', mappedHeaders);

  /** @type {Map<string, string>} original header → prop name */
  const keyMap = new Map();
  for (let i = 0; i < data.headers.length; i++) {
    keyMap.set(data.headers[i], mappedHeaders[i]);
  }

  const mappedRows = (data.rows || []).map(row => {
    const out = {};
    for (const [origKey, propKey] of keyMap) {
      out[propKey] = row[origKey] ?? '';
    }
    // Giữ các key không nằm trong headers (nếu có)
    for (const key of Object.keys(row)) {
      if (!keyMap.has(key)) {
        out[mapHeaderToProp(key)] = row[key];
      }
    }
    return out;
  });

  return { headers: mappedHeaders, rows: mappedRows };
}

/**
 * Reverse: convert ChannelData từ prop format ngược lại Excel format (để ghi file).
 * @param {{ headers: string[], rows: Record<string, unknown>[] }} data
 * @returns {{ headers: string[], rows: Record<string, unknown>[] }}
 */
export function mapIndexDataToHeaders(data) {
  if (!data || !data.headers?.length) return data;

  const excelHeaders = mapPropNamesToHeaders(data.headers);

  /** @type {Map<string, string>} prop name → Excel header */
  const keyMap = new Map();
  for (let i = 0; i < data.headers.length; i++) {
    keyMap.set(data.headers[i], excelHeaders[i]);
  }

  const mappedRows = (data.rows || []).map(row => {
    const out = {};
    for (const [propKey, excelKey] of keyMap) {
      out[excelKey] = row[propKey] ?? '';
    }
    // Giữ các key không nằm trong headers
    for (const key of Object.keys(row)) {
      if (!keyMap.has(key)) {
        out[mapPropToHeader(key)] = row[key];
      }
    }
    return out;
  });

  return { headers: excelHeaders, rows: mappedRows };
}
