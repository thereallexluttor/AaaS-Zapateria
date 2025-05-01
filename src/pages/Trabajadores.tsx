import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, PrinterIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import TrabajadorFormComponent from '../components/TrabajadorForm';
import TrabajadorItem, { TrabajadorItemType } from '../components/TrabajadorItem';
import { useTrabajadores } from '../lib/hooks';

// Tipos de pestañas para filtrar trabajadores
type FilterTab = 'produccion' | 'administrativo';
type ModalType = 'trabajador' | null;

function Trabajadores() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrabajador, setSelectedTrabajador] = useState<TrabajadorItemType | null>(null);
  const [itemsVisible, setItemsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('produccion');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [prevTab, setPrevTab] = useState<FilterTab>('produccion');
  
  // State for selected workers
  const [selectedTrabajadores, setSelectedTrabajadores] = useState<Set<string>>(new Set());
  
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
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #c1c1c1;
        border-radius: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #a8a8a8;
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
    const tabs: FilterTab[] = ['produccion', 'administrativo'];
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
    // Always filter by the active tab
    // Also filter out any residual unwanted types that might still be in the data
    return trabajadores.filter(t => 
      t.tipo === activeTab && 
      !((t.tipo as string) === 'diseno' || 
        (t.tipo as string) === 'diseño' || 
        (t.tipo as string) === 'ventas')
    );
  }, [trabajadores, activeTab]);
  
  // Preparar los trabajadores para mostrar
  const trabajadorItems: TrabajadorItemType[] = getFilteredTrabajadores()
    .filter(trabajador => !!trabajador.id) // Ensure ID exists
    .map(trabajador => ({
      ...trabajador,
      type: 'trabajador', // Static type for the component
      id: trabajador.id!, // ID is confirmed by the filter above
      // Type is now guaranteed to be one of the allowed FilterTab values (excluding 'todos')
      // So direct assignment is safe
      tipo: trabajador.tipo as 'produccion' | 'administrativo' // Cast needed as TS cannot fully infer from filters
    }));
  
  // Handle selecting/deselecting a single trabajador
  const handleSelectTrabajador = useCallback((id: string, isSelected: boolean) => {
    setSelectedTrabajadores(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isSelected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []);

  // Handle selecting/deselecting all currently visible trabajadores
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const currentVisibleIds = trabajadorItems.map(t => t.id);
    
    setSelectedTrabajadores(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isChecked) {
        currentVisibleIds.forEach(id => newSelected.add(id));
      } else {
        currentVisibleIds.forEach(id => newSelected.delete(id));
      }
      return newSelected;
    });
  }, [trabajadorItems]);

  // Determine if "Select All" checkbox should be checked
  const isAllSelected = trabajadorItems.length > 0 && trabajadorItems.every(t => selectedTrabajadores.has(t.id));
  
  // Handler for export button
  const handleExport = useCallback(async () => {
    const selectedIds = Array.from(selectedTrabajadores);
    console.log('Exporting selected trabajador IDs:', selectedIds);

    // Get full data for selected workers from the original list
    const selectedData = trabajadores.filter(t => selectedIds.includes(t.id!));

    if (selectedData.length === 0) {
      console.log('No data selected for export.');
      // Optionally show a message to the user
      return;
    }

    // Define headers (customize as needed)
    const headers = [
      'id', 'nombre', 'apellido', 'cedula', 'tipo', 'area', 
      'salario', 'fecha_contratacion', 'correo', 'telefono', 'direccion', 
      'especialidad', 'tipo_contrato', 'horas_trabajo', 'fecha_nacimiento'
    ];

    // Prepare data in the format needed by xlsx.utils.json_to_sheet
    // (Array of objects where keys match headers)
    const excelData = selectedData.map(worker => {
      const row: Record<string, any> = {};
      headers.forEach(header => {
        // Handle potentially undefined fields
        row[header] = (worker as any)[header] ?? ''; 
      });
      return row;
    });
    
    try {
      console.log('Sending export request to main process...');
      // Use the exposed electronAPI from preload script
      const result = await window.electronAPI.invoke('export-trabajadores-excel', { 
        headers,
        data: excelData 
      });
      
      console.log('Export result from main process:', result);

      if (result.success) {
        console.log(`Export successful: ${result.message} (${result.filePath})`);
        // Optionally show a success notification to the user
        alert(`Exportación exitosa: ${result.message}\nGuardado en: ${result.filePath}`);
      } else {
        console.error(`Export failed: ${result.message}`);
        // Optionally show an error notification to the user
        alert(`Error en la exportación: ${result.message}`);
      }
    } catch (error) {
      console.error('Error invoking Excel export IPC:', error);
      alert(`Error de comunicación al exportar: ${(error as Error).message}`);
    }

  }, [selectedTrabajadores, trabajadores]);
  
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      padding: '24px 24px 0 24px', // Removed bottom padding 
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden', // Contain everything within the container
      display: 'flex',
      flexDirection: 'column'
    }}>
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
        {(['produccion', 'administrativo'] as FilterTab[]).map((tab) => (
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
            
            {tab === 'produccion' && '🛠️ Producción'}
            {tab === 'administrativo' && '📊 Administrativo'}
          </button>
        ))}
      </div>
      
      {/* Header Row with Select All */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        padding: '0 8px' // Align with item padding
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            disabled={trabajadorItems.length === 0}
            style={{ cursor: 'pointer' }}
            title={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
          />
          <label 
            style={{ fontSize: '14px', color: '#6B7280', cursor: 'pointer' }} 
            onClick={(e) => { 
              const checkbox = (e.target as HTMLLabelElement).previousElementSibling;
              if (checkbox instanceof HTMLInputElement) {
                checkbox.click();
              }
            }}
          >
            Seleccionar Todos ({selectedTrabajadores.size} seleccionados)
          </label>
        </div>

        {/* Placeholder for potential header actions/sorting */}
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
          {activeTab === 'produccion' && 'Trabajadores de Producción'}
          {activeTab === 'administrativo' && 'Personal Administrativo'}
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
          flex: '1 1 auto', // Add flex grow/shrink
          minHeight: '200px', // Keep minimum size 
          overflowY: 'auto', 
          position: 'relative',
          marginBottom: '0px',
          // Add custom styled scrollbar
          scrollbarWidth: 'thin', // For Firefox
          scrollbarColor: '#c1c1c1 #f1f1f1', // For Firefox 
        }} 
        className="custom-scrollbar" // Add custom scrollbar class
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
                  : activeTab === 'produccion'
                    ? 'No hay trabajadores de producción registrados.'
                      : activeTab === 'administrativo'
                        ? 'No hay personal administrativo registrado.'
                    : ''
              }
            </div>
          ) : !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trabajadorItems.map(trabajador => (
                <div key={trabajador.id} className="trabajador-item-wrapper">
                  <TrabajadorItem
                    trabajador={trabajador}
                    isSelected={selectedTrabajadores.has(trabajador.id)}
                    onSelectChange={handleSelectTrabajador}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              ))}
              {/* Add some padding at the bottom of the scroll */}
              <div style={{ height: '24px' }}></div> 
            </div>
          )}
        </div>
      </div>
      
      {/* Contenedor de botones en esquina inferior derecha */}
      <div 
        style={{
          position: 'fixed', // Keep fixed at bottom right
          bottom: '24px',
          right: '24px',
          display: 'flex',
          gap: '12px',
          zIndex: 9999,
          // Add shadow to make buttons stand out against scroll content
          backgroundColor: 'rgba(255, 255, 255, 0.77)',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Botón Exportar */}
        <button 
          onClick={handleExport}
          disabled={selectedTrabajadores.size === 0}
          style={{
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: 'none',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: selectedTrabajadores.size === 0 ? 'not-allowed' : 'pointer',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 200,
            fontFamily: "'Poppins', sans-serif",
            opacity: selectedTrabajadores.size === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (selectedTrabajadores.size === 0) return;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            if (selectedTrabajadores.size === 0) return;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <ArrowDownTrayIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Exportar
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