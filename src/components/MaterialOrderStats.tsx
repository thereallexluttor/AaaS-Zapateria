import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryItemType } from './InventoryItem';
import { ArrowLeftIcon, ChartBarIcon, ShoppingBagIcon, CurrencyDollarIcon, ClockIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// Estilo global para aplicar Helvetica Neue a todo el componente
const globalStyles = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// Estilos para placeholder más gris
const placeholderColor = '#a0a0a0';

// CSS para los placeholders y animaciones de foco
const customStyles = `
  ::placeholder {
    color: ${placeholderColor};
    opacity: 1;
  }
  
  input, select, textarea {
    transition: border 0.2s ease-in-out, box-shadow 0.2s ease-in-out, transform 0.1s ease-in-out;
  }
  
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #4F46E5 !important;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    transform: translateY(-1px);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Tipo para las órdenes de materiales
interface OrdenMaterial {
  id: number;
  material_id: number;
  nombre_material: string;
  proveedor: string;
  referencia: string;
  cantidad_solicitada: number;
  unidades: string;
  fecha_entrega_estimada: string | null;
  precio_unitario: number | null;
  notas: string | null;
  estado: 'Pendiente' | 'Enviada' | 'Recibida' | 'Cancelada';
  fecha_orden: string;
  numero_orden: string;
  responsable: string | null;
  created_at: string;
  updated_at: string;
}

// Tipo para los datos estadísticos
interface OrderStats {
  totalOrdenes: number;
  totalRecibidas: number;
  totalPendientes: number;
  totalEnviadas: number;
  totalCanceladas: number;
  totalGastado: number;
  totalUnidades: number;
  proveedores: Record<string, number>;
  ordenesRecientesPorMes: Record<string, number>;
  precioPromedio: number;
  tiempoEntregaPromedio: number; // en días
}

interface MaterialOrderStatsProps {
  material: InventoryItemType;
  onClose: () => void;
  isClosing: boolean;
}

export default function MaterialOrderStats({ material, onClose, isClosing }: MaterialOrderStatsProps) {
  // Estados
  const [ordenes, setOrdenes] = useState<OrdenMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statsTimeFrame, setStatsTimeFrame] = useState<'1m' | '6m' | '1y'>('1y');

  // Cargar órdenes del material
  useEffect(() => {
    async function fetchOrdenes() {
      if (!material || material.type !== 'material') {
        setError('Material no válido');
        setLoading(false);
        return;
      }
      
      // Asegurarse de que material.id exista y sea un valor válido
      const materialId = material.id ? Number(material.id) : null;
      if (materialId === null) {
        setError('ID de material no válido');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('ordenes_materiales')
          .select('*')
          .eq('material_id', materialId)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setOrdenes(data || []);
      } catch (err: any) {
        console.error('Error al cargar las órdenes:', err);
        setError('No se pudieron cargar las estadísticas de órdenes');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrdenes();
  }, [material]);

  // Filtrar órdenes según el período de tiempo seleccionado
  const filteredOrdenes = useMemo(() => {
    
    const now = new Date();
    const cutoffDate = new Date();
    
    if (statsTimeFrame === '1m') {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else if (statsTimeFrame === '6m') {
      cutoffDate.setMonth(now.getMonth() - 6);
    } else if (statsTimeFrame === '1y') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }
    
    return ordenes.filter(orden => {
      const ordenDate = new Date(orden.fecha_orden);
      return ordenDate >= cutoffDate;
    });
  }, [ordenes, statsTimeFrame]);

  // Calcular estadísticas
  const stats: OrderStats = useMemo(() => {
    const result: OrderStats = {
      totalOrdenes: filteredOrdenes.length,
      totalRecibidas: 0,
      totalPendientes: 0,
      totalEnviadas: 0,
      totalCanceladas: 0,
      totalGastado: 0,
      totalUnidades: 0,
      proveedores: {},
      ordenesRecientesPorMes: {},
      precioPromedio: 0,
      tiempoEntregaPromedio: 0
    };
    
    // Contadores para promedio de tiempo de entrega
    let sumaEntregaDias = 0;
    let ordenesConEntrega = 0;
    
    // Procesar cada orden
    filteredOrdenes.forEach(orden => {
      // Contar por estado
      switch (orden.estado) {
        case 'Recibida': result.totalRecibidas++; break;
        case 'Pendiente': result.totalPendientes++; break;
        case 'Enviada': result.totalEnviadas++; break;
        case 'Cancelada': result.totalCanceladas++; break;
      }
      
      // Sumar gastos y unidades
      if (orden.precio_unitario && orden.estado !== 'Cancelada') {
        result.totalGastado += orden.precio_unitario * orden.cantidad_solicitada;
      }
      
      if (orden.estado !== 'Cancelada') {
        result.totalUnidades += orden.cantidad_solicitada;
      }
      
      // Contabilizar proveedores
      if (orden.proveedor) {
        result.proveedores[orden.proveedor] = (result.proveedores[orden.proveedor] || 0) + 1;
      }
      
      // Tiempo de entrega para órdenes recibidas
      if (orden.estado === 'Recibida' && orden.fecha_orden && orden.updated_at) {
        const fechaOrden = new Date(orden.fecha_orden);
        const fechaRecibida = new Date(orden.updated_at);
        const dias = Math.round((fechaRecibida.getTime() - fechaOrden.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dias >= 0) {  // Asegurarse que la fecha de recibimiento es posterior a la orden
          sumaEntregaDias += dias;
          ordenesConEntrega++;
        }
      }
    });
    
    // Calcular precio promedio
    if (result.totalUnidades > 0 && result.totalGastado > 0) {
      result.precioPromedio = result.totalGastado / result.totalUnidades;
    }
    
    // Calcular tiempo promedio de entrega
    if (ordenesConEntrega > 0) {
      result.tiempoEntregaPromedio = sumaEntregaDias / ordenesConEntrega;
    }
    
    return result;
  }, [filteredOrdenes]);
  
  // Obtener los 2 proveedores más frecuentes
  const topProveedores = useMemo(() => {
    return Object.entries(stats.proveedores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([proveedor, count]) => ({ proveedor, count }));
  }, [stats.proveedores]);
  
  // Formatear fecha para visualización
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };
  
  // Formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(price);
  };
  
  // Exportar estadísticas a CSV
  const exportToCSV = () => {
    if (!material || ordenes.length === 0) return;
    
    // Definir encabezados
    const headers = [
      'Estadística',
      'Valor'
    ];
    
    // Preparar datos para CSV
    const rows = [
      ['Período analizado', statsTimeFrame === '1m' ? 'Último mes' : statsTimeFrame === '6m' ? 'Últimos 6 meses' : 'Último año'],
      ['Total de órdenes', stats.totalOrdenes],
      ['Órdenes recibidas', stats.totalRecibidas],
      ['Órdenes pendientes', stats.totalPendientes],
      ['Órdenes enviadas', stats.totalEnviadas],
      ['Órdenes canceladas', stats.totalCanceladas],
      ['Total gastado', formatPrice(stats.totalGastado)],
      ['Total unidades', stats.totalUnidades],
      ['Precio promedio', formatPrice(stats.precioPromedio)],
      ['Tiempo entrega promedio (días)', stats.tiempoEntregaPromedio.toFixed(1)]
    ];
    
    // Añadir proveedores principales
    topProveedores.forEach((p, i) => {
      rows.push([`Proveedor #${i+1}`, `${p.proveedor} (${p.count} órdenes)`]);
    });
    
    // Combinar encabezados y filas
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        // Escapar comas y comillas en el contenido
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(','))
    ].join('\n');
    
    // Crear blob y enlace para descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Usar nombre del material si existe, o un nombre genérico si no
    const materialName = material.nombre ? material.nombre.replace(/\s+/g, '_') : 'material';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `estadisticas_${materialName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '5px',
          padding: '24px',
          width: '920px',
          maxWidth: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          opacity: isClosing ? 0 : 1,
          transition: 'all 0.3s ease-in-out',
          animation: isClosing ? '' : 'modalAppear 0.3s ease-out forwards',
          ...globalStyles,
        }}
        className="apple-scrollbar"
        aria-labelledby="stats-title"
      >
        <style>
          {customStyles}
        </style>
        
        {/* Encabezado con título y botón de cierre */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '5px',
                padding: '4px',
              }}
              aria-label="Volver atrás"
            >
              <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#666' }} />
            </button>
            <div>
              <h2 
                id="stats-title"
                style={{ fontSize: '20px', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ChartBarIcon style={{ width: '24px', height: '24px', color: '#4F46E5' }} />
                Estadísticas de Órdenes
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0' }}>{material?.nombre || 'Material'}</p>
            </div>
          </div>
          
          {/* Botón para exportar */}
          <button
            onClick={exportToCSV}
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '1px solid #e0e0e0',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <ArrowDownTrayIcon style={{ width: '16px', height: '16px' }} />
            <span>Exportar</span>
          </button>
        </header>
        
        {/* Selector de período de tiempo */}
        <section style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          backgroundColor: '#F9FAFB', 
          borderRadius: '5px', 
          border: '1px solid #E5E7EB' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>Período de análisis:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStatsTimeFrame('1m')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: statsTimeFrame === '1m' ? '#EEF2FF' : 'white',
                  color: statsTimeFrame === '1m' ? '#4F46E5' : '#6B7280',
                  border: '1px solid',
                  borderColor: statsTimeFrame === '1m' ? '#C7D2FE' : '#E5E7EB',
                }}
                onMouseEnter={(e) => {
                  if (statsTimeFrame !== '1m') {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (statsTimeFrame !== '1m') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                Último mes
              </button>
              <button
                onClick={() => setStatsTimeFrame('6m')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: statsTimeFrame === '6m' ? '#EEF2FF' : 'white',
                  color: statsTimeFrame === '6m' ? '#4F46E5' : '#6B7280',
                  border: '1px solid',
                  borderColor: statsTimeFrame === '6m' ? '#C7D2FE' : '#E5E7EB',
                }}
                onMouseEnter={(e) => {
                  if (statsTimeFrame !== '6m') {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (statsTimeFrame !== '6m') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                Últimos 6 meses
              </button>
              <button
                onClick={() => setStatsTimeFrame('1y')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: statsTimeFrame === '1y' ? '#EEF2FF' : 'white',
                  color: statsTimeFrame === '1y' ? '#4F46E5' : '#6B7280',
                  border: '1px solid',
                  borderColor: statsTimeFrame === '1y' ? '#C7D2FE' : '#E5E7EB',
                }}
                onMouseEnter={(e) => {
                  if (statsTimeFrame !== '1y') {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (statsTimeFrame !== '1y') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                Último año
              </button>
            </div>
          </div>
        </section>
        
        <div className="p-4">
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px' 
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(79, 70, 229, 0.2)',
                  borderRadius: '50%',
                  borderTopColor: '#4F46E5',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ marginLeft: '12px', color: '#6B7280', fontSize: '14px' }}>
                  Cargando...
                </span>
              </div>
            ) : error ? (
              <div style={{ 
                backgroundColor: 'rgba(220, 38, 38, 0.1)', 
                color: '#DC2626', 
                padding: '16px', 
                borderRadius: '5px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            ) : ordenes.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '32px 0', 
                color: '#6B7280' 
              }}>
                <p style={{ fontSize: '16px', fontWeight: 500 }}>No hay órdenes registradas para este material</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Regrese cuando haya creado órdenes para ver estadísticas</p>
              </div>
            ) : (
              <div>
                {/* Tarjetas de resumen */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '24px' 
                }}>
                  {/* Total de órdenes */}
                  <div style={{ 
                    backgroundColor: '#EEF2FF', 
                    borderRadius: '5px',
                    padding: '16px',
                    border: '1px solid #C7D2FE'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: '#4F46E5', fontSize: '14px', fontWeight: 500 }}>Total de órdenes</p>
                        <p style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginTop: '8px' }}>{stats.totalOrdenes}</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBagIcon style={{ width: '20px', height: '20px', color: '#4F46E5' }} />
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#6B7280' }}>Recibidas: <span style={{ color: '#10B981', fontWeight: 500 }}>{stats.totalRecibidas}</span></span>
                      <span style={{ color: '#6B7280' }}>Pendientes: <span style={{ color: '#F59E0B', fontWeight: 500 }}>{stats.totalPendientes}</span></span>
                      <span style={{ color: '#6B7280' }}>Canceladas: <span style={{ color: '#EF4444', fontWeight: 500 }}>{stats.totalCanceladas}</span></span>
                    </div>
                  </div>
                  
                  {/* Total gastado */}
                  <div style={{ 
                    backgroundColor: '#ECFDF5', 
                    borderRadius: '5px',
                    padding: '16px',
                    border: '1px solid #A7F3D0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: '#10B981', fontSize: '14px', fontWeight: 500 }}>Total gastado</p>
                        <p style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginTop: '8px' }}>{formatPrice(stats.totalGastado)}</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CurrencyDollarIcon style={{ width: '20px', height: '20px', color: '#10B981' }} />
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#6B7280' }}>Unidades: <span style={{ color: '#111827', fontWeight: 500 }}>{stats.totalUnidades}</span></span>
                      <span style={{ color: '#6B7280' }}>Promedio: <span style={{ color: '#111827', fontWeight: 500 }}>{formatPrice(stats.precioPromedio)}</span></span>
                    </div>
                  </div>
                  
                  {/* Tiempo promedio de entrega */}
                  <div style={{ 
                    backgroundColor: '#FFF7ED', 
                    borderRadius: '5px',
                    padding: '16px',
                    border: '1px solid #FED7AA'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: '#F97316', fontSize: '14px', fontWeight: 500 }}>Tiempo promedio de entrega</p>
                        <p style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginTop: '8px' }}>{stats.tiempoEntregaPromedio.toFixed(1)} días</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClockIcon style={{ width: '20px', height: '20px', color: '#F97316' }} />
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#6B7280' }}>Calculado con <span style={{ color: '#111827', fontWeight: 500 }}>{stats.totalRecibidas}</span> órdenes recibidas</span>
                    </div>
                  </div>
                  
                  {/* Proveedores principales */}
                  <div style={{ 
                    backgroundColor: '#F5F3FF', 
                    borderRadius: '5px',
                    padding: '16px',
                    border: '1px solid #DDD6FE'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: '#8B5CF6', fontSize: '14px', fontWeight: 500 }}>Proveedores principales</p>
                        <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {topProveedores.length > 0 
                            ? topProveedores[0].proveedor 
                            : "Sin proveedores"}
                        </p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBagIcon style={{ width: '20px', height: '20px', color: '#8B5CF6' }} />
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      {topProveedores.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{p.proveedor}:</span>
                          <span style={{ color: '#111827', fontWeight: 500 }}>{p.count} órdenes</span>
                        </div>
                      ))}
                      {topProveedores.length === 0 && (
                        <span style={{ color: '#6B7280' }}>No hay datos de proveedores</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Listado de últimas órdenes */}
                <div style={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E7EB', 
                  borderRadius: '5px', 
                  padding: '16px' 
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#111827', marginBottom: '16px' }}>Últimas órdenes</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#F9FAFB' }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>N° Orden</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Fecha</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Proveedor</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Cantidad</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Precio</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrdenes.slice(0, 5).map((orden) => {
                          const statusStyles = {
                            padding: '2px 8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            borderRadius: '9999px',
                            display: 'inline-block',
                            ...orden.estado === 'Pendiente' 
                              ? { backgroundColor: '#FEF3C7', color: '#D97706' }
                              : orden.estado === 'Enviada' 
                                ? { backgroundColor: '#DBEAFE', color: '#3B82F6' }
                                : orden.estado === 'Recibida'
                                  ? { backgroundColor: '#D1FAE5', color: '#10B981' }
                                  : { backgroundColor: '#FEE2E2', color: '#EF4444' }
                          };
                              
                          return (
                            <tr key={orden.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                {orden.numero_orden}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6B7280' }}>
                                {formatDate(orden.fecha_orden)}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6B7280' }}>
                                {orden.proveedor}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6B7280' }}>
                                {orden.cantidad_solicitada} {orden.unidades}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6B7280' }}>
                                {orden.precio_unitario 
                                  ? formatPrice(orden.precio_unitario * orden.cantidad_solicitada)
                                  : 'N/A'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={statusStyles}>
                                  {orden.estado}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {filteredOrdenes.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                              No hay órdenes en el período seleccionado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredOrdenes.length > 5 && (
                    <div style={{ textAlign: 'right', marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#6B7280' }}>
                        Mostrando 5 de {filteredOrdenes.length} órdenes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 