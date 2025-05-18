import { useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler,
  TooltipItem,
  Point,
  ChartType,
  BarController
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  BarController,
  ArcElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

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

interface TallaVentas {
  talla: string;
  cantidad: number;
}

interface ColorVentas {
  color: string;
  cantidad: number;
  colorHex: string;
}

type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'trimestre' | 'año';
type TipoGrafica = 'tendencia' | 'barras' | 'estado' | 'tallas' | 'colores';

function VentasHistorial({ onClose, isClosing, productoId, productoNombre }: VentasHistorialProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  
  // Estado para las gráficas
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('dia');
  const [tipoGrafica, setTipoGrafica] = useState<TipoGrafica>('tendencia');
  const [ventasPorPeriodo, setVentasPorPeriodo] = useState<VentaPorPeriodo[]>([]);
  const [ventasPorEstado, setVentasPorEstado] = useState<EstadoVentas[]>([]);
  const [ventasPorTalla, setVentasPorTalla] = useState<TallaVentas[]>([]);
  const [ventasPorColor, setVentasPorColor] = useState<ColorVentas[]>([]);

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
    
    // 3. Calcular ventas por talla
    const tallas = new Map<string, number>();
    
    ventasOrdenadas.forEach(venta => {
      if (venta.tallas) {
        // Las tallas pueden venir como: "36, 37, 38" o "38" o incluso tener espacios
        const tallasSeparadas = venta.tallas.split(',').map(t => t.trim());
        
        tallasSeparadas.forEach(talla => {
          if (talla) {
            if (tallas.has(talla)) {
              tallas.set(talla, tallas.get(talla)! + venta.cantidad);
            } else {
              tallas.set(talla, venta.cantidad);
            }
          }
        });
      }
    });
    
    // Convertir el Map a un array y ordenar por talla numéricamente
    const tallasFinal = Array.from(tallas.entries())
      .map(([talla, cantidad]) => ({ talla, cantidad }))
      .sort((a, b) => {
        const numA = parseFloat(a.talla);
        const numB = parseFloat(b.talla);
        if (isNaN(numA) || isNaN(numB)) {
          return a.talla.localeCompare(b.talla);
        }
        return numA - numB;
      });
    
    setVentasPorTalla(tallasFinal);
    
    // 4. Calcular ventas por color
    const colores = new Map<string, number>();
    
    // Mapa de colores comunes a valores hexadecimales
    const coloresHex: Record<string, string> = {
      'negro': '#000000',
      'blanco': '#FFFFFF',
      'rojo': '#FF0000',
      'azul': '#0000FF',
      'verde': '#008000',
      'amarillo': '#FFFF00',
      'naranja': '#FFA500',
      'morado': '#800080',
      'rosa': '#FFC0CB',
      'gris': '#808080',
      'marrón': '#A52A2A',
      'café': '#A52A2A',
      'beige': '#F5F5DC',
      'dorado': '#FFD700',
      'plateado': '#C0C0C0'
    };
    
    ventasOrdenadas.forEach(venta => {
      if (venta.colores) {
        // Los colores pueden venir como: "negro, rojo" o "azul"
        const coloresSeparados = venta.colores.split(',').map(c => c.trim().toLowerCase());
        
        coloresSeparados.forEach(color => {
          if (color) {
            if (colores.has(color)) {
              colores.set(color, colores.get(color)! + venta.cantidad);
            } else {
              colores.set(color, venta.cantidad);
            }
          }
        });
      }
    });
    
    // Convertir el Map a un array
    const coloresFinal = Array.from(colores.entries())
      .map(([color, cantidad]) => ({ 
        color, 
        cantidad, 
        colorHex: coloresHex[color.toLowerCase()] || '#CCCCCC' // Color gris por defecto si no se encuentra
      }))
      .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad, de mayor a menor
    
    setVentasPorColor(coloresFinal);
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
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#4F46E5',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ],
  };
  
  const configuracionGraficaIngresos = {
    labels: ventasPorPeriodo.map(item => item.periodo),
    datasets: [
      {
        label: 'Ingresos',
        data: ventasPorPeriodo.map(item => item.ingresos),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#10B981',
        pointRadius: 4,
        pointHoverRadius: 6,
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
        hoverOffset: 10,
      }
    ],
  };

  // Nueva configuración para gráfica de tallas
  const configuracionGraficaTallas = {
    labels: ventasPorTalla.map(item => `Talla ${item.talla}`),
    datasets: [
      {
        label: 'Unidades vendidas',
        data: ventasPorTalla.map(item => item.cantidad),
        backgroundColor: ventasPorTalla.map((_, index) => {
          // Generar una paleta de colores para las tallas
          const coloresTallas = [
            '#4F46E5', // Indigo
            '#7C3AED', // Violeta
            '#8B5CF6', // Púrpura
            '#A78BFA', // Lavanda
            '#C4B5FD', // Lila
            '#818CF8', // Azul violeta
            '#6366F1', // Azul lavanda
            '#4F46E5', // Índigo
            '#4338CA', // Índigo oscuro
            '#3730A3', // Azul muy oscuro
            '#312E81', // Azul profundo
          ];
          return coloresTallas[index % coloresTallas.length];
        }),
        borderColor: '#4F46E5',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 30,
      }
    ],
  };

  // Nueva configuración para gráfica de colores
  const configuracionGraficaColores = {
    labels: ventasPorColor.map(item => item.color.charAt(0).toUpperCase() + item.color.slice(1)), // Primera letra en mayúscula
    datasets: [
      {
        label: 'Unidades por color',
        data: ventasPorColor.map(item => item.cantidad),
        backgroundColor: ventasPorColor.map(item => {
          // Verificar que el color sea válido y visible
          const colorHex = item.colorHex || '#CCCCCC';
          // Hacer transparentes los colores para mejor visualización
          if (colorHex === '#FFFFFF') return 'rgba(255, 255, 255, 0.9)'; // Blanco con transparencia
          
          // Convertir hex a rgba con algo de transparencia para mejor visualización
          const r = parseInt(colorHex.slice(1, 3), 16);
          const g = parseInt(colorHex.slice(3, 5), 16);
          const b = parseInt(colorHex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.8)`;
        }),
        borderColor: ventasPorColor.map(item => {
          const colorHex = item.colorHex || '#CCCCCC';
          // Borde oscuro para colores claros, claro para colores oscuros
          if (['#FFFFFF', '#F5F5DC', '#FFFF00', '#FFC0CB', '#C0C0C0'].includes(colorHex)) {
            return '#666666';
          } else {
            return '#FFFFFF';
          }
        }),
        borderWidth: 2,
        hoverOffset: 15,
      }
    ],
  };
  
  // Opciones comunes para gráficas de línea
  const opcionesGraficasLinea = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#111827',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        boxPadding: 4,
        usePointStyle: true,
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
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          color: '#6B7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(243, 244, 246, 1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          padding: 8,
          callback: function(value: any) {
            return value;
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        hitRadius: 8,
      }
    },
  };

  // Opciones específicas para gráficos de pastel
  const opcionesPie = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: {
            size: 12,
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#111827',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        boxPadding: 4,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((sum: number, item: number) => sum + item, 0);
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
    cutout: '50%',
    animation: {
      animateScale: true,
      animateRotate: true
    }
  };
  
  // Opciones específicas para ingresos
  const opcionesIngresos = {
    ...opcionesGraficasLinea,
    scales: {
      ...opcionesGraficasLinea.scales,
      y: {
        ...opcionesGraficasLinea.scales.y,
        ticks: {
          ...opcionesGraficasLinea.scales.y.ticks,
          callback: function(value: any) {
            if (value >= 1000000) {
              return '$' + (value / 1000000).toFixed(1) + 'M';
            }
            if (value >= 1000) {
              return '$' + (value / 1000).toFixed(1) + 'K';
            }
            return '$' + value;
          }
        }
      }
    }
  };
  
  // Opciones para gráfica de barras horizontal (tallas)
  const opcionesTallas = {
    indexAxis: 'y' as const, // Hace que las barras sean horizontales
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // No necesitamos leyenda para tallas
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#111827',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        boxPadding: 4,
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.x} unidades`;
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(243, 244, 246, 1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            weight: 'bold'
          },
        }
      }
    },
    elements: {
      bar: {
        borderWidth: 2,
        borderRadius: 4,
      }
    },
  };
  
  const renderGrafica = () => {
    if (loading) return null;
    
    switch(tipoGrafica) {
      case 'tendencia':
        return (
          <div style={{ height: '300px', position: 'relative' }}>
            <Line options={opcionesGraficasLinea as any} data={configuracionGraficaTendencia} />
          </div>
        );
      case 'barras':
        return (
          <div style={{ height: '300px', position: 'relative' }}>
            <Line options={opcionesIngresos as any} data={configuracionGraficaIngresos} />
          </div>
        );
      case 'estado':
        return (
          <div style={{ height: '300px', position: 'relative' }}>
            <Pie options={opcionesPie as any} data={configuracionGraficaEstado} />
          </div>
        );
      case 'tallas':
        return ventasPorTalla.length > 0 ? (
          <div style={{ height: '300px', position: 'relative' }}>
            <Bar options={opcionesTallas as any} data={configuracionGraficaTallas} />
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#6B7280',
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No hay datos de tallas disponibles</div>
            <div style={{ fontSize: '14px' }}>Las ventas no tienen información de tallas registrada</div>
          </div>
        );
      case 'colores':
        return ventasPorColor.length > 0 ? (
          <div style={{ height: '300px', position: 'relative' }}>
            <Pie options={opcionesPie as any} data={configuracionGraficaColores} />
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#6B7280',
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No hay datos de colores disponibles</div>
            <div style={{ fontSize: '14px' }}>Las ventas no tienen información de colores registrada</div>
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
                  Evolución de ingresos
                </button>
                <button
                  className={tipoGrafica === 'estado' ? 'active' : ''}
                  onClick={() => setTipoGrafica('estado')}
                >
                  Estado de ventas
                </button>
                <button
                  className={tipoGrafica === 'tallas' ? 'active' : ''}
                  onClick={() => setTipoGrafica('tallas')}
                >
                  Ventas por talla
                </button>
                <button
                  className={tipoGrafica === 'colores' ? 'active' : ''}
                  onClick={() => setTipoGrafica('colores')}
                >
                  Ventas por color
                </button>
              </div>
              
              {/* Selector de periodo (solo visible para gráficas de tendencia y barras) */}
              {(tipoGrafica === 'tendencia' || tipoGrafica === 'barras') && (
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