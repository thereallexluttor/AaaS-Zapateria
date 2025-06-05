import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Cliente } from '../lib/supabase';
import { ChartBarIcon, ArrowTrendingUpIcon, CurrencyDollarIcon, XMarkIcon, ExclamationTriangleIcon, SparklesIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ClienteEstadisticasProps {
  onClose: () => void;
  isClosing: boolean;
  clienteId: string;
  clienteNombre: string;
}

interface Venta {
  id: number;
  cliente_id: number;
  producto_id: number;
  trabajador_id: number;
  cantidad: number;
  precio_venta: number;
  descuento: number;
  forma_pago: string;
  estado: string;
  fecha_entrega: string;
  fecha_inicio: string;
  producto_nombre?: string;
  trabajador_nombre?: string;
}

interface DatosResumen {
  totalCompras: number;
  totalGastado: number;
  compraPromedio: number;
  ultimaCompra: string;
  formasPago: { [key: string]: number };
  productosPopulares: Array<{ producto_id: number; producto_nombre: string; cantidad: number }>;
  comprasPorMes: Array<{ fecha: string; total: number }>;
  totalCancelaciones: number;
  valorCancelaciones: number;
  cancelacionesPorMes: Array<{ fecha: string; total: number }>;
  productosCancelados: Array<{ producto_id: number; producto_nombre: string; cantidad: number }>;
  promedioDiasEntreCompras: number;
  fechaEstimadaProximaCompra: string;
  probabilidadCompra: number;
  productosProximaCompra: Array<{ producto_id: number; producto_nombre: string; probabilidad: number }>;
  tendenciaCompras: 'creciente' | 'decreciente' | 'estable';
}

function ClienteEstadisticas({ onClose, isClosing, clienteId, clienteNombre }: ClienteEstadisticasProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<DatosResumen>({
    totalCompras: 0,
    totalGastado: 0,
    compraPromedio: 0,
    ultimaCompra: '',
    formasPago: {},
    productosPopulares: [],
    comprasPorMes: [],
    totalCancelaciones: 0,
    valorCancelaciones: 0,
    cancelacionesPorMes: [],
    productosCancelados: [],
    promedioDiasEntreCompras: 0,
    fechaEstimadaProximaCompra: '',
    probabilidadCompra: 0,
    productosProximaCompra: [],
    tendenciaCompras: 'estable'
  });

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#84CC16', '#14B8A6'];
  const CANCELACION_COLOR = '#EF4444';

  useEffect(() => {
    async function fetchVentasCliente() {
      if (!clienteId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Obtener ventas con información de productos
        const { data, error } = await supabase
          .from('ventas')
          .select(`
            *,
            productos_table:producto_id(nombre)
          `)
          .eq('cliente_id', clienteId)
          .order('fecha_inicio', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Transformar los datos para obtener nombres de productos
          const ventasFormateadas = data.map(venta => ({
            ...venta,
            producto_nombre: venta.productos_table?.nombre || 'Producto desconocido'
          }));
          
          setVentas(ventasFormateadas);
          
          // Procesar datos para el resumen
          procesarDatosResumen(ventasFormateadas);
        }
      } catch (error: any) {
        console.error('Error al cargar ventas del cliente:', error);
        setError(`Error al cargar las ventas: ${error.message || 'Desconocido'}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVentasCliente();
  }, [clienteId]);

  // Función para procesar los datos y generar el resumen
  const procesarDatosResumen = (ventas: Venta[]) => {
    if (!ventas || ventas.length === 0) {
      return setResumen({
        totalCompras: 0,
        totalGastado: 0,
        compraPromedio: 0,
        ultimaCompra: 'No hay compras',
        formasPago: {},
        productosPopulares: [],
        comprasPorMes: [],
        totalCancelaciones: 0,
        valorCancelaciones: 0,
        cancelacionesPorMes: [],
        productosCancelados: [],
        promedioDiasEntreCompras: 0,
        fechaEstimadaProximaCompra: 'No hay datos suficientes',
        probabilidadCompra: 0,
        productosProximaCompra: [],
        tendenciaCompras: 'estable'
      });
    }

    // Separar ventas válidas de canceladas
    const ventasValidas = ventas.filter(venta => venta.estado !== 'Cancelada');
    const ventasCanceladas = ventas.filter(venta => venta.estado === 'Cancelada');
    
    // Total de compras válidas (número de ventas no canceladas)
    const totalCompras = ventasValidas.length;
    
    // Sumar el total gastado en compras válidas (precio_venta - descuento)
    const totalGastado = ventasValidas.reduce((acc, venta) => {
      return acc + (venta.precio_venta - (venta.descuento || 0));
    }, 0);
    
    // Calcular promedio de compra para compras válidas
    const compraPromedio = totalCompras > 0 ? totalGastado / totalCompras : 0;
    
    // Obtener fecha de última compra válida
    const ultimaCompraValida = ventasValidas.length > 0 ? ventasValidas[0]?.fecha_inicio : 'No hay compras';
    
    // Contar formas de pago (solo compras válidas)
    const formasPago: { [key: string]: number } = {};
    ventasValidas.forEach(venta => {
      formasPago[venta.forma_pago] = (formasPago[venta.forma_pago] || 0) + 1;
    });
    
    // Productos más comprados (solo compras válidas)
    const productosPorCantidad: { [key: number]: { cantidad: number, nombre: string } } = {};
    ventasValidas.forEach(venta => {
      if (!productosPorCantidad[venta.producto_id]) {
        productosPorCantidad[venta.producto_id] = {
          cantidad: 0,
          nombre: venta.producto_nombre || 'Desconocido'
        };
      }
      productosPorCantidad[venta.producto_id].cantidad += venta.cantidad;
    });
    
    const productosPopulares = Object.entries(productosPorCantidad)
      .map(([id, data]) => ({
        producto_id: parseInt(id),
        producto_nombre: data.nombre,
        cantidad: data.cantidad
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5); // Top 5
    
    // Compras por mes (solo compras válidas)
    const comprasPorMes: {[key: string]: number} = {};
    
    // Procesar todas las ventas válidas
    ventasValidas.forEach(venta => {
      if (venta.fecha_inicio) {
        // Extraer año y mes de fecha_inicio (YYYY-MM)
        const fechaCorta = venta.fecha_inicio.substring(0, 7);
        const montoVenta = venta.precio_venta - (venta.descuento || 0);
        comprasPorMes[fechaCorta] = (comprasPorMes[fechaCorta] || 0) + montoVenta;
      }
    });
    
    // Crear array para la gráfica
    let comprasPorMesArray: Array<{ fecha: string; total: number }> = [];
    
    // Si hay compras, generar el rango completo de meses
    if (Object.keys(comprasPorMes).length > 0) {
      // Obtener todas las fechas y ordenarlas
      const fechasConCompras = Object.keys(comprasPorMes).sort();
      const fechaInicio = fechasConCompras[0];
      
      // Generar todos los meses desde la primera compra hasta el mes actual
      const todosLosMeses: string[] = [];
      const [añoInicio, mesInicio] = fechaInicio.split('-').map(Number);
      const fechaActualObj = new Date();
      const añoActual = fechaActualObj.getFullYear();
      const mesActual = fechaActualObj.getMonth() + 1;
      
      for (let año = añoInicio; año <= añoActual; año++) {
        const mesMin = año === añoInicio ? mesInicio : 1;
        const mesMax = año === añoActual ? mesActual : 12;
        
        for (let mes = mesMin; mes <= mesMax; mes++) {
          const fechaKey = `${año}-${mes.toString().padStart(2, '0')}`;
          todosLosMeses.push(fechaKey);
        }
      }
      
      // Crear array final con todos los meses (con 0 si no hay compras)
      comprasPorMesArray = todosLosMeses.map(fecha => ({
        fecha,
        total: comprasPorMes[fecha] || 0
      }));
    }
    
    // ----- DATOS DE CANCELACIONES -----
    
    // Total de cancelaciones
    const totalCancelaciones = ventasCanceladas.length;
    
    // Valor total de cancelaciones
    const valorCancelaciones = ventasCanceladas.reduce((acc, venta) => {
      return acc + (venta.precio_venta - (venta.descuento || 0));
    }, 0);
    
    // Cancelaciones por mes
    const cancelacionesPorMes: {[key: string]: number} = {};
    ventasCanceladas.forEach(venta => {
      if (venta.fecha_inicio) {
        const fechaCorta = venta.fecha_inicio.substring(0, 7);
        const montoVenta = venta.precio_venta - (venta.descuento || 0);
        cancelacionesPorMes[fechaCorta] = (cancelacionesPorMes[fechaCorta] || 0) + montoVenta;
      }
    });
    
    // Crear array para cancelaciones
    let cancelacionesPorMesArray: Array<{ fecha: string; total: number }> = [];
    
    // Si hay cancelaciones, generar el rango completo de meses
    if (Object.keys(cancelacionesPorMes).length > 0) {
      const fechasCancelacionesOrdenadas = Object.keys(cancelacionesPorMes).sort();
      const fechaInicioCancelaciones = fechasCancelacionesOrdenadas[0];
      
      const todosLosMesesCancelaciones: string[] = [];
      const [añoInicioCancelaciones, mesInicioCancelaciones] = fechaInicioCancelaciones.split('-').map(Number);
      const fechaActualCancelaciones = new Date();
      const añoActualCancelaciones = fechaActualCancelaciones.getFullYear();
      const mesActualCancelaciones = fechaActualCancelaciones.getMonth() + 1;
      
      for (let año = añoInicioCancelaciones; año <= añoActualCancelaciones; año++) {
        const mesMin = año === añoInicioCancelaciones ? mesInicioCancelaciones : 1;
        const mesMax = año === añoActualCancelaciones ? mesActualCancelaciones : 12;
        
        for (let mes = mesMin; mes <= mesMax; mes++) {
          const fechaKey = `${año}-${mes.toString().padStart(2, '0')}`;
          todosLosMesesCancelaciones.push(fechaKey);
        }
      }
      
      cancelacionesPorMesArray = todosLosMesesCancelaciones.map(fecha => ({
        fecha,
        total: cancelacionesPorMes[fecha] || 0
      }));
    }
    
    // Productos cancelados
    const productosCanceladosPorCantidad: { [key: number]: { cantidad: number, nombre: string } } = {};
    ventasCanceladas.forEach(venta => {
      if (!productosCanceladosPorCantidad[venta.producto_id]) {
        productosCanceladosPorCantidad[venta.producto_id] = {
          cantidad: 0,
          nombre: venta.producto_nombre || 'Desconocido'
        };
      }
      productosCanceladosPorCantidad[venta.producto_id].cantidad += venta.cantidad;
    });
    
    const productosCancelados = Object.entries(productosCanceladosPorCantidad)
      .map(([id, data]) => ({
        producto_id: parseInt(id),
        producto_nombre: data.nombre,
        cantidad: data.cantidad
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5); // Top 5
    
    // ----- PROYECCIONES DE PRÓXIMA VENTA -----
    
    let promedioDiasEntreCompras = 0;
    let fechaEstimadaProximaCompra = 'No hay datos suficientes';
    let probabilidadCompra = 0;
    let productosProximaCompra: Array<{ producto_id: number; producto_nombre: string; probabilidad: number }> = [];
    let tendenciaCompras: 'creciente' | 'decreciente' | 'estable' = 'estable';

    if (ventasValidas.length >= 2) {
      // Calcular promedio de días entre compras
      const fechasCompras = ventasValidas
        .map(venta => new Date(venta.fecha_inicio))
        .sort((a, b) => b.getTime() - a.getTime()); // Ordenar de más reciente a más antigua

      let totalDiasEntreCompras = 0;
      let intervalosValidos = 0;

      for (let i = 0; i < fechasCompras.length - 1; i++) {
        const diasEntre = Math.abs(fechasCompras[i].getTime() - fechasCompras[i + 1].getTime()) / (1000 * 60 * 60 * 24);
        if (diasEntre > 0 && diasEntre <= 365) { // Filtrar intervalos realistas
          totalDiasEntreCompras += diasEntre;
          intervalosValidos++;
        }
      }

      if (intervalosValidos > 0) {
        promedioDiasEntreCompras = Math.round(totalDiasEntreCompras / intervalosValidos);
        
        // Calcular fecha estimada de próxima compra
        const ultimaFechaCompra = fechasCompras[0];
        const fechaEstimada = new Date(ultimaFechaCompra.getTime() + (promedioDiasEntreCompras * 24 * 60 * 60 * 1000));
        fechaEstimadaProximaCompra = fechaEstimada.toISOString().split('T')[0];

        // Calcular probabilidad de compra basada en el tiempo transcurrido
        const diasDesdeUltimaCompra = Math.floor((new Date().getTime() - ultimaFechaCompra.getTime()) / (1000 * 60 * 60 * 24));
        const ratioTiempo = diasDesdeUltimaCompra / promedioDiasEntreCompras;
        
        if (ratioTiempo < 0.5) {
          probabilidadCompra = 20; // Muy temprano
        } else if (ratioTiempo < 0.8) {
          probabilidadCompra = 40; // Algo temprano
        } else if (ratioTiempo < 1.2) {
          probabilidadCompra = 80; // Momento óptimo
        } else if (ratioTiempo < 1.5) {
          probabilidadCompra = 90; // Un poco tarde
        } else {
          probabilidadCompra = 95; // Muy tarde
        }

        // Calcular productos más probables para próxima compra
        const frecuenciaProductos: { [key: number]: { nombre: string; compras: number; ultimaCompra: Date } } = {};
        
        ventasValidas.forEach(venta => {
          if (!frecuenciaProductos[venta.producto_id]) {
            frecuenciaProductos[venta.producto_id] = {
              nombre: venta.producto_nombre || 'Desconocido',
              compras: 0,
              ultimaCompra: new Date(venta.fecha_inicio)
            };
          }
          frecuenciaProductos[venta.producto_id].compras++;
          const fechaVenta = new Date(venta.fecha_inicio);
          if (fechaVenta > frecuenciaProductos[venta.producto_id].ultimaCompra) {
            frecuenciaProductos[venta.producto_id].ultimaCompra = fechaVenta;
          }
        });

        productosProximaCompra = Object.entries(frecuenciaProductos)
          .map(([id, data]) => {
            const diasDesdeUltimaCompraProducto = Math.floor((new Date().getTime() - data.ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
            const frecuenciaRelativa = data.compras / ventasValidas.length;
            const factorTiempo = Math.min(diasDesdeUltimaCompraProducto / promedioDiasEntreCompras, 2);
            const probabilidad = Math.round((frecuenciaRelativa * 0.7 + factorTiempo * 0.3) * 100);
            
            return {
              producto_id: parseInt(id),
              producto_nombre: data.nombre,
              probabilidad: Math.min(probabilidad, 95)
            };
          })
          .sort((a, b) => b.probabilidad - a.probabilidad)
          .slice(0, 3);

        // Calcular tendencia de compras
        if (comprasPorMesArray.length >= 3) {
          const ultimos3Meses = comprasPorMesArray.slice(-3);
          const primeros3Meses = comprasPorMesArray.slice(0, 3);
          
          const promedioReciente = ultimos3Meses.reduce((acc, mes) => acc + mes.total, 0) / ultimos3Meses.length;
          const promedioAntiguo = primeros3Meses.reduce((acc, mes) => acc + mes.total, 0) / primeros3Meses.length;
          
          const diferenciaPorcentual = ((promedioReciente - promedioAntiguo) / promedioAntiguo) * 100;
          
          if (diferenciaPorcentual > 15) {
            tendenciaCompras = 'creciente';
          } else if (diferenciaPorcentual < -15) {
            tendenciaCompras = 'decreciente';
          } else {
            tendenciaCompras = 'estable';
          }
        }
      }
    }
    
    setResumen({
      totalCompras,
      totalGastado,
      compraPromedio,
      ultimaCompra: ultimaCompraValida,
      formasPago,
      productosPopulares,
      comprasPorMes: comprasPorMesArray,
      totalCancelaciones,
      valorCancelaciones,
      cancelacionesPorMes: cancelacionesPorMesArray,
      productosCancelados,
      promedioDiasEntreCompras,
      fechaEstimadaProximaCompra,
      probabilidadCompra,
      productosProximaCompra,
      tendenciaCompras
    });
  };

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'No hay compras' || dateString === 'Desconocida' || dateString === 'No hay datos suficientes') {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).format(date);
    } catch (error) {
      return dateString;
    }
  };

  // Formatear nombres de meses para gráficas
  const formatMesGrafica = (fecha: string) => {
    if (!fecha || !fecha.includes('-')) return fecha;
    
    const [año, mes] = fecha.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesIndice = parseInt(mes) - 1;
    
    return `${meses[mesIndice]} ${año.slice(2)}`;
  };

  // Función para obtener el color de probabilidad
  const getProbabilidadColor = (probabilidad: number) => {
    if (probabilidad >= 80) return '#10B981'; // Verde
    if (probabilidad >= 60) return '#F59E0B'; // Amarillo
    if (probabilidad >= 40) return '#EF4444'; // Rojo
    return '#6B7280'; // Gris
  };

  // Función para obtener el icono de tendencia
  const getTendenciaIcon = (tendencia: 'creciente' | 'decreciente' | 'estable') => {
    switch (tendencia) {
      case 'creciente':
        return '📈';
      case 'decreciente':
        return '📉';
      default:
        return '➡️';
    }
  };

  return (
    <div 
      style={{
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      {/* Cabecera */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ChartBarIcon style={{ width: '24px', height: '24px', color: '#3B82F6' }} />
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#111827' 
          }}>
            Estadísticas de {clienteNombre}
          </h2>
        </div>
        <button 
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#F3F4F6',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
        >
          <XMarkIcon style={{ width: '20px', height: '20px', color: '#6B7280' }} />
        </button>
      </div>

      {/* Contenido */}
      <div style={{
        padding: '24px',
        overflowY: 'auto',
        maxHeight: 'calc(90vh - 69px)',
      }} className="apple-scrollbar">
        {loading ? (
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
            Cargando datos de compras...
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#EF4444',
            fontSize: '14px' 
          }}>
            {error}
          </div>
        ) : ventas.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#6B7280',
            fontSize: '14px' 
          }}>
            Este cliente no tiene historial de compras.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Estadísticas rápidas */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div style={{
                backgroundColor: '#F0F9FF',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: '#3B82F6', fontSize: '14px', fontWeight: 500 }}>
                  Total de Compras
                </div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1E3A8A' }}>
                  {resumen.totalCompras}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#ECFDF5',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: '#10B981', fontSize: '14px', fontWeight: 500 }}>
                  Total Gastado
                </div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#065F46' }}>
                  {formatCurrency(resumen.totalGastado)}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#FEF3C7',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: '#D97706', fontSize: '14px', fontWeight: 500 }}>
                  Compra Promedio
                </div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#92400E' }}>
                  {formatCurrency(resumen.compraPromedio)}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#F5F3FF',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: '#8B5CF6', fontSize: '14px', fontWeight: 500 }}>
                  Última Compra
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#5B21B6' }}>
                  {formatDate(resumen.ultimaCompra)}
                </div>
              </div>
            </div>
            
            {/* Proyecciones de Próxima Venta */}
            {resumen.totalCompras >= 2 && (
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#065F46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <SparklesIcon style={{ width: '20px', height: '20px', color: '#10B981' }} />
                  Proyecciones de Próxima Venta
                </h3>
                
                {/* Métricas de predicción */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}>
                    <div style={{ color: '#059669', fontSize: '14px', fontWeight: 500 }}>
                      Promedio entre Compras
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#047857' }}>
                      {resumen.promedioDiasEntreCompras} días
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}>
                    <div style={{ color: '#059669', fontSize: '14px', fontWeight: 500 }}>
                      Fecha Estimada Próxima Compra
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarIcon style={{ width: '16px', height: '16px' }} />
                      {formatDate(resumen.fechaEstimadaProximaCompra)}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}>
                    <div style={{ color: '#059669', fontSize: '14px', fontWeight: 500 }}>
                      Probabilidad de Compra
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 600, 
                      color: getProbabilidadColor(resumen.probabilidadCompra),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {resumen.probabilidadCompra}%
                      <div style={{
                        width: '40px',
                        height: '8px',
                        backgroundColor: '#E5E7EB',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${resumen.probabilidadCompra}%`,
                          height: '100%',
                          backgroundColor: getProbabilidadColor(resumen.probabilidadCompra),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}>
                    <div style={{ color: '#059669', fontSize: '14px', fontWeight: 500 }}>
                      Tendencia de Compras
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{getTendenciaIcon(resumen.tendenciaCompras)}</span>
                      {resumen.tendenciaCompras.charAt(0).toUpperCase() + resumen.tendenciaCompras.slice(1)}
                    </div>
                  </div>
                </div>
                
                {/* Productos más probables para próxima compra */}
                {resumen.productosProximaCompra.length > 0 && (
                  <div>
                    <h4 style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: '#065F46'
                    }}>
                      Productos Más Probables para Próxima Compra
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '12px'
                    }}>
                      {resumen.productosProximaCompra.map((producto) => (
                        <div key={producto.producto_id} style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          padding: '12px 16px',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                            {producto.producto_nombre}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 600,
                              color: getProbabilidadColor(producto.probabilidad)
                            }}>
                              {producto.probabilidad}%
                            </span>
                            <div style={{
                              width: '30px',
                              height: '6px',
                              backgroundColor: '#E5E7EB',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${producto.probabilidad}%`,
                                height: '100%',
                                backgroundColor: getProbabilidadColor(producto.probabilidad),
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Gráfica de compras por mes */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ArrowTrendingUpIcon style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                Compras por Mes
              </h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={resumen.comprasPorMes}
                    margin={{ top: 5, right: 20, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="fecha" 
                      tickFormatter={formatMesGrafica}
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={formatMesGrafica}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                      name="Total"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Productos más comprados y formas de pago */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Productos más comprados */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CurrencyDollarIcon style={{ width: '20px', height: '20px', color: '#10B981' }} />
                  Productos Más Comprados
                </h3>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resumen.productosPopulares}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="producto_nombre" 
                        type="category" 
                        tick={{ fontSize: 12 }}
                        width={150}
                      />
                      <Tooltip />
                      <Bar 
                        dataKey="cantidad" 
                        fill="#10B981" 
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Formas de pago */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CurrencyDollarIcon style={{ width: '20px', height: '20px', color: '#8B5CF6' }} />
                  Formas de Pago
                </h3>
                <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(resumen.formasPago).map(([name, value], index) => ({
                          name,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={true}
                      >
                        {Object.entries(resumen.formasPago).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} compras`, 'Cantidad']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Sección de Cancelaciones */}
            {resumen.totalCancelaciones > 0 && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                  Cancelaciones
                </h3>
                
                {/* Datos generales de cancelaciones */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}>
                    <div style={{ color: '#991B1B', fontSize: '14px', fontWeight: 500 }}>
                      Total Cancelaciones
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#7F1D1D' }}>
                      {resumen.totalCancelaciones}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}>
                    <div style={{ color: '#991B1B', fontSize: '14px', fontWeight: 500 }}>
                      Valor Cancelaciones
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#7F1D1D' }}>
                      {formatCurrency(resumen.valorCancelaciones)}
                    </div>
                  </div>
                </div>
                
                {/* Gráfica de cancelaciones por mes */}
                {resumen.cancelacionesPorMes.length > 0 && (
                  <div style={{ height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={resumen.cancelacionesPorMes}
                        margin={{ top: 5, right: 20, left: 20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="fecha" 
                          tickFormatter={formatMesGrafica}
                          tick={{ fontSize: 12 }}
                          tickMargin={10}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={formatMesGrafica}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke={CANCELACION_COLOR}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          name="Valor Cancelado"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Productos cancelados */}
                {resumen.productosCancelados.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: '#991B1B'
                    }}>
                      Productos Más Cancelados
                    </h4>
                    <div style={{ height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={resumen.productosCancelados}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="producto_nombre" 
                            type="category" 
                            tick={{ fontSize: 12 }}
                            width={150}
                          />
                          <Tooltip />
                          <Bar 
                            dataKey="cantidad" 
                            fill={CANCELACION_COLOR} 
                            radius={[0, 4, 4, 0]}
                            barSize={30}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Lista de últimas compras */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#374151'
              }}>
                Últimas Compras
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB'
                    }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Cantidad</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Precio</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.slice(0, 5).map((venta) => (
                      <tr key={venta.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 16px' }}>{formatDate(venta.fecha_inicio)}</td>
                        <td style={{ padding: '12px 16px' }}>{venta.producto_nombre}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{venta.cantidad}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(venta.precio_venta - (venta.descuento || 0))}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: venta.estado === 'Completada' 
                              ? '#ECFDF5' 
                              : venta.estado === 'Pendiente' 
                                ? '#FEF3C7' 
                                : '#FEE2E2',
                            color: venta.estado === 'Completada' 
                              ? '#10B981' 
                              : venta.estado === 'Pendiente' 
                                ? '#D97706' 
                                : '#EF4444',
                          }}>
                            {venta.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClienteEstadisticas; 