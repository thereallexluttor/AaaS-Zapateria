import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

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

interface MaterialOrdenListProps {
  materialId: string | number;
  materialNombre: string;
  onBack: () => void;
}

function MaterialOrdenList({ materialId, materialNombre, onBack }: MaterialOrdenListProps) {
  // Estados para manejar las órdenes
  const [ordenes, setOrdenes] = useState<OrdenMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof OrdenMaterial>('fecha_orden');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Estados disponibles para las órdenes
  const estadosOrden = [
    'Pendiente',
    'Enviada',
    'Recibida',
    'Cancelada'
  ];

  // Cargar órdenes del material
  useEffect(() => {
    async function fetchOrdenes() {
      setLoading(true);
      setError(null);
      
      try {
        // Convertir materialId a número para la comparación adecuada
        const idToCompare = typeof materialId === 'string' ? parseInt(materialId) : materialId;
        
        const { data, error } = await supabase
          .from('ordenes_materiales')
          .select('*')
          .eq('material_id', idToCompare)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setOrdenes(data || []);
      } catch (err: any) {
        console.error('Error al cargar las órdenes:', err);
        setError('No se pudieron cargar las órdenes de materiales');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrdenes();
  }, [materialId]);

  // Ordenar los datos por campo
  const handleSort = (field: keyof OrdenMaterial) => {
    if (field === sortField) {
      // Cambiar dirección si se hace clic en el mismo campo
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nuevo campo, ordenar descendente por defecto
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Aplicar ordenamiento a las órdenes
  const sortedOrdenes = useMemo(() => {
    return [...ordenes].sort((a, b) => {
      let compareA = a[sortField];
      let compareB = b[sortField];
      
      // Manejar valores nulos
      if (compareA === null) compareA = '';
      if (compareB === null) compareB = '';
      
      // Comparación
      if (typeof compareA === 'string' && typeof compareB === 'string') {
        const result = compareA.localeCompare(compareB);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = Number(compareA) - Number(compareB);
        return sortDirection === 'asc' ? result : -result;
      }
    });
  }, [ordenes, sortField, sortDirection]);

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
  
  // Obtener el color según el estado de la orden
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pendiente': return { bg: '#FEF3C7', text: '#D97706' };
      case 'Enviada': return { bg: '#E0F2FE', text: '#0284C7' };
      case 'Recibida': return { bg: '#D1FAE5', text: '#059669' };
      case 'Cancelada': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  // Exportar datos a CSV
  const exportToCSV = () => {
    if (ordenes.length === 0) return;
    
    // Definir encabezados
    const headers = [
      'No. Orden',
      'Fecha Orden',
      'Proveedor',
      'Material',
      'Referencia',
      'Cantidad',
      'Unidades',
      'Precio Unitario',
      'Total',
      'Estado',
      'Responsable',
      'Fecha Entrega Est.',
      'Notas'
    ];
    
    // Convertir datos a filas CSV
    const rows = sortedOrdenes.map(orden => [
      orden.numero_orden,
      formatDate(orden.fecha_orden),
      orden.proveedor,
      orden.nombre_material,
      orden.referencia || '',
      orden.cantidad_solicitada,
      orden.unidades || '',
      orden.precio_unitario || 0,
      (orden.precio_unitario || 0) * orden.cantidad_solicitada,
      orden.estado,
      orden.responsable || '',
      formatDate(orden.fecha_entrega_estimada),
      orden.notas || ''
    ]);
    
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
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ordenes_${materialNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para actualizar el estado de una orden
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!['Pendiente', 'Enviada', 'Recibida', 'Cancelada'].includes(newStatus)) {
      return;
    }

    setUpdatingOrderId(orderId);
    
    try {
      const { error } = await supabase
        .from('ordenes_materiales')
        .update({ 
          estado: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      // Actualizar el estado local
      setOrdenes(prevOrdenes => 
        prevOrdenes.map(orden => 
          orden.id === orderId 
            ? { ...orden, estado: newStatus as 'Pendiente' | 'Enviada' | 'Recibida' | 'Cancelada' } 
            : orden
        )
      );
      
      // Mostrar notificación de éxito
      const successMessage = document.createElement('div');
      successMessage.textContent = `Estado actualizado a: ${newStatus}`;
      successMessage.style.position = 'fixed';
      successMessage.style.bottom = '20px';
      successMessage.style.left = '50%';
      successMessage.style.transform = 'translateX(-50%)';
      successMessage.style.backgroundColor = '#10B981';
      successMessage.style.color = 'white';
      successMessage.style.padding = '10px 20px';
      successMessage.style.borderRadius = '5px';
      successMessage.style.zIndex = '10000';
      
      document.body.appendChild(successMessage);
      
      // Remover la notificación después de 3 segundos
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error al actualizar el estado de la orden:', err);
      
      // Mostrar notificación de error
      const errorMessage = document.createElement('div');
      errorMessage.textContent = `Error al actualizar estado: ${err.message}`;
      errorMessage.style.position = 'fixed';
      errorMessage.style.bottom = '20px';
      errorMessage.style.left = '50%';
      errorMessage.style.transform = 'translateX(-50%)';
      errorMessage.style.backgroundColor = '#EF4444';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '10px 20px';
      errorMessage.style.borderRadius = '5px';
      errorMessage.style.zIndex = '10000';
      
      document.body.appendChild(errorMessage);
      
      // Remover la notificación después de 3 segundos
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 3000);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      padding: '0', 
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      backgroundColor: '#fff',
      position: 'relative'
    }}>
      {/* Estilos para spinner */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner {
            border: 2px solid rgba(0, 0, 0, 0.1);
            border-top-color: #10B981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}
      </style>
      
      {/* Cabecera */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '4px',
              color: '#4B5563'
            }}
            aria-label="Volver"
          >
            <ArrowLeftIcon style={{ width: '20px', height: '20px' }} />
          </button>
          
          <div>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 500, 
              margin: 0,
              color: '#111827'
            }}>
              Órdenes de Material: {materialNombre}
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              margin: '4px 0 0'
            }}>
              {ordenes.length} {ordenes.length === 1 ? 'orden registrada' : 'órdenes registradas'}
            </p>
          </div>
        </div>
        
        <button
          onClick={exportToCSV}
          disabled={ordenes.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: ordenes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: ordenes.length === 0 ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (ordenes.length > 0) {
              e.currentTarget.style.backgroundColor = '#4338CA';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4F46E5';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <DocumentArrowDownIcon style={{ width: '18px', height: '18px' }} />
          Exportar a CSV
        </button>
      </header>
      
      {/* Contenido principal */}
      <div style={{ 
        height: 'calc(100vh - 80px)',
        overflow: 'auto',
        padding: '0',
        position: 'relative'
      }} className="apple-scrollbar">
        {loading && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '200px',
            color: '#6B7280',
            fontSize: '14px',
            gap: '12px'
          }}>
            <div className="spinner"></div>
            Cargando órdenes...
          </div>
        )}
        
        {error && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#FEE2E2', 
            color: '#DC2626',
            borderRadius: '6px',
            margin: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        {!loading && !error && ordenes.length === 0 && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '48px 0',
            color: '#6B7280',
            fontSize: '14px'
          }}>
            No hay órdenes registradas para este material.
          </div>
        )}
        
        {!loading && !error && ordenes.length > 0 && (
          <div style={{ 
            width: '100%', 
            overflowX: 'auto',
            borderCollapse: 'collapse'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#F9FAFB', 
                  borderBottom: '1px solid #E5E7EB',
                  textAlign: 'left'
                }}>
                  <th 
                    onClick={() => handleSort('numero_orden')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB',
                      zIndex: 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      No. Orden
                      {sortField === 'numero_orden' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_orden')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Fecha Orden
                      {sortField === 'fecha_orden' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('proveedor')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Proveedor
                      {sortField === 'proveedor' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('cantidad_solicitada')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Cantidad
                      {sortField === 'cantidad_solicitada' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    Unidades
                  </th>
                  <th 
                    onClick={() => handleSort('precio_unitario')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Precio Unit.
                      {sortField === 'precio_unitario' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    Total
                  </th>
                  <th 
                    onClick={() => handleSort('estado')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Estado
                      {sortField === 'estado' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_entrega_estimada')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Entrega Est.
                      {sortField === 'fecha_entrega_estimada' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('responsable')} 
                    style={{ 
                      padding: '12px 16px', 
                      fontWeight: 500, 
                      color: '#111827',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Responsable
                      {sortField === 'responsable' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOrdenes.map((orden, index) => {
                  const statusColor = getStatusColor(orden.estado);
                  const precioTotal = (orden.precio_unitario || 0) * orden.cantidad_solicitada;
                  
                  return (
                    <tr 
                      key={orden.id}
                      style={{ 
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#F9FAFB';
                      }}
                    >
                      <td style={{ padding: '12px 16px', color: '#111827' }}>
                        {orden.numero_orden}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {formatDate(orden.fecha_orden)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>
                        {orden.proveedor}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#111827', textAlign: 'right' }}>
                        {orden.cantidad_solicitada.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                        {orden.unidades || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#111827', textAlign: 'right' }}>
                        ${orden.precio_unitario?.toFixed(2) || '0.00'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500, textAlign: 'right' }}>
                        ${precioTotal.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          position: 'relative'
                        }}>
                          <select
                            value={orden.estado}
                            onChange={(e) => handleUpdateOrderStatus(orden.id, e.target.value)}
                            disabled={updatingOrderId === orden.id}
                            title="Haz clic para cambiar el estado de la orden"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontWeight: 500,
                              border: 'none',
                              cursor: updatingOrderId === orden.id ? 'wait' : 'pointer',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'none',
                              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 8px center',
                              backgroundSize: '12px',
                              paddingRight: '28px',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.9';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            }}
                          >
                            {estadosOrden.map(estado => (
                              <option key={estado} value={estado}>{estado}</option>
                            ))}
                          </select>
                          {updatingOrderId === orden.id && (
                            <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {formatDate(orden.fecha_entrega_estimada)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                        {orden.responsable || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaterialOrdenList; 