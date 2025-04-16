import { Material, Herramienta, Producto } from '../lib/supabase';
import { EyeIcon, TagIcon, ClockIcon, CurrencyDollarIcon, ChartBarIcon, SwatchIcon, ScaleIcon, CalendarIcon, CubeIcon, ShoppingBagIcon, QrCodeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

// Combinar los tipos para poder trabajar con cualquier ítem del inventario
export type InventoryItemType = 
  | (Material & { type: 'material' })
  | (Herramienta & { type: 'herramienta' })
  | (Producto & { type: 'producto' });

// Tipo para mockup de datos adicionales que aún no existen en la tabla Producto
interface ProductoMockupData {
  precio_venta: string;
  categoria: string;
  tiempo_fabricacion: string;
  popularidad: number;
  ultima_venta: string;
  tallas_disponibles: string[];
  materiales_usados: string[];
  margen_ganancia: string;
  tags: string[];
  temporada: string;
}

// Tipo para mockup de datos adicionales que aún no existen en la tabla Material
interface MaterialMockupData {
  proveedor: string;
  precio_unitario: string;
  ultima_compra: string;
  tiempo_entrega: string;
  calidad: string;
  color: string;
  medidas: string;
  usos_comunes: string[];
  caracteristicas_especiales: string[];
}

// Tipo para mockup de datos adicionales que aún no existen en la tabla Herramienta
interface HerramientaMockupData {
  marca: string;
  modelo: string;
  fecha_adquisicion: string;
  fecha_ultimo_mantenimiento: string;
  proxima_revision: string;
  garantia: string;
  ubicacion: string;
  instrucciones: string;
  accesorios: string[];
}

interface InventoryItemProps {
  item: InventoryItemType;
  onViewDetails: (item: InventoryItemType) => void;
}

// Determinar el estado del ítem basado en su tipo y propiedades
function getItemStatus(item: InventoryItemType): { text: string; color: string } {
  // Por defecto asumimos que está normal
  let status = { text: 'Normal', color: '#10B981' };
  
  // Si es una herramienta, el estado viene en el campo 'estado'
  if (item.type === 'herramienta') {
    const herramienta = item as Herramienta & { type: 'herramienta' };
    if (herramienta.estado === 'Excelente' || herramienta.estado === 'Nuevo') {
      return { text: herramienta.estado, color: '#10B981' };
    } else if (herramienta.estado === 'Bueno') {
      return { text: herramienta.estado, color: '#3B82F6' };
    } else if (herramienta.estado === 'Regular') {
      return { text: herramienta.estado, color: '#F59E0B' };
    } else if (herramienta.estado === 'Necesita reparación' || herramienta.estado === 'Fuera de servicio') {
      return { text: herramienta.estado, color: '#EF4444' };
    }
    return status;
  }
  
  // Para productos y materiales, calculamos el estado basado en el stock
  if (item.type === 'material' || item.type === 'producto') {
    const stockItem = item as (Material | Producto) & { type: 'material' | 'producto' };
    
    if (!stockItem.stock || !stockItem.stock_minimo) return status;
    
    const stock = parseInt(stockItem.stock);
    const stockMinimo = parseInt(stockItem.stock_minimo);
    
    if (stock <= 0) {
      status = { text: 'Agotado', color: '#EF4444' };
    } else if (stock <= stockMinimo) {
      status = { text: 'Bajo', color: '#F59E0B' };
    }
  }
  
  return status;
}

// Obtener icono o imagen para el item
function getItemImage(item: InventoryItemType) {
  // Si el item tiene una URL de imagen, usarla
  if ('imagen_url' in item && item.imagen_url) {
    return <img src={item.imagen_url} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />;
  }
  
  // De lo contrario, usar un icono predeterminado basado en el tipo
  const bgColor = item.type === 'material' 
    ? '#FFF7ED' 
    : item.type === 'herramienta' 
      ? '#EEF2FF' 
      : '#ECFDF5';
  
  const textColor = item.type === 'material' 
    ? '#F97316'
    : item.type === 'herramienta'
      ? '#4F46E5'
      : '#10B981';
      
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: bgColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: '16px',
      color: textColor,
      borderRadius: '8px'
    }}>
      {item.type === 'material' && 'M'}
      {item.type === 'herramienta' && 'H'}
      {item.type === 'producto' && 'P'}
    </div>
  );
}

