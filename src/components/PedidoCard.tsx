import { useState } from 'react';
import { PlusCircleIcon, CalendarIcon, CurrencyDollarIcon, ShoppingBagIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

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

interface PedidoCardProps {
  clienteNombre: string;
  pedidosCliente: Pedido[];
  isExpanded: boolean;
  onToggleExpand: (clienteNombre: string) => void;
  onCancelPedido?: (ventaId: number) => Promise<void>;
  onGenerateInvoice?: (pedido: Pedido) => Promise<void>;
}

// Funciones auxiliares
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-ES');
};

const calcularDiasRestantes = (fechaEntrega: Date): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaEntrega);
  entrega.setHours(0, 0, 0, 0);
  const diferencia = entrega.getTime() - hoy.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
};

const obtenerFechaEntregaMasCercana = (pedidos: Pedido[]): Date | null => {
  const fechasEntrega = pedidos
    .map(p => new Date(p.fecha_entrega))
    .filter(date => !isNaN(date.getTime()));
  return fechasEntrega.length > 0 ? 
    new Date(Math.min(...fechasEntrega.map(date => date.getTime()))) : 
    null;
};

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

const getTextoDiasRestantes = (dias: number) => {
  if (dias < 0) {
    return `${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''} atrasado`;
  } else if (dias === 0) {
    return 'Hoy';
  } else {
    return `${dias} día${dias !== 1 ? 's' : ''}`;
  }
};

const getEstadoStyle = (estado: string) => {
  switch (estado.toLowerCase()) {
    case 'pendiente':
      return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'completado':
    case 'completada':
      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'cancelado':
    case 'cancelada':
      return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
    default:
      return { backgroundColor: '#E5E7EB', color: '#374151' };
  }
};

const getEstadoIcon = (estado: string) => {
  switch (estado.toLowerCase()) {
    case 'pendiente':
      return <ClockIcon style={{ width: '16px', height: '16px' }} />;
    case 'completado':
    case 'completada':
      return <CheckCircleIcon style={{ width: '16px', height: '16px' }} />;
    case 'cancelado':
    case 'cancelada':
      return <XCircleIcon style={{ width: '16px', height: '16px' }} />;
    default:
      return null;
  }
};

