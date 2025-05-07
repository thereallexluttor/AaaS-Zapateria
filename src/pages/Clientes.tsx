import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ClienteFormComponent from '../components/ClienteForm';
import ClienteItem, { ClienteItemType } from '../components/ClienteItem';
import { useClientes } from '../lib/hooks';

// Tipos de pestañas para filtrar clientes
type FilterTab = 'todos';
type ModalType = 'cliente' | null;

function Clientes() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteItemType | null>(null);
  const [itemsVisible, setItemsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('todos');
  
  // State for selected clients
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  
  // Referencia para guardar el último término de búsqueda que se envió a la API
  const lastSearchTermRef = useRef<string>('');
  
  // Agregar estilos de animación dinámicamente al montar el componente
  useEffect(() => {
    // Crear estilos para las animaciones
    const animationStyle = document.createElement('style');
    animationStyle.innerHTML = `
      /* Animaciones para elementos individuales */
      .cliente-item-wrapper {
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
      .cliente-item-wrapper:nth-child(1) { animation-delay: 0.05s; }
      .cliente-item-wrapper:nth-child(2) { animation-delay: 0.1s; }
      .cliente-item-wrapper:nth-child(3) { animation-delay: 0.15s; }
      .cliente-item-wrapper:nth-child(4) { animation-delay: 0.2s; }
      .cliente-item-wrapper:nth-child(5) { animation-delay: 0.25s; }
      .cliente-item-wrapper:nth-child(6) { animation-delay: 0.3s; }
      .cliente-item-wrapper:nth-child(7) { animation-delay: 0.35s; }
      .cliente-item-wrapper:nth-child(8) { animation-delay: 0.4s; }
      .cliente-item-wrapper:nth-child(9) { animation-delay: 0.45s; }
      .cliente-item-wrapper:nth-child(10) { animation-delay: 0.5s; }
      
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
  
  // Usar el hook para obtener los clientes
  const { 
    clientes, 
    loading, 
    getClientes, 
    addCliente,
    updateCliente,
    deleteCliente
  } = useClientes();
  
  // Manejar la búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Solo realizamos la búsqueda si es diferente de la última búsqueda
      if (searchTerm !== lastSearchTermRef.current) {
        // Animación de desvanecimiento antes de buscar
        setItemsVisible(false);
        
        setTimeout(() => {
          lastSearchTermRef.current = searchTerm;
          getClientes(searchTerm);
          
          // Devolver visibilidad después de obtener resultados
          setTimeout(() => {
            setItemsVisible(true);
          }, 300);
        }, 300);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, getClientes]);
  
  // Manejar el cambio en el campo de búsqueda
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    
    // Si se borra completamente la búsqueda, recargar todos los datos
    if (newTerm === '' && lastSearchTermRef.current !== '') {
      console.log('Campo de búsqueda vacío: actualizando vista');
      lastSearchTermRef.current = '';
      getClientes('');
    }
  }, [getClientes]);
  
  const openModal = (type: ModalType) => {
    setActiveModal(type);
  };
  
  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
      
      // Actualizar los clientes después de cerrar el modal
      getClientes(searchTerm);
    }, 300);
  }, [getClientes, searchTerm]);
  
  const handleViewDetails = useCallback((cliente: ClienteItemType) => {
    setSelectedCliente(cliente);
    // Aquí se puede implementar la lógica para mostrar detalles
    console.log('Ver detalles de:', cliente);
  }, []);
  
  // Preparar los clientes para mostrar
  const clienteItems: ClienteItemType[] = clientes.map(cliente => ({
    ...cliente,
    type: 'cliente'
  }));
  
  // Handle selecting/deselecting a single cliente
  const handleSelectCliente = useCallback((id: string, isSelected: boolean) => {
    setSelectedClientes(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isSelected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []);

  // Handle selecting/deselecting all currently visible clientes
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const currentVisibleIds = clienteItems
      .map(c => c.id)
      .filter((id): id is string => id !== undefined); // Filtrar posibles undefined
    
    setSelectedClientes(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isChecked) {
        currentVisibleIds.forEach(id => newSelected.add(id));
      } else {
        currentVisibleIds.forEach(id => newSelected.delete(id));
      }
      return newSelected;
    });
  }, [clienteItems]);

  // Determine if "Select All" checkbox should be checked
  const isAllSelected = clienteItems.length > 0 && 
    clienteItems.every(c => c.id !== undefined && selectedClientes.has(c.id));
  
  // Handler for export button
  const handleExport = useCallback(async () => {
    const selectedIds = Array.from(selectedClientes);
    console.log('Exporting selected cliente IDs:', selectedIds);

    // Get full data for selected clients from the original list
    const selectedData = clientes.filter(c => c.id !== undefined && selectedIds.includes(c.id));

    if (selectedData.length === 0) {
      console.log('No data selected for export.');
      // Optionally show a message to the user
      return;
    }

    // Define headers (customize as needed)
    const headers = [
      'id', 'nombre', 'apellidos', 'tipo_cliente', 'email', 'telefono', 
      'direccion', 'ciudad', 'codigo_postal', 'fecha_registro',
      'nombre_compania', 'contacto_nombre', 'contacto_email', 'contacto_telefono'
    ];

    // Prepare data in the format needed by xlsx.utils.json_to_sheet
    const excelData = selectedData.map(cliente => {
      const row: Record<string, any> = {};
      headers.forEach(header => {
        // Handle potentially undefined fields
        row[header] = (cliente as any)[header] ?? ''; 
      });
      return row;
    });
    
    try {
      console.log('Sending export request to main process...');
      // Use the exposed electronAPI from preload script
      const result = await window.electronAPI.invoke('export-clientes-excel', { 
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

  }, [selectedClientes, clientes]);
  
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      padding: '24px 24px 0 24px', 
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden',
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
          placeholder="Buscar clientes..."
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
            disabled={clienteItems.length === 0}
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
            Seleccionar Todos ({selectedClientes.size} seleccionados)
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
          Lista de Clientes
          {!loading && clienteItems.length > 0 && 
            <span style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              fontWeight: 400, 
              marginLeft: '8px' 
            }}>
              ({clienteItems.length} {clienteItems.length === 1 ? 'cliente' : 'clientes'})
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
      
      {/* Lista de clientes */}
      <div 
        style={{ 
          flex: '1 1 auto',
          minHeight: '200px',
          overflowY: 'auto', 
          position: 'relative',
          marginBottom: '0px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#c1c1c1 #f1f1f1',
        }} 
        className="custom-scrollbar"
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
            Cargando clientes...
          </div>
        )}
        
        {/* Lista de clientes con animación */}
        <div 
          className="clientes-container"
          style={{
            opacity: itemsVisible ? 1 : 0,
            transform: itemsVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            padding: '4px'
          }}
        >
          {!loading && clienteItems.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 0', 
              color: '#6B7280',
              fontSize: '14px' 
            }}>
              {searchTerm 
                ? `No se encontraron clientes para "${searchTerm}"` 
                : 'No hay clientes registrados. Agrega algunos usando el botón "Nuevo Cliente".'
              }
            </div>
          ) : !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {clienteItems.map(cliente => (
                <div key={cliente.id} className="cliente-item-wrapper">
                  <ClienteItem
                    cliente={cliente}
                    onViewDetails={handleViewDetails}
                    isSelected={cliente.id !== undefined && selectedClientes.has(cliente.id)}
                    onSelect={(cliente, selected) => {
                      if (cliente.id !== undefined) {
                        handleSelectCliente(cliente.id, selected);
                      }
                    }}
                  />
                </div>
              ))}
              {/* Espacio adicional para scroll */}
              <div style={{ height: '100px' }}></div>
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
          zIndex: 9999,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Botón Exportar */}
        <button 
          onClick={handleExport}
          disabled={selectedClientes.size === 0}
          style={{
            height: '36px',
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: 'none',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            cursor: selectedClientes.size === 0 ? 'not-allowed' : 'pointer',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 200,
            fontFamily: "'Poppins', sans-serif",
            opacity: selectedClientes.size === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (selectedClientes.size === 0) return;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            if (selectedClientes.size === 0) return;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <ArrowDownTrayIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Exportar
        </button>
        
        {/* Botón Nuevo Cliente */}
        <button 
          onClick={() => openModal('cliente')}
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
          Nuevo Cliente
        </button>
      </div>
      
      {/* Modal de formulario */}
      {activeModal === 'cliente' && (
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
          <ClienteFormComponent
            onClose={closeModal}
            onSave={addCliente}
            isClosing={isClosing}
          />
        </div>
      )}
    </div>
  );
}

export default Clientes; 