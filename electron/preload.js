import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('runner', {
  runNpmScript: npmScript => ipcRenderer.invoke('run-npm-script', { npmScript }),
  listConstantsFiles: () => ipcRenderer.invoke('list-constants-files'),
  readConstantsFile: file => ipcRenderer.invoke('read-constants-file', { file }),
  writeConstantsFile: (file, content) => ipcRenderer.invoke('write-constants-file', { file, content }),
});

