import { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircleIcon, ArrowDownTrayIcon, PrinterIcon, MagnifyingGlassIcon, DocumentTextIcon, PhotoIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import PedidoForm from '../components/PedidoForm';
import ProductosPedidoModal from '../components/ProductosPedidoModal';
import { supabase } from '../lib/supabase';

// Tipo para los datos que vienen de Supabase
interface PedidoSupabase {
  id: string;
  cliente: string;
  fecha_inicio: string;
  fecha_entrega: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  observaciones: string;
  clientes: {
    tipo_cliente: string;
    nombre: string;
    apellidos: string;
    nombre_compania: string;
    email: string;
    telefono: string;
    direccion: string;
    notas: string;
    contacto_nombre: string;
    contacto_email: string;
    contacto_telefono: string;
    contacto_cargo: string;
  };
}

interface Pedido {
  id: string;
  cliente: string;
  tipo_cliente: string;
  nombre: string;
  apellidos: string;
  nombre_compania: string;
  email: string;
  telefono: string;
  direccion: string;
  notas: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono: string;
  contacto_cargo: string;
  fecha_inicio: string;
  fecha_entrega: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  observaciones: string;
}

interface ProductoSupabase {
  nombre: string;
  precio: number;
  categoria: string;
  imagen_url: string;
}

interface VentaSupabase {
  cantidad: number;
  total_venta: number;
  forma_pago: string;
  productos: ProductoSupabase;
}

interface ProductoPedido {
  nombre: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  cantidad: number;
  precio_venta: number;
  forma_pago: string;
  descuento: number;
  tallas: string[];
  colores: string[];
  producto_id: number;
  total_steps: number;
  completed_steps: number;
  ventas_id: number | null;
  cliente_id: number | null;
  tasks_complete: number | null;
  total_orders: number | null;
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
  const [isProductosModalOpen, setIsProductosModalOpen] = useState(false);
  const [productosDelPedido, setProductosDelPedido] = useState<ProductoPedido[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Cargar datos desde Supabase
  useEffect(() => {
    async function fetchPedidos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pedidos')
          .select(`
            id,
            cliente,
            fecha_inicio,
            fecha_entrega,
            estado,
            observaciones,
            clientes!inner (
              tipo_cliente,
              nombre,
              apellidos,
              nombre_compania,
              email,
              telefono,
              direccion,
              notas,
              contacto_nombre,
              contacto_email,
              contacto_telefono,
              contacto_cargo
            )
          `);

        if (error) {
          console.error('Error al cargar pedidos:', error);
          throw error;
        }

        // Transformar los datos al formato esperado por la interfaz
        const pedidosFormateados = (data as any[]).map(pedido => ({
          id: pedido.id,
          cliente: pedido.cliente,
          tipo_cliente: pedido.clientes?.tipo_cliente || '',
          nombre: pedido.clientes?.nombre || '',
          apellidos: pedido.clientes?.apellidos || '',
          nombre_compania: pedido.clientes?.nombre_compania || '',
          email: pedido.clientes?.email || '',
          telefono: pedido.clientes?.telefono || '',
          direccion: pedido.clientes?.direccion || '',
          notas: pedido.clientes?.notas || '',
          contacto_nombre: pedido.clientes?.contacto_nombre || '',
          contacto_email: pedido.clientes?.contacto_email || '',
          contacto_telefono: pedido.clientes?.contacto_telefono || '',
          contacto_cargo: pedido.clientes?.contacto_cargo || '',
          fecha_inicio: pedido.fecha_inicio || '',
          fecha_entrega: pedido.fecha_entrega || '',
          estado: pedido.estado as 'pendiente' | 'en_proceso' | 'completado',
          observaciones: pedido.observaciones || ''
        }));

        console.log('Pedidos formateados:', pedidosFormateados); // Para debug
        setPedidos(pedidosFormateados);
      } catch (error) {
        console.error('Error al procesar datos de pedidos:', error);
      } finally {
      setLoading(false);
      }
    }

    fetchPedidos();
  }, []);

  // Filtrar pedidos según búsqueda y pestaña activa
  const pedidosFiltrados = useCallback(() => {
    let filtered = pedidos;
    
    // Filtrar por búsqueda
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p => {
          const nombreCompleto = p.nombre_compania || `${p.nombre} ${p.apellidos}`.trim();
          return nombreCompleto.toLowerCase().includes(search) || 
                 p.id.toLowerCase().includes(search) ||
                 p.email?.toLowerCase().includes(search) ||
                 p.telefono?.includes(search);
        }
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

  // Obtener el nombre del cliente formateado (empresa o nombre completo)
  const getNombreCliente = (pedido: Pedido) => {
    if (pedido.tipo_cliente === 'compania') {
      return pedido.nombre_compania || 'Sin nombre de compañía';
    } else {
      const nombreCompleto = `${pedido.nombre || ''} ${pedido.apellidos || ''}`.trim();
      return nombreCompleto || 'Sin nombre';
    }
  };

  // Función para cargar los productos del pedido
  const cargarProductosPedido = async (pedidoId: string) => {
    setLoadingProductos(true);
    setProductosDelPedido([]); // Clear previous products

    try {
      // 1. Obtener el pedido para extraer el cliente_id
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select('id, cliente, estado')
        .eq('id', pedidoId)
        .single();
      if (pedidoError || !pedidoData) {
        console.error('No se pudo obtener el cliente_id del pedido:', pedidoError);
        setLoadingProductos(false);
        return;
      }
      const clienteId = pedidoData.cliente;

      // 2. Fetch base product details from detalle_pedidos
      const { data: detalleData, error: detalleError } = await supabase
        .from('detalle_pedidos')
        .select(`
          id,
          pedido_id,
          producto_id,
          tallas,
          colores,
          cantidad,
          precio_unitario,
          productos!inner (
            id,
            nombre,
            precio,
            categoria,
            imagen_url
          )
        `)
        .eq('pedido_id', pedidoId)
        .returns<{
          id: number;
          pedido_id: number;
          producto_id: number;
          tallas: string;
          colores: string;
          cantidad: number;
          precio_unitario: number;
          productos: {
            id: number;
            nombre: string;
            precio: number;
            categoria: string;
            imagen_url: string;
          };
        }[]>();

      if (detalleError) {
        console.error('Error de Supabase al cargar detalles:', detalleError);
        throw detalleError;
      }

      if (!detalleData || detalleData.length === 0) {
        setLoadingProductos(false);
        return;
      }

      // 3. Llamar a la función RPC para obtener datos de ventas-producción
      const { data: ventasProduccionData, error: ventasProduccionError } = await supabase.rpc('obtener_datos_ventas_produccion');
      if (ventasProduccionError) {
        console.error('Error al llamar obtener_datos_ventas_produccion:', ventasProduccionError);
      }

      // 4. Mapear los datos de ventas-producción por producto_id y cliente_id
      const ventasProduccionMap = (ventasProduccionData || []).reduce((acc: any, item: any) => {
        const key = `${item.producto_id}_${item.cliente_id}`;
        acc[key] = item;
        return acc;
      }, {});

      // 5. Extract unique product IDs
      const productIds = detalleData.map(item => item.productos.id);
      const uniqueProductIds = [...new Set(productIds)];

      let maxOrdersMap: { [key: number]: number } = {};
      if (uniqueProductIds.length > 0) {
        const { data: pasosData, error: pasosError } = await supabase
          .from('pasos_produccion')
          .select('producto_id, orden')
          .in('producto_id', uniqueProductIds);
        if (!pasosError && pasosData) {
          maxOrdersMap = pasosData.reduce((acc, paso) => {
            acc[paso.producto_id] = Math.max(acc[paso.producto_id] || 0, paso.orden);
            return acc;
          }, {} as { [key: number]: number });
        }
      }

      // 6. Formatear los datos finales, enlazando con ventas-producción usando cliente_id
      const productosFormateados: ProductoPedido[] = detalleData.map(item => {
        const productoId = item.productos.id;
        const maxStepsPerUnit = maxOrdersMap[productoId] || 1;
        const totalSteps = item.cantidad * maxStepsPerUnit;
        // Usar clienteId obtenido del pedido
        const key = `${productoId}_${clienteId}`;
        const ventaProduccion = ventasProduccionMap[key];
        return {
          producto_id: productoId,
          nombre: item.productos.nombre,
          precio: item.productos.precio,
          categoria: item.productos.categoria,
          imagen_url: item.productos.imagen_url,
          cantidad: item.cantidad,
          precio_venta: item.precio_unitario * item.cantidad,
          forma_pago: 'N/A',
          descuento: 0,
          tallas: JSON.parse(item.tallas || '[]'),
          colores: JSON.parse(item.colores || '[]'),
          total_steps: totalSteps,
          completed_steps: Math.floor(totalSteps * 0.4),
          ventas_id: ventaProduccion?.ventas_id || null,
          cliente_id: ventaProduccion?.cliente_id || null,
          tasks_complete: ventaProduccion?.tasks_complete || null,
          total_orders: ventaProduccion?.total_orders || null,
        };
      });

      // Verificar si algún producto tiene tasks_complete > 0
      const hayProductosEnProceso = productosFormateados.some(
        producto => (producto.tasks_complete ?? 0) > 0
      );

      // Si hay productos en proceso y el pedido no está ya en ese estado, actualizar el estado
      if (hayProductosEnProceso && pedidoData.estado !== 'en_proceso') {
        const { error: updateError } = await supabase
          .from('pedidos')
          .update({ estado: 'en_proceso' })
          .eq('id', pedidoId);

        if (updateError) {
          console.error('Error al actualizar el estado del pedido:', updateError);
        } else {
          // Actualizar el estado en el estado local de React
          setPedidos(prevPedidos => 
            prevPedidos.map(pedido => 
              pedido.id === pedidoId 
                ? { ...pedido, estado: 'en_proceso' }
                : pedido
            )
          );
        }
      }

      setProductosDelPedido(productosFormateados);
    } catch (error) {
      console.error('Error general al cargar productos del pedido:', error);
      setProductosDelPedido([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Función para manejar el clic en la tarjeta
  const handleCardClick = (pedido: Pedido) => {
    console.log('Pedido seleccionado:', pedido);
    cargarProductosPedido(pedido.id); // This now fetches steps too
    setIsProductosModalOpen(true);
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
          position: 'relative',
          padding: '12px'
        }} 
        className="apple-scrollbar"
      >
        <div className={`inventory-items-container ${getTransitionClass()}`}>
          {!loading && filteredItems.length > 0 && (
            <div className="pedidos-list">
                  {filteredItems.map((pedido, index) => {
                    const [bgColor, textColor] = getEstadoColor(pedido.estado).split(' ');
                    return (
                  <div
                    key={pedido.id}
                    className="pedido-card"
                    onClick={() => handleCardClick(pedido)}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Encabezado de la tarjeta */}
                    <div style={{
                      padding: '16px',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#F9FAFB'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: '#111827' }}>
                            {getNombreCliente(pedido)}
                          </div>
                          <div style={{ 
                            fontSize: '13px', 
                            color: '#6B7280',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {pedido.tipo_cliente === 'compania' ? '🏢 Empresa' : '👤 Persona'}
                          </div>
                        </div>
                          <span style={{ 
                            display: 'inline-block',
                          padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: bgColor,
                            color: textColor
                          }}>
                            {getEstadoTexto(pedido.estado)}
                          </span>
                          </div>
                    </div>

                    {/* Contenido de la tarjeta */}
                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                      {/* Sección de Contacto */}
                      <div className="card-section">
                        <h4 className="section-title">Contacto Principal</h4>
                        {pedido.email && (
                          <div className="info-row">
                            <span className="info-label">✉️ Email:</span>
                            <span className="info-value">{pedido.email}</span>
                          </div>
                        )}
                        {pedido.telefono && (
                          <div className="info-row">
                            <span className="info-label">📞 Teléfono:</span>
                            <span className="info-value">{pedido.telefono}</span>
                          </div>
                        )}
                      </div>

                      {/* Sección de Contacto Adicional */}
                      {(pedido.contacto_nombre || pedido.contacto_email || pedido.contacto_telefono) && (
                        <div className="card-section">
                          <h4 className="section-title">Contacto Adicional</h4>
                          {pedido.contacto_nombre && (
                            <div className="info-row">
                              <span className="info-label">👤 Nombre:</span>
                              <span className="info-value">
                                {pedido.contacto_nombre}
                                {pedido.contacto_cargo && ` (${pedido.contacto_cargo})`}
                              </span>
                            </div>
                          )}
                          {pedido.contacto_email && (
                            <div className="info-row">
                              <span className="info-label">✉️ Email:</span>
                              <span className="info-value">{pedido.contacto_email}</span>
                            </div>
                          )}
                          {pedido.contacto_telefono && (
                            <div className="info-row">
                              <span className="info-label">📞 Teléfono:</span>
                              <span className="info-value">{pedido.contacto_telefono}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sección de Dirección */}
                      {pedido.direccion && (
                        <div className="card-section">
                          <h4 className="section-title">Dirección</h4>
                          <div className="info-row">
                            <span className="info-label">📍</span>
                            <span className="info-value">{pedido.direccion}</span>
                          </div>
                        </div>
                      )}

                      {/* Sección de Fechas */}
                      <div className="card-section">
                        <h4 className="section-title">Fechas</h4>
                        <div className="info-row">
                          <span className="info-label">🏁 Inicio:</span>
                          <span className="info-value">
                            {new Date(pedido.fecha_inicio).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">🎯 Entrega:</span>
                          <span className="info-value">
                            {new Date(pedido.fecha_entrega).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                    );
                  })}
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
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <PlusCircleIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
          Nuevo Pedido
        </button>
      </div>

      {/* Modal de Productos - Use the new component */}
      <ProductosPedidoModal
        isOpen={isProductosModalOpen}
        onClose={() => setIsProductosModalOpen(false)}
        productos={productosDelPedido}
        loading={loadingProductos}
      />

      {/* Estilos generales y de animación (Keep styles not moved to the modal) */}
      <style>{`
        .pedidos-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 100%;
          margin: 0 auto;
        }

        .pedido-card {
          width: 100%;
        }

        .pedido-card:hover {
          transform: translateY(-2px);
          border-color: #D1D5DB;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .card-section {
          padding: 0;
          margin-bottom: 0;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #4B5563;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f3f4f6;
          display: inline-block;
        }

        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: #374151;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-label {
          color: #6B7280;
          min-width: 24px;
          flex-shrink: 0;
          line-height: 1.5;
        }

        .info-value {
          flex: 1;
          word-break: break-word;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .pedido-card {
            margin-bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
}

// Global styles (ensure this runs once)
const styleId = 'produccion-animation-styles';
if (!document.getElementById(styleId)) {
  const animationStyle = document.createElement('style');
  animationStyle.id = styleId;
  animationStyle.innerHTML = `
    @keyframes modalAppear {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .apple-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .apple-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .apple-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
    .apple-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.4); }
    .apple-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(0, 0, 0, 0.2) transparent; }

    .inventory-items-container { transition: transform 0.3s ease, opacity 0.3s ease; }
    .items-enter-active-right { opacity: 1; transform: translateX(0); }
    .items-exit-active-right { opacity: 0; transform: translateX(-20px); }
    .items-enter-active-left { opacity: 1; transform: translateX(0); }
    .items-exit-active-left { opacity: 0; transform: translateX(20px); }

    .tab-underline { position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background-color: #4F46E5; transition: width 0.3s ease; }
    .tab-underline-active { position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background-color: #4F46E5; transition: width 0.3s ease; }

    .spinner { width: 24px; height: 24px; border: 3px solid rgba(79, 70, 229, 0.2); border-radius: 50%; border-top-color: #4F46E5; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
`;
document.head.appendChild(animationStyle);
}

export default Produccion; 