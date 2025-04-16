import { Cliente } from '../lib/supabase';
import { EyeIcon, UserIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, ClockIcon, CurrencyDollarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export type ClienteItemType = Cliente & { 
  type: 'cliente';
  imagen_url?: string;
};

interface ClienteItemProps {
  cliente: ClienteItemType;
  onViewDetails: (cliente: ClienteItemType) => void;
}

function getClienteImage(cliente: ClienteItemType) {
  // Si el cliente tiene una URL de imagen, usarla
  if (cliente.imagen_url) {
    return <img src={cliente.imagen_url} alt={cliente.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />;
  }
  
  // Si es una compañía, mostrar un ícono diferente
  if (cliente.tipo_cliente === 'compania') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#F0FDF4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px'
      }}>
        <BuildingOfficeIcon style={{ width: '30px', height: '30px', color: '#16A34A' }} />
      </div>
    );
  }
  
  // Para personas, mostrar sus iniciales
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#EFF6FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: '16px',
      color: '#3B82F6',
      borderRadius: '8px'
    }}>
      {cliente.nombre?.charAt(0).toUpperCase() || ''}
      {cliente.apellidos ? cliente.apellidos.charAt(0).toUpperCase() : ''}
    </div>
  );
}

// Formatear fecha para mostrar
function formatDate(dateString: string): string {
  if (!dateString) return 'No disponible';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

// Formatear precio para mostrar
function formatPrice(price: string | undefined): string {
  if (!price) return '€0.00';
  return `€${parseFloat(price).toFixed(2)}`;
}

export default function ClienteItem({ cliente, onViewDetails }: ClienteItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  
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
  
  const handleViewDetails = () => {
    setDetailsVisible(!detailsVisible);
    onViewDetails(cliente);
  };
  
  return (
    <div 
      className="cliente-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: 'none',
        border: '1px solid #E5E7EB',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        overflow: 'hidden',
        cursor: 'pointer',
        marginBottom: '16px',
        width: '100%',
        maxWidth: '100%',
        borderLeft: isCompania ? '4px solid #16A34A' : '4px solid #3B82F6'
      }}
      onClick={handleViewDetails}
    >
      {/* Imagen o Avatar */}
      <div style={{ 
        width: '60px', 
        height: '60px', 
        margin: '16px',
        flexShrink: 0
      }}>
        {getClienteImage(cliente)}
      </div>
      
      {/* Información principal */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        flexGrow: 1,
        padding: '16px 16px 16px 0'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: '#111827',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {displayName}
          {isCompania && (
            <span style={{ 
              fontSize: '12px',
              backgroundColor: '#F0FDF4', 
              color: '#16A34A',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '8px'
            }}>
              Compañía
            </span>
          )}
        </div>
        
        {secondaryInfo && (
          <div style={{ 
            fontSize: '14px', 
            color: '#4B5563',
            marginBottom: '6px'
          }}>
            {secondaryInfo}
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '14px',
          color: '#6B7280',
          fontWeight: 400
        }}>
          {emailToShow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <EnvelopeIcon style={{ width: '16px', height: '16px' }} />
              <span>{emailToShow}</span>
            </div>
          )}
          
          {phoneToShow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PhoneIcon style={{ width: '16px', height: '16px' }} />
              <span>{phoneToShow}</span>
            </div>
          )}
          
          {ubicacion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPinIcon style={{ width: '16px', height: '16px' }} />
              <span>{ubicacion}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Información adicional */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '16px',
        padding: '16px',
        flexShrink: 0,
        color: '#4B5563'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ClockIcon style={{ width: '20px', height: '20px', marginBottom: '4px' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>{fechaRegistroFormateada}</div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            <EyeIcon style={{ width: '20px', height: '20px', color: '#6B7280' }} />
          </button>
        </div>
      </div>
    </div>
  );
} 