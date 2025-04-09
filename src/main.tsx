import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSupabaseStorage } from './lib/supabase.ts'

// Inicializar el almacenamiento de Supabase
initSupabaseStorage().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Verificar si ipcRenderer está disponible antes de usarlo (solo disponible en Electron)
// @ts-ignore - Ignorar el error de TypeScript para ipcRenderer que puede ser undefined
if (typeof window !== 'undefined' && 'ipcRenderer' in window && window.ipcRenderer) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
