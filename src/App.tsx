import './App.css'
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Dashboard from './components/Dashboard'
import Inventario from './pages/Inventario'
import Clientes from './pages/Clientes'
import Trabajadores from './pages/Trabajadores'

function App() {
  const [activePage, setActivePage] = useState<string>('home');

  // Función para cambiar la página activa
  const handlePageChange = (pageId: string) => {
    setActivePage(pageId);
  };

  // Renderizar la página activa
  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <Dashboard />;
      case 'inventory':
        return <Inventario />;
      case 'clients':
        return <Clientes />;
      case 'employees':
        return <Trabajadores />;
      default:
        return <div className="flex items-center justify-center h-full">
          <p className="text-xl text-gray-500">Página en desarrollo</p>
        </div>;
    }
  };

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
      <TitleBar />
      <Sidebar onItemClick={handlePageChange} activePage={activePage} />
      <div style={{ 
        flex: 1, 
        padding: '20px',
        paddingTop: '52px',
        overflow: 'auto',
        height: '100%',
        position: 'relative'
      }}>
        {renderActivePage()}
      </div>
    </div>
  )
}

export default App
