import { useState, useCallback } from 'react';
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface TrabajadorItemType {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  fecha_contratacion?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  salario?: number;
  tipo: 'produccion' | 'ventas' | 'administrativo' | 'diseño';
  area?: string;
  especialidad?: string;
  tipo_contrato?: string;
  horas_trabajo?: number;
  fecha_nacimiento?: string;
  type: string;
}

interface TrabajadorItemProps {
  trabajador: TrabajadorItemType;
  onViewDetails?: (trabajador: TrabajadorItemType) => void;
  onEdit?: (trabajador: TrabajadorItemType) => void;
  onDelete?: (id: string) => void;
}

function TrabajadorItem({ trabajador, onViewDetails, onEdit, onDelete }: TrabajadorItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Obtener una imagen de avatar con las iniciales del trabajador
  const getInitialAvatar = useCallback(() => {
    const initials = `${trabajador.nombre.charAt(0)}${trabajador.apellido.charAt(0)}`;
    return `https://ui-avatars.com/api/?name=${initials}&background=random&size=48&bold=true`;
  }, [trabajador.nombre, trabajador.apellido]);
  
  const fechaFormateada = trabajador.fecha_contratacion 
    ? new Date(trabajador.fecha_contratacion).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : 'No disponible';
  
  // Tipo de trabajador formateado y con color
  const getTipoInfo = () => {
    switch (trabajador.tipo) {
      case 'produccion':
        return { label: 'Producción', color: '#16A34A', bgColor: '#DCFCE7', icon: '🛠️' };
      case 'ventas':
        return { label: 'Ventas', color: '#EA580C', bgColor: '#FFEDD5', icon: '🛒' };
      case 'administrativo':
        return { label: 'Administrativo', color: '#2563EB', bgColor: '#DBEAFE', icon: '📊' };
      case 'diseño':
        return { label: 'Diseño', color: '#9333EA', bgColor: '#F3E8FF', icon: '✏️' };
      default:
        return { label: 'No asignado', color: '#6B7280', bgColor: '#F3F4F6', icon: '❓' };
    }
  };
  
  // Obtener el ícono y nombre para el área específica
  const getAreaInfo = () => {
    if (!trabajador.area) return null;
    
    const areaMapping: Record<string, { label: string, icon: string }> = {
      'corte': { label: 'Corte', icon: '✂️' },
      'aparado': { label: 'Aparado', icon: '🧵' },
      'montaje': { label: 'Montaje', icon: '🔨' },
      'suela': { label: 'Suela', icon: '👟' },
      'acabado': { label: 'Acabado', icon: '✨' },
      'ventas': { label: 'Ventas', icon: '💼' },
      'administracion': { label: 'Admin.', icon: '📝' },
      'diseño': { label: 'Diseño', icon: '🎨' }
    };
    
    return areaMapping[trabajador.area] || { label: trabajador.area, icon: '👞' };
  };
  
  const tipoInfo = getTipoInfo();
  const areaInfo = getAreaInfo();
  
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(trabajador);
    }
    setShowActions(false);
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(trabajador);
    }
    setShowActions(false);
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(trabajador.id);
    }
    setShowActions(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent expanding if clicking action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div 
      onClick={handleCardClick}
      style={{
        background: '#fff',
        borderRadius: '8px',
        boxShadow: 'none',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        cursor: 'pointer',
        transform: isExpanded ? 'scale(1)' : 'scale(1)',
      }}
      onMouseEnter={() => {
        const elem = document.activeElement as HTMLElement;
        if (!elem || elem.tagName !== 'BUTTON') {
          setShowActions(true);
        }
      }}
      onMouseLeave={() => {
        const elem = document.activeElement as HTMLElement;
        if (!elem || elem.tagName !== 'BUTTON') {
          setShowActions(false);
        }
      }}
    >
      {/* Borde izquierdo coloreado */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        backgroundColor: tipoInfo.color,
        borderRadius: '4px 0 0 4px'
      }} />
      
      {/* Contenido principal */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: '16px',
        width: '100%',
        alignItems: 'center'
      }}>
        {/* Avatar */}
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <img 
            src={getInitialAvatar()} 
            alt={`${trabajador.nombre} ${trabajador.apellido}`} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        
        {/* Información básica */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            margin: '0 0 4px 0',
            color: '#111827'
          }}>
            {trabajador.nombre} {trabajador.apellido}
          </h3>
          
          <div style={{ 
            fontSize: '13px', 
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
              <span>CI: {trabajador.cedula}</span>
            {areaInfo && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span>{areaInfo.icon}</span> {areaInfo.label}
              </span>
            )}
          </div>
        </div>
        
        {/* Etiqueta de tipo */}
        <div style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: tipoInfo.bgColor,
          color: tipoInfo.color,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{tipoInfo.icon}</span> {tipoInfo.label}
        </div>
        
        {/* Salario */}
        {trabajador.salario && (
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#111827',
            whiteSpace: 'nowrap'
          }}>
            ${trabajador.salario.toLocaleString('es-ES')}
          </div>
        )}
      </div>
      
      {/* Información expandida */}
      <div style={{ 
        maxHeight: isExpanded ? '500px' : '0',
        opacity: isExpanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginTop: isExpanded ? '16px' : '0',
        borderTop: isExpanded ? '1px solid #E5E7EB' : 'none',
        paddingTop: isExpanded ? '16px' : '0',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          fontSize: '14px',
          color: '#374151'
        }}>
          {/* Información de contacto */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
              Información de Contacto
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trabajador.correo && (
                <div>
                  <span style={{ color: '#6B7280' }}>Correo:</span>
                  <div>{trabajador.correo}</div>
                </div>
              )}
              {trabajador.telefono && (
                <div>
                  <span style={{ color: '#6B7280' }}>Teléfono:</span>
                  <div>{trabajador.telefono}</div>
                </div>
              )}
              {trabajador.direccion && (
                <div>
                  <span style={{ color: '#6B7280' }}>Dirección:</span>
                  <div>{trabajador.direccion}</div>
                </div>
              )}
            </div>
          </div>

          {/* Información laboral */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
              Información Laboral
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trabajador.fecha_contratacion && (
                <div>
                  <span style={{ color: '#6B7280' }}>Fecha de Contratación:</span>
                  <div>
                    {new Date(trabajador.fecha_contratacion).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
              {trabajador.tipo_contrato && (
                <div>
                  <span style={{ color: '#6B7280' }}>Tipo de Contrato:</span>
                  <div>{trabajador.tipo_contrato}</div>
                </div>
              )}
              {trabajador.horas_trabajo && (
                <div>
                  <span style={{ color: '#6B7280' }}>Horas de Trabajo:</span>
                  <div>{trabajador.horas_trabajo} horas</div>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
              Información Adicional
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trabajador.especialidad && (
                <div>
                  <span style={{ color: '#6B7280' }}>Especialidad:</span>
                  <div>{trabajador.especialidad}</div>
                </div>
              )}
              {trabajador.fecha_nacimiento && (
                <div>
                  <span style={{ color: '#6B7280' }}>Fecha de Nacimiento:</span>
                  <div>
                    {new Date(trabajador.fecha_nacimiento).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #E5E7EB'
      }}>
        <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(trabajador);
            }}
          style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <PencilIcon style={{ width: '14px', height: '14px' }} />
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(trabajador.id);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
            <TrashIcon style={{ width: '14px', height: '14px' }} />
            Eliminar
        </button>
        </div>
      </div>

      {/* Menú de acciones flotante (solo visible cuando no está expandido) */}
      {!isExpanded && (
        <div style={{ 
          display: 'flex',
          opacity: showActions ? 1 : 0,
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: showActions ? 'translate(0, -50%)' : 'translate(10px, -50%)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          background: 'white',
          borderRadius: '6px',
          padding: '4px',
          boxShadow: 'none',
          border: showActions ? '1px solid #E5E7EB' : 'none',
          zIndex: 2
        }}>
        <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(trabajador);
            }}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <PencilIcon style={{ width: '18px', height: '18px' }} />
        </button>
        
        <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(trabajador.id);
            }}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
            e.currentTarget.style.color = '#DC2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#EF4444';
          }}
        >
          <TrashIcon style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
      )}
    </div>
  );
}

// Componente auxiliar para mostrar detalles
function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <span style={{ 
        color: '#6B7280', 
        fontSize: '13px', 
        display: 'block', 
        marginBottom: '2px' 
      }}>
        {label}
      </span>
      <span style={{ color: '#111827' }}>{value}</span>
    </div>
  );
}

export default TrabajadorItem; 