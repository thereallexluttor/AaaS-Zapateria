import { useState, useRef, useEffect } from 'react';
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
    return { color: '#EF4444' }; // Rojo
  } else if (dias === 0) {
    return { color: '#F59E0B' }; // Amarillo
  } else if (dias <= 3) {
    return { color: '#F97316' }; // Naranja
  } else {
    return { color: '#059669' }; // Verde
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
      return { backgroundColor: '#FEF3C7', color: '#92400E' }; // Amarillo suave
    case 'completado':
    case 'completada':
      return { backgroundColor: '#F0FDF4', color: '#059669' }; // Verde suave
    case 'cancelado':
    case 'cancelada':
      return { backgroundColor: '#FEF2F2', color: '#EF4444' }; // Rojo suave
    default:
      return { backgroundColor: '#F3F4F6', color: '#374151' }; // Gris suave
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

// Función auxiliar para calcular el progreso total de tareas
const calcularProgresoTotalTareas = (pedidos: Pedido[]) => {
  const totalTareas = pedidos.reduce((sum, pedido) => sum + pedido.total_tareas, 0);
  const tareasCompletadas = pedidos.reduce((sum, pedido) => sum + pedido.tareas_completadas, 0);
  return totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
};

export function PedidoCard({ clienteNombre, pedidosCliente, isExpanded, onToggleExpand, onCancelPedido, onGenerateInvoice }: PedidoCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [isExpanded, pedidosCliente]);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [isExpanded]);

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
        boxShadow: 'none',
        backgroundColor: 'white',
        transition: 'all 0.2s ease',
        margin: '8px 0'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#D1D5DB';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
      }}
    >
      {/* Header siempre visible con información resumida */}
      <div 
        style={{ 
          padding: '24px 28px',
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: 'white',
          borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none'
        }}
        onClick={() => onToggleExpand(clienteNombre)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
          {/* Icono de expansión con estilo más sutil */}
          <div style={{ color: '#6B7280', display: 'flex', alignItems: 'center' }}>
            {isExpanded ? 
              <ChevronDownIcon style={{ width: '16px', height: '16px' }} /> : 
              <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
            }
          </div>
          
          {/* Gauge circular de progreso */}
          {(() => {
            const progress = calcularProgresoTotalTareas(pedidosOrdenados);
            const size = 56;
            const strokeWidth = 5;
            const radius = (size - strokeWidth) / 2;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (progress / 100) * circumference;
            
            return (
              <div style={{ 
                position: 'relative', 
                width: size, 
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px'
              }}>
                {/* Círculo de fondo */}
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                  />
                  {/* Círculo de progreso */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                </svg>
                {/* Texto de porcentaje */}
                <div style={{ 
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: progress === 100 ? '#059669' : '#374151',
                    lineHeight: '1'
                  }}>
                    {progress}%
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    marginTop: '3px'
                  }}>
                    Progreso
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* Información básica del cliente con mejor tipografía */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '17px', 
              fontWeight: 500, 
              color: '#111827',
              marginBottom: '6px',
              letterSpacing: '-0.01em'
            }}>
              {clienteNombre}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'center'
            }}>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                color: '#4B5563',
                fontWeight: 500
              }}>
                {pedidosOrdenados.length} pedido{pedidosOrdenados.length !== 1 ? 's' : ''}
              </span>
              
              {/* Precio total con estilo más limpio */}
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                color: '#059669',
                fontWeight: 500
              }}>
                <CurrencyDollarIcon style={{ width: '16px', height: '16px' }} />
                ${precioTotal % 1 === 0 ? Math.floor(precioTotal) : precioTotal.toFixed(2).replace(/\.00$/, '')}
              </span>
              
              {fechaEntregaMasCercana && (
                <>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    color: '#6B7280'
                  }}>
                    <CalendarIcon style={{ width: '16px', height: '16px' }} />
                    {formatDate(fechaEntregaMasCercana.toISOString())}
                  </span>
                  
                  {/* Días restantes con estilo más sutil */}
                  {(() => {
                    const diasRestantes = calcularDiasRestantes(fechaEntregaMasCercana);
                    return (
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        color: getEstiloDiasRestantes(diasRestantes).color,
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        <ClockIcon style={{ width: '16px', height: '16px' }} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Botón de factura con estilo más limpio */}
          {onGenerateInvoice && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateInvoice(pedidosOrdenados[0]);
              }}
              style={{
                background: 'white',
                border: '1px solid #E5E7EB',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                borderRadius: '6px',
                color: '#374151',
                fontSize: '14px',
                gap: '8px',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
              title="Generar factura electrónica"
            >
              <DocumentTextIcon style={{ width: '16px', height: '16px' }} />
              Factura
            </button>
          )}
          
          {/* Estado con estilo más sutil */}
          <div style={{ 
            padding: '8px 16px', 
            borderRadius: '6px', 
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: getEstadoStyle(estadoGeneral).backgroundColor,
            color: getEstadoStyle(estadoGeneral).color
          }}>
            {getEstadoIcon(estadoGeneral)}
            {estadoGeneral.charAt(0).toUpperCase() + estadoGeneral.slice(1)}
          </div>
        </div>
      </div>
      
      {/* Contenido expandible */}
      <div 
        ref={contentRef}
        style={{ 
          height: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 0.3s ease-in-out, opacity 0.3s ease-in-out',
          backgroundColor: 'white'
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          transform: `translateY(${isExpanded ? '0' : '-10px'})`,
          transition: 'transform 0.3s ease-in-out',
        }}>
          {/* Información del cliente - ahora horizontal */}
          <div style={{ 
            backgroundColor: '#F9FAFB', 
            padding: '12px 24px',
            display: 'flex',
            gap: '32px',
            opacity: isExpanded ? 1 : 0,
            transform: `translateY(${isExpanded ? '0' : '-10px'})`,
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            transitionDelay: '0.1s',
            borderBottom: '1px solid #E5E7EB'
          }}>
            {/* Teléfono */}
            {pedidosOrdenados[0].cliente_telefono && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#4B5563',
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B7280'
                }}>
                  📞
                </div>
                {pedidosOrdenados[0].cliente_telefono}
              </div>
            )}

            {/* Email */}
            {pedidosOrdenados[0].cliente_email && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#4B5563'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B7280'
                }}>
                  ✉️
                </div>
                {pedidosOrdenados[0].cliente_email}
              </div>
            )}

            {/* Dirección */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#4B5563'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B7280'
              }}>
                📍
              </div>
              <div>
                {pedidosOrdenados[0].cliente_direccion}
                {pedidosOrdenados[0].cliente_ciudad && (
                  <span style={{ color: '#6B7280', marginLeft: '4px' }}>
                    • {pedidosOrdenados[0].cliente_ciudad}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lista de pedidos */}
          <div style={{ 
            padding: '12px 24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            opacity: isExpanded ? 1 : 0,
            transform: `translateX(${isExpanded ? '0' : '10px'})`,
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            transitionDelay: '0.15s'
          }}>
            {pedidosOrdenados.map((pedido, index) => (
              <div 
                key={pedido.venta_id} 
                style={{ 
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '10px',
                  backgroundColor: 'white',
                  fontSize: '13px',
                  opacity: isExpanded ? 1 : 0,
                  transform: `translateY(${isExpanded ? '0' : '10px'})`,
                  transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                  transitionDelay: `${0.2 + index * 0.05}s`
                }}
              >
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '10px',
                  alignItems: 'center'
                }}>
                  {/* Icono del producto */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    backgroundColor: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShoppingBagIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />
                  </div>

                  {/* Información del producto */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 500, 
                      color: '#111827',
                      fontSize: '14px',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {pedido.producto_nombre}
                      <span style={{ 
                        backgroundColor: '#F3F4F6', 
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#374151',
                        fontWeight: 500
                      }}>
                        x{pedido.cantidad}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      color: '#6B7280',
                      fontSize: '12px',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarIcon style={{ width: '12px', height: '12px' }} />
                        Venta: {formatDate(pedido.fecha_venta)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarIcon style={{ width: '12px', height: '12px' }} />
                        Entrega: {formatDate(pedido.fecha_entrega)}
                      </div>
                    </div>
                  </div>

                  {/* Estado y acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {pedido.estado.toLowerCase() === 'pendiente' && onCancelPedido && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelPedido(pedido.venta_id);
                        }}
                        style={{
                          background: 'white',
                          border: '1px solid #E5E7EB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '5px',
                          borderRadius: '4px',
                          color: '#EF4444',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEF2F2';
                          e.currentTarget.style.borderColor = '#FCA5A5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                        title="Cancelar pedido"
                      >
                        <TrashIcon style={{ width: '14px', height: '14px' }} />
                      </button>
                    )}
                    <div style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: getEstadoStyle(pedido.estado).backgroundColor,
                      color: getEstadoStyle(pedido.estado).color
                    }}>
                      {getEstadoIcon(pedido.estado)}
                      {pedido.estado}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  {/* Gauge circular de progreso */}
                  {pedido.total_tareas > 0 && (
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      {(() => {
                        const progress = Math.round((pedido.tareas_completadas / pedido.total_tareas) * 100);
                        const size = 28;
                        const strokeWidth = 3;
                        const radius = (size - strokeWidth) / 2;
                        const circumference = radius * 2 * Math.PI;
                        const offset = circumference - (progress / 100) * circumference;
                        
                        return (
                          <div style={{ 
                            position: 'relative', 
                            width: size, 
                            height: size,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke="#E5E7EB"
                                strokeWidth={strokeWidth}
                              />
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke="#10B981"
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                              />
                            </svg>
                            <div style={{ 
                              position: 'absolute',
                              fontSize: '9px',
                              fontWeight: 600,
                              color: progress === 100 ? '#059669' : '#374151'
                            }}>
                              {progress}%
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ 
                        fontSize: '12px',
                        color: '#6B7280'
                      }}>
                        <div style={{ fontWeight: 500, color: '#374151', fontSize: '11px' }}>
                          Progreso de producción
                        </div>
                        <div style={{ fontSize: '11px' }}>
                          {pedido.tareas_completadas} de {pedido.total_tareas} tareas
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Precio */}
                  <div style={{ 
                    fontWeight: 600, 
                    color: '#059669',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <CurrencyDollarIcon style={{ width: '15px', height: '15px' }} />
                    ${pedido.precio_venta % 1 === 0 ? Math.floor(pedido.precio_venta) : pedido.precio_venta.toFixed(2).replace(/\.00$/, '')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PedidoCard; 