"use strict";
const electron = require("electron");
const validChannels = [
  "open-folder-dialog",
  "execute-sql",
  "save-settings",
  "load-settings",
  "process-image-ocr",
  "export-trabajadores-excel"
  // Add channel for Excel export
];
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Invoke methods (Renderer -> Main -> Renderer)
  invoke: (channel, ...args) => {
    if (validChannels.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid invoke channel: ${channel}`);
  },
  // Send methods (Renderer -> Main)
  send: (channel, ...args) => {
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Invalid send channel: ${channel}`);
    }
  },
  // Receive methods (Main -> Renderer)
  on: (channel, func) => {
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    } else {
      throw new Error(`Invalid receive channel: ${channel}`);
    }
  },
  // Remove listener
  removeListener: (channel, func) => {
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.removeListener(channel, func);
    } else {
      throw new Error(`Invalid removeListener channel: ${channel}`);
    }
  }
});
