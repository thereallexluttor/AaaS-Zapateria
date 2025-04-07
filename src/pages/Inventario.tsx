import { useState } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import MaterialFormComponent from '../components/MaterialForm';

function Inventario() {
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowMaterialModal(false);
      setIsClosing(false);
    }, 300);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Página en blanco */}
      
      {/* Modal para agregar material */}
      {showMaterialModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            opacity: isClosing ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <MaterialFormComponent 
            onClose={closeModal}
            isClosing={isClosing}
          />
        </div>
      )}
      
      {/* Contenedor de botones en esquina inferior derecha */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          gap: '12px',
          zIndex: 9999
        }}
      >
        {/* Botón Agregar */}
        <button 
          style={{
            width: '180px',
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 10px rgba(65, 65, 65, 0.13)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onClick={() => console.log('Agregar clicked')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <PlusCircleIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Agregar Producto
        </button>

        {/* Botón Exportar */}
        <button 
          style={{
            width: '200px',
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 10px rgba(65, 65, 65, 0.13)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onClick={() => console.log('Exportar clicked')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <PlusCircleIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Agregar herramientas
        </button>

        {/* Botón Imprimir */}
        <button 
          style={{
            width: '180px',
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 10px rgba(65, 65, 65, 0.13)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onClick={() => setShowMaterialModal(true)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <PlusCircleIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Agregar materiales
        </button>
      </div>
    </div>
  );
}

// Definir animaciones usando CSS global en un estilo incrustado
const animationStyle = document.createElement('style');
animationStyle.innerHTML = `
  @keyframes modalAppear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Estilo de scrollbar tipo Apple */
  .apple-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .apple-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .apple-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  
  .apple-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.4);
    border: 2px solid transparent;
    background-clip: content-box;
  }
  
  /* Para Firefox */
  .apple-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }
`;
document.head.appendChild(animationStyle);

export default Inventario;