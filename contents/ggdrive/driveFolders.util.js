/**
 * Tìm / tạo thư mục trên Google Drive (API v3).
 * @param {import('googleapis').drive_v3.Drive} drive
 */

/** @param {string} name */
export function escapeDriveQueryLiteral(name) {
  return String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} parentId — `'root'` cho My Drive
 * @param {string} folderName
 * @returns {Promise<string | null>} fileId hoặc null
 */
export async function findChildFolderByName(drive, parentId, folderName) {
  const q = [
    `'${escapeDriveQueryLiteral(parentId)}' in parents`,
    `name = '${escapeDriveQueryLiteral(folderName)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ].join(' and ');
  const { data } = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const files = data.files || [];
  return files.length ? String(files[0].id) : null;
}

/**
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} parentId
 * @param {string} folderName
 * @returns {Promise<string>} folder id
 */
export async function createFolder(drive, parentId, folderName) {
  const { data } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!data.id) throw new Error(`Không tạo được thư mục «${folderName}».`);
  return String(data.id);
}

/**
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} parentId
 * @param {string} folderName
 * @returns {Promise<string>}
 */
export async function ensureChildFolder(drive, parentId, folderName) {
  const existing = await findChildFolderByName(drive, parentId, folderName);
  if (existing) return existing;
  return createFolder(drive, parentId, folderName);
}
