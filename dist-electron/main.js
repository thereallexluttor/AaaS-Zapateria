import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn, spawnSync } from "child_process";
import fs from "node:fs";
import os from "node:os";
function findPythonExecutable() {
  const platform = process.platform;
  if (platform === "win32") {
    const pythonExecutables = [
      "python",
      "python3",
      "py",
      "C:\\Python310\\python.exe",
      "C:\\Python39\\python.exe",
      "C:\\Python38\\python.exe",
      "C:\\Python37\\python.exe",
      "C:\\Program Files\\Python310\\python.exe",
      "C:\\Program Files\\Python39\\python.exe",
      "C:\\Program Files\\Python38\\python.exe",
      "C:\\Program Files\\Python37\\python.exe",
      "C:\\Program Files (x86)\\Python310\\python.exe",
      "C:\\Program Files (x86)\\Python39\\python.exe",
      "C:\\Program Files (x86)\\Python38\\python.exe",
      "C:\\Program Files (x86)\\Python37\\python.exe"
    ];
    for (const exe of pythonExecutables) {
      try {
        if (exe.includes("\\")) {
          if (fs.existsSync(exe)) {
            return exe;
          }
        } else {
          const result = spawnSync(exe, ["--version"], { shell: true });
          if (result.status === 0) {
            return exe;
          }
        }
      } catch (e) {
        console.log(`Python ejecutable ${exe} no disponible`);
      }
    }
  } else {
    const pythonExecutables = ["python3", "python"];
    for (const exe of pythonExecutables) {
      try {
        const result = spawnSync(exe, ["--version"], { shell: true });
        if (result.status === 0) {
          return exe;
        }
      } catch (e) {
      }
    }
  }
  return "python";
}
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: "#ffffff",
    titleBarStyle: "hidden"
  });
  win.maximize();
  win.once("ready-to-show", () => {
    win == null ? void 0 : win.show();
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  ipcMain.on("window-minimize", () => {
    if (win) win.minimize();
  });
  ipcMain.on("window-maximize", () => {
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });
  ipcMain.on("window-close", () => {
    if (win) win.close();
  });
  ipcMain.handle("save-temp-file", async (event, { fileName, data }) => {
    try {
      const tempDir = path.join(os.tmpdir(), "zapateria-temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(data));
      console.log(`Temporary file saved at: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("Error saving temporary file:", error);
      throw error;
    }
  });
  ipcMain.handle("process-pdf-ocr", async (event, pdfPath) => {
    try {
      console.log(`Processing PDF with OCR: ${pdfPath}`);
      const appRootPath = process.env.APP_ROOT || __dirname;
      const scriptPath = path.join(appRootPath, "ai_service", "services", "ocr.py");
      const servicesDir = path.join(appRootPath, "ai_service", "services");
      console.log(`Script path: ${scriptPath}`);
      console.log(`Services directory: ${servicesDir}`);
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      const pythonExecutable = findPythonExecutable();
      console.log(`Using Python executable: ${pythonExecutable}`);
      return new Promise((resolve, reject) => {
        const env = {
          ...process.env,
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: "utf-8"
          // Asegurar que la salida se codifica correctamente
        };
        const args = [scriptPath, pdfPath, "--raw"];
        console.log(`Executing: ${pythonExecutable} ${args.join(" ")}`);
        const pythonProcess = spawn(pythonExecutable, args, {
          env,
          shell: process.platform === "win32"
          // Usar shell en Windows
        });
        let dataString = "";
        let errorString = "";
        pythonProcess.stdout.on("data", (data) => {
          dataString += data.toString();
          console.log(`Python stdout: ${data}`);
        });
        pythonProcess.stderr.on("data", (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          try {
            const startMarker = "===JSON_RESULT_START===";
            const endMarker = "===JSON_RESULT_END===";
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error("No se encontró el resultado JSON en la salida del proceso"));
              return;
            }
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            resolve(result);
          } catch (error) {
            console.error("Error parsing JSON result:", error);
            reject(error);
          }
        });
        pythonProcess.on("error", (error) => {
          console.error("Error starting Python process:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error in OCR processing:", error);
      throw error;
    }
  });
  ipcMain.handle("process-producto-ocr", async (event, filePath) => {
    try {
      console.log(`Processing product file with OCR: ${filePath}`);
      const appRootPath = process.env.APP_ROOT || __dirname;
      const scriptPath = path.join(appRootPath, "ai_service", "services", "ocr_producto.py");
      const servicesDir = path.join(appRootPath, "ai_service", "services");
      console.log(`Script path: ${scriptPath}`);
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      const pythonExecutable = findPythonExecutable();
      return new Promise((resolve, reject) => {
        const env = {
          ...process.env,
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: "utf-8"
        };
        const args = [scriptPath, filePath, "--raw"];
        console.log(`Executing: ${pythonExecutable} ${args.join(" ")}`);
        const pythonProcess = spawn(pythonExecutable, args, {
          env,
          shell: process.platform === "win32"
        });
        let dataString = "";
        let errorString = "";
        pythonProcess.stdout.on("data", (data) => {
          dataString += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          try {
            const startMarker = "===JSON_RESULT_START===";
            const endMarker = "===JSON_RESULT_END===";
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error("No se encontró el resultado JSON en la salida del proceso"));
              return;
            }
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            resolve(result);
          } catch (error) {
            console.error("Error parsing JSON result:", error);
            reject(error);
          }
        });
        pythonProcess.on("error", (error) => {
          console.error("Error starting Python process:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error in product OCR processing:", error);
      throw error;
    }
  });
  ipcMain.handle("process-material-ocr", async (event, filePath) => {
    try {
      console.log(`Processing material file with OCR: ${filePath}`);
      const appRootPath = process.env.APP_ROOT || __dirname;
      const scriptPath = path.join(appRootPath, "ai_service", "services", "ocr_material.py");
      const servicesDir = path.join(appRootPath, "ai_service", "services");
      console.log(`Script path: ${scriptPath}`);
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      const pythonExecutable = findPythonExecutable();
      return new Promise((resolve, reject) => {
        const env = {
          ...process.env,
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: "utf-8"
        };
        const args = [scriptPath, filePath, "--raw"];
        console.log(`Executing: ${pythonExecutable} ${args.join(" ")}`);
        const pythonProcess = spawn(pythonExecutable, args, {
          env,
          shell: process.platform === "win32"
        });
        let dataString = "";
        let errorString = "";
        pythonProcess.stdout.on("data", (data) => {
          dataString += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code}: ${errorString}`));
            return;
          }
          try {
            const startMarker = "===JSON_RESULT_START===";
            const endMarker = "===JSON_RESULT_END===";
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error("No se encontró el resultado JSON en la salida del proceso"));
              return;
            }
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            resolve(result);
          } catch (error) {
            console.error("Error parsing JSON result:", error);
            reject(error);
          }
        });
        pythonProcess.on("error", (error) => {
          console.error("Error starting Python process:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error in material OCR processing:", error);
      throw error;
    }
  });
  ipcMain.handle("process-producto-text", async (event, rawText) => {
    try {
      console.log(`Processing product text with AI`);
      const appRootPath = process.env.APP_ROOT || __dirname;
      const servicesDir = path.join(appRootPath, "ai_service", "services");
      const tempDir = path.join(os.tmpdir(), "zapateria-temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, `text_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, rawText, "utf8");
      const scriptPath = path.join(appRootPath, "ai_service", "services", "gemma_agent_producto.py");
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      const pythonExecutable = findPythonExecutable();
      return new Promise((resolve, reject) => {
        const normalizedServicesDir = servicesDir.replace(/\\/g, "/");
        const normalizedTempFile = tempFile.replace(/\\/g, "/");
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
        const tempCodeFile = path.join(tempDir, `temp_code_${Date.now()}.py`);
        fs.writeFileSync(tempCodeFile, code, "utf8");
        const env = {
          ...process.env,
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: "utf-8"
        };
        console.log(`Executing Python with temp code file: ${tempCodeFile}`);
        const pythonProcess = spawn(pythonExecutable, [tempCodeFile], {
          env,
          shell: process.platform === "win32"
        });
        let dataString = "";
        let errorString = "";
        pythonProcess.stdout.on("data", (data) => {
          dataString += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        pythonProcess.on("close", (code2) => {
          try {
            fs.unlinkSync(tempFile);
            fs.unlinkSync(tempCodeFile);
          } catch (e) {
            console.error("Error cleaning temporary files:", e);
          }
          if (code2 !== 0) {
            console.error(`Python process exited with code ${code2}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code2}: ${errorString}`));
            return;
          }
          try {
            const startMarker = "===JSON_RESULT_START===";
            const endMarker = "===JSON_RESULT_END===";
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error("No se encontró el resultado JSON en la salida del proceso"));
              return;
            }
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            resolve(result);
          } catch (error) {
            console.error("Error parsing JSON result:", error);
            reject(error);
          }
        });
        pythonProcess.on("error", (error) => {
          console.error("Error starting Python process:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error in product text processing:", error);
      throw error;
    }
  });
  ipcMain.handle("process-material-text", async (event, rawText) => {
    try {
      console.log(`Processing material text with AI`);
      const appRootPath = process.env.APP_ROOT || __dirname;
      const servicesDir = path.join(appRootPath, "ai_service", "services");
      const tempDir = path.join(os.tmpdir(), "zapateria-temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, `text_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, rawText, "utf8");
      const scriptPath = path.join(appRootPath, "ai_service", "services", "gemma_agent_material.py");
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
      }
      const pythonExecutable = findPythonExecutable();
      return new Promise((resolve, reject) => {
        const normalizedServicesDir = servicesDir.replace(/\\/g, "/");
        const normalizedTempFile = tempFile.replace(/\\/g, "/");
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
        const tempCodeFile = path.join(tempDir, `temp_code_${Date.now()}.py`);
        fs.writeFileSync(tempCodeFile, code, "utf8");
        const env = {
          ...process.env,
          PYTHONPATH: servicesDir,
          PYTHONIOENCODING: "utf-8"
        };
        console.log(`Executing Python with temp code file: ${tempCodeFile}`);
        const pythonProcess = spawn(pythonExecutable, [tempCodeFile], {
          env,
          shell: process.platform === "win32"
        });
        let dataString = "";
        let errorString = "";
        pythonProcess.stdout.on("data", (data) => {
          dataString += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          errorString += data.toString();
          console.error(`Python stderr: ${data}`);
        });
        pythonProcess.on("close", (code2) => {
          try {
            fs.unlinkSync(tempFile);
            fs.unlinkSync(tempCodeFile);
          } catch (e) {
            console.error("Error cleaning temporary files:", e);
          }
          if (code2 !== 0) {
            console.error(`Python process exited with code ${code2}, error: ${errorString}`);
            reject(new Error(`Process exited with code ${code2}: ${errorString}`));
            return;
          }
          try {
            const startMarker = "===JSON_RESULT_START===";
            const endMarker = "===JSON_RESULT_END===";
            const startIdx = dataString.indexOf(startMarker);
            const endIdx = dataString.indexOf(endMarker);
            if (startIdx === -1 || endIdx === -1) {
              reject(new Error("No se encontró el resultado JSON en la salida del proceso"));
              return;
            }
            const jsonStr = dataString.substring(startIdx + startMarker.length, endIdx).trim();
            const result = JSON.parse(jsonStr);
            resolve(result);
          } catch (error) {
            console.error("Error parsing JSON result:", error);
            reject(error);
          }
        });
        pythonProcess.on("error", (error) => {
          console.error("Error starting Python process:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error in material text processing:", error);
      throw error;
    }
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
