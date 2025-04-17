import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, PrinterIcon, MagnifyingGlassIcon, DocumentTextIcon, PhotoIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import PedidoForm from '../components/PedidoForm';

interface Pedido {
  id: string;
  cliente: string;
  producto: string;
  cantidad: number;
  fechaInicio: string;
  fechaEntrega: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
}

type FilterTab = 'todos' | 'pendiente' | 'en_proceso' | 'completado';

function Produccion() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('todos');
  const [prevTab, setPrevTab] = useState<FilterTab>('todos');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPedido, setCurrentPedido] = useState<Pedido | null>(null);
  const [itemsVisible, setItemsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  // Simular datos de ejemplo (en una aplicación real, esto vendría de una API)
  useEffect(() => {
    // Simulamos una carga
    setTimeout(() => {
      // Datos de ejemplo
      const pedidosEjemplo: Pedido[] = [
        {
          id: '1',
          cliente: 'Calzados Rivera',
          producto: 'Zapato de vestir negro',
          cantidad: 50,
          fechaInicio: '2023-10-01',
          fechaEntrega: '2023-10-15',
          estado: 'completado'
        },
        {
          id: '2',
          cliente: 'Tiendas Moda',
          producto: 'Sandalia de verano',
          cantidad: 75,
          fechaInicio: '2023-10-05',
          fechaEntrega: '2023-10-20',
          estado: 'en_proceso'
        },
        {
          id: '3',
          cliente: 'Calzado Infantil SA',
          producto: 'Zapato escolar',
          cantidad: 100,
          fechaInicio: '2023-10-10',
          fechaEntrega: '2023-11-01',
          estado: 'pendiente'
        },
        {
          id: '4',
          cliente: 'Boutique Eleganza',
          producto: 'Tacón alto rojo',
          cantidad: 30,
          fechaInicio: '2023-10-12',
          fechaEntrega: '2023-10-28',
          estado: 'en_proceso'
        },
        {
          id: '5',
          cliente: 'Deportivos MaxFit',
          producto: 'Zapatilla deportiva',
          cantidad: 120,
          fechaInicio: '2023-10-05',
          fechaEntrega: '2023-11-10',
          estado: 'pendiente'
        }
      ];
      
      setPedidos(pedidosEjemplo);
      setLoading(false);
    }, 1000);
  }, []);

  // Filtrar pedidos según búsqueda y pestaña activa
  const pedidosFiltrados = useCallback(() => {
    let filtered = pedidos;
    
    // Filtrar por búsqueda
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p => p.cliente.toLowerCase().includes(search) || 
             p.producto.toLowerCase().includes(search) ||
             p.id.toLowerCase().includes(search)
      );
    }
    
    // Filtrar por estado
    if (activeTab !== 'todos') {
      filtered = filtered.filter(p => p.estado === activeTab);
    }
    
    return filtered;
  }, [pedidos, searchTerm, activeTab]);

  // Función para abrir el modal con un pedido
  const handleEditPedido = useCallback((pedido: Pedido) => {
    setCurrentPedido(pedido);
    setIsModalOpen(true);
  }, []);

  // Función para crear un nuevo pedido
  const handleNuevoPedido = useCallback(() => {
    setCurrentPedido(null);
    setIsModalOpen(true);
  }, []);

  // Manejar el cambio en el campo de búsqueda
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Manejar cierre del modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Manejar cambio de pestaña con animación
  const handleTabChange = useCallback((tab: FilterTab) => {
    if (tab === activeTab) return;
    
    // Establecer la dirección de la transición basada en la posición de la pestaña
    const tabOrder = ['todos', 'pendiente', 'en_proceso', 'completado'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(tab);
    
    if (nextIndex > currentIndex) {
      setTransitionDirection('right');
    } else {
      setTransitionDirection('left');
    }
    
    // Guardar la pestaña anterior para la animación
    setPrevTab(activeTab);
    
    // Ocultar elementos actuales
    setItemsVisible(false);
    
    // Cambiar pestaña y mostrar nuevos elementos después de la transición
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => {
        setItemsVisible(true);
      }, 50);
    }, 300);
    
  }, [activeTab]);

  // Clase CSS para la animación de los elementos según la dirección
  const getTransitionClass = () => {
    return itemsVisible 
      ? transitionDirection === 'right' ? 'items-enter-active-right' : 'items-enter-active-left'
      : transitionDirection === 'right' ? 'items-exit-active-right' : 'items-exit-active-left';
  };

  // Obtener el color según el estado del pedido
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#FEF3C7 #92400E';
      case 'en_proceso':
        return '#DBEAFE #1E40AF';
      case 'completado':
        return '#D1FAE5 #065F46';
      default:
        return '#F3F4F6 #1F2937';
    }
  };

  // Obtener el texto formateado del estado
  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En proceso';
      case 'completado':
        return 'Completado';
      default:
        return estado;
    }
  };

  // Resultados filtrados
  const filteredItems = pedidosFiltrados();

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
          placeholder="Buscar pedidos..."
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
        {(['todos', 'pendiente', 'en_proceso', 'completado'] as FilterTab[]).map((tab) => (
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
            {tab === 'pendiente' && '🔶 Pendientes'}
            {tab === 'en_proceso' && '🔵 En Proceso'}
            {tab === 'completado' && '✅ Completados'}
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
          Pedidos de Producción
          {!loading && filteredItems.length > 0 && 
            <span style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              fontWeight: 400, 
              marginLeft: '8px' 
            }}>
              ({filteredItems.length} {filteredItems.length === 1 ? 'pedido' : 'pedidos'})
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
          Cargando pedidos...
        </div>
      )}
      
      {/* Lista de pedidos con transición */}
      <div 
        style={{ 
          maxHeight: 'calc(100vh - 220px)', 
          overflowY: 'auto', 
          position: 'relative' 
        }} 
        className="apple-scrollbar"
      >
        <div className={`inventory-items-container ${getTransitionClass()}`}>
          {!loading && filteredItems.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#F9FAFB' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inicio</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrega</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((pedido, index) => {
                    const [bgColor, textColor] = getEstadoColor(pedido.estado).split(' ');
                    return (
                      <tr key={pedido.id} className="inventory-item-wrapper" style={{ 
                        borderBottom: '1px solid #E5E7EB',
                        transition: 'background-color 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'} 
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{pedido.id}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>{pedido.cliente}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>{pedido.producto}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>{pedido.cantidad}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>{pedido.fechaInicio}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>{pedido.fechaEntrega}</td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: bgColor,
                            color: textColor
                          }}>
                            {getEstadoTexto(pedido.estado)}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditPedido(pedido)}
                              style={{ 
                                background: 'none',
                                border: 'none',
                                color: '#4F46E5',
                                fontSize: '14px',
                                cursor: 'pointer',
                                padding: '0',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3730A3'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#4F46E5'}
                            >
                              Editar
                            </button>
                            <button
                              style={{ 
                                background: 'none',
                                border: 'none',
                                color: '#EF4444',
                                fontSize: '14px',
                                cursor: 'pointer',
                                padding: '0',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#B91C1C'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#EF4444'}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Mensaje cuando no hay elementos */}
          {!loading && filteredItems.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 0', 
              color: '#6B7280',
              fontSize: '14px'
            }}>
              {searchTerm 
                ? `No se encontraron pedidos para "${searchTerm}"` 
                : activeTab === 'todos'
                  ? 'No hay pedidos en el sistema. Agrega uno usando el botón de abajo.'
                  : `No hay pedidos ${
                      activeTab === 'pendiente' ? 'pendientes' : 
                      activeTab === 'en_proceso' ? 'en proceso' : 'completados'
                    } en el sistema.`
              }
            </div>
          )}
        </div>
      </div>
      
      {/* Modal para agregar/editar pedidos */}
      {isModalOpen && (
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
            opacity: 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <PedidoForm 
            onClose={closeModal} 
            isEditing={!!currentPedido} 
            initialData={currentPedido} 
          />
        </div>
      )}
      
      {/* Botón para agregar nuevo pedido */}
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
        <button 
          style={{
            width: '190px',
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
          onClick={handleNuevoPedido}
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
          Nuevo Pedido
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
  
  /* Animaciones para las transiciones de categorías */
  .inventory-items-container {
    transition: transform 0.3s ease, opacity 0.3s ease;
  }
  
  .items-enter-active-right {
    opacity: 1;
    transform: translateX(0);
  }
  
  .items-exit-active-right {
    opacity: 0;
    transform: translateX(-20px);
  }
  
  .items-enter-active-left {
    opacity: 1;
    transform: translateX(0);
  }
  
  .items-exit-active-left {
    opacity: 0;
    transform: translateX(20px);
  }
  
  .inventory-item-wrapper {
    animation: itemAppear 0.3s ease forwards;
    opacity: 0;
    transform: translateY(15px);
  }
  
  @keyframes itemAppear {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Agregar retraso a cada elemento para efecto cascada */
  .inventory-item-wrapper:nth-child(1) { animation-delay: 0.05s; }
  .inventory-item-wrapper:nth-child(2) { animation-delay: 0.1s; }
  .inventory-item-wrapper:nth-child(3) { animation-delay: 0.15s; }
  .inventory-item-wrapper:nth-child(4) { animation-delay: 0.2s; }
  .inventory-item-wrapper:nth-child(5) { animation-delay: 0.25s; }
  .inventory-item-wrapper:nth-child(6) { animation-delay: 0.3s; }
  .inventory-item-wrapper:nth-child(7) { animation-delay: 0.35s; }
  .inventory-item-wrapper:nth-child(8) { animation-delay: 0.4s; }
  .inventory-item-wrapper:nth-child(9) { animation-delay: 0.45s; }
  .inventory-item-wrapper:nth-child(10) { animation-delay: 0.5s; }
  
  /* Animación para pestañas */
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
  
  /* Spinner de carga */
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(79, 70, 229, 0.2);
    border-radius: 50%;
    border-top-color: #4F46E5;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Importar fuente Poppins */
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
`;
document.head.appendChild(animationStyle);

export default Produccion; 