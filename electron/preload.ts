import { ipcRenderer, contextBridge } from 'electron'

// Whitelist specific channels for IPC
const validChannels = [
  'open-folder-dialog',
  'execute-sql', 
  'save-settings',
  'load-settings',
  'process-image-ocr',
  'export-trabajadores-excel', // Add channel for Excel export
  'export-clientes-excel' // Add channel for exporting clientes to Excel
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Invoke methods (Renderer -> Main -> Renderer)
  invoke: (channel: string, ...args: any[]) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid invoke channel: ${channel}`);
  },
  // Send methods (Renderer -> Main)
  send: (channel: string, ...args: any[]) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Invalid send channel: ${channel}`);
    }
  },
  // Receive methods (Main -> Renderer)
  on: (channel: string, func: (...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    } else {
      throw new Error(`Invalid receive channel: ${channel}`);
    }
  },
  // Remove listener
  removeListener: (channel: string, func: (...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    } else {
      throw new Error(`Invalid removeListener channel: ${channel}`);
    }
  }
});

// Declare the type for the exposed API
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, func: (...args: any[]) => void) => void;
      removeListener: (channel: string, func: (...args: any[]) => void) => void;
      // We could add a specific function signature here for better type safety,
      // but using the generic invoke is also common.
      // exportTrabajadoresExcel: (data: { headers: string[], data: any[] }) => Promise<{ success: boolean; message?: string; filePath?: string }>;
    };
  }
}
