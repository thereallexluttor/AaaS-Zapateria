import './App.css'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <div style={{ 
      display: 'flex', 
      width: '100%', 
      height: '100vh',
      backgroundColor: '#FAF5E4',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <Sidebar />
      <div style={{ 
        flex: 1, 
        padding: '20px',
        overflow: 'auto',
        height: '100%',
        position: 'relative'
      }}>
        {/* Contenido principal - vacío por ahora */}
      </div>
    </div>
  )
}

export default App
