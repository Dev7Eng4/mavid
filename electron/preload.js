const { contextBridge, ipcRenderer } = require('electron');

let _scriptLogHandler = null;

contextBridge.exposeInMainWorld('runner', {
  runNpmScript: (npmScript, extraEnv) => ipcRenderer.invoke('run-npm-script', { npmScript, extraEnv }),
  cancelRunningJob: () => ipcRenderer.invoke('cancel-running-job'),
  runScript: (script, params) => ipcRenderer.invoke('run-script', { script, params }),
  getConstantsUiModel: () => ipcRenderer.invoke('get-constants-ui-model'),
  saveConstantsUiModel: modelPatch => ipcRenderer.invoke('save-constants-ui-model', { modelPatch }),
  listChannels: () => ipcRenderer.invoke('list-channels'),
  readChannelData: filePath => ipcRenderer.invoke('read-channel-data', { filePath }),
  writeChannelIndex: payload => ipcRenderer.invoke('write-channel-index', payload),
  readChannelFolderData: channelFolder => ipcRenderer.invoke('read-channel-folder-data', { channelFolder }),
  setChannelFolderStartFromRow: (channelFolder, dataRowIndex) =>
    ipcRenderer.invoke('set-channel-folder-start-from-row', { channelFolder, dataRowIndex }),
  listBackgrounds: () => ipcRenderer.invoke('list-backgrounds'),
  listChannelFolders: () => ipcRenderer.invoke('list-channel-folders'),
  getOverlayOptionNames: () => ipcRenderer.invoke('get-overlay-option-names'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  readInputFile: () => ipcRenderer.invoke('read-input-file'),
  writeInputFile: content => ipcRenderer.invoke('write-input-file', { content }),
  onScriptLog: cb => {
    if (_scriptLogHandler) {
      ipcRenderer.removeListener('script-log', _scriptLogHandler);
    }
    _scriptLogHandler = (_event, line) => cb(line);
    ipcRenderer.on('script-log', _scriptLogHandler);
  },
  removeScriptLogListener: () => {
    if (_scriptLogHandler) {
      ipcRenderer.removeListener('script-log', _scriptLogHandler);
      _scriptLogHandler = null;
    }
  },
});
