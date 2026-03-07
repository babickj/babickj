const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  platform: process.platform,
})
