import fs from 'fs';
import path from 'path';
import { VIDEO_STORAGE_ROOT } from '../../constants/index.js';

export const MAVID_MEDIA_FOLDER = 'MaVidMedia';
export const MAPPING_FILE_NAME = 'index.xlsx';
export const GROUP_FILE_NAME = 'group.json';
export const CHANNEL_CONFIG_FILENAME = 'mavid-channel-config.json';

export function getStorageRootPath() {
  const storageRoot = typeof VIDEO_STORAGE_ROOT === 'string' ? VIDEO_STORAGE_ROOT.trim() : '';

  if (storageRoot) {
    return storageRoot;
  }

  if (process.platform === 'win32') {
    for (const L of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
      if (L === 'C') continue;
      const root = `${L}:\\`;
      try {
        if (fs.existsSync(root)) {
          return path.join(root, MAVID_MEDIA_FOLDER);
        }
      } catch {
        /* ignore */
      }
    }
    return `D:\\${MAVID_MEDIA_FOLDER}`;
  }

  if (process.platform === 'darwin') {
    try {
      const vols = '/Volumes';
      if (fs.existsSync(vols)) {
        const names = fs.readdirSync(vols).filter(n => n !== 'Macintosh HD' && n !== 'Mac HD' && !n.startsWith('.'));
        if (names.length > 0) {
          return path.join(vols, names[0], MAVID_MEDIA_FOLDER);
        }
      }
    } catch {
      /* ignore */
    }
    const home = process.env.HOME || '/tmp';
    return path.join(home, MAVID_MEDIA_FOLDER);
  }
  const home = process.env.HOME || '/tmp';
  return path.join(home, MAVID_MEDIA_FOLDER);
}

export function getChannelsDirPath() {
  return path.join(getStorageRootPath(), 'channels');
}

export function getChannelDirPath(channelFolder) {
  return path.join(getChannelsDirPath(), channelFolder);
}

export function getListMappingPath() {
  return path.join(getChannelsDirPath(), MAPPING_FILE_NAME);
}

export function getListGroupsPath() {
  return path.join(getChannelsDirPath(), GROUP_FILE_NAME);
}

export function getChannelConfigPath(channelFolder) {
  return path.join(getChannelDirPath(channelFolder), CHANNEL_CONFIG_FILENAME);
}

export function getVideosDirPath() {
  return path.join(getStorageRootPath(), 'videos');
}

export function getChannelArchiveDirPath(channelFolder) {
  return path.join(getVideosDirPath(), channelFolder);
}

export function getBackgroundsDirPath() {
  return path.join(getStorageRootPath(), 'backgrounds');
}

export const getVisualsDirPath = () => {
  return path.join(getStorageRootPath(), 'visuals');
};

export const getNarratorsDirPath = () => {
  return path.join(getStorageRootPath(), 'narrators');
};
