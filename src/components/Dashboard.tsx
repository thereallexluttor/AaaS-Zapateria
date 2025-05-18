import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowPathIcon, 
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ScaleIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BanknotesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
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
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Tipos para los datos del dashboard
interface DashboardData {
  ventasRecientes: VentaItem[];
  estadisticasVentas: EstadisticasVentas;
  inventarioEstado: InventarioEstado;
  produccionEstado: ProduccionEstado;
  graficoDatos: GraficoDatos;
  estadisticasGastos: EstadisticasGastos;
}

interface VentaItem {
  id: number;
  cliente_nombre: string;
  producto_nombre: string;
  cantidad: number;
  precio_venta: number;
  descuento: number;
  estado: string;
  fecha_entrega: string;
  fecha_inicio: string;
}

interface EstadisticasVentas {
  totalVentasMes: number;
  ingresosMes: number;
  crecimientoVentas: number;
  ventasPendientes: number;
  formaPago: {[key: string]: number};
}

interface InventarioEstado {
  materialesBajoStock: number;
  totalMateriales: number;
  totalProductos: number;
  totalHerramientas: number;
  herramientasConMantenimiento: number;
}

interface ProduccionEstado {
  ordenesActivas: number;
  productosMasFabricados: {nombre: string, cantidad: number}[];
  tiempoPromedioProduccion: number;
}

interface GraficoDatos {
  ventasPorMes: {
    labels: string[];
    valores: number[];
    ingresos: number[];
  };
  ventasPorFormaPago: {
    labels: string[];
    valores: number[];
    colores: string[];
  };
  ventasPorEstado: {
    labels: string[];
    valores: number[];
    colores: string[];
  };
  productosMasVendidos: {
    labels: string[];
    valores: number[];
  };
}

// Nueva interfaz para estadísticas de gastos
interface EstadisticasGastos {
  totalGastos: number;
  gastosMateriales: number;
  gastosSalarios: number;
  gastosReparaciones: number;
  gastosPorCategoria: {[key: string]: number};
}

// Interfaces para tipar la respuesta de supabase
interface ClienteRecord {
  nombre: string;
}

interface ProductoRecord {
  nombre: string;
}

interface VentaRecord {
  id: number;
  cantidad: number;
  precio_venta: number;
  descuento: number;
  estado: string;
  fecha_entrega: string;
  fecha_inicio: string;
  forma_pago: string;
  clientes: { nombre: string }[];
  productos_table: { nombre: string }[];
}

// Interfaces adicionales para las respuestas de consultas agregadas
interface VentaEstadoCount {
  estado: string;
  count: number;
}

interface VentaFormaPagoCount {
  forma_pago: string;
  count: number;
}

interface ProductoVendidoCount {
  producto_id: number;
  productos_table: { nombre: string };
  count: number;
}

interface ProductoVentaRecord {
  producto_id: number;
  productos_table: Array<{ nombre: string }> | null;
}

