const { contextBridge, ipcRenderer } = require('electron');

let _scriptErrorLogHandler = null;

contextBridge.exposeInMainWorld('runner', {
  runNpmScript: (npmScript, extraEnv) => ipcRenderer.invoke('run-npm-script', { npmScript, extraEnv }),
  cancelRunningJob: () => ipcRenderer.invoke('cancel-running-job'),
  runScript: (script, params) => ipcRenderer.invoke('run-script', { script, params }),
  getConstantsUiModel: () => ipcRenderer.invoke('get-constants-ui-model'),
  getConstantsFactoryUiModel: () => ipcRenderer.invoke('get-constants-factory-ui-model'),
  saveConstantsUiModel: modelPatch => ipcRenderer.invoke('save-constants-ui-model', { modelPatch }),
  selectVideoStorageFolder: currentPath => ipcRenderer.invoke('select-video-storage-folder', { currentPath }),
  listChannels: () => ipcRenderer.invoke('list-channels'),
  readChannelData: filePath => ipcRenderer.invoke('read-channel-data', { filePath }),
  writeChannelIndex: payload => ipcRenderer.invoke('write-channel-index', payload),
  readChannelFolderData: channelFolder => ipcRenderer.invoke('read-channel-folder-data', { channelFolder }),
  readMavidChannelConfig: channelFolder => ipcRenderer.invoke('read-mavid-channel-config', { channelFolder }),
  writeMavidChannelConfig: payload => ipcRenderer.invoke('write-mavid-channel-config', payload),
  setChannelFolderStartFromRow: (channelFolder, dataRowIndex) =>
    ipcRenderer.invoke('set-channel-folder-start-from-row', { channelFolder, dataRowIndex }),
  listBackgrounds: () => ipcRenderer.invoke('list-backgrounds'),
  listChannelFolders: () => ipcRenderer.invoke('list-channel-folders'),
  listRegisteredChannelEmails: () => ipcRenderer.invoke('list-registered-channel-emails'),
  getOverlayOptionNames: () => ipcRenderer.invoke('get-overlay-option-names'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  readInputFile: () => ipcRenderer.invoke('read-input-file'),
  writeInputFile: content => ipcRenderer.invoke('write-input-file', { content }),
  getGpmDataFolder: () => ipcRenderer.invoke('get-gpm-data-folder'),
  selectGpmDataFolder: () => ipcRenderer.invoke('select-gpm-data-folder'),
  loadGpmProfiles: () => ipcRenderer.invoke('load-gpm-profiles'),
  selectGpmBrowserExe: () => ipcRenderer.invoke('select-gpm-browser-exe'),
  clearGpmBrowserExe: () => ipcRenderer.invoke('clear-gpm-browser-exe'),
  gpmApiRequest: payload => ipcRenderer.invoke('gpm-api-request', payload),
  gpmPlaywrightListOpen: () => ipcRenderer.invoke('gpm-playwright-list-open'),
  gpmPlaywrightStartFolder: payload => ipcRenderer.invoke('gpm-playwright-start-folder', payload),
  gpmPlaywrightStopFolder: profileKey => ipcRenderer.invoke('gpm-playwright-stop-folder', { profileKey }),
  /** Chỉ stderr / console.error / warn / lỗi thoát mã — không phải toàn bộ stdout npm. */
  onScriptErrorLog: cb => {
    if (_scriptErrorLogHandler) {
      ipcRenderer.removeListener('script-error-log', _scriptErrorLogHandler);
    }
    _scriptErrorLogHandler = (_event, line) => cb(line);
    ipcRenderer.on('script-error-log', _scriptErrorLogHandler);
  },
  removeScriptErrorLogListener: () => {
    if (_scriptErrorLogHandler) {
      ipcRenderer.removeListener('script-error-log', _scriptErrorLogHandler);
      _scriptErrorLogHandler = null;
    }
  },
  getPersistedErrorLogs: () => ipcRenderer.invoke('get-persisted-error-logs'),
  appendPersistedErrorLog: line => ipcRenderer.invoke('append-persisted-error-log', { line }),
  clearPersistedErrorLogs: () => ipcRenderer.invoke('clear-persisted-error-logs'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  getMavidGroups: () => ipcRenderer.invoke('get-mavid-groups'),
  setMavidGroups: payload => ipcRenderer.invoke('set-mavid-groups', payload),
});