// Obtener la referencia del item
function getItemReference(item: InventoryItemType): string {
  if (item.type === 'material') {
    const material = item as Material & { type: 'material' };
    return material.referencia || '';
  } else if (item.type === 'herramienta') {
    const herramienta = item as Herramienta & { type: 'herramienta' };
    return herramienta.numero_serie || '';
  } else if (item.type === 'producto') {
    // Los productos no tienen un campo de referencia específico, así que generamos uno
    const producto = item as Producto & { type: 'producto' };
    // Verificar si el ID existe y convertirlo a string antes de usar substring
    return producto.id ? `#${String(producto.id).substring(0, 8)}` : '#PROD';
  }
  return '';
}

// Obtener el stock del ítem
function getItemStock(item: InventoryItemType): string {
  if (item.type === 'material' || item.type === 'producto') {
    const stockItem = item as (Material | Producto) & { type: 'material' | 'producto' };
    return stockItem.stock || '0';
  }
  // Las herramientas no tienen stock
  return '1';
}

// Obtener el icono por tipo
function getTypeIcon(type: 'material' | 'herramienta' | 'producto'): string {
  if (type === 'material') return '🧵';
  if (type === 'herramienta') return '🔧';
  return '👞';
}

// Obtener la información adicional del producto (mockup)
function getProductAdditionalInfo(producto: Producto & { type: 'producto' }): ProductoMockupData {
  // Usar datos reales del producto en lugar de simulados
  const categoria = producto.categoria || 'No especificada';
  
  // Usar el precio real
  const precio = producto.precio || '0.00';
  
  // Tiempo de fabricación real
  const tiempoFabricacion = producto.tiempo_fabricacion || 'No especificado';
  
  // Popularidad (por ahora valor por defecto)
  const popularidad = 5;
  
  // Fecha de última venta (por ahora valor por defecto)
  const ultimaVentaStr = 'No registrada';
  
  // Tallas
  const tallas = producto.tallas ? producto.tallas.split(',').map(t => t.trim()) : [];
  
  // Colores
  const colores = producto.colores ? producto.colores.split(',').map(c => c.trim()) : [];
  
  return {
    precio_venta: precio,
    categoria: categoria,
    tiempo_fabricacion: tiempoFabricacion,
    popularidad: popularidad,
    ultima_venta: ultimaVentaStr,
    tallas_disponibles: tallas,
    materiales_usados: [],
    margen_ganancia: 'No especificado',
    tags: [],
    temporada: 'Actual'
  };
}

// Obtener la información adicional del material (mockup)
function getMaterialAdditionalInfo(material: Material & { type: 'material' }): MaterialMockupData {
  // Usar los datos reales del material en lugar de datos simulados
  const proveedor = material.proveedor || 'No especificado';
  
  // Usar el precio real del material
  const precioBase = material.precio ? parseFloat(material.precio) : 10.50;
  const precioUnitario = `$${precioBase.toFixed(2)}`;
  
  // Fecha de última compra
  const ultimaCompra = material.fecha_adquisicion || 'No registrada';
  
  // Usar datos reales para el resto de campos o valores por defecto
  const color = 'Variado';
  const medidas = material.unidades || 'No especificado';
  
  return {
    proveedor: proveedor,
    precio_unitario: precioUnitario,
    ultima_compra: ultimaCompra,
    tiempo_entrega: 'Por definir',
    calidad: 'Estándar',
    color: color,
    medidas: medidas,
    usos_comunes: ['Por definir'],
    caracteristicas_especiales: ['Por definir']
  };
}

// Obtener la información adicional de la herramienta (mockup)
function getHerramientaAdditionalInfo(herramienta: Herramienta & { type: 'herramienta' }): HerramientaMockupData {
  // Usar datos reales de la herramienta
  const marca = 'No especificada';
  const modelo = herramienta.modelo || 'No especificado';
  
  // Fechas reales
  const fechaAdquisicion = herramienta.fecha_adquisicion || 'No registrada';
  const ultimoMantenimiento = herramienta.ultimo_mantenimiento || 'No registrado';
  const proximoMantenimiento = herramienta.proximo_mantenimiento || 'No programado';
  
  // Ubicación real
  const ubicacion = herramienta.ubicacion || 'No especificada';
  
  return {
    marca: marca,
    modelo: modelo,
    fecha_adquisicion: fechaAdquisicion,
    fecha_ultimo_mantenimiento: ultimoMantenimiento,
    proxima_revision: proximoMantenimiento,
    garantia: 'No especificada',
    ubicacion: ubicacion,
    instrucciones: 'No disponibles',
    accesorios: []
  };
}

