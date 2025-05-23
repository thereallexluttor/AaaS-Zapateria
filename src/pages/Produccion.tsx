import { useState, useCallback, useEffect, useRef } from 'react';
import { PlusCircleIcon, CalendarIcon, CurrencyDollarIcon, ShoppingBagIcon, CheckCircleIcon, ClockIcon, XCircleIcon, AdjustmentsHorizontalIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import PedidoForm from '../components/PedidoForm';
import PedidoCard from '../components/PedidoCard';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import { supabase } from '../lib/supabase';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import jsPDF from 'jspdf';

// Definición de tipos exactamente como en la función RPC
interface Pedido {
  venta_id: number;
  fecha_venta: string;
  fecha_entrega: string;
  estado: string;
  forma_pago: string;
  observaciones: string;
  cantidad: number;
  precio_venta: number;
  descuento_porcentaje: number;
  tipo_cliente: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  cliente_ciudad: string;
  cliente_direccion: string;
  trabajador_nombre: string;
  trabajador_email: string;
  trabajador_telefono: string;
  rol_trabajador: string;
  area_trabajador: string;
  producto_nombre: string;
  categoria_producto: string;
  precio_catalogo: number;
  tiempo_fabricacion: number;
  pasos_produccion: number;
  tallas: string[];
  colores: string[];
  // Información de tareas de producción
  total_tareas: number;
  tareas_completadas: number;
}

interface GroupedPedidos {
  [clienteNombre: string]: Pedido[];
}

interface PedidosPorEstado {
  pendiente: GroupedPedidos;
  completado: GroupedPedidos;
  cancelada: GroupedPedidos;
  [key: string]: GroupedPedidos; // Para cualquier otro estado que pueda existir
}

type FilterTab = 'pendiente' | 'completado' | 'cancelada';

function Produccion() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPedido, setCurrentPedido] = useState<any | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidosPorEstado, setPedidosPorEstado] = useState<PedidosPorEstado>({
    pendiente: {},
    completado: {},
    cancelada: {}
  });
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pendiente');
  const [prevTab, setPrevTab] = useState<FilterTab>('pendiente');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [itemsVisible, setItemsVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const lastSearchTermRef = useRef<string>('');
  const [expandedCards, setExpandedCards] = useState<{[key: string]: boolean}>({});
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<{ document: jsPDF; invoiceNumber: string } | null>(null);

  // Función para obtener los pedidos usando consulta alternativa (por si falla la RPC)
  const fetchPedidosAlternativos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          id,
          fecha_inicio,
          fecha_entrega,
          estado,
          forma_pago,
          observaciones,
          cantidad,
          precio_venta,
          descuento,
          cliente_id (
            id,
            tipo_cliente,
            nombre, 
            apellidos,
            nombre_compania,
            email,
            telefono,
            ciudad,
            direccion
          ),
          trabajador_id (
            id,
            nombre,
            apellido,
            correo,
            telefono,
            tipo,
            area
          ),
          producto_id (
            id,
            nombre,
            precio,
            categoria,
            tiempo_fabricacion
          ),
          tallas,
          colores
        `)
        .order('fecha_inicio', { ascending: false });
      
      if (error) throw error;
      
      // Transformar los datos al formato esperado
      const transformedData = (data || []).map((item: any) => ({
        venta_id: item.id,
        fecha_venta: item.fecha_inicio,
        fecha_entrega: item.fecha_entrega,
        estado: item.estado,
        forma_pago: item.forma_pago,
        observaciones: item.observaciones,
        cantidad: item.cantidad,
        precio_venta: item.precio_venta,
        descuento_porcentaje: item.descuento,
        tipo_cliente: item.cliente_id?.tipo_cliente || '',
        cliente_nombre: item.cliente_id 
          ? `${item.cliente_id.nombre || ''} ${item.cliente_id.apellidos || ''} ${item.cliente_id.nombre_compania || ''}`.trim()
          : 'Cliente Desconocido',
        cliente_email: item.cliente_id?.email || '',
        cliente_telefono: item.cliente_id?.telefono || '',
        cliente_ciudad: item.cliente_id?.ciudad || '',
        cliente_direccion: item.cliente_id?.direccion || '',
        trabajador_nombre: item.trabajador_id 
          ? `${item.trabajador_id.nombre || ''} ${item.trabajador_id.apellido || ''}`.trim()
          : '',
        trabajador_email: item.trabajador_id?.correo || '',
        trabajador_telefono: item.trabajador_id?.telefono || '',
        rol_trabajador: item.trabajador_id?.tipo || '',
        area_trabajador: item.trabajador_id?.area || '',
        producto_nombre: item.producto_id?.nombre || '',
        categoria_producto: item.producto_id?.categoria || '',
        precio_catalogo: item.producto_id?.precio || 0,
        tiempo_fabricacion: item.producto_id?.tiempo_fabricacion || 0,
        pasos_produccion: 0, // No disponible en esta consulta
        tallas: item.tallas || [],
        colores: item.colores || [],
        total_tareas: 0,
        tareas_completadas: 0
      }));
      
      return transformedData;
    } catch (err) {
      console.error('Error en consulta alternativa:', err);
      throw err;
    }
  }, []);

  // Función para agrupar pedidos por estado y luego por cliente
  const agruparPedidosPorEstadoYCliente = useCallback((pedidos: Pedido[]) => {
    const result: PedidosPorEstado = {
      pendiente: {},
      completado: {},
      cancelada: {}
    };

    pedidos.forEach(pedido => {
      const estado = pedido.estado.toLowerCase();
      const clienteNombre = pedido.cliente_nombre;
      
      // Inicializar el objeto de estado si no existe
      if (!result[estado]) {
        result[estado] = {};
      }
      
      // Inicializar el array de pedidos del cliente si no existe
      if (!result[estado][clienteNombre]) {
        result[estado][clienteNombre] = [];
      }
      
      // Añadir el pedido al array del cliente en el estado correspondiente
      result[estado][clienteNombre].push(pedido);
    });

    return result;
  }, []);

  // Manejar cambio de pestaña con animación
  const handleTabChange = useCallback((tab: FilterTab) => {
    if (tab === activeTab) return;
    
    // Establecer la dirección de la transición basada en la posición de la pestaña
    const tabOrder = ['pendiente', 'completado', 'cancelada'];
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

  // Función para buscar pedidos
  const buscarPedidos = useCallback((term: string) => {
    if (!term) return;
    
    // Implementar lógica de búsqueda por cliente o producto
    console.log(`Buscando: ${term}`);
    
    // Aquí implementarías la llamada a la API de búsqueda
    
  }, []);

  // Manejar la búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== lastSearchTermRef.current) {
        lastSearchTermRef.current = searchTerm;
        buscarPedidos(searchTerm);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, buscarPedidos]);

  // Función para obtener los pedidos desde Supabase
  const fetchPedidos = useCallback(async () => {
    setIsLoading(true);
    try {
      // Intentar primero con la función RPC
      const { data, error } = await supabase
        .rpc('obtener_datos_ventas_consolidados');
      
      if (error) {
        console.warn('Error con RPC, usando consulta alternativa:', error.message);
        // Si hay error en la RPC, usar la consulta alternativa
        const datosAlternativos = await fetchPedidosAlternativos();
        
        // Obtener información de tareas de producción
        const tareasInfo = await obtenerTareasProduccion(datosAlternativos.map(p => p.venta_id));
        
        // Combinar los datos
        const datosConTareas = datosAlternativos.map(pedido => ({
          ...pedido,
          total_tareas: tareasInfo[pedido.venta_id]?.total_tareas || 0,
          tareas_completadas: tareasInfo[pedido.venta_id]?.tareas_completadas || 0
        }));
        
        setPedidos(datosConTareas);
        
        // Agrupar pedidos por estado y cliente
        const agrupados = agruparPedidosPorEstadoYCliente(datosConTareas);
        setPedidosPorEstado(agrupados);
        return;
      }
      
      // Obtener información de tareas de producción
      const tareasInfo = await obtenerTareasProduccion(data.map((p: Pedido) => p.venta_id));
      
      // Combinar los datos
      const datosConTareas = (data || []).map((pedido: Pedido) => ({
        ...pedido,
        total_tareas: tareasInfo[pedido.venta_id]?.total_tareas || 0,
        tareas_completadas: tareasInfo[pedido.venta_id]?.tareas_completadas || 0
      }));
      
      setPedidos(datosConTareas);
      
      // Agrupar pedidos por estado y cliente
      const agrupados = agruparPedidosPorEstadoYCliente(datosConTareas);
      setPedidosPorEstado(agrupados);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los pedidos');
      console.error('Error al cargar pedidos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPedidosAlternativos, agruparPedidosPorEstadoYCliente]);

  // Obtener las tareas de producción para las ventas
  const obtenerTareasProduccion = async (ventaIds: number[]) => {
    if (!ventaIds.length) return {};
    
    try {
      // Consultar las tareas de producción para las ventas proporcionadas
      const { data, error } = await supabase
        .from('tareas_produccion')
        .select('venta_id, estado')
        .in('venta_id', ventaIds);
      
      if (error) throw error;
      
      // Procesar los resultados para obtener el total de tareas y completadas por cada venta
      const resultado: { [ventaId: number]: { total_tareas: number, tareas_completadas: number } } = {};
      
      if (data) {
        // Inicializar resultados para todas las ventas
        ventaIds.forEach(id => {
          resultado[id] = { total_tareas: 0, tareas_completadas: 0 };
        });
        
        // Contar tareas por venta
        data.forEach(tarea => {
          if (!resultado[tarea.venta_id]) {
            resultado[tarea.venta_id] = { total_tareas: 0, tareas_completadas: 0 };
          }
          
          resultado[tarea.venta_id].total_tareas++;
          
          if (tarea.estado.toLowerCase() === 'completado') {
            resultado[tarea.venta_id].tareas_completadas++;
          }
        });
      }
      
      return resultado;
    } catch (error) {
      console.error('Error al obtener tareas de producción:', error);
      return {};
    }
  };

  // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleNuevoPedido = useCallback(() => {
    setCurrentPedido(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Refrescar los pedidos al cerrar el modal
    fetchPedidos();
  }, [fetchPedidos]);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Función para calcular días restantes hasta la fecha de entrega
  const calcularDiasRestantes = (fechaEntrega: Date): number => {
    const hoy = new Date();
    // Resetear las horas para comparar solo fechas
    hoy.setHours(0, 0, 0, 0);
    const entrega = new Date(fechaEntrega);
    entrega.setHours(0, 0, 0, 0);
    
    // Diferencia en milisegundos
    const diferencia = entrega.getTime() - hoy.getTime();
    // Convertir a días
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  };

  // Función para obtener la fecha de entrega más cercana de un grupo de pedidos
  const obtenerFechaEntregaMasCercana = (pedidos: Pedido[]): Date | null => {
    const fechasEntrega = pedidos
      .map(p => new Date(p.fecha_entrega))
      .filter(date => !isNaN(date.getTime()));
    return fechasEntrega.length > 0 ? 
      new Date(Math.min(...fechasEntrega.map(date => date.getTime()))) : 
      null;
  };

  // Función para ordenar pedidos por tiempo restante
  const ordenarPedidosPorTiempoRestante = (a: Pedido[], b: Pedido[]): number => {
    const fechaA = obtenerFechaEntregaMasCercana(a);
    const fechaB = obtenerFechaEntregaMasCercana(b);
    
    if (!fechaA && !fechaB) return 0;
    if (!fechaA) return 1;
    if (!fechaB) return -1;
    
    return calcularDiasRestantes(fechaA) - calcularDiasRestantes(fechaB);
  };

  // Obtener estilo para días restantes
  const getEstiloDiasRestantes = (dias: number) => {
    if (dias < 0) {
      return { backgroundColor: '#FEE2E2', color: '#B91C1C' }; // Rojo - Atrasado
    } else if (dias === 0) {
      return { backgroundColor: '#FEF3C7', color: '#92400E' }; // Amarillo - Hoy
    } else if (dias <= 3) {
      return { backgroundColor: '#FFEDD5', color: '#C2410C' }; // Naranja - Próximo
    } else {
      return { backgroundColor: '#ECFDF5', color: '#047857' }; // Verde - A tiempo
    }
  };

  // Obtener texto para días restantes
  const getTextoDiasRestantes = (dias: number) => {
    if (dias < 0) {
      return `${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''} atrasado`;
    } else if (dias === 0) {
      return 'Hoy';
    } else {
      return `${dias} día${dias !== 1 ? 's' : ''}`;
    }
  };

  // Obtener total de pedidos por estado
  const getTotalPedidosPorEstado = (estado: string) => {
    const clientesEnEstado = pedidosPorEstado[estado] || {};
    return Object.values(clientesEnEstado).reduce((total, pedidos) => total + pedidos.length, 0);
  };

  // Obtener total de clientes por estado
  const getTotalClientesPorEstado = (estado: string) => {
    const clientesEnEstado = pedidosPorEstado[estado] || {};
    return Object.keys(clientesEnEstado).length;
  };

  // Estilo para los estados
  const getEstadoStyle = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'completado':
      case 'completada':  // Añadimos este caso para manejar 'Completada'
        return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'cancelado':
      case 'cancelada':  // Añadimos este caso para manejar 'Cancelada'
        return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
      default:
        return { backgroundColor: '#E5E7EB', color: '#374151' };
    }
  };

  // Icono para los estados
  const getEstadoIcon = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return <ClockIcon style={{ width: '16px', height: '16px' }} />;
      case 'completado':
      case 'completada':  // Añadimos este caso para manejar 'Completada'
        return <CheckCircleIcon style={{ width: '16px', height: '16px' }} />;
      case 'cancelado':
      case 'cancelada':  // Añadimos este caso para manejar 'Cancelada'
        return <XCircleIcon style={{ width: '16px', height: '16px' }} />;
      default:
        return null;
    }
  };

  // Traducir nombre del estado
  const traducirEstado = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'Pendientes';
      case 'completado':
      case 'completada':  // Añadimos este caso para manejar 'Completada'
        return 'Completados';
      case 'cancelado':
      case 'cancelada':  // Añadimos este caso para manejar 'Cancelada'
        return 'Cancelados';
      default:
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    }
  };

  // Función para alternar la expansión de una card
  const toggleCardExpansion = useCallback((clienteId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  }, []);

  // Función para cancelar un pedido
  const handleCancelPedido = useCallback(async (ventaId: number) => {
    if (isCancelling) return;
    
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setIsCancelling(true);
    try {
      // 1. Actualizar el estado del pedido en la tabla ventas
      const { error: updateError } = await supabase
        .from('ventas')
        .update({ estado: 'Cancelada' })
        .eq('id', ventaId);
      
      if (updateError) throw updateError;
      
      // 2. Eliminar las tareas de producción asociadas a la venta
      const { error: deleteError } = await supabase
        .from('tareas_produccion')
        .delete()
        .eq('venta_id', ventaId);
      
      if (deleteError) throw deleteError;
      
      // 3. Actualizar la UI
      await fetchPedidos();
      
      // Mostrar confirmación
      alert('Pedido cancelado correctamente');
    } catch (err: any) {
      console.error('Error al cancelar el pedido:', err);
      alert(`Error al cancelar el pedido: ${err.message || 'Se ha producido un error'}`);
    } finally {
      setIsCancelling(false);
    }
  }, [isCancelling, fetchPedidos]);

  // Función para generar factura electrónica
  const handleGenerateInvoice = useCallback(async (pedido: Pedido) => {
    if (isGeneratingInvoice) return;
    
    setIsGeneratingInvoice(true);
    try {
      // Encontrar todos los pedidos del mismo cliente
      const pedidosCliente = pedidos.filter(p => p.cliente_nombre === pedido.cliente_nombre);
      
      // Generar la factura en formato PDF
      const invoiceResult = generateInvoicePDF(pedidosCliente);
      
      // Mostrar la vista previa de la factura
      setInvoicePreview(invoiceResult);
      
      console.log('Generando factura para cliente:', pedido.cliente_nombre);
      console.log('Pedidos incluidos:', pedidosCliente.map(p => p.venta_id));
      
      // Calcular el total para el mensaje
      const totalFactura = pedidosCliente.reduce((sum, p) => sum + p.precio_venta, 0);
    } catch (err: any) {
      console.error('Error al generar la factura:', err);
      alert(`Error al generar la factura: ${err.message || 'Se ha producido un error'}`);
    } finally {
      setIsGeneratingInvoice(false);
    }
  }, [isGeneratingInvoice, pedidos]);

  // Función para cerrar el modal de vista previa de factura
  const closeInvoicePreview = useCallback(() => {
    setInvoicePreview(null);
  }, []);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      padding: '24px', 
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden'
    }}>
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
            isEditing={false} 
            initialData={null} 
          />
        </div>
      )}
      
      {/* Modal de vista previa de factura */}
      {invoicePreview && (
        <InvoicePreviewModal
          onClose={closeInvoicePreview}
          pdfDocument={invoicePreview.document}
          invoiceNumber={invoicePreview.invoiceNumber}
        />
      )}
      
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
          onChange={(e) => setSearchTerm(e.target.value)}
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
        {(['pendiente', 'completado', 'cancelada'] as const).map((tab) => {
          const totalPedidos = getTotalPedidosPorEstado(tab);
          const totalClientes = getTotalClientesPorEstado(tab);
          return (
            <button 
              key={tab}
              onClick={() => handleTabChange(tab as FilterTab)}
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
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {/* Animación de subrayado */}
              <span className={activeTab === tab ? 'tab-underline-active' : 'tab-underline'} />
              
              {getEstadoIcon(tab)}
              {traducirEstado(tab)}
              <span style={{ 
                backgroundColor: activeTab === tab ? '#EEF2FF' : '#F3F4F6',
                color: activeTab === tab ? '#4F46E5' : '#6B7280',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
              }}>
                {totalClientes} {totalClientes === 1 ? 'cliente' : 'clientes'}
              </span>
            </button>
          )
        })}
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
          {`Pedidos ${traducirEstado(activeTab).toLowerCase()}`}
          {!isLoading && getTotalClientesPorEstado(activeTab) > 0 && 
            <span style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              fontWeight: 400, 
              marginLeft: '8px' 
            }}>
              ({getTotalClientesPorEstado(activeTab)} {getTotalClientesPorEstado(activeTab) === 1 ? 'cliente' : 'clientes'})
            </span>
          }
        </span>
        
        {searchTerm && (
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
      {isLoading && (
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
      
      {/* Contenido principal con transición */}
      {!isLoading && (
        <div 
          style={{ 
            maxHeight: 'calc(100vh - 220px)', 
            overflowY: 'auto', 
            position: 'relative' 
          }} 
          className="apple-scrollbar"
        >
          <div className={`inventory-items-container ${getTransitionClass()}`}>
            {/* Mensaje cuando no hay elementos */}
            {getTotalPedidosPorEstado(activeTab) === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0', 
                color: '#6B7280',
                fontSize: '14px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px dashed #D1D5DB',
                margin: '20px 0'
              }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  {getEstadoIcon(activeTab)}
                </div>
                <p style={{ color: '#4B5563', fontWeight: 500 }}>No hay pedidos {traducirEstado(activeTab).toLowerCase()}</p>
                <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '8px' }}>
                  Los pedidos {traducirEstado(activeTab).toLowerCase()} aparecerán aquí
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {Object.entries(pedidosPorEstado[activeTab] || {})
                  .map(([clienteNombre, pedidosCliente]) => (
                    <PedidoCard
                      key={clienteNombre}
                      clienteNombre={clienteNombre}
                      pedidosCliente={pedidosCliente}
                      isExpanded={expandedCards[clienteNombre] || false}
                      onToggleExpand={toggleCardExpansion}
                      onCancelPedido={handleCancelPedido}
                      onGenerateInvoice={handleGenerateInvoice}
                    />
                  ))}
                {/* Espacio adicional para permitir scroll completo */}
                <div style={{ height: '100px' }}></div>
              </div>
            )}
          </div>
        </div>
      )}

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

      <style>{`
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
        
        @media (max-width: 640px) {
          .grid-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default Produccion;