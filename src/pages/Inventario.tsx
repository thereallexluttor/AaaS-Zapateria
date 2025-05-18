import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, PrinterIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import MaterialFormComponent from '../components/MaterialForm';
import ProductoFormComponent from '../components/ProductoForm';
import HerramientaFormComponent from '../components/HerramientaForm';
import OrdenMaterialForm from '../components/OrdenMaterialForm';
import MaterialOrdenList from '../components/MaterialOrdenList';
import HerramientaDañoFormComponent from '../components/HerramientaDañoForm';
import HerramientaMantenimientoFormComponent from '../components/HerramientaMantenimientoForm';
import HerramientaMantenimientoListComponent from '../components/HerramientaMantenimientoList';
import HerramientaDañoListComponent from '../components/HerramientaDañoList';
import InventoryItem, { InventoryItemType } from '../components/InventoryItem';
import { useInventario } from '../lib/hooks';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { Herramienta } from '../lib/types';

type ModalType = 'material' | 'producto' | 'herramienta' | 'ordenMaterial' | 'herramientaDaño' | 'herramientaMantenimiento' | 'herramientaMantenimientoList' | 'herramientaDañoList' | null;
type FilterTab = 'materiales' | 'productos' | 'herramientas';
type ViewMode = 'list' | 'materialOrdenes';