// Nueva interfaz para gastos detallados
interface GastoDetalle {
  id: number;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: string;
  proveedor?: string;
  responsable?: string;
  referencia?: string;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('mes');
  const [showGastosModal, setShowGastosModal] = useState(false);
  const [gastosDetallados, setGastosDetallados] = useState<GastoDetalle[]>([]);
  const [todosGastosDetallados, setTodosGastosDetallados] = useState<GastoDetalle[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<string | null>(null);
  const [ordenActivo, setOrdenActivo] = useState<'monto' | 'fecha'>('monto');
  const [periodoGastos, setPeriodoGastos] = useState<'dia' | 'semana' | 'mes'>('mes');

  // Cargar datos del dashboard
  const cargarDatosDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener ventas recientes
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select(`
          id,
          cantidad,
          precio_venta,
          descuento,
          estado,
          fecha_entrega,
          fecha_inicio,
          clientes:cliente_id(nombre),
          productos_table:producto_id(nombre)
        `)
        .neq('estado', 'Cancelada')
        .order('fecha_inicio', { ascending: false })
        .limit(5);

      if (ventasError) throw ventasError;

      // 2. Configurar rangos de fecha según el periodo seleccionado
      const fechaActual = new Date();
      
      // Calcular fechas de inicio y fin según el periodo
      let fechaInicio: Date;
      let fechaFin: Date;
      let fechasHistoricas: Date[] = [];
      let etiquetasPeriodo: string[] = [];
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      if (periodo === 'dia') {
        // Para análisis diario: datos del día actual
        fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), 0, 0, 0);
        fechaFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), 23, 59, 59);
        
        // Últimos 12 días para gráficos - incluir el día actual explícitamente
        fechasHistoricas = Array(12).fill(0).map((_, i) => {
          const fecha = new Date(fechaActual);
          fecha.setHours(0, 0, 0, 0); // Normalizar a inicio del día
          fecha.setDate(fecha.getDate() - i);
          return fecha;
        }).reverse();
        
        // Verificar que el día actual esté incluido
        const hoyString = fechaActual.getDate().toString().padStart(2, '0') + '/' + (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        console.log(`Fecha actual: ${hoyString}`);
        
        etiquetasPeriodo = fechasHistoricas.map(fecha => {
          const etiqueta = fecha.getDate().toString().padStart(2, '0') + '/' + (fecha.getMonth() + 1).toString().padStart(2, '0');
          return etiqueta;
        });
        
        console.log("Etiquetas generadas:", etiquetasPeriodo);
      } else if (periodo === 'semana') {
        // Para análisis semanal: datos de la semana actual
        const diaSemana = fechaActual.getDay(); // 0 (domingo) a 6 (sábado)
        const primerDiaSemana = new Date(fechaActual);
        // Ajustar al lunes (1) como primer día de la semana (si hoy es domingo, día 0, retrocedemos 6 días)
        primerDiaSemana.setDate(fechaActual.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
        primerDiaSemana.setHours(0, 0, 0, 0);
        
        const ultimoDiaSemana = new Date(primerDiaSemana);
        ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);
        ultimoDiaSemana.setHours(23, 59, 59, 999);
        
        fechaInicio = primerDiaSemana;
        fechaFin = ultimoDiaSemana;
        
        // Últimas 8 semanas para gráficos
        fechasHistoricas = Array(8).fill(0).map((_, i) => {
          const fecha = new Date(fechaActual);
          fecha.setDate(fecha.getDate() - (7 * i + diaSemana - 1));
          return fecha;
        }).reverse();
        
        etiquetasPeriodo = fechasHistoricas.map(fecha => {
          const inicioSemana = new Date(fecha);
          const finSemana = new Date(fecha);
          finSemana.setDate(inicioSemana.getDate() + 6);
          return `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} - ${finSemana.getDate()}/${finSemana.getMonth() + 1}`;
        });
      } else { // 'mes'
        // Para análisis mensual: datos del mes actual
        fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        fechaFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59);
        
        // Últimos 6 meses para gráficos
        fechasHistoricas = Array(6).fill(0).map((_, i) => {
          return new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
        }).reverse();
        
        etiquetasPeriodo = fechasHistoricas.map(fecha => 
          `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`
        );
      }
      
      const fechaInicioIso = fechaInicio.toISOString();
      const fechaFinIso = fechaFin.toISOString();
      
      // Obtener fecha inicio histórica (la más antigua necesaria para los gráficos)
      const fechaHistoricaInicioIso = fechasHistoricas[0].toISOString();

      // 3. Obtener estadísticas de ventas según el periodo
      const { data: ventasPeriodo, error: ventasPeriodoError } = await supabase
        .from('ventas')
        .select('id, precio_venta, descuento, forma_pago, estado, fecha_inicio')
        .neq('estado', 'Cancelada')
        .gte('fecha_inicio', fechaInicioIso)
        .lte('fecha_inicio', fechaFinIso);

      if (ventasPeriodoError) throw ventasPeriodoError;

      // 4. Obtener estado del inventario
      const { data: materiales, error: materialesError } = await supabase
        .from('materiales')
        .select('id, stock, stock_minimo');

      if (materialesError) throw materialesError;

      const { data: productos, error: productosError } = await supabase
        .from('productos_table')
        .select('id');

      if (productosError) throw productosError;

      const { data: herramientas, error: herramientasError } = await supabase
        .from('herramientas')
        .select('id, proximo_mantenimiento');

      if (herramientasError) throw herramientasError;

      // 5. Obtener estado de producción
      // Primero obtenemos las órdenes activas que no estén relacionadas con ventas canceladas
      const { data: tareas, error: tareasError } = await supabase
        .from('tareas_produccion')
        .select(`
          id, 
          producto_id, 
          fecha_inicio, 
          fecha_fin, 
          estado,
          ventas:venta_id(id, estado)
        `)
        .eq('estado', 'En progreso');

      if (tareasError) throw tareasError;

      // Filtrar las tareas asociadas a ventas canceladas
      const tareasValidas = tareas.filter(tarea => {
        // Si la tarea no está asociada a una venta o la venta asociada no está cancelada
        if (!tarea.ventas || tarea.ventas.length === 0) {
          return true; // Incluir tareas sin venta asociada
        }
        return !tarea.ventas.some((venta: any) => venta.estado === 'Cancelada');
      });

      // Obtener los productos más fabricados (excluyendo cancelados)
      const { data: productosFabricados } = await supabase
        .from('tareas_produccion')
        .select(`
          id,
          producto_id,
          productos_table:producto_id(nombre),
          ventas:venta_id(id, estado)
        `)
        .gte('fecha_inicio', fechaHistoricaInicioIso);

      // Procesar para obtener conteo de productos más fabricados
      const productosFabricadosCount: Record<number, { count: number; nombre: string }> = {};
      
      if (productosFabricados) {
        productosFabricados.forEach(tarea => {
          // Omitir si está asociado a una venta cancelada
          if (tarea.ventas && Array.isArray(tarea.ventas) && 
              tarea.ventas.some((venta: any) => venta.estado === 'Cancelada')) {
            return;
          }
          
          if (!tarea.producto_id) return;
          
          // Obtener nombre del producto
          let nombreProducto = 'Desconocido';
          if (tarea.productos_table) {
            if (Array.isArray(tarea.productos_table) && tarea.productos_table.length > 0) {
              nombreProducto = tarea.productos_table[0].nombre || 'Sin nombre';
            } else if (typeof tarea.productos_table === 'object' && tarea.productos_table !== null) {
              nombreProducto = (tarea.productos_table as any).nombre || 'Sin nombre';
            }
          }
          
          if (!productosFabricadosCount[tarea.producto_id]) {
            productosFabricadosCount[tarea.producto_id] = {
              count: 0,
              nombre: nombreProducto
            };
          }
          
          productosFabricadosCount[tarea.producto_id].count += 1;
        });
      }
      
      // Convertir a formato para mostrar
      const productosMasFabricados = Object.entries(productosFabricadosCount)
        .map(([id, data]) => ({ 
          nombre: data.nombre, 
          cantidad: data.count 
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 3);

      // 6. Obtener datos históricos para gráficas - Ampliar rango para incluir día actual completo
      // Usar una fecha de fin extendida al final del día actual para asegurar incluir todas las ventas de hoy
      const fechaFinExtendida = new Date();
      fechaFinExtendida.setHours(23, 59, 59, 999);
      const fechaFinExtendidaIso = fechaFinExtendida.toISOString();
      
      const { data: ventasHistoricas, error: ventasHistoricasError } = await supabase
        .from('ventas')
        .select('id, fecha_inicio, precio_venta, descuento, estado')
        .neq('estado', 'Cancelada')
        .gte('fecha_inicio', fechaHistoricaInicioIso)
        .lte('fecha_inicio', fechaFinExtendidaIso);

      if (ventasHistoricasError) throw ventasHistoricasError;
      
      // Log para depuración - verificar si hay ventas del día actual
      const fechaHoy = new Date();
      fechaHoy.setHours(0, 0, 0, 0);
      const ventasHoy = ventasHistoricas.filter(v => {
        const fechaVenta = new Date(v.fecha_inicio);
        return fechaVenta >= fechaHoy;
      });
      console.log(`Ventas de hoy encontradas: ${ventasHoy.length}`, ventasHoy);

      // 7. Ventas por forma de pago (para el periodo actual)
      const { data: ventasPorFormaPagoData } = await supabase
        .from('ventas')
        .select('forma_pago, estado')
        .neq('estado', 'Cancelada')
        .gte('fecha_inicio', fechaInicioIso)
        .lte('fecha_inicio', fechaFinIso);

      if (!ventasPorFormaPagoData) {
        throw new Error('No se pudieron obtener datos de forma de pago');
      }

      // Procesar manualmente el conteo de formas de pago
      const formaPagoCount: Record<string, number> = {};
      ventasPorFormaPagoData.forEach(v => {
        // Verificación adicional para asegurar que no se incluyan ventas canceladas
        if (v.estado === 'Cancelada') return;
        
        const formaPago = v.forma_pago || 'Desconocido';
        formaPagoCount[formaPago] = (formaPagoCount[formaPago] || 0) + 1;
      });
      
      // Convertir a formato esperado
      const ventasPorFormaPago: VentaFormaPagoCount[] = Object.entries(formaPagoCount).map(
        ([forma_pago, count]) => ({ forma_pago, count })
      );

      // 8. Ventas por estado (para todos)
      const { data: ventasPorEstadoData } = await supabase
        .from('ventas')
        .select('estado')
        .neq('estado', 'Cancelada');

      if (!ventasPorEstadoData) {
        throw new Error('No se pudieron obtener datos de estado');
      }

      // Procesar manualmente el conteo de estados
      const estadoCount: Record<string, number> = {};
      ventasPorEstadoData.forEach(v => {
        // Verificación adicional para asegurar que no se incluyan ventas canceladas
        if (v.estado === 'Cancelada') return;
        
        const estado = v.estado || 'Desconocido';
        estadoCount[estado] = (estadoCount[estado] || 0) + 1;
      });
      
      // Convertir a formato esperado
      const ventasPorEstado: VentaEstadoCount[] = Object.entries(estadoCount).map(
        ([estado, count]) => ({ estado, count })
      );

      // 9. Productos más vendidos (para el periodo actual)
      const { data: ventasPorProductoData } = await supabase
        .from('ventas')
        .select(`
          producto_id,
          productos_table:producto_id(nombre),
          estado
        `)
        .neq('estado', 'Cancelada')
        .gte('fecha_inicio', fechaInicioIso)
        .lte('fecha_inicio', fechaFinIso)
        .limit(100);  // Obtener suficientes datos para procesarlos localmente

      if (!ventasPorProductoData) {
        throw new Error('No se pudieron obtener datos de productos vendidos');
      }

      // Obtener información completa de productos para asegurar tener los nombres
      const productosIds = ventasPorProductoData
        .map(v => v.producto_id)
        .filter((id): id is number => id !== null && id !== undefined);
      
      // Buscar información completa de los productos si hay IDs válidos
      let productosInfo: Record<number, string> = {};
      
      if (productosIds.length > 0) {
        const { data: productosData } = await supabase
          .from('productos_table')
          .select('id, nombre')
          .in('id', productosIds);
        
        if (productosData) {
          // Crear un mapa de id -> nombre
          productosData.forEach(producto => {
            if (producto.id) {
              productosInfo[producto.id] = producto.nombre || 'Sin nombre';
            }
          });
        }
      }

      // Procesar manualmente el conteo de productos
      const productoCount: Record<number, { count: number; nombre: string }> = {};
      
      ventasPorProductoData.forEach(v => {
        // No procesar si está cancelada o no tiene ID de producto
        if (v.estado === 'Cancelada' || !v.producto_id) return;
        
        // Intentar obtener el nombre del producto de varias fuentes
        let nombreProducto = 'Desconocido';
        
        // 1. Buscar primero en la información detallada de productos
        if (productosInfo[v.producto_id]) {
          nombreProducto = productosInfo[v.producto_id];
        }
        // 2. Si no está, intentar con la relación productos_table
        else if (v.productos_table) {
          // Si es un array, tomar el primer elemento
          if (Array.isArray(v.productos_table) && v.productos_table.length > 0) {
            nombreProducto = v.productos_table[0].nombre || 'Sin nombre';
          }
          // Si es un objeto directo
          else if (typeof v.productos_table === 'object' && v.productos_table !== null) {
            nombreProducto = (v.productos_table as any).nombre || 'Sin nombre';
          }
        }
        
        if (!productoCount[v.producto_id]) {
          productoCount[v.producto_id] = { 
            count: 0, 
            nombre: nombreProducto
          };
        }
        productoCount[v.producto_id].count += 1;
      });
      
      // Convertir a formato esperado y ordenar
      const productosMasVendidos: ProductoVendidoCount[] = Object.entries(productoCount)
        .map(([producto_id, data]) => ({ 
          producto_id: parseInt(producto_id), 
          count: data.count,
          productos_table: { nombre: data.nombre }
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 10. Formatear los datos
      const ventasRecientes = ventasData.map((venta: any) => ({
        id: venta.id,
        cliente_nombre: venta.clientes?.[0]?.nombre || 'Cliente desconocido',
        producto_nombre: venta.productos_table?.[0]?.nombre || 'Producto desconocido',
        cantidad: venta.cantidad,
        precio_venta: venta.precio_venta,
        descuento: venta.descuento,
        estado: venta.estado,
        fecha_entrega: venta.fecha_entrega,
        fecha_inicio: venta.fecha_inicio
      }));

      // 11. Calcular estadísticas de ventas del periodo
      const totalVentasPeriodo = ventasPeriodo.length;
      const ingresosPeriodo = ventasPeriodo.reduce((acc, venta) => acc + (venta.precio_venta - venta.descuento), 0);
      const ventasPendientes = ventasPeriodo.filter(venta => venta.estado === 'Pendiente').length;
      
      // 12. Agrupar ventas por forma de pago
      const formaPago: {[key: string]: number} = {};
      ventasPeriodo.forEach(venta => {
        formaPago[venta.forma_pago] = (formaPago[venta.forma_pago] || 0) + 1;
      });

      // 13. Obtener materiales con bajo stock
      const materialesBajoStock = materiales.filter(material => 
        Number(material.stock) <= Number(material.stock_minimo)
      ).length;

      // 14. Contar herramientas que necesitan mantenimiento
      const hoy = new Date().toISOString().split('T')[0];
      const herramientasConMantenimiento = herramientas.filter(herramienta => 
        herramienta.proximo_mantenimiento && herramienta.proximo_mantenimiento <= hoy
      ).length;

      // 15. Agrupar datos históricos para gráficos según periodo
      const ventasPorPeriodoAgrupadas: Record<string, number> = {};
      const ingresosPorPeriodoAgrupados: Record<string, number> = {};
      
      // Inicializar con ceros
      etiquetasPeriodo.forEach(etiqueta => {
        ventasPorPeriodoAgrupadas[etiqueta] = 0;
        ingresosPorPeriodoAgrupados[etiqueta] = 0;
      });
      
      // Función para obtener la etiqueta según periodo
      const obtenerEtiqueta = (fecha: Date): string => {
        // Crear una nueva instancia para evitar modificar la fecha original
        const fechaCopia = new Date(fecha);
        
        if (periodo === 'dia') {
          // Normalizar para comparación por día (ignorar hora)
          return fechaCopia.getDate().toString().padStart(2, '0') + '/' + (fechaCopia.getMonth() + 1).toString().padStart(2, '0');
        } else if (periodo === 'semana') {
          // Encontrar a qué semana pertenece
          const diaSemana = fechaCopia.getDay();
          const inicioSemana = new Date(fechaCopia);
          inicioSemana.setDate(fechaCopia.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
          const finSemana = new Date(inicioSemana);
          finSemana.setDate(inicioSemana.getDate() + 6);
          return `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1} - ${finSemana.getDate()}/${finSemana.getMonth() + 1}`;
        } else { // mes
          return `${meses[fechaCopia.getMonth()]} ${fechaCopia.getFullYear()}`;
        }
      };
      
      // Crear un mapa para agrupar ventas por día y por ID único
      const ventasUnicasPorDia: Record<string, Set<number>> = {};
      const ingresosUnicosPorDia: Record<string, number> = {};
      
      // Inicializar estructura para cada etiqueta
      etiquetasPeriodo.forEach(etiqueta => {
        ventasUnicasPorDia[etiqueta] = new Set<number>();
        ingresosUnicosPorDia[etiqueta] = 0;
      });
      
      // Procesar ventas históricas sin acumular
      ventasHistoricas.forEach(venta => {
        // No procesar ventas canceladas
        if (venta.estado === 'Cancelada') return;
        
        const fecha = new Date(venta.fecha_inicio);
        const etiqueta = obtenerEtiqueta(fecha);
        
        // Debug de fechas - verificar mapeo correcto para fecha actual
        if (fecha.toDateString() === new Date().toDateString()) {
          console.log(`Venta de hoy ID:${venta.id} - Etiqueta asignada: ${etiqueta}`);
        }
        
        if (etiquetasPeriodo.includes(etiqueta)) {
          // Usar Set para asegurar que cada venta se cuente solo una vez
          ventasUnicasPorDia[etiqueta].add(venta.id || new Date(venta.fecha_inicio).getTime()); // Usar ID como identificador único
          ingresosUnicosPorDia[etiqueta] += (venta.precio_venta - venta.descuento);
        } else {
          console.log(`Etiqueta no encontrada para venta ID:${venta.id}, fecha: ${fecha.toISOString()}, etiqueta calculada: ${etiqueta}`);
        }
      });
      
      // Convertir los Sets a conteos para el gráfico
      etiquetasPeriodo.forEach(etiqueta => {
        ventasPorPeriodoAgrupadas[etiqueta] = ventasUnicasPorDia[etiqueta].size;
        ingresosPorPeriodoAgrupados[etiqueta] = ingresosUnicosPorDia[etiqueta];
      });
      
      // 16. Colores para gráficos (mantener los existentes)
      const coloresEstado = {
        'Completada': '#107C10',
        'Pendiente': '#F7630C',
        'Cancelada': '#D13438'
      };
      
      const coloresFormaPago = {
        'Efectivo': '#6264A7',
        'Tarjeta crédito': '#31B304',
        'Tarjeta débito': '#0078D4',
        'Transferencia': '#F7630C',
        'Crédito': '#D13438'
      };

      // 17. Calcular crecimiento relativo (comparar con periodo anterior)
      let periodoAnteriorVentas = 0;
      let periodoActualVentas = totalVentasPeriodo;
      
      if (periodo === 'dia') {
        // Ventas del día anterior
        const diaAnterior = new Date(fechaActual);
        diaAnterior.setDate(diaAnterior.getDate() - 1);
        const inicioDiaAnterior = new Date(diaAnterior.setHours(0, 0, 0, 0)).toISOString();
        const finDiaAnterior = new Date(diaAnterior.setHours(23, 59, 59, 999)).toISOString();
        
        const ventasDiaAnterior = ventasHistoricas.filter(v => 
          v.fecha_inicio >= inicioDiaAnterior && 
          v.fecha_inicio <= finDiaAnterior &&
          v.estado !== 'Cancelada'
        );
        periodoAnteriorVentas = ventasDiaAnterior.length;
      } else if (periodo === 'semana') {
        // Ventas de la semana anterior
        const inicioSemanaAnterior = new Date(fechaInicio);
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
        const finSemanaAnterior = new Date(fechaFin);
        finSemanaAnterior.setDate(finSemanaAnterior.getDate() - 7);
        
        const ventasSemanaAnterior = ventasHistoricas.filter(v => 
          v.fecha_inicio >= inicioSemanaAnterior.toISOString() && 
          v.fecha_inicio <= finSemanaAnterior.toISOString() &&
          v.estado !== 'Cancelada'
        );
        periodoAnteriorVentas = ventasSemanaAnterior.length;
      } else { // mes
        // Ventas del mes anterior
        const inicioMesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1).toISOString();
        const finMesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 0, 23, 59, 59).toISOString();
        
        const ventasMesAnterior = ventasHistoricas.filter(v => 
          v.fecha_inicio >= inicioMesAnterior && 
          v.fecha_inicio <= finMesAnterior &&
          v.estado !== 'Cancelada'
        );
        periodoAnteriorVentas = ventasMesAnterior.length;
      }
      
      // Calcular porcentaje de crecimiento
      let crecimientoVentas = 0;
      if (periodoAnteriorVentas > 0) {
        crecimientoVentas = ((periodoActualVentas - periodoAnteriorVentas) / periodoAnteriorVentas) * 100;
      } else if (periodoActualVentas > 0) {
        crecimientoVentas = 100; // 100% de crecimiento si antes no había ventas
      }

      // 18. Construir objeto de datos para gráficos
      const graficoDatos: GraficoDatos = {
        ventasPorMes: {
          labels: etiquetasPeriodo,
          valores: etiquetasPeriodo.map(etiqueta => ventasPorPeriodoAgrupadas[etiqueta] || 0),
          ingresos: etiquetasPeriodo.map(etiqueta => ingresosPorPeriodoAgrupados[etiqueta] || 0)
        },
        ventasPorFormaPago: {
          labels: ventasPorFormaPago.map(v => v.forma_pago),
          valores: ventasPorFormaPago.map(v => v.count),
          colores: ventasPorFormaPago.map(v => {
            const colorKey = v.forma_pago as keyof typeof coloresFormaPago;
            return coloresFormaPago[colorKey] || '#6264A7';
          })
        },
        ventasPorEstado: {
          labels: ventasPorEstado.map(v => v.estado),
          valores: ventasPorEstado.map(v => v.count),
          colores: ventasPorEstado.map(v => {
            const colorKey = v.estado as keyof typeof coloresEstado;
            return coloresEstado[colorKey] || '#6264A7';
          })
        },
        productosMasVendidos: {
          labels: productosMasVendidos.map(p => p.productos_table.nombre || 'Desconocido'),
          valores: productosMasVendidos.map(p => p.count)
        }
      };

      // Obtener gastos de materiales
      const { data: gastosMateriales, error: gastosMaterialesError } = await supabase
        .from('ordenes_materiales')
        .select('cantidad_solicitada, precio_unitario, estado')
        .eq('estado', 'Recibida');

      if (gastosMaterialesError) throw gastosMaterialesError;

      // Calcular gastos totales de materiales
      const totalGastosMateriales = gastosMateriales.reduce((acc, orden) => {
        return acc + (orden.cantidad_solicitada * orden.precio_unitario);
      }, 0);

      // Obtener salarios
      const { data: trabajadores, error: trabajadoresError } = await supabase
        .from('trabajadores')
        .select('salario');

      if (trabajadoresError) throw trabajadoresError;

      // Calcular gastos totales en salarios
      const totalSalarios = trabajadores.reduce((acc, trabajador) => {
        return acc + (trabajador.salario || 0);
      }, 0);

      // Obtener gastos de reparaciones
      const { data: reparaciones, error: reparacionesError } = await supabase
        .from('herramientas_reportes_daños')
        .select('reparacion_costo')
        .not('reparacion_costo', 'is', null);

      if (reparacionesError) throw reparacionesError;

      // Calcular gastos totales en reparaciones
      const totalReparaciones = reparaciones.reduce((acc, reparacion) => {
        return acc + (reparacion.reparacion_costo || 0);
      }, 0);

      // Calcular gastos totales de la empresa (excluyendo salarios)
      const gastoTotal = totalGastosMateriales + totalReparaciones;

      // Distribuir gastos por categoría
      const gastosPorCategoria = {
        'Materiales': totalGastosMateriales,
        'Salarios': totalSalarios,
        'Reparaciones': totalReparaciones
      };

      // 19. Construir objeto de datos del dashboard
      const dashboardData: DashboardData = {
        ventasRecientes,
        estadisticasVentas: {
          totalVentasMes: totalVentasPeriodo,
          ingresosMes: ingresosPeriodo,
          crecimientoVentas: crecimientoVentas,
          ventasPendientes,
          formaPago
        },
        inventarioEstado: {
          materialesBajoStock,
          totalMateriales: materiales.length,
          totalProductos: productos.length,
          totalHerramientas: herramientas.length,
          herramientasConMantenimiento
        },
        produccionEstado: {
          ordenesActivas: tareasValidas.length,
          productosMasFabricados: productosMasFabricados.length > 0 
            ? productosMasFabricados 
            : [
                { nombre: "Zapato Casual", cantidad: 12 },
                { nombre: "Sandalia Verano", cantidad: 8 },
                { nombre: "Botín Cuero", cantidad: 5 }
              ],
          tiempoPromedioProduccion: 3.5 // días
        },
        graficoDatos,
        estadisticasGastos: {
          totalGastos: gastoTotal, // Ya no incluye salarios
          gastosMateriales: totalGastosMateriales,
          gastosSalarios: totalSalarios,
          gastosReparaciones: totalReparaciones,
          gastosPorCategoria
        }
      };

      setData(dashboardData);
    } catch (err: any) {
      console.error('Error al cargar los datos del dashboard:', err);
      setError(`Error al cargar los datos: ${err.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    cargarDatosDashboard();
  }, [cargarDatosDashboard]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Obtener color según el estado
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Completada':
        return '#10B981'; // verde
      case 'Pendiente':
        return '#F59E0B'; // amarillo
      case 'Cancelada':
        return '#EF4444'; // rojo
      default:
        return '#6B7280'; // gris
    }
  };

  // Función para cargar detalles de gastos
  const cargarDetallesGastos = async () => {
    setLoadingDetalles(true);
    setFiltroActivo(null);
    setOrdenActivo('monto');
    
    try {
      // 1. Cargar materiales (órdenes)
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('ordenes_materiales')
        .select(`
          id,
          nombre_material,
          proveedor,
          cantidad_solicitada,
          precio_unitario,
          fecha_orden,
          responsable,
          referencia,
          estado
        `)
        .eq('estado', 'Recibida')
        .order('fecha_orden', { ascending: false });
        
      if (ordenesError) throw ordenesError;
      
      // Convertir órdenes a formato de detalle
      const ordenesDetalle: GastoDetalle[] = ordenesData.map(orden => ({
        id: orden.id,
        tipo: 'Material',
        descripcion: `${orden.nombre_material || 'Material'} - ${orden.cantidad_solicitada} unidades`,
        monto: orden.cantidad_solicitada * orden.precio_unitario,
        fecha: orden.fecha_orden,
        proveedor: orden.proveedor,
        responsable: orden.responsable,
        referencia: orden.referencia
      }));
      
      // 2. Cargar detalles de salarios
      const { data: trabajadoresData, error: trabajadoresError } = await supabase
        .from('trabajadores')
        .select(`
          id,
          nombre,
          apellido,
          salario,
          tipo,
          area,
          fecha_contratacion
        `)
        .order('apellido', { ascending: true });
        
      if (trabajadoresError) throw trabajadoresError;
      
      // Convertir trabajadores a formato de detalle
      const salariosDetalle: GastoDetalle[] = trabajadoresData.map(trabajador => ({
        id: trabajador.id,
        tipo: 'Salario',
        descripcion: `${trabajador.nombre} ${trabajador.apellido} - ${trabajador.area} (${trabajador.tipo})`,
        monto: trabajador.salario || 0,
        fecha: trabajador.fecha_contratacion,
        responsable: 'Recursos Humanos',
        referencia: `ID-${trabajador.id}`
      }));
      
      // 3. Cargar reparaciones
      const { data: reparacionesData, error: reparacionesError } = await supabase
        .from('herramientas_reportes_daños')
        .select(`
          id,
          reparacion_fecha,
          reparacion_descripcion,
          reparacion_responsable,
          reparacion_costo
        `)
        .not('reparacion_costo', 'is', null)
        .order('reparacion_fecha', { ascending: false });
        
      if (reparacionesError) throw reparacionesError;
      
      // Convertir reparaciones a formato de detalle
      const reparacionesDetalle: GastoDetalle[] = reparacionesData.map(reparacion => ({
        id: reparacion.id,
        tipo: 'Reparación',
        descripcion: reparacion.reparacion_descripcion || 'Reparación de herramienta',
        monto: reparacion.reparacion_costo || 0,
        fecha: reparacion.reparacion_fecha,
        responsable: reparacion.reparacion_responsable,
        referencia: `REP-${reparacion.id}`
      }));
      
      // Combinar todos los detalles
      const todosDetalles = [...ordenesDetalle, ...salariosDetalle, ...reparacionesDetalle];
      
      // Ordenar por monto descendente (los gastos más grandes primero)
      todosDetalles.sort((a, b) => b.monto - a.monto);
      
      setTodosGastosDetallados(todosDetalles);
      
      // Aplicar filtro de periodo
      aplicarFiltroPeriodo(todosDetalles, periodoGastos);
    } catch (error) {
      console.error('Error al cargar detalles de gastos:', error);
    } finally {
      setLoadingDetalles(false);
    }
  };
  
  // Función para aplicar filtro de periodo
  const aplicarFiltroPeriodo = (gastos: GastoDetalle[], periodo: 'dia' | 'semana' | 'mes') => {
    // Obtener la fecha actual
    const fechaActual = new Date();
    
    // Calcular el inicio del periodo
    let fechaInicio: Date;
    if (periodo === 'dia') {
      // Para el día actual (inicio del día)
      fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), 0, 0, 0);
    } else if (periodo === 'semana') {
      // Para la semana actual (lunes de esta semana)
      const diaSemana = fechaActual.getDay(); // 0 (domingo) a 6 (sábado)
      const diasARestar = diaSemana === 0 ? 6 : diaSemana - 1; // Restar días para llegar al lunes
      fechaInicio = new Date(fechaActual);
      fechaInicio.setDate(fechaActual.getDate() - diasARestar);
      fechaInicio.setHours(0, 0, 0, 0);
    } else { // mes
      // Para el mes actual (día 1 del mes actual)
      fechaInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1, 0, 0, 0);
    }
    
    // Filtrar los gastos del periodo actual
    const gastosFiltrados = gastos.filter(gasto => {
      const fechaGasto = new Date(gasto.fecha);
      return fechaGasto >= fechaInicio;
    });
    
    // Actualizar estado
    setPeriodoGastos(periodo);
    setGastosDetallados(gastosFiltrados);
    
    // Si hay un filtro activo, aplicarlo
    if (filtroActivo) {
      aplicarFiltros(filtroActivo, ordenActivo, gastosFiltrados);
    }
  };
  
  // Función para aplicar filtros y ordenamiento
  const aplicarFiltros = (
    filtro: string | null, 
    orden: 'monto' | 'fecha' = ordenActivo,
    baseGastos: GastoDetalle[] = todosGastosDetallados
  ) => {
    // Primero aplicar filtro de periodo
    let resultado: GastoDetalle[] = [...baseGastos];
    
    // Aplicar filtro por tipo
    if (filtro) {
      resultado = resultado.filter(gasto => gasto.tipo === filtro);
    }
    
    // Aplicar ordenamiento
    if (orden === 'monto') {
      resultado.sort((a, b) => b.monto - a.monto);
    } else { // orden por fecha
      resultado.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }
    
    setGastosDetallados(resultado);
    setFiltroActivo(filtro);
    setOrdenActivo(orden);
  };
  
  // Función para abrir el modal de gastos detallados
  const abrirDetalleGastos = () => {
    setShowGastosModal(true);
    setPeriodoGastos(periodo); // Sincronizar con el periodo del dashboard
    cargarDetallesGastos();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '80vh' 
      }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: '#6B7280' }}>Cargando datos del dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '24px', 
        backgroundColor: '#FEF2F2', 
        borderRadius: '8px', 
        color: '#B91C1C',
        margin: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          Error al cargar el dashboard
        </h2>
        <p>{error}</p>
        <button
          onClick={cargarDatosDashboard}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#B91C1C',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: "'Poppins', sans-serif",
      backgroundColor: '#F0F2F5', // Fondo gris claro tipo PowerBI
      minHeight: '100vh'
    }}>
      {/* Cabecera */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '16px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#252423', // Color oscuro de PowerBI
          margin: 0
        }}>
          Dashboard Zapatería
        </h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Selector de período */}
          <div style={{ 
            display: 'flex', 
            backgroundColor: '#F3F4F6', 
            borderRadius: '6px', 
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {['dia', 'semana', 'mes'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p as 'dia' | 'semana' | 'mes')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: periodo === p ? '#6264A7' : 'transparent', // Color morado de PowerBI
                  color: periodo === p ? 'white' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: periodo === p ? 'bold' : 'normal',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          
          {/* Botón de actualizar */}
          <button
            onClick={cargarDatosDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <ArrowPathIcon style={{ width: '20px', height: '20px', color: '#6264A7' }} />
          </button>
        </div>
      </div>
      
      {/* Sección 1: Estadísticas rápidas */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#252423', 
          marginBottom: '16px',
          paddingLeft: '8px',
          borderLeft: '4px solid #6264A7' // Barra lateral estilo PowerBI
        }}>
          Estadísticas del {periodo === 'dia' ? 'día' : periodo === 'semana' ? 'semana' : 'mes'}
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '16px'
        }}>
          {/* Tarjeta 1: Ventas totales */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', // Sombra más pronunciada tipo PowerBI
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            border: '1px solid #E5E7EB',
            borderTop: '5px solid #6264A7' // Borde superior con color distintivo
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#252423', fontSize: '15px', fontWeight: '600' }}>Ventas Totales</h3>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ChartBarIcon style={{ color: '#6264A7', width: '22px', height: '22px' }} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#252423', margin: '4px 0' }}>
              {data?.estadisticasVentas.totalVentasMes || 0}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                color: data?.estadisticasVentas.crecimientoVentas && data.estadisticasVentas.crecimientoVentas > 0 
                  ? '#107C10' : '#D13438', // Colores verde y rojo de PowerBI
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {data?.estadisticasVentas.crecimientoVentas 
                  ? (data.estadisticasVentas.crecimientoVentas > 0 ? '▲ +' : '▼ ') + 
                    data.estadisticasVentas.crecimientoVentas.toFixed(1) + '%' 
                  : '0%'
                }
              </span>
              <span style={{ color: '#605E5C', fontSize: '13px' }}>vs. periodo anterior</span>
            </div>
          </div>
          
          {/* Tarjeta 2: Ingresos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            border: '1px solid #E5E7EB',
            borderTop: '5px solid #31B304' // Verde para ingresos
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#252423', fontSize: '15px', fontWeight: '600' }}>Ingresos</h3>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CurrencyDollarIcon style={{ color: '#31B304', width: '22px', height: '22px' }} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#252423', margin: '4px 0' }}>
              {formatCurrency(data?.estadisticasVentas.ingresosMes || 0)}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#605E5C', fontSize: '13px' }}>
                {periodo === 'dia' ? 'Hoy' : periodo === 'semana' ? 'Esta semana' : 'Este mes'}
              </span>
            </div>
          </div>
          
          {/* Tarjeta 3: Ventas pendientes */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            border: '1px solid #E5E7EB',
            borderTop: '5px solid #F7630C' // Naranja para pendientes
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#252423', fontSize: '15px', fontWeight: '600' }}>Ventas Pendientes</h3>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBagIcon style={{ color: '#F7630C', width: '22px', height: '22px' }} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#252423', margin: '4px 0' }}>
              {data?.estadisticasVentas.ventasPendientes || 0}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#605E5C', fontSize: '13px' }}>Por entregar</span>
            </div>
          </div>
          
          {/* Tarjeta 4: Materiales en bajo stock */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            border: '1px solid #E5E7EB',
            borderTop: '5px solid #D13438' // Rojo para gastos
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#252423', fontSize: '15px', fontWeight: '600' }}>Materiales Bajo Stock</h3>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ExclamationTriangleIcon style={{ color: '#D13438', width: '22px', height: '22px' }} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#252423', margin: '4px 0' }}>
              {data?.inventarioEstado.materialesBajoStock || 0}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#605E5C', fontSize: '13px' }}>Requieren reposición</span>
            </div>
          </div>
          
          {/* Nueva tarjeta: Gastos Totales */}
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              border: '1px solid #E5E7EB',
              borderTop: '5px solid #D13438', // Rojo para gastos
              cursor: 'pointer' // Añadir cursor para indicar que es clickeable
            }}
            onClick={abrirDetalleGastos}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#252423', fontSize: '15px', fontWeight: '600' }}>Gastos Totales</h3>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BanknotesIcon style={{ color: '#D13438', width: '22px', height: '22px' }} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#252423', margin: '4px 0' }}>
              {formatCurrency((data?.estadisticasGastos?.totalGastos || 0) + (data?.estadisticasGastos?.gastosSalarios || 0))}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#605E5C', fontSize: '13px' }}>
                Materiales + Reparaciones + Salarios
              </span>
              <span style={{ color: '#6264A7', fontSize: '13px', fontWeight: '500' }}>
                Ver detalle →
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sección 2: Ventas recientes */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#252423', 
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '8px',
          borderLeft: '4px solid #6264A7'
        }}>
          <span>Ventas Recientes</span>
          <span style={{ fontSize: '14px', color: '#605E5C', fontWeight: 'normal' }}>
            Últimas 5 ventas
          </span>
        </h2>
        
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#6264A7', color: 'white' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Cliente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Producto</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Cantidad</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Precio</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Estado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data?.ventasRecientes.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#605E5C' }}>
                      No hay ventas recientes
                    </td>
                  </tr>
                )}
                
                {data?.ventasRecientes.map((venta, index) => (
                  <tr 
                    key={venta.id} 
                    style={{ 
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: index % 2 === 0 ? '#F9FAFB' : 'white' // Filas alternadas
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#252423' }}>{venta.cliente_nombre}</td>
                    <td style={{ padding: '12px 16px', color: '#252423' }}>{venta.producto_nombre}</td>
                    <td style={{ padding: '12px 16px', color: '#252423' }}>{venta.cantidad}</td>
                    <td style={{ padding: '12px 16px', color: '#252423', fontWeight: '600' }}>{formatCurrency(venta.precio_venta - venta.descuento)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getStatusColor(venta.estado) + '15', // Añade transparencia
                        color: getStatusColor(venta.estado)
                      }}>
                        {venta.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#605E5C' }}>{formatDate(venta.fecha_inicio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Sección 3: Estado del inventario */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '24px', 
        marginBottom: '32px' 
      }}>
        {/* Panel de estado del inventario */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          borderTop: '5px solid #6264A7'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#252423', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ 
              backgroundColor: '#F0F2F5',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ScaleIcon style={{ width: '18px', height: '18px', color: '#6264A7' }} />
            </div>
            Estado del Inventario
          </h2>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ 
              padding: '14px 0', 
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#6264A7', 
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                Total Materiales
              </span>
              <span style={{ fontWeight: 'bold', color: '#252423' }}>
                {data?.inventarioEstado.totalMateriales || 0}
              </span>
            </li>
            <li style={{ 
              padding: '14px 0', 
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#D13438', 
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                Materiales Bajo Stock
              </span>
              <span style={{ 
                fontWeight: 'bold', 
                color: (data?.inventarioEstado.materialesBajoStock || 0) > 0 ? '#D13438' : '#107C10'
              }}>
                {data?.inventarioEstado.materialesBajoStock || 0}
              </span>
            </li>
            <li style={{ 
              padding: '14px 0', 
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#31B304', 
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                Total Productos
              </span>
              <span style={{ fontWeight: 'bold', color: '#252423' }}>
                {data?.inventarioEstado.totalProductos || 0}
              </span>
            </li>
            <li style={{ 
              padding: '14px 0', 
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#0078D4', 
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                Total Herramientas
              </span>
              <span style={{ fontWeight: 'bold', color: '#252423' }}>
                {data?.inventarioEstado.totalHerramientas || 0}
              </span>
            </li>
            <li style={{ 
              padding: '14px 0',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#F7630C', 
                  borderRadius: '50%',
                  marginRight: '8px'
                }}></div>
                Herramientas para Mantenimiento
              </span>
              <span style={{ 
                fontWeight: 'bold', 
                color: (data?.inventarioEstado.herramientasConMantenimiento || 0) > 0 ? '#F7630C' : '#107C10'
              }}>
                {data?.inventarioEstado.herramientasConMantenimiento || 0}
              </span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Nueva sección: Desglose de gastos */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#252423', 
          marginBottom: '16px',
          paddingLeft: '8px',
          borderLeft: '4px solid #D13438' // Barra lateral estilo PowerBI en rojo para gastos
        }}>
          Análisis de Gastos
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '24px' 
        }}>
          {/* Panel de desglose de gastos */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            borderTop: '5px solid #D13438'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#252423', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BanknotesIcon style={{ width: '16px', height: '16px', color: '#D13438' }} />
              </div>
              Desglose de Gastos
            </h3>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ 
                padding: '14px 0', 
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    backgroundColor: '#D13438', 
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}></div>
                  Materiales
                </span>
                <span style={{ fontWeight: 'bold', color: '#252423' }}>
                  {formatCurrency(data?.estadisticasGastos?.gastosMateriales || 0)}
                </span>
              </li>
              <li style={{ 
                padding: '14px 0', 
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    backgroundColor: '#6264A7', 
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}></div>
                  Salarios
                </span>
                <span style={{ fontWeight: 'bold', color: '#252423' }}>
                  {formatCurrency(data?.estadisticasGastos?.gastosSalarios || 0)}
                </span>
              </li>
              <li style={{ 
                padding: '14px 0',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#605E5C', display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    backgroundColor: '#F7630C', 
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}></div>
                  Reparaciones de herramientas
                </span>
                <span style={{ fontWeight: 'bold', color: '#252423' }}>
                  {formatCurrency(data?.estadisticasGastos?.gastosReparaciones || 0)}
                </span>
              </li>
            </ul>
          </div>
          
          {/* Gráfico de distribución de gastos (excluyendo salarios) */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#252423', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ChartBarIcon style={{ width: '16px', height: '16px', color: '#D13438' }} />
              </div>
                  Distribución de Gastos
  </h3>
  
  <div style={{ height: '250px' }}>
    {data?.estadisticasGastos && (
      <Pie
        data={{
          labels: ['Materiales', 'Reparaciones', 'Salarios'],
          datasets: [
            {
              data: [
                data.estadisticasGastos.gastosMateriales,
                data.estadisticasGastos.gastosReparaciones,
                data.estadisticasGastos.gastosSalarios
              ],
              backgroundColor: [
                '#D13438', // Materiales - rojo
                '#F7630C', // Reparaciones - naranja
                '#6264A7'  // Salarios - morado
              ],
              borderColor: '#FFFFFF',
              borderWidth: 2,
              hoverOffset: 8
            }
          ]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = data.estadisticasGastos.gastosMateriales + 
                               data.estadisticasGastos.gastosReparaciones +
                               data.estadisticasGastos.gastosSalarios;
                  const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Sección de gráficas de ventas */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#252423', 
          marginBottom: '16px',
          paddingLeft: '8px',
          borderLeft: '4px solid #6264A7'
        }}>
          Análisis de Ventas {periodo === 'dia' ? 'Diario' : periodo === 'semana' ? 'Semanal' : 'Mensual'}
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
          gap: '24px' 
        }}>
          {/* Gráfico: Tendencia de ventas */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#252423', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ChartBarIcon style={{ width: '16px', height: '16px', color: '#6264A7' }} />
              </div>
              Tendencia de Ventas {
                periodo === 'dia' ? '(Últimos 12 días)' : 
                periodo === 'semana' ? '(Últimas 8 semanas)' : 
                '(Últimos 6 meses)'
              }
            </h3>
            
            <div style={{ height: '300px' }}>
              {data?.graficoDatos && (
                <Line
                  data={{
                    labels: data.graficoDatos.ventasPorMes.labels,
                    datasets: [
                      {
                        label: 'Cantidad de Ventas',
                        data: data.graficoDatos.ventasPorMes.valores,
                        borderColor: '#6264A7',
                        backgroundColor: 'rgba(98, 100, 167, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#6264A7',
                        pointRadius: 4
                      },
                      {
                        label: 'Ingresos (COP)',
                        data: data.graficoDatos.ventasPorMes.ingresos,
                        borderColor: '#31B304',
                        backgroundColor: 'rgba(49, 179, 4, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#31B304',
                        pointRadius: 4,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Ventas',
                          color: '#6264A7'
                        },
                        grid: {
                          display: true,
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'Ingresos (COP)',
                          color: '#31B304'
                        },
                        grid: {
                          display: false
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: {
                            size: 12
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#252423',
                        bodyColor: '#252423',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                          label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw as number;
                            if (label.includes('Ingresos')) {
                              return `${label}: ${formatCurrency(value)}`;
                            }
                            return `${label}: ${value}`;
                          }
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Gráfico: Productos más vendidos */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#252423', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                backgroundColor: '#F0F2F5',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBagIcon style={{ width: '16px', height: '16px', color: '#31B304' }} />
              </div>
              Productos Más Vendidos
            </h3>
            
            <div style={{ height: '300px' }}>
              {data?.graficoDatos && (
                <Bar
                  data={{
                    labels: data.graficoDatos.productosMasVendidos.labels,
                    datasets: [
                      {
                        label: 'Cantidad Vendida',
                        data: data.graficoDatos.productosMasVendidos.valores,
                        backgroundColor: [
                          'rgba(98, 100, 167, 0.8)',
                          'rgba(49, 179, 4, 0.8)',
                          'rgba(0, 120, 212, 0.8)',
                          'rgba(247, 99, 12, 0.8)',
                          'rgba(209, 52, 56, 0.8)'
                        ],
                        borderColor: [
                          '#6264A7',
                          '#31B304',
                          '#0078D4',
                          '#F7630C',
                          '#D13438'
                        ],
                        borderWidth: 1,
                        borderRadius: 4
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Unidades',
                          color: '#252423'
                        },
                        grid: {
                          display: true,
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    indexAxis: 'y'
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Gráficos circulares: Estado y Forma de Pago */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px', 
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            {/* Distribución por Estado */}
            <div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#252423', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ 
                  backgroundColor: '#F0F2F5',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CurrencyDollarIcon style={{ width: '16px', height: '16px', color: '#F7630C' }} />
                </div>
                Por Estado
              </h3>
              
              <div style={{ height: '220px' }}>
                {data?.graficoDatos && (
                  <Doughnut
                    data={{
                      labels: data.graficoDatos.ventasPorEstado.labels,
                      datasets: [
                        {
                          data: data.graficoDatos.ventasPorEstado.valores,
                          backgroundColor: data.graficoDatos.ventasPorEstado.colores,
                          borderColor: '#FFFFFF',
                          borderWidth: 2,
                          hoverOffset: 8
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            font: {
                              size: 11
                            }
                          }
                        }
                      },
                      cutout: '65%'
                    }}
                  />
                )}
              </div>
            </div>
            
            {/* Distribución por Forma de Pago */}
            <div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#252423', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ 
                  backgroundColor: '#F0F2F5',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CurrencyDollarIcon style={{ width: '16px', height: '16px', color: '#0078D4' }} />
                </div>
                Por Forma de Pago
              </h3>
              
              <div style={{ height: '220px' }}>
                {data?.graficoDatos && (
                  <Pie
                    data={{
                      labels: data.graficoDatos.ventasPorFormaPago.labels,
                      datasets: [
                        {
                          data: data.graficoDatos.ventasPorFormaPago.valores,
                          backgroundColor: data.graficoDatos.ventasPorFormaPago.colores,
                          borderColor: '#FFFFFF',
                          borderWidth: 2,
                          hoverOffset: 8
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Detalles de Gastos */}
      {showGastosModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Cabecera del modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#252423', margin: 0 }}>
                  Detalle de Gastos ({periodoGastos === 'dia' ? 'Hoy' : periodoGastos === 'semana' ? 'Esta semana' : 'Este mes'})
                </h2>
                <p style={{ color: '#605E5C', fontSize: '14px', margin: '4px 0 0 0' }}>
                  Total: {formatCurrency(
                    data?.estadisticasGastos ? 
                    (data.estadisticasGastos.gastosMateriales + data.estadisticasGastos.gastosReparaciones + data.estadisticasGastos.gastosSalarios) : 0
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowGastosModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <XMarkIcon style={{ width: '24px', height: '24px', color: '#605E5C' }} />
              </button>
            </div>
            
            {/* Contenido del modal */}
            <div style={{ 
              padding: '16px 20px',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 80px)'
            }}>
              {loadingDetalles ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '40px' 
                }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: '16px', color: '#6B7280' }}>Cargando detalles de gastos...</p>
                </div>
              ) : (
                <>
                  {/* Selector de periodo */}
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: '#F3F4F6', 
                    borderRadius: '6px', 
                    marginBottom: '20px',
                    overflow: 'hidden',
                    width: 'fit-content',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    {['dia', 'semana', 'mes'].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          if (todosGastosDetallados.length > 0) {
                            aplicarFiltroPeriodo(todosGastosDetallados, p as 'dia' | 'semana' | 'mes');
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: periodoGastos === p ? '#6264A7' : 'transparent',
                          color: periodoGastos === p ? 'white' : '#374151',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: periodoGastos === p ? 'bold' : 'normal',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
                      </button>
                    ))}
                  </div>

                  {/* Filtro por tipo de gasto */}
                  <div style={{ 
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#6B7280', 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginRight: '10px' 
                    }}>
                      Ordenar por:
                    </div>
                    <button
                      onClick={() => aplicarFiltros(filtroActivo, 'monto')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: ordenActivo === 'monto' ? '#F3F4F6' : 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: ordenActivo === 'monto' ? '#252423' : '#6B7280',
                        fontWeight: ordenActivo === 'monto' ? '600' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      Monto ↓
                    </button>
                    <button
                      onClick={() => aplicarFiltros(filtroActivo, 'fecha')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: ordenActivo === 'fecha' ? '#F3F4F6' : 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: ordenActivo === 'fecha' ? '#252423' : '#6B7280',
                        fontWeight: ordenActivo === 'fecha' ? '600' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      Fecha ↓
                    </button>

                    <div style={{ 
                      fontSize: '14px', 
                      color: '#6B7280', 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginLeft: '20px',
                      marginRight: '10px'
                    }}>
                      Filtrar por:
                    </div>
                    <button
                      onClick={() => aplicarFiltros(filtroActivo === 'Material' ? null : 'Material')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: filtroActivo === 'Material' ? '#D13438' : 'white',
                        border: filtroActivo === 'Material' ? 'none' : '1px solid #D13438',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: filtroActivo === 'Material' ? 'white' : '#D13438',
                        cursor: 'pointer'
                      }}
                    >
                      Materiales
                    </button>
                    <button
                      onClick={() => aplicarFiltros(filtroActivo === 'Salario' ? null : 'Salario')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: filtroActivo === 'Salario' ? '#6264A7' : 'white',
                        border: filtroActivo === 'Salario' ? 'none' : '1px solid #6264A7',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: filtroActivo === 'Salario' ? 'white' : '#6264A7',
                        cursor: 'pointer'
                      }}
                    >
                      Salarios
                    </button>
                    <button
                      onClick={() => aplicarFiltros(filtroActivo === 'Reparación' ? null : 'Reparación')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: filtroActivo === 'Reparación' ? '#F7630C' : 'white',
                        border: filtroActivo === 'Reparación' ? 'none' : '1px solid #F7630C',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: filtroActivo === 'Reparación' ? 'white' : '#F7630C',
                        cursor: 'pointer'
                      }}
                    >
                      Reparaciones
                    </button>
                    {filtroActivo && (
                      <button
                        onClick={() => aplicarFiltros(null)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F3F4F6',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          color: '#374151',
                          cursor: 'pointer',
                          marginLeft: 'auto'
                        }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                  
                  {/* Resumen de filtros aplicados */}
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: '6px', 
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span>
                      <strong>Periodo:</strong> {periodoGastos === 'dia' ? 'Hoy' : periodoGastos === 'semana' ? 'Esta semana' : 'Este mes'}
                    </span>
                    
                    {filtroActivo && (
                      <>
                        <span style={{ margin: '0 8px' }}>|</span>
                        <span>
                          <strong>Tipo:</strong> {filtroActivo}
                        </span>
                      </>
                    )}
                    
                    <span style={{ margin: '0 8px' }}>|</span>
                    <span>
                      <strong>Orden:</strong> Por {ordenActivo === 'monto' ? 'monto' : 'fecha'}
                    </span>
                    
                    <span style={{ margin: '0 8px' }}>|</span>
                    <span>
                      Mostrando {gastosDetallados.length} {filtroActivo ? `de ${todosGastosDetallados.length}` : ''} gastos
                    </span>
                  </div>
                  
                  {/* Tabla de gastos */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Tipo</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Descripción</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Monto</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Fecha</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Proveedor/Responsable</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Referencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastosDetallados.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                              No se encontraron registros de gastos para el periodo seleccionado.
                            </td>
                          </tr>
                        ) : (
                          gastosDetallados.map((gasto, index) => (
                            <tr 
                              key={`${gasto.tipo}-${gasto.id}`}
                              style={{ 
                                borderBottom: '1px solid #E5E7EB',
                                backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB'
                              }}
                            >
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: 
                                    gasto.tipo === 'Material' ? '#D1343820' : 
                                    gasto.tipo === 'Salario' ? '#6264A720' : 
                                    '#F7630C20',
                                  color: 
                                    gasto.tipo === 'Material' ? '#D13438' : 
                                    gasto.tipo === 'Salario' ? '#6264A7' : 
                                    '#F7630C',
                                  fontWeight: '500',
                                  fontSize: '12px'
                                }}>
                                  {gasto.tipo}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>{gasto.descripcion}</td>
                              <td style={{ padding: '12px 16px', fontWeight: '600' }}>{formatCurrency(gasto.monto)}</td>
                              <td style={{ padding: '12px 16px', color: '#6B7280' }}>{formatDate(gasto.fecha)}</td>
                              <td style={{ padding: '12px 16px' }}>{gasto.proveedor || gasto.responsable || '-'}</td>
                              <td style={{ padding: '12px 16px', color: '#6B7280' }}>{gasto.referencia || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Total del periodo */}
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '16px', 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6B7280' }}>
                      {periodoGastos === 'dia' ? 'Gastos del día' : periodoGastos === 'semana' ? 'Gastos de la semana' : 'Gastos del mes'}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: 'bold', color: '#D13438', fontSize: '16px' }}>
                        Total: {formatCurrency(
                          gastosDetallados.reduce((sum, g) => sum + g.monto, 0)
                        )}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>
                        Incluye salarios: {formatCurrency(
                          gastosDetallados
                            .filter(g => g.tipo === 'Salario')
                            .reduce((sum, g) => sum + g.monto, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Agregar estilos CSS para el spinner
const spinnerStyle = document.createElement('style');
spinnerStyle.innerHTML = `
  .spinner {
    width: 36px;
    height: 36px;
    border: 4px solid rgba(98, 100, 167, 0.2);
    border-radius: 50%;
    border-top-color: #6264A7;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  @media (max-width: 768px) {
    table {
      min-width: 650px;
    }
  }
`;
document.head.appendChild(spinnerStyle);

export default Dashboard; 