export function PedidoCard({ clienteNombre, pedidosCliente, isExpanded, onToggleExpand, onCancelPedido, onGenerateInvoice }: PedidoCardProps) {
  // Ordenar los pedidos del cliente por fecha de entrega
  const pedidosOrdenados = [...pedidosCliente].sort((a, b) => {
    const fechaA = new Date(a.fecha_entrega);
    const fechaB = new Date(b.fecha_entrega);
    return fechaA.getTime() - fechaB.getTime();
  });
  
  // Determinar la fecha de entrega más cercana y el estado general
  const fechaEntregaMasCercana = obtenerFechaEntregaMasCercana(pedidosOrdenados);
  
  // Calcular el precio total de todos los pedidos del cliente
  const precioTotal = pedidosOrdenados.reduce((total, pedido) => {
    return total + pedido.precio_venta;
  }, 0);
  
  // Determinar el estado general
  let estadoGeneral = '';
  if (pedidosOrdenados.some(p => p.estado.toLowerCase() === 'pendiente')) {
    estadoGeneral = 'pendiente';
  } else if (pedidosOrdenados.some(p => p.estado.toLowerCase() === 'completado')) {
    estadoGeneral = 'completado';
  } else if (pedidosOrdenados.some(p => p.estado.toLowerCase() === 'cancelada')) {
    estadoGeneral = 'cancelada';
  } else {
    estadoGeneral = pedidosOrdenados[0]?.estado.toLowerCase() || '';
  }

  return (
    <div 
      className="inventory-item-wrapper"
      style={{ 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        backgroundColor: 'white',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      {/* Header siempre visible con información resumida */}
      <div 
        style={{ 
          padding: '12px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: '#F9FAFB',
          borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none'
        }}
        onClick={() => onToggleExpand(clienteNombre)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Icono de expansión */}
          <div style={{ color: '#6B7280' }}>
            {isExpanded ? 
              <ChevronDownIcon style={{ width: '16px', height: '16px' }} /> : 
              <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
            }
          </div>
          
          {/* Información básica del cliente */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
              {clienteNombre}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', display: 'flex', gap: '8px', marginTop: '2px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ backgroundColor: '#E5E7EB', padding: '1px 6px', borderRadius: '10px', color: '#374151', fontSize: '12px' }}>
                  {pedidosOrdenados.length} pedido{pedidosOrdenados.length !== 1 ? 's' : ''}
                </span>
              </span>
              
              {/* Precio total */}
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '3px',
                backgroundColor: '#F0FDF4',
                padding: '1px 6px',
                borderRadius: '10px',
                color: '#166534',
                fontSize: '12px',
                fontWeight: 500
              }}>
                <CurrencyDollarIcon style={{ width: '13px', height: '13px' }} />
                ${precioTotal % 1 === 0 ? Math.floor(precioTotal) : precioTotal.toFixed(2).replace(/\.00$/, '')}
              </span>
              
              {fechaEntregaMasCercana && (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalendarIcon style={{ width: '13px', height: '13px' }} />
                    {formatDate(fechaEntregaMasCercana.toISOString())}
                  </span>
                  
                  {/* Días restantes para entrega */}
                  {(() => {
                    const diasRestantes = calcularDiasRestantes(fechaEntregaMasCercana);
                    return (
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '3px',
                        ...getEstiloDiasRestantes(diasRestantes),
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        <ClockIcon style={{ width: '12px', height: '12px' }} />
                        {getTextoDiasRestantes(diasRestantes)}
                      </span>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Sección de botones y estado a la derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Botón de factura electrónica para toda la orden */}
          {onGenerateInvoice && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Pasamos el primer pedido para obtener los datos del cliente
                onGenerateInvoice(pedidosOrdenados[0]);
              }}
              style={{
                background: 'none',
                border: '1px solid #4F46E5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                borderRadius: '4px',
                color: '#4F46E5',
                fontSize: '11px',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EEF2FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Generar factura electrónica"
            >
              <DocumentTextIcon style={{ width: '12px', height: '12px' }} />
              Factura
            </button>
          )}
          
          {/* Estado general */}
          <div style={{ 
            ...getEstadoStyle(estadoGeneral), 
            padding: '2px 8px', 
            borderRadius: '10px', 
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            {getEstadoIcon(estadoGeneral)}
            {estadoGeneral.charAt(0).toUpperCase() + estadoGeneral.slice(1)}
          </div>
        </div>
      </div>
      
      {/* Contenido expandible */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {/* Información del cliente - lado izquierdo */}
          <div style={{ 
            backgroundColor: '#F9FAFB', 
            padding: '12px', 
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '200px',
            width: '22%'
          }}>
            {pedidosOrdenados[0].cliente_telefono && (
              <div style={{ 
                fontSize: '12px', 
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center', 
                gap: '4px'
              }}>
                📞 {pedidosOrdenados[0].cliente_telefono}
              </div>
            )}
            {pedidosOrdenados[0].cliente_email && (
              <div style={{ 
                fontSize: '12px', 
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center', 
                gap: '4px',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}>
                ✉️ {pedidosOrdenados[0].cliente_email}
              </div>
            )}
            {pedidosOrdenados[0].cliente_direccion && (
              <div style={{ 
                fontSize: '12px', 
                color: '#6B7280',
                marginTop: '4px'
              }}>
                📍 {pedidosOrdenados[0].cliente_direccion}
              </div>
            )}
            {pedidosOrdenados[0].cliente_ciudad && (
              <div style={{ 
                fontSize: '12px', 
                color: '#6B7280'
              }}>
                {pedidosOrdenados[0].cliente_ciudad}
              </div>
            )}
          </div>

          {/* Lista de pedidos - lado derecho */}
          <div style={{ padding: '10px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pedidosOrdenados.map((pedido) => (
              <div 
                key={pedido.venta_id} 
                style={{ 
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '8px',
                  transition: 'all 0.2s',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '13px', 
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ShoppingBagIcon style={{ width: '14px', height: '14px' }} />
                    {pedido.producto_nombre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Botón de cancelar solo si el pedido está pendiente y la función está disponible */}
                    {pedido.estado.toLowerCase() === 'pendiente' && onCancelPedido && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelPedido(pedido.venta_id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px',
                          borderRadius: '4px',
                          color: '#EF4444',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Cancelar pedido"
                      >
                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}
                    
                    {/* Etiqueta de estado */}
                    <div style={{ 
                      ...getEstadoStyle(pedido.estado), 
                      padding: '1px 6px', 
                      borderRadius: '10px', 
                      fontSize: '11px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {getEstadoIcon(pedido.estado)}
                      {pedido.estado}
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '6px',
                  fontSize: '11px',
                  color: '#6B7280',
                  marginBottom: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalendarIcon style={{ width: '12px', height: '12px' }} />
                    <span>Venta: {formatDate(pedido.fecha_venta)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalendarIcon style={{ width: '12px', height: '12px' }} />
                    <span>Entrega: {formatDate(pedido.fecha_entrega)}</span>
                  </div>
                </div>
                
                {/* Barra de progreso de tareas */}
                {pedido.total_tareas > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '10px', color: '#4B5563' }}>
                      <span>Progreso de producción</span>
                      <span>{pedido.tareas_completadas} de {pedido.total_tareas} tareas</span>
                    </div>
                    <div style={{ 
                      height: '6px', 
                      backgroundColor: '#E5E7EB', 
                      borderRadius: '3px', 
                      overflow: 'hidden' 
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.round((pedido.tareas_completadas / pedido.total_tareas) * 100)}%`, 
                        backgroundColor: '#10B981', 
                        borderRadius: '3px' 
                      }} />
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #F3F4F6',
                  paddingTop: '6px',
                  marginTop: '3px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ 
                      backgroundColor: '#F3F4F6', 
                      padding: '1px 4px', 
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      x{pedido.cantidad}
                    </span>
                  </div>
                  <div style={{ 
                    fontWeight: 600, 
                    color: '#111827',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <CurrencyDollarIcon style={{ width: '12px', height: '12px' }} />
                    ${pedido.precio_venta % 1 === 0 ? Math.floor(pedido.precio_venta) : pedido.precio_venta.toFixed(2).replace(/\.00$/, '')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PedidoCard; 