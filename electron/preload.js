const { contextBridge, ipcRenderer } = require('electron');

let _scriptLogHandler = null;

contextBridge.exposeInMainWorld('runner', {
  runNpmScript: (npmScript, extraEnv) => ipcRenderer.invoke('run-npm-script', { npmScript, extraEnv }),
  getConstantsUiModel: () => ipcRenderer.invoke('get-constants-ui-model'),
  saveConstantsUiModel: modelPatch => ipcRenderer.invoke('save-constants-ui-model', { modelPatch }),
  listChannels: () => ipcRenderer.invoke('list-channels'),
  readChannelData: filePath => ipcRenderer.invoke('read-channel-data', { filePath }),
  listBackgrounds: () => ipcRenderer.invoke('list-backgrounds'),
  listChannelFolders: () => ipcRenderer.invoke('list-channel-folders'),
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