function Inventario() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItemType | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('materiales');
  const [prevTab, setPrevTab] = useState<FilterTab>('materiales');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Referencia para guardar el último término de búsqueda que se envió a la API
  const lastSearchTermRef = useRef<string>('');
  
  // Manejadores de visibilidad de elementos para animaciones
  const [itemsVisible, setItemsVisible] = useState(true);
  
  // Usar el hook personalizado para obtener los elementos del inventario
  const { 
    loading, 
    getAllItems, 
    searchInventario, 
    initialized, 
    searchQuery,
    refreshAllData 
  } = useInventario();
  
  // Manejar la búsqueda con debounce y evitar búsquedas duplicadas
  useEffect(() => {
    // Solo realizar búsquedas cuando se ha inicializado el inventario
    if (!initialized) return;
    
    // Si el término de búsqueda es el mismo que ya está activo, no realizamos una nueva búsqueda
    if (searchTerm === searchQuery) return;
    
    const timer = setTimeout(() => {
      // Solo realizamos la búsqueda si es diferente de la última búsqueda
      if (searchTerm !== lastSearchTermRef.current) {
        // Animación de desvanecimiento antes de buscar
        setItemsVisible(false);
        
        setTimeout(() => {
          lastSearchTermRef.current = searchTerm;
          searchInventario(searchTerm);
          
          // Devolver visibilidad después de obtener resultados
          setTimeout(() => {
            setItemsVisible(true);
          }, 300);
        }, 300);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, searchInventario, initialized, searchQuery]);
  
  // Manejar el cambio en el campo de búsqueda con control para evitar re-renders innecesarios
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    
    // Si se borra completamente la búsqueda, asegurémonos de recargar todos los datos
    if (newTerm === '' && lastSearchTermRef.current !== '') {
      console.log('Campo de búsqueda vacío: actualizando vista');
      lastSearchTermRef.current = '';
      searchInventario('');
    }
  }, [searchInventario]);
  
  const openModal = (type: ModalType) => {
    setIsEditMode(false);
    setSelectedItem(null);
    setActiveModal(type);
  };
  
  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
      setIsEditMode(false);
      setSelectedItem(null);
      
      // Actualizar el inventario después de cerrar el modal
      refreshAllData();
    }, 300);
  }, [refreshAllData]);
  
  const handleViewDetails = useCallback((item: InventoryItemType) => {
    if (item.type === 'material') {
      // Ya no cambiamos a la vista de órdenes al hacer clic en la tarjeta
      setSelectedItem(item);
      console.log('Ver detalles de material:', item);
    } else {
      // Para otros tipos de items, mantener el comportamiento actual
      setSelectedItem(item);
      console.log('Ver detalles de:', item);
    }
  }, []);
  
  // Nueva función específica para ver órdenes de materiales
  const handleViewMaterialOrders = useCallback((item: InventoryItemType) => {
    if (item.type === 'material') {
      setSelectedItem(item);
      setViewMode('materialOrdenes');
      console.log('Ver órdenes de material:', item);
    }
  }, []);
  
  // Función específica para editar materiales
  const handleEditMaterial = useCallback((item: InventoryItemType) => {
    if (item.type === 'material') {
      setSelectedItem(item);
      setIsEditMode(true);
      setActiveModal('material');
    }
  }, []);

  // Nueva función para ordenar materiales
  const handleOrderMaterial = useCallback((item: InventoryItemType) => {
    if (item.type === 'material') {
      setSelectedItem(item);
      setActiveModal('ordenMaterial');
    }
  }, []);

  // Volver a la vista de lista desde la vista de órdenes
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedItem(null);
  }, []);

  // Nueva función para reportar daños en herramientas
  const handleReportDamage = useCallback((item: InventoryItemType) => {
    if (item.type === 'herramienta') {
      setSelectedItem(item);
      setActiveModal('herramientaDaño');
      console.log('Reportar daño de herramienta:', item);
    }
  }, []);

  // Nueva función para programar mantenimiento de herramientas
  const handleScheduleMaintenance = useCallback((item: InventoryItemType) => {
    if (item.type === 'herramienta') {
      setSelectedItem(item);
      setActiveModal('herramientaMantenimiento');
      console.log('Programar mantenimiento de herramienta:', item);
    }
  }, []);

  // Nueva función para ver mantenimientos de herramientas
  const handleViewMaintenance = useCallback((item: InventoryItemType) => {
    if (item.type === 'herramienta') {
      setSelectedItem(item);
      setActiveModal('herramientaMantenimientoList');
      console.log('Ver mantenimientos de herramienta:', item);
    }
  }, []);

  // Nueva función para ver daños/reparaciones de herramientas
  const handleViewDamages = useCallback((item: InventoryItemType) => {
    if (item.type === 'herramienta') {
      setSelectedItem(item);
      setActiveModal('herramientaDañoList');
      console.log('Ver daños/reparaciones de herramienta:', item);
    }
  }, []);

  // Filtrar elementos según la pestaña activa
  const getFilteredItems = useCallback(() => {
    const allItems = getAllItems();
    
    const typeMapping: Record<FilterTab, string> = {
      'materiales': 'material',
      'productos': 'producto',
      'herramientas': 'herramienta'
    };
    
    return allItems.filter(item => item.type === typeMapping[activeTab]);
  }, [getAllItems, activeTab]);
  
  // Memorizar los items para evitar re-renders innecesarios
  const inventoryItems = getFilteredItems();
  
  // Manejar cambio de pestaña con animación
  const handleTabChange = useCallback((tab: FilterTab) => {
    if (tab === activeTab) return;
    
    // Si estamos en la vista de órdenes, volver a la lista primero
    if (viewMode === 'materialOrdenes') {
      setViewMode('list');
      setSelectedItem(null);
    }
    
    // Establecer la dirección de la transición basada en la posición de la pestaña
    const tabOrder = ['materiales', 'productos', 'herramientas'];
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
    
  }, [activeTab, viewMode]);

  // Clase CSS para la animación de los elementos según la dirección
  const getTransitionClass = () => {
    return itemsVisible 
      ? transitionDirection === 'right' ? 'items-enter-active-right' : 'items-enter-active-left'
      : transitionDirection === 'right' ? 'items-exit-active-right' : 'items-exit-active-left';
  };

  // Renderizar el contenido según el modo de vista
  const renderContent = () => {
    if (viewMode === 'materialOrdenes' && selectedItem && selectedItem.type === 'material') {
      return (
        <MaterialOrdenList 
          materialId={selectedItem.id || '0'} 
          materialNombre={selectedItem.nombre}
          onBack={handleBackToList}
        />
      );
    }

    return (
      <>
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
            placeholder="Buscar en inventario..."
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
          {(['materiales', 'productos', 'herramientas'] as FilterTab[]).map((tab) => (
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
              
              {tab === 'materiales' && '🧵 Materiales'}
              {tab === 'productos' && '👞 Productos'}
              {tab === 'herramientas' && '🔧 Herramientas'}
            </button>
          ))}
        </div>
        
        {/* Título del inventario con contador */}
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
            {activeTab === 'materiales' && 'Lista Materiales'}
            {activeTab === 'productos' && 'Lista Productos'}
            {activeTab === 'herramientas' && 'Lista Herramientas'}
            {initialized && !loading && inventoryItems.length > 0 && 
              <span style={{ 
                fontSize: '14px', 
                color: '#6B7280', 
                fontWeight: 400, 
                marginLeft: '8px' 
              }}>
                ({inventoryItems.length} {inventoryItems.length === 1 ? 'elemento' : 'elementos'})
              </span>
            }
          </span>
          
          {searchTerm && initialized && !loading && (
            <span style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              fontWeight: 400 
            }}>
              {`Resultados para "${searchTerm}"`}
            </span>
          )}
        </h2>
        
        {/* Mostrar mensaje de carga o inicialización */}
        {(loading || !initialized) && (
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
            Cargando inventario...
          </div>
        )}
        
        {/* Lista de elementos con transición */}
        <div 
          style={{ 
            maxHeight: 'calc(100vh - 220px)', 
            overflowY: 'auto', 
            position: 'relative' 
          }} 
          className="apple-scrollbar"
        >
          <div className={`inventory-items-container ${getTransitionClass()}`}>
            {initialized && !loading && inventoryItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="inventory-item-wrapper">
                <InventoryItem 
                  item={item} 
                  onViewDetails={handleViewDetails}
                  onEdit={item.type === 'material' ? handleEditMaterial : undefined}
                  onOrder={item.type === 'material' ? handleOrderMaterial : undefined}
                  onViewOrders={item.type === 'material' ? handleViewMaterialOrders : undefined}
                  onReportDamage={item.type === 'herramienta' ? handleReportDamage : undefined}
                  onScheduleMaintenance={item.type === 'herramienta' ? handleScheduleMaintenance : undefined}
                  onViewMaintenance={item.type === 'herramienta' ? handleViewMaintenance : undefined}
                  onViewDamages={item.type === 'herramienta' ? handleViewDamages : undefined}
                />
              </div>
            ))}
            
            {/* Mensaje cuando no hay elementos */}
            {initialized && !loading && inventoryItems.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0', 
                color: '#6B7280',
                fontSize: '14px'
              }}>
                {searchTerm 
                  ? `No se encontraron elementos para "${searchTerm}"` 
                  : `No hay ${
                      activeTab === 'materiales' ? 'materiales' : 
                      activeTab === 'productos' ? 'productos' : 'herramientas'
                    } en el inventario.`
                }
              </div>
            )}
            
            {/* Espacio adicional para permitir scroll más abajo */}
            <div style={{ padding: '100px 0' }}></div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      padding: '24px', 
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden' 
    }}>
      {renderContent()}
      
      {/* Modal para agregar, editar, ordenar o reportar elementos */}
      {activeModal && (
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
          {activeModal === 'material' && (
            <MaterialFormComponent 
              onClose={closeModal}
              isClosing={isClosing}
              isEditMode={isEditMode}
              materialToEdit={isEditMode ? selectedItem : null}
            />
          )}
          
          {activeModal === 'producto' && (
            <ProductoFormComponent 
              onClose={closeModal}
              isClosing={isClosing}
            />
          )}
          
          {activeModal === 'herramienta' && (
            <HerramientaFormComponent 
              onClose={closeModal}
              isClosing={isClosing}
            />
          )}

          {activeModal === 'ordenMaterial' && (
            <OrdenMaterialForm 
              onClose={closeModal}
              isClosing={isClosing}
              material={selectedItem}
            />
          )}

          {activeModal === 'herramientaDaño' && (
            <HerramientaDañoFormComponent
              onClose={closeModal}
              isClosing={isClosing}
              herramienta={selectedItem as (Herramienta & { type: 'herramienta' }) | null}
            />
          )}

          {activeModal === 'herramientaMantenimiento' && (
            <HerramientaMantenimientoFormComponent
              onClose={closeModal}
              isClosing={isClosing}
              herramienta={selectedItem as (Herramienta & { type: 'herramienta' }) | null}
            />
          )}

          {activeModal === 'herramientaMantenimientoList' && (
            <HerramientaMantenimientoListComponent
              onClose={closeModal}
              isClosing={isClosing}
              herramienta={selectedItem as (Herramienta & { type: 'herramienta' }) | null}
            />
          )}

          {activeModal === 'herramientaDañoList' && (
            <HerramientaDañoListComponent
              onClose={closeModal}
              isClosing={isClosing}
              herramienta={selectedItem as (Herramienta & { type: 'herramienta' }) | null}
            />
          )}
        </div>
      )}
      
      {/* Contenedor de botones en esquina inferior derecha */}
      {viewMode === 'list' && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            gap: '12px',
            zIndex: 9999,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Botón Agregar Producto */}
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
            onClick={() => openModal('producto')}
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
            Agregar Producto
          </button>

          {/* Botón Agregar Herramientas */}
          <button 
            style={{
              width: '230px',
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
            onClick={() => openModal('herramienta')}
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
            Agregar herramientas
          </button>

          {/* Botón Agregar Materiales */}
          <button 
            style={{
              width: '210px',
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
            onClick={() => openModal('material')}
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
            Agregar materiales
          </button>
        </div>
      )}
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

export default Inventario;