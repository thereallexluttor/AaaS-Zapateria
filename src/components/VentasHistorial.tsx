import { useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

// Estilos CSS para mejorar la responsividad
const responsiveStyles = `
  @media (max-width: 768px) {
    .ventas-historial-container {
      padding: 16px !important;
      width: 100% !important;
    }
    
    .ventas-historial-header {
      flex-direction: column;
      align-items: flex-start !important;
      gap: 12px;
    }
    
    .ventas-historial-title {
      font-size: 18px !important;
    }
    
    .ventas-resumen {
      flex-direction: column !important;
    }
    
    .ventas-resumen-card {
      width: 100% !important;
    }
    
    .graficas-container {
      flex-direction: column !important;
    }
    
    .grafica-selector {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 576px) {
    .ventas-historial-container {
      padding: 12px !important;
    }
    
    .ventas-table th, 
    .ventas-table td {
      padding: 8px 4px !important;
      font-size: 12px !important;
    }
  }

  /* Estilos para hacer la tabla más responsiva */
  .ventas-table-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .ventas-table {
    width: 100%;
    min-width: 1100px; /* Aumentado para dar más espacio a todas las columnas */
  }
  
  /* Estilos para las gráficas */
  .graficas-container {
    margin-bottom: 24px;
    background-color: #F9FAFB;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .grafica-card {
    background-color: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .grafica-selector button {
    border: none;
    background-color: white;
    padding: 8px 12px;
    font-size: 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .grafica-selector button.active {
    background-color: #4F46E5;
    color: white;
  }
  
  .grafica-selector button:hover:not(.active) {
    background-color: #F3F4F6;
  }
`;

interface VentasHistorialProps {
  onClose: () => void;
  isClosing: boolean;
  productoId: number | null;
  productoNombre: string;
}

interface Venta {
  id: number;
  cliente_id: number;
  cliente_nombre?: string;
  trabajador_id: number;
  trabajador_nombre?: string;
  cantidad: number;
  precio_venta: number;
  descuento: number;
  forma_pago: string;
  estado: string;
  fecha_entrega: string;
  fecha_inicio: string;
  observaciones: string;
  tallas: string;
  colores: string;
}

// Nuevos tipos para los datos de las gráficas
interface VentaPorPeriodo {
  periodo: string;
  cantidad: number;
  ingresos: number;
}

interface EstadoVentas {
  estado: string;
  cantidad: number;
  color: string;
}

type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'trimestre' | 'año';
type TipoGrafica = 'tendencia' | 'barras' | 'estado';

function VentasHistorial({ onClose, isClosing, productoId, productoNombre }: VentasHistorialProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  
  // Estado para las gráficas
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('mes');
  const [tipoGrafica, setTipoGrafica] = useState<TipoGrafica>('tendencia');
  const [ventasPorPeriodo, setVentasPorPeriodo] = useState<VentaPorPeriodo[]>([]);
  const [ventasPorEstado, setVentasPorEstado] = useState<EstadoVentas[]>([]);

  useEffect(() => {
    async function fetchVentas() {
      if (!productoId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Obtener ventas con información de clientes y trabajadores
        const { data, error } = await supabase
          .from('ventas')
          .select(`
            *,
            clientes:cliente_id(nombre),
            trabajadores:trabajador_id(nombre)
          `)
          .eq('producto_id', productoId)
          .order('fecha_inicio', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Transformar los datos para obtener nombres de cliente y trabajador
          const ventasFormateadas = data.map(venta => ({
            ...venta,
            cliente_nombre: venta.clientes?.nombre || 'Cliente desconocido',
            trabajador_nombre: venta.trabajadores?.nombre || 'Trabajador desconocido',
          }));
          
          setVentas(ventasFormateadas);
          
          // Calcular totales
          const total = ventasFormateadas.reduce((acc, venta) => acc + venta.cantidad, 0);
          setTotalVentas(total);
          
          const ingresos = ventasFormateadas.reduce((acc, venta) => {
            // El precio final ya tiene en cuenta la cantidad, solo restamos el descuento
            return acc + (venta.precio_venta - venta.descuento);
          }, 0);
          setTotalIngresos(ingresos);
          
          // Procesar datos para las gráficas
          procesarDatosGraficas(ventasFormateadas);
        }
      } catch (error: any) {
        console.error('Error al cargar ventas:', error);
        setError(`Error al cargar las ventas: ${error.message || 'Desconocido'}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVentas();
  }, [productoId]);
  
  // Cuando cambia el tipo de periodo, recalcular los datos
  useEffect(() => {
    if (ventas.length > 0) {
      procesarDatosGraficas(ventas);
    }
  }, [tipoPeriodo, ventas]);

  // Función para procesar los datos de las gráficas
  const procesarDatosGraficas = (ventasData: Venta[]) => {
    // Ordenar ventas por fecha (más antiguas primero)
    const ventasOrdenadas = [...ventasData].sort((a, b) => 
      new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
    );
    
    // 1. Calcular ventas por periodo (día, semana, mes, etc.)
    const periodos = new Map<string, VentaPorPeriodo>();
    
    ventasOrdenadas.forEach(venta => {
      const fecha = new Date(venta.fecha_inicio);
      let periodoKey: string;
      
      // Formatear la llave del periodo según el tipo seleccionado
      switch(tipoPeriodo) {
        case 'dia':
          periodoKey = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'semana':
          // Obtener el lunes de la semana
          const diaSemana = fecha.getDay();
          const diff = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
          const lunes = new Date(fecha);
          lunes.setDate(diff);
          periodoKey = `${lunes.toISOString().split('T')[0]}`; // Semana del YYYY-MM-DD
          break;
        case 'mes':
          periodoKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'trimestre':
          const trimestre = Math.floor(fecha.getMonth() / 3) + 1;
          periodoKey = `${fecha.getFullYear()}-T${trimestre}`;
          break;
        case 'año':
          periodoKey = `${fecha.getFullYear()}`;
          break;
        default:
          periodoKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      }
      
      // Agregar o actualizar el periodo
      if (periodos.has(periodoKey)) {
        const periodoActual = periodos.get(periodoKey)!;
        periodos.set(periodoKey, {
          ...periodoActual,
          cantidad: periodoActual.cantidad + venta.cantidad,
          ingresos: periodoActual.ingresos + (venta.precio_venta - venta.descuento)
        });
      } else {
        periodos.set(periodoKey, {
          periodo: formatearPeriodo(periodoKey, tipoPeriodo),
          cantidad: venta.cantidad,
          ingresos: venta.precio_venta - venta.descuento
        });
      }
    });
    
    // Convertir el Map a un array ordenado
    const periodosFinal = Array.from(periodos.values());
    setVentasPorPeriodo(periodosFinal);
    
    // 2. Calcular ventas por estado
    const estados = new Map<string, number>();
    
    ventasOrdenadas.forEach(venta => {
      if (estados.has(venta.estado)) {
        estados.set(venta.estado, estados.get(venta.estado)! + venta.cantidad);
      } else {
        estados.set(venta.estado, venta.cantidad);
      }
    });
    
    // Colores para los estados
    const coloresEstado: Record<string, string> = {
      'Completada': '#10B981',
      'Pendiente': '#F59E0B', 
      'Cancelada': '#EF4444',
      'En proceso': '#3B82F6'
    };
    
    // Convertir el Map a un array
    const estadosFinal = Array.from(estados.entries()).map(([estado, cantidad]) => ({
      estado,
      cantidad,
      color: coloresEstado[estado] || '#6B7280' // Color por defecto si no está en nuestro mapping
    }));
    
    setVentasPorEstado(estadosFinal);
  };
  
  // Función para formatear el periodo para su visualización
  const formatearPeriodo = (periodoKey: string, tipo: TipoPeriodo): string => {
    switch(tipo) {
      case 'dia':
        return formatDate(periodoKey);
      case 'semana':
        return `Semana del ${formatDate(periodoKey)}`;
      case 'mes': {
        const [año, mes] = periodoKey.split('-');
        const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
        return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }
      case 'trimestre': {
        const [año, trimestre] = periodoKey.split('-T');
        return `${trimestre}T ${año}`;
      }
      case 'año':
        return periodoKey;
      default:
        return periodoKey;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Formatear precio
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  // Calcular precio final (con descuento)
  const calcularPrecioFinal = (precioVenta: number, descuento: number) => {
    // Precio total (precio unitario - descuento)
    const precioTotal = precioVenta - descuento;
    return precioTotal > 0 ? precioTotal : 0;
  };

  // Obtener color de estado
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Completada':
        return '#10B981';
      case 'Pendiente':
        return '#F59E0B';
      case 'Cancelada':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };
  
  // Configuraciones para las gráficas
  const configuracionGraficaTendencia = {
    labels: ventasPorPeriodo.map(item => item.periodo),
    datasets: [
      {
        label: 'Unidades vendidas',
        data: ventasPorPeriodo.map(item => item.cantidad),
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ],
  };
  
  const configuracionGraficaBarras = {
    labels: ventasPorPeriodo.map(item => item.periodo),
    datasets: [
      {
        label: 'Ingresos',
        data: ventasPorPeriodo.map(item => item.ingresos),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      }
    ],
  };
  
  const configuracionGraficaEstado = {
    labels: ventasPorEstado.map(item => item.estado),
    datasets: [
      {
        label: 'Unidades por estado',
        data: ventasPorEstado.map(item => item.cantidad),
        backgroundColor: ventasPorEstado.map(item => item.color),
        borderColor: ventasPorEstado.map(item => item.color),
        borderWidth: 1,
      }
    ],
  };
  
  const opcionesGraficas = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== undefined) {
              if (context.dataset.label === 'Ingresos') {
                label += formatPrice(context.parsed.y);
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
  };
  
  const renderGrafica = () => {
    if (loading) return null;
    
    switch(tipoGrafica) {
      case 'tendencia':
        return (
          <div style={{ height: '300px', position: 'relative' }}>
            <Line options={opcionesGraficas} data={configuracionGraficaTendencia} />
          </div>
        );
      case 'barras':
        return (
          <div style={{ height: '300px', position: 'relative' }}>
            <Bar options={opcionesGraficas} data={configuracionGraficaBarras} />
          </div>
        );
      case 'estado':
        return (
          <div style={{ height: '300px', position: 'relative' }}>
            <Pie options={{...opcionesGraficas, maintainAspectRatio: true}} data={configuracionGraficaEstado} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>{responsiveStyles}</style>
      <div 
        className="ventas-historial-container apple-scrollbar"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '1200px', // Aumentado de 990px a 1200px para dar más espacio
          maxWidth: '98%', // Aumentado de 95% a 98% para usar más espacio de la pantalla
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          opacity: isClosing ? 0 : 1,
          transition: 'all 0.3s ease-in-out',
          animation: isClosing ? '' : 'modalAppear 0.3s ease-out forwards',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <header 
          className="ventas-historial-header"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginRight: '12px',
              borderRadius: '5px',
              padding: '4px',
            }}
            aria-label="Volver atrás"
          >
            <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#666' }} />
          </button>
          <h2 
            className="ventas-historial-title"
            style={{ fontSize: '20px', fontWeight: 500, margin: 0 }}
          >
            Historial de Ventas: {productoNombre}
          </h2>
        </header>

        {/* Resumen */}
        <div 
          className="ventas-resumen"
          style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <div 
            className="ventas-resumen-card"
            style={{
              flex: 1,
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              padding: '16px',
              borderLeft: '4px solid #10B981',
            }}
          >
            <div style={{ fontSize: '14px', color: '#047857', marginBottom: '4px' }}>Total Unidades Vendidas</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{totalVentas}</div>
          </div>
          
          <div 
            className="ventas-resumen-card"
            style={{
              flex: 1,
              backgroundColor: '#EEF2FF',
              borderRadius: '8px',
              padding: '16px',
              borderLeft: '4px solid #4F46E5',
            }}
          >
            <div style={{ fontSize: '14px', color: '#4338CA', marginBottom: '4px' }}>Ingresos Totales</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{formatPrice(totalIngresos)}</div>
          </div>
        </div>

        {/* Estado de carga o error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            Cargando historial de ventas...
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            color: '#DC2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}>
            {error}
          </div>
        )}

        {/* Gráficas */}
        {!loading && !error && ventas.length > 0 && (
          <div className="graficas-container" style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                margin: 0, 
                fontWeight: 500, 
                color: '#111827'
              }}>
                Análisis de Ventas
              </h3>
              
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                color: '#6B7280',
                fontSize: '12px'
              }}>
                <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
                Actualizado al {new Date().toLocaleDateString()}
              </div>
            </div>
            
            {/* Botones para cambiar la visualización */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Selector de tipo de gráfica */}
              <div 
                className="grafica-selector"
                style={{
                  display: 'flex',
                  gap: '8px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#F3F4F6',
                  padding: '3px'
                }}
              >
                <button
                  className={tipoGrafica === 'tendencia' ? 'active' : ''}
                  onClick={() => setTipoGrafica('tendencia')}
                >
                  Tendencia de ventas
                </button>
                <button
                  className={tipoGrafica === 'barras' ? 'active' : ''}
                  onClick={() => setTipoGrafica('barras')}
                >
                  Ingresos por período
                </button>
                <button
                  className={tipoGrafica === 'estado' ? 'active' : ''}
                  onClick={() => setTipoGrafica('estado')}
                >
                  Estado de ventas
                </button>
              </div>
              
              {/* Selector de periodo (solo visible para gráficas de tendencia y barras) */}
              {tipoGrafica !== 'estado' && (
                <div 
                  className="grafica-selector"
                  style={{
                    display: 'flex',
                    gap: '8px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: '#F3F4F6',
                    padding: '3px'
                  }}
                >
                  <button
                    className={tipoPeriodo === 'dia' ? 'active' : ''}
                    onClick={() => setTipoPeriodo('dia')}
                  >
                    Diario
                  </button>
                  <button
                    className={tipoPeriodo === 'semana' ? 'active' : ''}
                    onClick={() => setTipoPeriodo('semana')}
                  >
                    Semanal
                  </button>
                  <button
                    className={tipoPeriodo === 'mes' ? 'active' : ''}
                    onClick={() => setTipoPeriodo('mes')}
                  >
                    Mensual
                  </button>
                  <button
                    className={tipoPeriodo === 'trimestre' ? 'active' : ''}
                    onClick={() => setTipoPeriodo('trimestre')}
                  >
                    Trimestral
                  </button>
                  <button
                    className={tipoPeriodo === 'año' ? 'active' : ''}
                    onClick={() => setTipoPeriodo('año')}
                  >
                    Anual
                  </button>
                </div>
              )}
            </div>
            
            {/* Visualización de la gráfica */}
            <div className="grafica-card">
              {renderGrafica()}
              
              {/* Mensaje cuando no hay suficientes datos */}
              {ventasPorPeriodo.length <= 1 && tipoGrafica !== 'estado' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: '#6B7280',
                  fontSize: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '6px',
                  padding: '12px 24px'
                }}>
                  No hay suficientes datos para mostrar la tendencia.<br/>
                  Prueba con otro periodo o tipo de gráfico.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lista de ventas */}
        {!loading && !error && ventas.length === 0 && (
          <div style={{
            backgroundColor: '#F9FAFB',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6B7280',
          }}>
            No hay ventas registradas para este producto.
          </div>
        )}

        {!loading && !error && ventas.length > 0 && (
          <div className="ventas-table-container">
            <table 
              className="ventas-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '10%' }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '12%' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '8%' }}>Cantidad</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '10%' }}>Precio Neto</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '10%' }}>Descuento</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '10%' }}>Precio Final</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '10%' }}>Forma Pago</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '8%' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '8%' }}>Tallas</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151', width: '14%' }}>Trabajador</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id} style={{
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: 'white',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                  >
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div>{formatDate(venta.fecha_inicio)}</div>
                      {venta.fecha_entrega !== venta.fecha_inicio && (
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          Entrega: {formatDate(venta.fecha_entrega)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>{venta.cliente_nombre}</td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top', fontWeight: 500 }}>{venta.cantidad}</td>
                    
                    {/* Precio Neto (precio unitario directo de la base de datos) */}
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div>{formatPrice(venta.precio_venta)}</div>
                    </td>
                    
                    {/* Descuento */}
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      {venta.descuento > 0 ? (
                        <div style={{ color: '#10B981', fontWeight: 500 }}>
                          {formatPrice(venta.descuento)}
                        </div>
                      ) : (
                        <div style={{ color: '#9CA3AF' }}>-</div>
                      )}
                    </td>
                    
                    {/* Precio Final (precio neto - descuento) */}
                    <td style={{ padding: '12px 8px', verticalAlign: 'top', fontWeight: 500 }}>
                      {formatPrice(calcularPrecioFinal(venta.precio_venta, venta.descuento))}
                    </td>
                    
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>{venta.forma_pago}</td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'white',
                        backgroundColor: getStatusColor(venta.estado)
                      }}>
                        {venta.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>{venta.tallas || '-'}</td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{venta.trabajador_nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Botón para imprimir reporte si hay ventas */}
        {!loading && !error && ventas.length > 0 && (
          <div style={{ 
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '24px' 
          }}>
            <button
              style={{
                backgroundColor: '#F3F4F6',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#4B5563',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                window.print();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
                <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
              </svg>
              Imprimir reporte
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Definir animaciones para la aparición del modal
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

  /* Estilos para impresión */
  @media print {
    body * {
      visibility: hidden;
    }
    .ventas-historial-container, .ventas-historial-container * {
      visibility: visible;
    }
    .ventas-historial-container {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: auto;
      padding: 15px;
      margin: 0;
      max-width: 100%;
      box-shadow: none;
      border-radius: 0;
    }
    button {
      display: none !important;
    }
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
`;

// Solo añadir el estilo si no existe ya
if (!document.head.contains(animationStyle)) {
  document.head.appendChild(animationStyle);
}

export default VentasHistorial; 