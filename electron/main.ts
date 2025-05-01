import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn, spawnSync } from 'child_process'
import fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import os from 'node:os'
import * as XLSX from 'xlsx'

// Función auxiliar para encontrar el ejecutable de Python
function findPythonExecutable(): string {
  const platform = process.platform;
  
  if (platform === 'win32') {
    // En Windows, intentar varios posibles nombres de ejecutables
    const pythonExecutables = [
      'python',
      'python3',
      'py',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      'C:\\Python38\\python.exe',
      'C:\\Python37\\python.exe',
      'C:\\Program Files\\Python310\\python.exe',
      'C:\\Program Files\\Python39\\python.exe',
      'C:\\Program Files\\Python38\\python.exe',
      'C:\\Program Files\\Python37\\python.exe',
      'C:\\Program Files (x86)\\Python310\\python.exe',
      'C:\\Program Files (x86)\\Python39\\python.exe',
      'C:\\Program Files (x86)\\Python38\\python.exe',
      'C:\\Program Files (x86)\\Python37\\python.exe',
    ];
    
    // Devolver el primer ejecutable que existe
    for (const exe of pythonExecutables) {
      try {
        // Verificar si el comando está disponible
        if (exe.includes('\\')) {
          // Es una ruta completa, verificar si existe usando sync version
          if (fsSync.existsSync(exe)) { 
            return exe;
          }
        } else {
          // Es un comando, intentar ejecutarlo
          const result = spawnSync(exe, ['--version'], { shell: true });
          if (result.status === 0) {
            return exe;
          }
        }
      } catch (e) {
        // Continuar con el siguiente
        console.log(`Python ejecutable ${exe} no disponible`);
      }
    }
  } else {
    // En Unix/Mac, es más sencillo
    const pythonExecutables = ['python3', 'python'];
    
    for (const exe of pythonExecutables) {
      try {
        const result = spawnSync(exe, ['--version'], { shell: true });
        if (result.status === 0) {
          return exe;
        }
      } catch (e) {
        // Continuar con el siguiente
      }
    }
  }
  
  // Si llegamos aquí, no se encontró ningún ejecutable
  return 'python'; // Devolver 'python' como último recurso
}

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hidden',
  })

  win.maximize()

  win.once('ready-to-show', () => {
    win?.show()
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Remove application menu (File, Edit, Window, Help)
  Menu.setApplicationMenu(null)
  
  createWindow()

  // IPC handlers for window controls
  ipcMain.on('window-minimize', () => {
    if (win) win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('window-close', () => {
    if (win) win.close()
  })
  
  // IPC handler for saving temporary files (Keep sync for simplicity here)
  ipcMain.handle('save-temp-file', async (event, { fileName, data }) => {
    try {
      // Create a temporary directory if it doesn't exist
      const tempDir = path.join(os.tmpdir(), 'zapateria-temp');
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true }); // Use fsSync.mkdirSync
      }
      
      // Create a full path for the file
      const filePath = path.join(tempDir, fileName);
      
      // Write the file to disk using sync writeFileSync
      fsSync.writeFileSync(filePath, Buffer.from(data)); // Use fsSync.writeFileSync
      
      console.log(`Temporary file saved at: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Error saving temporary file:', error);
      throw error;
    }
  });
  
  // IPC handler for OCR processing
  ipcMain.handle('process-pdf-ocr', async (event, pdfPath) => {
    try {
      console.log(`Processing PDF with OCR: ${pdfPath}`);
      
      // Resolve path to the Python script
      const appRootPath = process.env.APP_ROOT || __dirname;
      const scriptPath = path.join(appRootPath, 'ai_service', 'services', 'ocr.py');
      const servicesDir = path.join(appRootPath, 'ai_service', 'services');
      
      console.log(`Script path: ${scriptPath}`);
      console.log(`Services directory: ${servicesDir}`);
      
      // Verificar que el archivo existe
      if (!fsSync.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      
      // Encontrar el ejecutable de Python
      const pythonExecutable = findPythonExecutable();
      console.log(`Using Python executable: ${pythonExecutable}`);
      
      return new Promise((resolve, reject) => {
        // Configurar variables de entorno para Python
        const env = { 
          ...process.env, 
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: 'utf-8'  // Asegurar que la salida se codifica correctamente
        };
        
        // Argumentos para el proceso Python - añadir --raw para obtener la respuesta directa
        const args = [scriptPath, pdfPath, '--raw'];
        console.log(`Executing: ${pythonExecutable} ${args.join(' ')}`);
        
        // Spawn Python process
        const pythonProcess = spawn(pythonExecutable, args, { 
          env,
          shell: process.platform === 'win32' // Usar shell en Windows
        });
        
        let dataString = '';
        let errorString = '';
        
        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
          console.log(`Python stdout: ${data}`);
        });
        
        // Collect errors from stderr
        pythonProcess.stderr.on('data', (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
          console.log(`Python process exited with code ${code}`);
          if (code === 0) {
            // On successful exit, resolve with the data
            resolve(dataString.trim()); // Trim potential whitespace/newlines
          } else {
            // On error, reject with the error string
            reject(new Error(errorString || `Python script exited with code ${code}`));
          }
          // Clean up temporary file if needed (using sync unlinkSync)
          // fsSync.unlinkSync(pdfPath); // Example cleanup if temp file was created
        });
        
        // Handle process error
        pythonProcess.on('error', (error) => {
          console.error('Error starting Python process:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in OCR processing:', error);
      throw error;
    }
  });
  
  // IPC handler for Excel export
  ipcMain.handle('export-trabajadores-excel', async (event, { headers, data }) => {
    try {
      // Show save dialog to get the file path
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Guardar Trabajadores en Excel',
        defaultPath: 'trabajadores.xlsx',
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        console.log('Export cancelled by user.');
        return { success: false, message: 'Exportación cancelada por el usuario.' };
      }

      console.log(`Attempting to save Excel file to: ${filePath}`);

      // Create worksheet
      // Note: json_to_sheet expects an array of objects. 
      // Ensure the data passed from the renderer is in this format.
      const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trabajadores');

      // Write the file using buffer and fs.writeFile
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      await fs.writeFile(filePath, buffer);

      console.log(`Excel file saved successfully to: ${filePath}`);
      return { success: true, message: 'Archivo Excel guardado con éxito.', filePath };

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      return { success: false, message: `Error al exportar a Excel: ${(error as Error).message}` };
    }
  });
  
  // IPC handler para OCR de productos
  ipcMain.handle('process-producto-ocr', async (event, filePath) => {
    try {
      console.log(`Processing product file with OCR: ${filePath}`);
      
      // Resolve path to the Python script for products
      const appRootPath = process.env.APP_ROOT || __dirname;
      const scriptPath = path.join(appRootPath, 'ai_service', 'services', 'ocr_producto.py');
      const servicesDir = path.join(appRootPath, 'ai_service', 'services');
      
      console.log(`Script path: ${scriptPath}`);
      
      // Verificar que el archivo existe
      if (!fsSync.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      
      // Encontrar el ejecutable de Python
      const pythonExecutable = findPythonExecutable();
      
      return new Promise((resolve, reject) => {
        // Configurar variables de entorno para Python
        const env = { 
          ...process.env, 
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: 'utf-8'
        };
        
        // Argumentos para el proceso Python
        const args = [scriptPath, filePath, '--raw'];
        console.log(`Executing: ${pythonExecutable} ${args.join(' ')}`);
        
        // Spawn Python process
        const pythonProcess = spawn(pythonExecutable, args, { 
          env,
          shell: process.platform === 'win32'
        });
        
        let dataString = '';
        let errorString = '';
        
        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
        });
        
        // Collect errors from stderr
        pythonProcess.stderr.on('data', (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          
          // Extract JSON result from output
          try {
            // Buscar el resultado JSON entre delimitadores
            const startMarker = '===JSON_RESULT_START===';
            const endMarker = '===JSON_RESULT_END===';
            
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error('No se encontró el resultado JSON en la salida del proceso'));
              return;
            }
            
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            
            resolve(result);
          } catch (error) {
            console.error('Error parsing JSON result:', error);
            reject(error);
          }
        });
        
        // Handle process error
        pythonProcess.on('error', (error) => {
          console.error('Error starting Python process:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in product OCR processing:', error);
      throw error;
    }
  });
  
  // IPC handler para OCR de materiales
  ipcMain.handle('process-material-ocr', async (event, filePath) => {
    try {
      console.log(`Processing material file with OCR: ${filePath}`);
      
      // Resolve path to the Python script for materials
      const appRootPath = process.env.APP_ROOT || __dirname;
      const scriptPath = path.join(appRootPath, 'ai_service', 'services', 'ocr_material.py');
      const servicesDir = path.join(appRootPath, 'ai_service', 'services');
      
      console.log(`Script path: ${scriptPath}`);
      
      // Verificar que el archivo existe
      if (!fsSync.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      
      // Encontrar el ejecutable de Python
      const pythonExecutable = findPythonExecutable();
      
      return new Promise((resolve, reject) => {
        // Configurar variables de entorno para Python
        const env = { 
          ...process.env, 
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: 'utf-8'
        };
        
        // Argumentos para el proceso Python
        const args = [scriptPath, filePath, '--raw'];
        console.log(`Executing: ${pythonExecutable} ${args.join(' ')}`);
        
        // Spawn Python process
        const pythonProcess = spawn(pythonExecutable, args, { 
          env,
          shell: process.platform === 'win32'
        });
        
        let dataString = '';
        let errorString = '';
        
        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
        });
        
        // Collect errors from stderr
        pythonProcess.stderr.on('data', (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          
          // Extract JSON result from output
          try {
            // Buscar el resultado JSON entre delimitadores
            const startMarker = '===JSON_RESULT_START===';
            const endMarker = '===JSON_RESULT_END===';
            
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error('No se encontró el resultado JSON en la salida del proceso'));
              return;
            }
            
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            
            resolve(result);
          } catch (error) {
            console.error('Error parsing JSON result:', error);
            reject(error);
          }
        });
        
        // Handle process error
        pythonProcess.on('error', (error) => {
          console.error('Error starting Python process:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in material OCR processing:', error);
      throw error;
    }
  });
  
  // IPC handler para procesar texto de productos
  ipcMain.handle('process-producto-text', async (event, rawText) => {
    try {
      console.log(`Processing product text with AI`);
      
      // Resolve path to the Python script
      const appRootPath = process.env.APP_ROOT || __dirname;
      const servicesDir = path.join(appRootPath, 'ai_service', 'services');
      
      // Crear un archivo temporal con el texto
      const tempDir = path.join(os.tmpdir(), 'zapateria-temp');
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true }); // Use fsSync.mkdirSync
      }
      
      const tempFile = path.join(tempDir, `text_${Date.now()}.txt`);
      fsSync.writeFileSync(tempFile, rawText, 'utf8'); // Use fsSync.writeFileSync
      
      // Importar directamente gemma_agent_producto.py
      const scriptPath = path.join(appRootPath, 'ai_service', 'services', 'gemma_agent_producto.py');
      
      // Verificar que el archivo existe
      if (!fsSync.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      
      // Encontrar el ejecutable de Python
      const pythonExecutable = findPythonExecutable();
      
      return new Promise((resolve, reject) => {
        // Código para ejecutar el módulo de Python - Corregir manejo de rutas para evitar errores Unicode
        const normalizedServicesDir = servicesDir.replace(/\\/g, '/');
        const normalizedTempFile = tempFile.replace(/\\/g, '/');
        
        const code = `
import sys
sys.path.append(r'${normalizedServicesDir}')
from gemma_agent_producto import extraer_datos_producto

with open(r'${normalizedTempFile}', 'r', encoding='utf-8') as f:
    text = f.read()

result = extraer_datos_producto(text)
import json
print("===JSON_RESULT_START===")
if isinstance(result, str):
    print(result)
else:
    print(json.dumps(result, ensure_ascii=False))
print("===JSON_RESULT_END===")
`;
        
        // Guardar código en archivo temporal using sync writeFileSync
        const tempCodeFile = path.join(tempDir, `temp_code_${Date.now()}.py`);
        fsSync.writeFileSync(tempCodeFile, code, 'utf8'); // Use fsSync.writeFileSync
        
        // Configurar variables de entorno para Python
        const env = { 
          ...process.env, 
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: 'utf-8'
        };
        
        // Ejecutar el código Python
        console.log(`Executing Python with temp code file: ${tempCodeFile}`);
        const pythonProcess = spawn(pythonExecutable, [tempCodeFile], { 
          env,
          shell: process.platform === 'win32'
        });
        
        let dataString = '';
        let errorString = '';
        
        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
        });
        
        // Collect errors from stderr
        pythonProcess.stderr.on('data', (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          
          // Extract JSON result from output
          try {
            // Buscar el resultado JSON entre delimitadores
            const startMarker = '===JSON_RESULT_START===';
            const endMarker = '===JSON_RESULT_END===';
            
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error('No se encontró el resultado JSON en la salida del proceso'));
              return;
            }
            
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            
            resolve(result);
          } catch (error) {
            console.error('Error parsing JSON result:', error);
            reject(error);
          }
        });
        
        // Handle process error
        pythonProcess.on('error', (error) => {
          console.error('Error starting Python process:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in product text processing:', error);
      throw error;
    }
  });
  
  // IPC handler para procesar texto de materiales
  ipcMain.handle('process-material-text', async (event, rawText) => {
    try {
      console.log(`Processing material text with AI`);
      
      // Resolve path to the Python script
      const appRootPath = process.env.APP_ROOT || __dirname;
      const servicesDir = path.join(appRootPath, 'ai_service', 'services');
      
      // Crear un archivo temporal con el texto
      const tempDir = path.join(os.tmpdir(), 'zapateria-temp');
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true }); // Use fsSync.mkdirSync
      }
      
      const tempFile = path.join(tempDir, `text_${Date.now()}.txt`);
      fsSync.writeFileSync(tempFile, rawText, 'utf8'); // Use fsSync.writeFileSync
      
      // Importar directamente gemma_agent_material.py
      const scriptPath = path.join(appRootPath, 'ai_service', 'services', 'gemma_agent_material.py');
      
      // Verificar que el archivo existe
      if (!fsSync.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      
      // Encontrar el ejecutable de Python
      const pythonExecutable = findPythonExecutable();
      
      return new Promise((resolve, reject) => {
        // Código para ejecutar el módulo de Python - Corregir manejo de rutas para evitar errores Unicode
        const normalizedServicesDir = servicesDir.replace(/\\/g, '/');
        const normalizedTempFile = tempFile.replace(/\\/g, '/');
        
        const code = `
import sys
sys.path.append(r'${normalizedServicesDir}')
from gemma_agent_material import extraer_datos_material

with open(r'${normalizedTempFile}', 'r', encoding='utf-8') as f:
    text = f.read()

result = extraer_datos_material(text)
import json
print("===JSON_RESULT_START===")
if isinstance(result, str):
    print(result)
else:
    print(json.dumps(result, ensure_ascii=False))
print("===JSON_RESULT_END===")
`;
        
        // Guardar código en archivo temporal using sync writeFileSync
        const tempCodeFile = path.join(tempDir, `temp_code_${Date.now()}.py`);
        fsSync.writeFileSync(tempCodeFile, code, 'utf8'); // Use fsSync.writeFileSync
        
        // Configurar variables de entorno para Python
        const env = { 
          ...process.env, 
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: 'utf-8'
        };
        
        // Ejecutar el código Python
        console.log(`Executing Python with temp code file: ${tempCodeFile}`);
        const pythonProcess = spawn(pythonExecutable, [tempCodeFile], { 
          env,
          shell: process.platform === 'win32'
        });
        
        let dataString = '';
        let errorString = '';
        
        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
        });
        
        // Collect errors from stderr
        pythonProcess.stderr.on('data', (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        
        // Handle process completion
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          
          // Extract JSON result from output
          try {
            // Buscar el resultado JSON entre delimitadores
            const startMarker = '===JSON_RESULT_START===';
            const endMarker = '===JSON_RESULT_END===';
            
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error('No se encontró el resultado JSON en la salida del proceso'));
              return;
            }
            
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            
            resolve(result);
          } catch (error) {
            console.error('Error parsing JSON result:', error);
            reject(error);
          }
        });
        
        // Handle process error
        pythonProcess.on('error', (error) => {
          console.error('Error starting Python process:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in material text processing:', error);
      throw error;
    }
  });
})
