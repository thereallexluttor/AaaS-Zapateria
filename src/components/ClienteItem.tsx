import { Cliente } from '../lib/supabase';
import { UserIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, ClockIcon, CurrencyDollarIcon, BuildingOfficeIcon, ChartBarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export type ClienteItemType = Cliente & { 
  type: 'cliente';
  imagen_url?: string;
};

interface ClienteItemProps {
  cliente: ClienteItemType;
  onViewDetails: (cliente: ClienteItemType) => void;
  isSelected?: boolean;
  onSelect?: (cliente: ClienteItemType, selected: boolean) => void;
  onViewEstadisticas?: (cliente: ClienteItemType) => void;
}

function getClienteImage(cliente: ClienteItemType) {
  // Crear iniciales del cliente
  const initials = cliente.tipo_cliente === 'compania' 
    ? (cliente.nombre_compania?.charAt(0).toUpperCase() || 'C')
    : `${cliente.nombre?.charAt(0).toUpperCase() || ''}${cliente.apellidos?.charAt(0).toUpperCase() || ''}`;
  
  // Colores basados en el tipo de cliente
  const colors = cliente.tipo_cliente === 'compania' 
    ? ['10B981', '059669'] // Verde para compañías
    : ['3B82F6', '2563EB']; // Azul para personas
  
  return `https://ui-avatars.com/api/?name=${initials}&background=${colors[0]}&color=ffffff&size=80&bold=true&format=svg`;
}

// Formatear fecha para mostrar
function formatDate(dateString: string): string {
  if (!dateString) return 'No disponible';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

export default function ClienteItem({ cliente, onViewDetails, isSelected = false, onSelect, onViewEstadisticas }: ClienteItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determinar si es persona o compañía
  const isCompania = cliente.tipo_cliente === 'compania';
  
  // Datos formatados según tipo de cliente
  const displayName = isCompania 
    ? cliente.nombre_compania 
    : `${cliente.nombre || ''} ${cliente.apellidos || ''}`.trim();
  
  const secondaryInfo = isCompania && cliente.contacto_nombre 
    ? `Contacto: ${cliente.contacto_nombre}` 
    : '';
  
  const ubicacion = `${cliente.ciudad || ''}${cliente.codigo_postal ? `, ${cliente.codigo_postal}` : ''}`;
  const fechaRegistroFormateada = formatDate(cliente.fecha_registro || '');
  
  // Determinar qué email y teléfono mostrar (del cliente o del contacto)
  const emailToShow = isCompania 
    ? (cliente.contacto_email || cliente.email)
    : cliente.email;
    
  const phoneToShow = isCompania
    ? (cliente.contacto_telefono || cliente.telefono)
    : cliente.telefono;

  // Información del tipo de cliente
  const getTipoInfo = () => {
    if (isCompania) {
      return { 
        label: 'Compañía', 
        color: '#10B981', 
        bgColor: '#ECFDF5', 
        borderColor: '#A7F3D0',
        icon: '🏢' 
      };
    } else {
      return { 
        label: 'Personal', 
        color: '#3B82F6', 
        bgColor: '#EFF6FF', 
        borderColor: '#BFDBFE',
        icon: '👤' 
      };
    }
  };

  const tipoInfo = getTipoInfo();
  
  const handleViewEstadisticas = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewEstadisticas) {
      onViewEstadisticas(cliente);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent expanding if clicking action buttons or checkbox
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
    setIsExpanded(!isExpanded);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(cliente, e.target.checked);
    }
  };
  
  return (
    <div 
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isSelected ? '#FAFBFC' : '#FFFFFF',
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
        {/* Checkbox */}
        {onSelect && (
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
        )}
        
        {/* Avatar */}
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid #E2E8F0',
          position: 'relative'
        }}>
          <img 
            src={getClienteImage(cliente)} 
            alt={displayName} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
            }}
          />
        </div>
        
        {/* Información principal */}
        <div style={{ 
          flex: 1, 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Nombre y badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              margin: 0,
              color: '#1E293B',
              letterSpacing: '-0.01em',
              lineHeight: '1.3'
            }}>
              {displayName}
            </h3>
            
            {/* Badge de tipo */}
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
          
          {/* Información secundaria */}
          {secondaryInfo && (
            <div style={{ 
              fontSize: '13px', 
              color: '#64748B',
              fontWeight: 500
            }}>
              {secondaryInfo}
            </div>
          )}
          
          {/* Meta información */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: '#64748B'
          }}>
            {emailToShow && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <EnvelopeIcon style={{ width: '12px', height: '12px' }} />
                {emailToShow}
              </span>
            )}
            
            {phoneToShow && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PhoneIcon style={{ width: '12px', height: '12px' }} />
                {phoneToShow}
              </span>
            )}
            
            {ubicacion && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPinIcon style={{ width: '12px', height: '12px' }} />
                {ubicacion}
              </span>
            )}
            
            {cliente.fecha_registro && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarDaysIcon style={{ width: '12px', height: '12px' }} />
                {fechaRegistroFormateada}
              </span>
            )}
          </div>
        </div>
        
        {/* Botones de acción */}
        <div style={{ 
          display: 'flex',
          gap: '6px',
          alignItems: 'center'
        }}>
          {onViewEstadisticas && (
            <button
              onClick={handleViewEstadisticas}
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
              title="Ver estadísticas"
            >
              <ChartBarIcon style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>
      
      {/* Información expandida */}
      <div style={{ 
        maxHeight: isExpanded ? '400px' : '0',
        opacity: isExpanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginTop: isExpanded ? '16px' : '0',
      }}>
        {/* Línea divisoria */}
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
          {isCompania ? (
            <>
              {cliente.nombre_compania && (
                <DetailItem 
                  icon={<BuildingOfficeIcon style={{ width: '14px', height: '14px' }} />}
                  label="Nombre de la empresa" 
                  value={cliente.nombre_compania} 
                />
              )}
              {cliente.contacto_nombre && (
                <DetailItem 
                  icon={<UserIcon style={{ width: '14px', height: '14px' }} />}
                  label="Persona de contacto" 
                  value={cliente.contacto_nombre} 
                />
              )}
              {cliente.contacto_email && (
                <DetailItem 
                  icon={<EnvelopeIcon style={{ width: '14px', height: '14px' }} />}
                  label="Email de contacto" 
                  value={cliente.contacto_email} 
                />
              )}
              {cliente.contacto_telefono && (
                <DetailItem 
                  icon={<PhoneIcon style={{ width: '14px', height: '14px' }} />}
                  label="Teléfono de contacto" 
                  value={cliente.contacto_telefono} 
                />
              )}
              {cliente.contacto_cargo && (
                <DetailItem 
                  icon={<span style={{ fontSize: '14px' }}>💼</span>}
                  label="Cargo del contacto" 
                  value={cliente.contacto_cargo} 
                />
              )}
            </>
          ) : (
            <>
              {cliente.apellidos && (
                <DetailItem 
                  icon={<UserIcon style={{ width: '14px', height: '14px' }} />}
                  label="Apellidos" 
                  value={cliente.apellidos} 
                />
              )}
              {cliente.email && (
                <DetailItem 
                  icon={<EnvelopeIcon style={{ width: '14px', height: '14px' }} />}
                  label="Email personal" 
                  value={cliente.email} 
                />
              )}
            </>
          )}
          
          {cliente.telefono && (
            <DetailItem 
              icon={<PhoneIcon style={{ width: '14px', height: '14px' }} />}
              label="Teléfono" 
              value={cliente.telefono} 
            />
          )}
          
          {cliente.notas && (
            <DetailItem 
              icon={<span style={{ fontSize: '14px' }}>📝</span>}
              label="Notas" 
              value={cliente.notas} 
            />
          )}
          
          {cliente.codigo_postal && (
            <DetailItem 
              icon={<span style={{ fontSize: '14px' }}>📮</span>}
              label="Código postal" 
              value={cliente.codigo_postal} 
            />
          )}
        </div>
        
        {/* Dirección completa si existe */}
        {cliente.direccion && (
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
                Dirección completa
              </span>
            </div>
            <span style={{ 
              color: '#1E293B',
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              {cliente.direccion}
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