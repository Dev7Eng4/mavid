/**
 * Upload đệ quy một thư mục cục bộ lên một thư mục cha trên Drive (giữ cấu trúc con).
 */
import fs, { createReadStream } from 'fs';
import path from 'path';
import { ensureChildFolder } from './driveFolders.util.js';

/**
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} localDir — đường dẫn tuyệt đối
 * @param {string} driveParentId
 */
export async function uploadLocalDirectoryTree(drive, localDir, driveParentId) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(localDir, ent.name);
    if (ent.isDirectory()) {
      const subId = await ensureChildFolder(drive, driveParentId, ent.name);
      await uploadLocalDirectoryTree(drive, abs, subId);
      continue;
    }
    if (!ent.isFile()) continue;
    await drive.files.create({
      requestBody: {
        name: ent.name,
        parents: [driveParentId],
      },
      media: {
        body: createReadStream(abs),
      },
      fields: 'id',
      supportsAllDrives: true,
    });
  }
}
