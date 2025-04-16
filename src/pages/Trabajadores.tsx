import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, PrinterIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import TrabajadorFormComponent from '../components/TrabajadorForm';
import TrabajadorItem, { TrabajadorItemType } from '../components/TrabajadorItem';
import { useTrabajadores } from '../lib/hooks';

// Tipos de pestañas para filtrar trabajadores
type FilterTab = 'todos' | 'produccion' | 'ventas' | 'administrativo' | 'diseño';
type ModalType = 'trabajador' | null;

function Trabajadores() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrabajador, setSelectedTrabajador] = useState<TrabajadorItemType | null>(null);
  const [itemsVisible, setItemsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('todos');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [prevTab, setPrevTab] = useState<FilterTab>('todos');
  
  // Referencia para guardar el último término de búsqueda que se envió a la API
  const lastSearchTermRef = useRef<string>('');
  
  // Agregar estilos de animación dinámicamente al montar el componente
  useEffect(() => {
    // Crear estilos para las animaciones
    const animationStyle = document.createElement('style');
    animationStyle.innerHTML = `
      /* Animaciones para la transición entre pestañas */
      .fade-in-right {
        animation: fadeInRight 0.3s forwards;
      }
      
      .fade-out-left {
        animation: fadeOutLeft 0.3s forwards;
      }
      
      .fade-in-left {
        animation: fadeInLeft 0.3s forwards;
      }
      
      .fade-out-right {
        animation: fadeOutRight 0.3s forwards;
      }
      
      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes fadeOutLeft {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(-20px);
        }
      }
      
      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes fadeOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(20px);
        }
      }
      
      /* Animación para elementos individuales */
      .trabajador-item-wrapper {
        opacity: 0;
        transform: translateY(10px);
        transition: transform 0.3s ease, opacity 0.3s ease;
        animation: itemAppear 0.3s ease forwards;
      }
      
      @keyframes itemAppear {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Agregar delays para animar de forma escalonada */
      .trabajador-item-wrapper:nth-child(1) { animation-delay: 0.05s; }
      .trabajador-item-wrapper:nth-child(2) { animation-delay: 0.1s; }
      .trabajador-item-wrapper:nth-child(3) { animation-delay: 0.15s; }
      .trabajador-item-wrapper:nth-child(4) { animation-delay: 0.2s; }
      .trabajador-item-wrapper:nth-child(5) { animation-delay: 0.25s; }
      .trabajador-item-wrapper:nth-child(6) { animation-delay: 0.3s; }
      .trabajador-item-wrapper:nth-child(7) { animation-delay: 0.35s; }
      .trabajador-item-wrapper:nth-child(8) { animation-delay: 0.4s; }
      .trabajador-item-wrapper:nth-child(9) { animation-delay: 0.45s; }
      .trabajador-item-wrapper:nth-child(10) { animation-delay: 0.5s; }
      
      /* Estilos para las pestañas */
      .tab-underline {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 2px;
        background-color: #4F46E5;
        transition: width 0.3s ease;
      }
      
      .tab-underline-active {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #4F46E5;
        transition: width 0.3s ease;
      }
      
      /* Spinner para carga */
      .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid rgba(79, 70, 229, 0.2);
        border-radius: 50%;
        border-top-color: #4F46E5;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Animación para el modal */
      @keyframes modalAppear {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      /* Estilo para el scrollbar personalizado */
      .apple-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      
      .apple-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .apple-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      
      .apple-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: rgba(0, 0, 0, 0.3);
      }
    `;
    
    // Añadir los estilos al head del documento
    document.head.appendChild(animationStyle);
    
    // Limpiar al desmontar
    return () => {
      document.head.removeChild(animationStyle);
    };
  }, []);
  
  // Usar el hook para obtener los trabajadores
  const { 
    trabajadores, 
    loading, 
    getTrabajadores, 
    addTrabajador,
    updateTrabajador,
    deleteTrabajador
  } = useTrabajadores();
  
  // Manejar la búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Solo realizamos la búsqueda si es diferente de la última búsqueda
      if (searchTerm !== lastSearchTermRef.current) {
        // Animación de desvanecimiento antes de buscar
        setItemsVisible(false);
        
        setTimeout(() => {
          lastSearchTermRef.current = searchTerm;
          getTrabajadores(searchTerm);
          
          // Devolver visibilidad después de obtener resultados
          setTimeout(() => {
            setItemsVisible(true);
          }, 300);
        }, 300);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, getTrabajadores]);
  
  // Manejar el cambio en el campo de búsqueda
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    
    // Si se borra completamente la búsqueda, recargar todos los datos
    if (newTerm === '' && lastSearchTermRef.current !== '') {
      console.log('Campo de búsqueda vacío: actualizando vista');
      lastSearchTermRef.current = '';
      getTrabajadores('');
    }
  }, [getTrabajadores]);
  
  // Manejar el cambio de pestaña
  const handleTabChange = useCallback((tab: FilterTab) => {
    // Establecer la dirección de la transición
    const tabs: FilterTab[] = ['todos', 'produccion', 'ventas', 'administrativo', 'diseño'];
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(tab);
    
    setTransitionDirection(newIndex > currentIndex ? 'right' : 'left');
    setPrevTab(activeTab);
    
    // Ocultar los elementos actuales
    setItemsVisible(false);
    
    // Después de la animación, cambiar la pestaña y mostrar los nuevos elementos
    setTimeout(() => {
      setActiveTab(tab);
      
      setTimeout(() => {
        setItemsVisible(true);
      }, 50);
    }, 300);
  }, [activeTab]);
  
  // Obtener la clase de transición basada en la dirección
  const getTransitionClass = useCallback(() => {
    if (!itemsVisible) {
      return transitionDirection === 'right' ? 'fade-out-left' : 'fade-out-right';
    }
    return transitionDirection === 'right' ? 'fade-in-right' : 'fade-in-left';
  }, [itemsVisible, transitionDirection]);
  
  const openModal = (type: ModalType) => {
    setActiveModal(type);
  };
  
  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
      
      // Actualizar los trabajadores después de cerrar el modal
      getTrabajadores(searchTerm);
    }, 300);
  }, [getTrabajadores, searchTerm]);
  
  const handleViewDetails = useCallback((trabajador: TrabajadorItemType) => {
    setSelectedTrabajador(trabajador);
    // Aquí se puede implementar la lógica para mostrar detalles
    console.log('Ver detalles de:', trabajador);
  }, []);
  
  // Filtrar trabajadores según la pestaña activa
  const getFilteredTrabajadores = useCallback(() => {
    if (activeTab === 'todos') return trabajadores;
    
    return trabajadores.filter(trabajador => trabajador.tipo === activeTab);
  }, [trabajadores, activeTab]);
  
  // Preparar los trabajadores para mostrar
  const trabajadorItems: TrabajadorItemType[] = getFilteredTrabajadores()
    .filter(trabajador => !!trabajador.id)
    .map(trabajador => ({
      ...trabajador,
      type: 'trabajador',
      id: trabajador.id!,
      tipo: trabajador.tipo === 'diseno' ? 'diseño' : trabajador.tipo
    }));
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', padding: '24px', fontFamily: "'Poppins', sans-serif" }}>
      {/* Barra de búsqueda */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <div style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          color: '#9CA3AF',
          display: 'flex',
          alignItems: 'center' 
        }}>
          <MagnifyingGlassIcon style={{ width: '20px', height: '20px' }} />
        </div>
        <input
          type="text"
          placeholder="Buscar trabajadores..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            height: '44px',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            paddingLeft: '40px',
            paddingRight: '16px',
            fontSize: '14px',
            fontFamily: "'Poppins', sans-serif",
            outline: 'none',
            boxShadow: 'none',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
        />
      </div>
      
      {/* Pestañas de filtro */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #E5E7EB',
        marginBottom: '20px',
        paddingBottom: '2px'
      }}>
        {(['todos', 'produccion', 'ventas', 'administrativo', 'diseño'] as FilterTab[]).map((tab) => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#4F46E5' : '#6B7280',
              borderBottom: activeTab === tab ? '2px solid #4F46E5' : 'none',
              marginBottom: activeTab === tab ? '-2px' : '0',
              transition: 'all 0.2s',
              fontFamily: "'Poppins', sans-serif",
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Animación de subrayado */}
            <span className={activeTab === tab ? 'tab-underline-active' : 'tab-underline'} />
            
            {tab === 'todos' && 'Todos'}
            {tab === 'produccion' && '🛠️ Producción'}
            {tab === 'ventas' && '🛒 Ventas'}
            {tab === 'administrativo' && '📊 Administrativo'}
            {tab === 'diseño' && '✏️ Diseño'}
          </button>
        ))}
      </div>
      
      {/* Título con contador */}
      <h2 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        color: '#111827', 
        marginBottom: '16px',
        marginTop: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          {activeTab === 'todos' && 'Lista de Trabajadores'}
          {activeTab === 'produccion' && 'Trabajadores de Producción'}
          {activeTab === 'ventas' && 'Equipo de Ventas'}
          {activeTab === 'administrativo' && 'Personal Administrativo'}
          {activeTab === 'diseño' && 'Equipo de Diseño'}
          {!loading && trabajadorItems.length > 0 && 
            <span style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              fontWeight: 400, 
              marginLeft: '8px' 
            }}>
              ({trabajadorItems.length} {trabajadorItems.length === 1 ? 'trabajador' : 'trabajadores'})
            </span>
          }
        </span>
        
        {searchTerm && !loading && (
          <span style={{ 
            fontSize: '14px', 
            color: '#6B7280', 
            fontWeight: 400 
          }}>
            {`Resultados para "${searchTerm}"`}
          </span>
        )}
      </h2>
      
      {/* Lista de trabajadores con transición */}
      <div 
        style={{ 
          maxHeight: 'calc(100vh - 220px)', 
          overflowY: 'auto', 
          position: 'relative',
          marginBottom: '20px'
        }} 
        className="apple-scrollbar"
      >
        {/* Mostrar mensaje de carga */}
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#6B7280',
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="spinner"></div>
            Cargando trabajadores...
          </div>
        )}
        
        {/* Lista de trabajadores con animación */}
        <div 
          className={`trabajadores-container ${getTransitionClass()}`}
          style={{
            opacity: itemsVisible ? 1 : 0,
            transform: itemsVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            padding: '4px'
          }}
        >
          {!loading && trabajadorItems.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 0', 
              color: '#6B7280',
              fontSize: '14px' 
            }}>
              {searchTerm 
                ? `No se encontraron trabajadores para "${searchTerm}"` 
                : activeTab === 'todos'
                  ? 'No hay trabajadores registrados. Agrega algunos usando el botón "Nuevo Trabajador".'
                  : activeTab === 'produccion'
                    ? 'No hay trabajadores de producción registrados.'
                    : activeTab === 'ventas'
                      ? 'No hay personal de ventas registrado.'
                      : activeTab === 'administrativo'
                        ? 'No hay personal administrativo registrado.'
                        : 'No hay diseñadores registrados.'
              }
            </div>
          ) : !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trabajadorItems.map(trabajador => (
                <div key={trabajador.id} className="trabajador-item-wrapper">
                  <TrabajadorItem
                    trabajador={trabajador}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
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
        {/* Botón Exportar */}
        <button 
          style={{
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: 'none',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 200,
            fontFamily: "'Poppins', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <ArrowDownTrayIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Exportar
        </button>
        
        {/* Botón Imprimir */}
        <button 
          style={{
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: 'none',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 200,
            fontFamily: "'Poppins', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <PrinterIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Imprimir
        </button>
        
        {/* Botón Nuevo Trabajador */}
        <button 
          onClick={() => openModal('trabajador')}
          style={{
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: 'none',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 200,
            fontFamily: "'Poppins', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <PlusCircleIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Nuevo Trabajador
        </button>
      </div>
      
      {/* Modal de formulario */}
      {activeModal === 'trabajador' && (
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
          <TrabajadorFormComponent
            onClose={closeModal}
            onSave={addTrabajador}
            isClosing={isClosing}
          />
        </div>
      )}
    </div>
  );
}

export default Trabajadores; 