// Formatear un precio
function formatPrice(price: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return '$0.00';
  return `$${numPrice.toFixed(2)}`;
}

export default function InventoryItem({ item, onViewDetails }: InventoryItemProps) {
  const [showQR, setShowQR] = useState(false);
  const status = getItemStatus(item);
  const reference = getItemReference(item);
  const stock = getItemStock(item);
  const typeIcon = getTypeIcon(item.type);
  
  // Información adicional según el tipo de item
  const productInfo = item.type === 'producto' 
    ? getProductAdditionalInfo(item as Producto & { type: 'producto' }) 
    : null;
    
  const materialInfo = item.type === 'material'
    ? getMaterialAdditionalInfo(item as Material & { type: 'material' })
    : null;
    
  const herramientaInfo = item.type === 'herramienta'
    ? getHerramientaAdditionalInfo(item as Herramienta & { type: 'herramienta' })
    : null;
  
  // Color de fondo según tipo para el icono
  const bgColor = item.type === 'material' 
    ? '#FFF7ED' 
    : item.type === 'herramienta' 
      ? '#EEF2FF' 
      : '#ECFDF5';
  
  // Verificar si el elemento tiene un código QR
  const hasQRCode = item.QR_Code && item.QR_Code.length > 0;

  // Manejador para mostrar el QR
  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasQRCode) {
      setShowQR(!showQR);
    }
  };
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #E5E7EB',
      gap: '14px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      margin: '12px 0',
      fontFamily: "'Poppins', sans-serif",
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = '#D1D5DB';
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
      e.currentTarget.style.backgroundColor = '#FAFAFA';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = '#E5E7EB';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      e.currentTarget.style.backgroundColor = 'white';
    }}
    onClick={() => onViewDetails(item)}
    >
      {/* Sección principal con información básica */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr 80px 120px auto',
        gap: '16px',
        alignItems: 'center',
      }}>
        {/* Icono/Imagen */}
        <div style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '6px',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid #E5E7EB',
          backgroundColor: bgColor,
          position: 'relative'
        }}>
          {getItemImage(item)}
          
          {/* Indicador de QR disponible */}
          {hasQRCode && (
            <div 
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                padding: '2px',
                width: '18px',
                height: '18px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                zIndex: 5,
              }}
              onClick={handleQRClick}
              title="Ver código QR"
            >
              <QrCodeIcon style={{ width: '14px', height: '14px', color: '#4F46E5' }} />
            </div>
          )}
        </div>
        
        {/* Nombre e información adicional */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {item.nombre}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#6B7280',
            fontWeight: 400,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{typeIcon}</span>
            <span>
              {item.type === 'material' && 'Material'}
              {item.type === 'herramienta' && 'Herramienta'}
              {item.type === 'producto' && 'Producto'}
            </span>
            {reference && <span style={{ color: '#9CA3AF', margin: '0 4px' }}>•</span>}
            {reference && <span>{reference}</span>}
          </div>
        </div>
        
        {/* Cantidad */}
        <div style={{ 
          fontSize: '16px',
          fontWeight: 600,
          color: '#111827',
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          padding: '10px 12px',
          border: '1px solid #E5E7EB',
          textAlign: 'center',
        }}>
          {stock}
        </div>
        
        {/* Estado */}
        <div style={{ 
          textAlign: 'center',
        }}>
          <span style={{ 
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '6px',
            backgroundColor: `${status.color}15`,
            color: status.color,
            border: `1px solid ${status.color}40`,
            letterSpacing: '0.2px',
            display: 'inline-block',
            width: '100%',
          }}>
            {status.text}
          </span>
        </div>
        
        {/* Botón de detalle */}
        <button style={{
          backgroundColor: '#F3F4F6',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          padding: '10px 18px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#4F46E5',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          height: '42px',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = '#EEF2FF';
          e.currentTarget.style.borderColor = '#818CF8';
          e.currentTarget.style.color = '#4338CA';
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = '#F3F4F6';
          e.currentTarget.style.borderColor = '#E5E7EB';
          e.currentTarget.style.color = '#4F46E5';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails(item);
        }}
        >
          <EyeIcon style={{ width: '18px', height: '18px' }} />
          Ver Detalles
        </button>
      </div>
      
      {/* Sección expandida del QR */}
      {showQR && hasQRCode && (
        <div 
          style={{
            borderTop: '1px solid #E5E7EB',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            position: 'relative',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            margin: '0 -8px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
            }}
            onClick={handleQRClick}
          >
            <XMarkIcon style={{ width: '20px', height: '20px', color: '#6B7280' }} />
          </button>
          
          <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Código QR de {item.nombre}
          </h3>
          
          <div 
            style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              width: '100%',
              alignItems: 'center',
            }}
          >
            <div style={{ 
              padding: '15px', 
              border: '1px solid #E5E7EB', 
              borderRadius: '8px',
              backgroundColor: 'white',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <img 
                src={item.QR_Code} 
                alt={`QR de ${item.nombre}`} 
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px',
                  width: '100%',
                  height: 'auto',
                }} 
              />
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '10px',
            }}>
              <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <strong>Referencia:</strong> {reference}
              </p>
              <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <strong>Tipo:</strong> {item.type === 'material' ? 'Material' : item.type === 'herramienta' ? 'Herramienta' : 'Producto'}
              </p>
              {item.type === 'producto' && (
                <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                  <strong>Precio:</strong> {productInfo?.precio_venta ? formatPrice(productInfo.precio_venta) : 'No disponible'}
                </p>
              )}
              {item.type === 'material' && (
                <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                  <strong>Proveedor:</strong> {materialInfo?.proveedor || 'No disponible'}
                </p>
              )}
              {item.type === 'herramienta' && (
                <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                  <strong>Ubicación:</strong> {herramientaInfo?.ubicacion || 'No disponible'}
                </p>
              )}
            </div>
          </div>
          
          <p style={{ marginTop: '15px', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>
            Escanea este código para acceder a información detallada
          </p>
        </div>
      )}
      
      {/* Información adicional para productos */}
      {item.type === 'producto' && productInfo && (
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px',
          fontSize: '13px',
        }}>
          {/* Código QR */}
          {hasQRCode && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EEF2FF',
                padding: '9px 12px',
                borderRadius: '6px',
                color: '#4F46E5',
                cursor: 'pointer',
                height: '40px',
              }}
              onClick={handleQRClick}
              title="Ver código QR"
            >
              <QrCodeIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{showQR ? 'Ocultar QR' : 'QR disponible'}</span>
            </div>
          )}
          
          {/* Precio */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEF3C7',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#D97706',
            height: '40px',
          }}>
            <CurrencyDollarIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Precio: {formatPrice(productInfo.precio_venta)}</span>
          </div>
          
          {/* Categoría */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#EFF6FF',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#3B82F6',
            height: '40px',
          }}>
            <TagIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{productInfo.categoria}</span>
          </div>
          
          {/* Tiempo de fabricación */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F0FDF4',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#10B981',
            height: '40px',
          }}>
            <ClockIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Tiempo: {productInfo.tiempo_fabricacion}</span>
          </div>
          
          {/* Popularidad */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEFCE8',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#CA8A04',
            height: '40px',
          }}>
            <ChartBarIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Popularidad: {productInfo.popularidad}/10</span>
          </div>
          
          {/* Margen */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#EDE9FE',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#8B5CF6',
            height: '40px',
          }}>
            <span>Margen: {productInfo.margen_ganancia}</span>
          </div>
          
          {/* Temporada */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FCE7F3',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#DB2777',
            height: '40px',
          }}>
            <span>Temporada: {productInfo.temporada}</span>
          </div>
          
          {/* Tallas */}
          {productInfo?.tallas_disponibles?.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F3F4F6',
              padding: '9px 12px',
              borderRadius: '6px',
              color: '#4B5563',
              height: '40px',
            }}>
              <SwatchIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>Tallas: {productInfo.tallas_disponibles.join(', ')}</span>
            </div>
          )}
          
          {/* Fecha última venta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F3F4F6',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#4B5563',
            height: '40px',
          }}>
            <span>Última venta: {productInfo?.ultima_venta}</span>
          </div>
        </div>
      )}
      
      {/* Información adicional para materiales */}
      {item.type === 'material' && materialInfo && (
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px',
          fontSize: '13px',
        }}>
          {/* Código QR */}
          {hasQRCode && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EEF2FF',
                padding: '9px 12px',
                borderRadius: '6px',
                color: '#4F46E5',
                cursor: 'pointer',
                height: '40px',
              }}
              onClick={handleQRClick}
              title="Ver código QR"
            >
              <QrCodeIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{showQR ? 'Ocultar QR' : 'QR disponible'}</span>
            </div>
          )}
          
          {/* Proveedor */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F0FDF4',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#10B981',
            height: '40px',
          }}>
            <ShoppingBagIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Proveedor: {materialInfo.proveedor}</span>
          </div>
          
          {/* Precio unitario */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEF3C7',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#D97706',
            height: '40px',
          }}>
            <CurrencyDollarIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Precio: {materialInfo.precio_unitario}</span>
          </div>
          
          {/* Calidad */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#EDE9FE',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#8B5CF6',
            height: '40px',
          }}>
            <TagIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Calidad: {materialInfo.calidad}</span>
          </div>
          
          {/* Color */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#EFF6FF',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#3B82F6',
            height: '40px',
          }}>
            <SwatchIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Color: {materialInfo.color}</span>
          </div>
          
          {/* Medidas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F3F4F6',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#4B5563',
            height: '40px',
          }}>
            <ScaleIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Medidas: {materialInfo.medidas}</span>
          </div>
          
          {/* Tiempo de entrega */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FCE7F3',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#DB2777',
            height: '40px',
          }}>
            <ClockIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Entrega: {materialInfo.tiempo_entrega}</span>
          </div>
          
          {/* Última compra */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEFCE8',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#CA8A04',
            height: '40px',
          }}>
            <CalendarIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Última compra: {materialInfo.ultima_compra}</span>
          </div>
        </div>
      )}
      
      {/* Información adicional para herramientas */}
      {item.type === 'herramienta' && herramientaInfo && (
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px',
          fontSize: '13px',
        }}>
          {/* Código QR */}
          {hasQRCode && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EEF2FF',
                padding: '9px 12px',
                borderRadius: '6px',
                color: '#4F46E5',
                cursor: 'pointer',
                height: '40px',
              }}
              onClick={handleQRClick}
              title="Ver código QR"
            >
              <QrCodeIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{showQR ? 'Ocultar QR' : 'QR disponible'}</span>
            </div>
          )}
          
          {/* Marca y modelo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#EFF6FF',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#3B82F6',
            height: '40px',
          }}>
            <TagIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{herramientaInfo.marca} {herramientaInfo.modelo}</span>
          </div>
          
          {/* Ubicación */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F0FDF4',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#10B981',
            height: '40px',
          }}>
            <CubeIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Ubicación: {herramientaInfo.ubicacion}</span>
          </div>
          
          {/* Garantía */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#EDE9FE',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#8B5CF6',
            height: '40px',
          }}>
            <span>Garantía: {herramientaInfo.garantia}</span>
          </div>
          
          {/* Fecha adquisición */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEFCE8',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#CA8A04',
            height: '40px',
          }}>
            <CalendarIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Adquirido: {herramientaInfo.fecha_adquisicion}</span>
          </div>
          
          {/* Último mantenimiento */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FCE7F3',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#DB2777',
            height: '40px',
          }}>
            <span>Último mant.: {herramientaInfo.fecha_ultimo_mantenimiento}</span>
          </div>
          
          {/* Próxima revisión */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEF3C7',
            padding: '9px 12px',
            borderRadius: '6px',
            color: '#D97706',
            height: '40px',
          }}>
            <ClockIcon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>Próx. revisión: {herramientaInfo.proxima_revision}</span>
          </div>
          
          {/* Accesorios */}
          {herramientaInfo.accesorios.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F3F4F6',
              padding: '9px 12px',
              borderRadius: '6px',
              color: '#4B5563',
              height: '40px',
            }}>
              <span>Accesorios: {herramientaInfo.accesorios.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 