import { useState, useCallback } from 'react';
import { EyeIcon, ChartBarIcon, PhoneIcon, EnvelopeIcon, CalendarDaysIcon, UserIcon } from '@heroicons/react/24/outline';

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
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Obtener una imagen de avatar con las iniciales del trabajador
  const getInitialAvatar = useCallback(() => {
    const initials = `${trabajador.nombre.charAt(0)}${trabajador.apellido.charAt(0)}`;
    // Usar un gradiente más elegante basado en el nombre
    const colors = [
      ['667eea', '764ba2'], // Azul a púrpura
      ['f093fb', 'f5576c'], // Rosa a rojo
      ['4facfe', '00f2fe'], // Azul claro a cian
      ['43e97b', '38f9d7'], // Verde a turquesa
      ['fa709a', 'fee140'], // Rosa a amarillo
      ['a8edea', 'fed6e3'], // Menta a rosa claro
      ['ff9a9e', 'fecfef'], // Coral a lavanda
      ['ffecd2', 'fcb69f']  // Durazno a naranja suave
    ];
    
    const hash = trabajador.nombre.charCodeAt(0) + trabajador.apellido.charCodeAt(0);
    const colorPair = colors[hash % colors.length];
    
    return `https://ui-avatars.com/api/?name=${initials}&background=${colorPair[0]}&color=ffffff&size=80&bold=true&format=svg`;
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
        return { 
          label: 'Producción', 
          color: '#10B981', 
          bgColor: '#ECFDF5', 
          borderColor: '#A7F3D0',
          icon: '🛠️' 
        };
      case 'ventas':
        return { 
          label: 'Ventas', 
          color: '#F59E0B', 
          bgColor: '#FFFBEB', 
          borderColor: '#FDE68A',
          icon: '💼' 
        };
      case 'administrativo':
        return { 
          label: 'Administrativo', 
          color: '#3B82F6', 
          bgColor: '#EFF6FF', 
          borderColor: '#BFDBFE',
          icon: '📊' 
        };
      default:
        return { 
          label: 'No asignado', 
          color: '#6B7280', 
          bgColor: '#F9FAFB', 
          borderColor: '#E5E7EB',
          icon: '❓' 
        };
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
  
  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(trabajador);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent expanding/toggling selection if clicking action buttons or the checkbox itself
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
    setIsExpanded(!isExpanded);
  };
  
  // Handler specifically for checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectChange(trabajador.id, e.target.checked);
  };

  // Manejador para el botón de dashboard
  const handleViewDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDashboard) {
      onViewDashboard(trabajador);
    }
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  
  return (
    <div 
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: isSelected 
          ? '#FAFBFC' 
          : '#FFFFFF',
        borderRadius: '8px',
        border: isSelected 
          ? '1px solid #CBD5E1' 
          : isHovered 
            ? '1px solid #CBD5E1' 
            : '1px solid #E2E8F0',
        padding: '20px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Contenido principal */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
      }}>
        {/* Checkbox con estilo mejorado */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          position: 'relative'
        }}>
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            style={{ 
              width: '16px', 
              height: '16px',
              cursor: 'pointer',
              accentColor: '#64748B',
            }}
          />
        </div>
        
        {/* Avatar minimalista */}
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid #E2E8F0',
          position: 'relative',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          <img 
            src={getInitialAvatar()} 
            alt={`${trabajador.nombre} ${trabajador.apellido}`} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
            }}
          />
        </div>
        
        {/* Información principal rediseñada */}
        <div style={{ 
          flex: 1, 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Nombre y título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              margin: 0,
              color: '#1E293B',
              letterSpacing: '-0.01em',
              lineHeight: '1.3'
            }}>
              {trabajador.nombre} {trabajador.apellido}
            </h3>
            
            {/* Badge de tipo minimalista */}
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: tipoInfo.bgColor,
              color: tipoInfo.color,
              border: `1px solid ${tipoInfo.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em'
            }}>
              <span>{tipoInfo.icon}</span>
              {tipoInfo.label}
            </span>
          </div>
          
          {/* Meta información */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: '#64748B'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <UserIcon style={{ width: '12px', height: '12px' }} />
              CI: {trabajador.cedula}
            </span>
            
            {areaInfo && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{areaInfo.icon}</span> 
                {areaInfo.label}
              </span>
            )}
            
            {trabajador.fecha_contratacion && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarDaysIcon style={{ width: '12px', height: '12px' }} />
                {fechaFormateada}
              </span>
            )}
          </div>
        </div>
        
        {/* Información del salario minimalista */}
        {trabajador.salario && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1E293B',
              letterSpacing: '-0.01em'
            }}>
              ${trabajador.salario.toLocaleString('es-ES')}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#64748B',
              fontWeight: 400
            }}>
              mensual
            </div>
          </div>
        )}
        
        {/* Botones de acción minimalistas */}
        <div style={{ 
          display: 'flex',
          gap: '6px',
          alignItems: 'center'
        }}>
          <button
            onClick={handleViewDetails}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              color: '#64748B'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
            title="Ver detalles"
          >
            <EyeIcon style={{ width: '16px', height: '16px' }} />
          </button>
          
          {/* Botón Dashboard para trabajadores de producción */}
          {trabajador.tipo === 'produccion' && onViewDashboard && (
            <button
              onClick={handleViewDashboard}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: '#64748B'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
              title="Ver dashboard de rendimiento"
            >
              <ChartBarIcon style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>
      
      {/* Información expandida minimalista */}
      <div style={{ 
        maxHeight: isExpanded ? '400px' : '0',
        opacity: isExpanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginTop: isExpanded ? '16px' : '0',
      }}>
        {/* Línea divisoria minimalista */}
        <div style={{
          height: '1px',
          backgroundColor: '#E2E8F0',
          marginBottom: '16px'
        }} />
        
        {/* Grid de información detallada */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {trabajador.correo && (
            <DetailItem 
              icon={<EnvelopeIcon style={{ width: '14px', height: '14px' }} />}
              label="Correo electrónico" 
              value={trabajador.correo} 
            />
          )}
          {trabajador.telefono && (
            <DetailItem 
              icon={<PhoneIcon style={{ width: '14px', height: '14px' }} />}
              label="Teléfono" 
              value={trabajador.telefono} 
            />
          )}
          {trabajador.especialidad && (
            <DetailItem 
              icon={<span style={{ fontSize: '14px' }}>🎯</span>}
              label="Especialidad" 
              value={trabajador.especialidad} 
            />
          )}
          {trabajador.tipo_contrato && (
            <DetailItem 
              icon={<span style={{ fontSize: '14px' }}>📋</span>}
              label="Tipo de contrato" 
              value={trabajador.tipo_contrato.charAt(0).toUpperCase() + trabajador.tipo_contrato.slice(1)} 
            />
          )}
          {trabajador.horas_trabajo && (
            <DetailItem 
              icon={<span style={{ fontSize: '14px' }}>⏰</span>}
              label="Horas de trabajo" 
              value={`${trabajador.horas_trabajo}h/semana`} 
            />
          )}
          {trabajador.fecha_nacimiento && (
            <DetailItem 
              icon={<span style={{ fontSize: '14px' }}>🎂</span>}
              label="Fecha de nacimiento" 
              value={new Date(trabajador.fecha_nacimiento).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })} 
            />
          )}
        </div>
        
        {/* Dirección si existe */}
        {trabajador.direccion && (
          <div style={{
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '6px',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px'
            }}>
              <span style={{ fontSize: '14px' }}>📍</span>
              <span style={{ 
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.025em'
              }}>
                Dirección
              </span>
            </div>
            <span style={{ 
              color: '#1E293B',
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              {trabajador.direccion}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para mostrar detalles con iconos
function DetailItem({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode;
  label: string; 
  value: string; 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{ color: '#64748B' }}>{icon}</span>
        <span style={{ 
          color: '#64748B', 
          fontSize: '11px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.025em'
        }}>
          {label}
        </span>
      </div>
      <span style={{ 
        color: '#1E293B',
        fontSize: '13px',
        fontWeight: 400,
        paddingLeft: '18px'
      }}>
        {value}
      </span>
    </div>
  );
}

export default TrabajadorItem; 