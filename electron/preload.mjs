// Register additional IPC handlers
ipcRenderer.on('main-process-message', (_event, ...args) => {
  console.log('[Receive Main-process message]:', ...args)
})

// Expose all functions needed for controlling window
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
})

// Expose ipcRenderer for other IPC communications
contextBridge.exposeInMainWorld('ipcRenderer', {
  // IPC handlers for temporary files and OCR
  invoke: (channel, args) => {
    const validChannels = [
      'save-temp-file', 
      'process-pdf-ocr',
      'process-herramienta-ocr',
      'process-producto-ocr',
      'process-material-ocr',
      'process-producto-text',
      'process-material-text'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
    throw new Error(`Unauthorized IPC channel ${channel}`);
  }
}) 