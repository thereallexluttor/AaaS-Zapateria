import { useState, useCallback } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

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
  isSelected: boolean;
  onSelectChange: (id: string, isSelected: boolean) => void;
  onViewDetails?: (trabajador: TrabajadorItemType) => void;
  onViewDashboard?: (trabajador: TrabajadorItemType) => void;
}

function TrabajadorItem({ 
  trabajador, 
  isSelected, 
  onSelectChange, 
  onViewDetails,
  onViewDashboard
}: TrabajadorItemProps) {
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
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent expanding/toggling selection if clicking action buttons or the checkbox itself
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
    // Toggle selection if clicking the card header area
    // onSelectChange(trabajador.id, !isSelected); 
    // OR toggle expansion:
    setIsExpanded(!isExpanded);
  };
  
  // Handler specifically for checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectChange(trabajador.id, e.target.checked);
  };

  // Manejador para el botón de dashboard
  const handleViewDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDashboard) {
      onViewDashboard(trabajador);
    }
  };
  
  return (
    <div 
      onClick={handleCardClick}
      style={{
        background: isSelected ? '#F3F4F6' : '#fff', // Highlight if selected
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        padding: '16px',
        marginBottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        cursor: 'pointer',
        transform: isExpanded ? 'scale(1)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
      }}
    >
      {/* Borde izquierdo coloreado */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '6px',
        backgroundColor: tipoInfo.color,
        borderRadius: '5px 0 0 5px'
      }} />
      
      {/* Contenido principal */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'auto auto 1fr auto auto', // Add column for checkbox
        gap: '16px',
        width: '100%',
        alignItems: 'center',
        paddingLeft: '6px'
      }}>
        {/* Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()} // Prevent card click when clicking checkbox
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
        </div>
        
        {/* Avatar */}
        <div style={{ 
          width: '54px', 
          height: '54px', 
          borderRadius: '5px',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
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
            fontSize: '16px', 
            fontWeight: 600, 
            margin: '0 0 6px 0',
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
              {trabajador.fecha_contratacion && (
                <span>Contratado: {fechaFormateada}</span>
              )}
            {areaInfo && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span>{areaInfo.icon}</span> {areaInfo.label}
              </span>
            )}
          </div>
        </div>
        
        {/* Etiqueta de tipo */}
        <div style={{
          padding: '6px 10px',
          borderRadius: '5px',
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
            fontSize: '15px',
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px 20px',
          marginBottom: '16px'
        }}>
          {trabajador.correo && (
            <DetailItem label="Correo" value={trabajador.correo} />
          )}
          {trabajador.telefono && (
            <DetailItem label="Teléfono" value={trabajador.telefono} />
          )}
          {trabajador.especialidad && (
            <DetailItem label="Especialidad" value={trabajador.especialidad} />
          )}
          {trabajador.tipo_contrato && (
            <DetailItem 
              label="Tipo Contrato" 
              value={trabajador.tipo_contrato.charAt(0).toUpperCase() + trabajador.tipo_contrato.slice(1)} 
            />
          )}
          {trabajador.horas_trabajo && (
            <DetailItem label="Horas" value={`${trabajador.horas_trabajo}h/semana`} />
          )}
          {trabajador.fecha_nacimiento && (
            <DetailItem 
              label="Fecha Nacimiento" 
              value={new Date(trabajador.fecha_nacimiento).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })} 
            />
          )}
        </div>
        
        {/* Botones de acción */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: '10px' 
        }}>
          <button
            onClick={handleViewDetails}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#F3F4F6',
              border: 'none',
              borderRadius: '5px',
              fontSize: '13px',
              color: '#4B5563',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            <EyeIcon style={{ width: '16px', height: '16px' }} />
            Ver Detalles
          </button>
          
          {/* Nuevo botón Dashboard (solo para trabajadores de producción) */}
          {trabajador.tipo === 'produccion' && onViewDashboard && (
            <button
              onClick={handleViewDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#EEF2FF',
                border: 'none',
                borderRadius: '5px',
                fontSize: '13px',
                color: '#4F46E5',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E0E7FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EEF2FF';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              Ver Dashboard
            </button>
          )}
        </div>
      </div>
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