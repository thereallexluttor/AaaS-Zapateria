import { Material, Herramienta, Producto } from '../lib/supabase';
import { EyeIcon, TagIcon, ClockIcon, CurrencyDollarIcon, ChartBarIcon, SwatchIcon, ScaleIcon, CalendarIcon, CubeIcon, ShoppingBagIcon, QrCodeIcon } from '@heroicons/react/24/outline';

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
  // Mockup de datos que aún no existen en la tabla Producto
  // Estos datos son ficticios y serán reemplazados cuando se agreguen a la tabla
  
  // Generar categoría basada en el nombre para el mockup
  let categoria = 'Calzado casual';
  if (producto.nombre.toLowerCase().includes('bota')) {
    categoria = 'Botas';
  } else if (producto.nombre.toLowerCase().includes('sandalia')) {
    categoria = 'Sandalias';
  } else if (producto.nombre.toLowerCase().includes('deportivo')) {
    categoria = 'Deportivo';
  }
  
  // Mockup de precio basado en el id
  const precioBase = 29.99;
  const id = producto.id ? parseInt(String(producto.id).substring(0, 5), 16) : 0;
  const precio = (precioBase + (id % 70)).toFixed(2);
  
  // Popularidad basada en el stock (si hay poco stock podría ser popular)
  const stock = producto.stock ? parseInt(producto.stock) : 0;
  const popularidad = Math.max(1, Math.min(10, 10 - Math.floor(stock / 10)));
  
  // Fecha de la última venta formateada
  const ultimaVentaDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
  const ultimaVentaStr = ultimaVentaDate.toLocaleDateString();
  
  return {
    precio_venta: precio,
    categoria: categoria,
    tiempo_fabricacion: `${Math.floor(Math.random() * 24) + 1} horas`,
    popularidad: popularidad,
    ultima_venta: ultimaVentaStr,
    tallas_disponibles: ['36', '37', '38', '39', '40', '41', '42'],
    materiales_usados: ['Cuero', 'Goma', 'Textil'],
    margen_ganancia: `${Math.floor(Math.random() * 30) + 20}%`,
    tags: ['Nuevo', 'Temporada', 'Oferta'],
    temporada: Math.random() > 0.5 ? 'Verano' : 'Invierno'
  };
}

// Obtener la información adicional del material (mockup)
function getMaterialAdditionalInfo(material: Material & { type: 'material' }): MaterialMockupData {
  // Mockup de datos que aún no existen en la tabla Material
  
  // Proveedores ficticios
  const proveedores = ['CueroFino S.A.', 'TextilesMax', 'MaterialesPremium', 'InsumosPro', 'ImportadoraGlobal'];
  const proveedor = proveedores[Math.floor(Math.random() * proveedores.length)];
  
  // Precio unitario basado en el nombre
  let precioBase = 10.50;
  if (material.nombre.toLowerCase().includes('cuero')) {
    precioBase = 45.75;
  } else if (material.nombre.toLowerCase().includes('tela')) {
    precioBase = 15.25;
  } else if (material.nombre.toLowerCase().includes('goma')) {
    precioBase = 20.30;
  }
  
  // Fecha de última compra
  const ultimaCompraDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
  const ultimaCompraStr = ultimaCompraDate.toLocaleDateString();
  
  // Características especiales basadas en el nombre
  let caracteristicas = ['Flexible', 'Duradero'];
  if (material.nombre.toLowerCase().includes('cuero')) {
    caracteristicas = ['Resistente al agua', 'Alta durabilidad', 'Premium'];
  } else if (material.nombre.toLowerCase().includes('tela')) {
    caracteristicas = ['Transpirable', 'Ligero', 'Fácil mantenimiento'];
  } else if (material.nombre.toLowerCase().includes('goma')) {
    caracteristicas = ['Antideslizante', 'Resistente al desgaste'];
  }
  
  // Colores basados en el nombre
  let color = 'Variado';
  if (material.nombre.toLowerCase().includes('negro')) {
    color = 'Negro';
  } else if (material.nombre.toLowerCase().includes('marron') || material.nombre.toLowerCase().includes('marrón')) {
    color = 'Marrón';
  } else if (material.nombre.toLowerCase().includes('rojo')) {
    color = 'Rojo';
  }
  
  return {
    proveedor: proveedor,
    precio_unitario: `$${precioBase.toFixed(2)}`,
    ultima_compra: ultimaCompraStr,
    tiempo_entrega: `${Math.floor(Math.random() * 14) + 3} días`,
    calidad: ['Estándar', 'Premium', 'Económica'][Math.floor(Math.random() * 3)],
    color: color,
    medidas: `${Math.floor(Math.random() * 100) + 50}cm x ${Math.floor(Math.random() * 50) + 20}cm`,
    usos_comunes: ['Calzado casual', 'Botas', 'Sandalias'],
    caracteristicas_especiales: caracteristicas
  };
}

// Obtener la información adicional de la herramienta (mockup)
function getHerramientaAdditionalInfo(herramienta: Herramienta & { type: 'herramienta' }): HerramientaMockupData {
  // Mockup de datos que aún no existen en la tabla Herramienta
  
  // Marcas ficticias
  const marcas = ['ToolsMaster', 'ProCraft', 'IndustrialTech', 'CraftPro', 'ShoeEquip'];
  const marca = marcas[Math.floor(Math.random() * marcas.length)];
  
  // Modelo basado en el nombre
  const modelo = `${herramienta.nombre.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  
  // Fechas aleatorias
  const fechaAdquisicion = new Date(Date.now() - Math.floor(Math.random() * 365 * 2) * 24 * 60 * 60 * 1000);
  const fechaAdquisicionStr = fechaAdquisicion.toLocaleDateString();
  
  const fechaUltimoMantenimiento = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
  const fechaUltimoMantenimientoStr = fechaUltimoMantenimiento.toLocaleDateString();
  
  const proximaRevision = new Date(Date.now() + Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
  const proximaRevisionStr = proximaRevision.toLocaleDateString();
  
  // Ubicaciones ficticias
  const ubicaciones = ['Taller principal', 'Armario herramientas', 'Cajón A', 'Cajón B', 'Estante superior'];
  const ubicacion = ubicaciones[Math.floor(Math.random() * ubicaciones.length)];
  
  // Accesorios basados en el nombre
  let accesorios = ['Manual de uso'];
  if (herramienta.nombre.toLowerCase().includes('máquina') || herramienta.nombre.toLowerCase().includes('maquina')) {
    accesorios = ['Repuestos básicos', 'Cable de alimentación', 'Manual de mantenimiento'];
  } else if (herramienta.nombre.toLowerCase().includes('martillo')) {
    accesorios = ['Cabezal de repuesto', 'Estuche'];
  }
  
  return {
    marca: marca,
    modelo: modelo,
    fecha_adquisicion: fechaAdquisicionStr,
    fecha_ultimo_mantenimiento: fechaUltimoMantenimientoStr,
    proxima_revision: proximaRevisionStr,
    garantia: `${Math.floor(Math.random() * 24) + 12} meses`,
    ubicacion: ubicacion,
    instrucciones: 'Ver manual adjunto',
    accesorios: accesorios
  };
}

// Formatear un precio
function formatPrice(price: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return '$0.00';
  return `$${numPrice.toFixed(2)}`;
}

export default function InventoryItem({ item, onViewDetails }: InventoryItemProps) {
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
  const hasQRCode = item.qr_code && item.qr_code.length > 0;
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '6px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #E5E7EB',
      gap: '12px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      margin: '10px 0',
      fontFamily: "'Poppins', sans-serif",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = '#D1D5DB';
      e.currentTarget.style.backgroundColor = '#FAFAFA';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = '#E5E7EB';
      e.currentTarget.style.backgroundColor = 'white';
    }}
    onClick={() => onViewDetails(item)}
    >
      {/* Sección principal con información básica */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
      }}>
        {/* Icono/Imagen */}
        <div style={{ 
          width: '52px', 
          height: '52px', 
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
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '50%',
              padding: '2px',
              width: '16px',
              height: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <QrCodeIcon style={{ width: '12px', height: '12px', color: '#4F46E5' }} />
            </div>
          )}
        </div>
        
        {/* Nombre e información adicional */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#111827',
            marginBottom: '7px',
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
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 600,
          color: '#111827',
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          padding: '9px 14px',
          minWidth: '60px',
          border: '1px solid #E5E7EB',
        }}>
          {stock}
        </div>
        
        {/* Estado */}
        <div style={{ 
          textAlign: 'center',
          minWidth: '120px'
        }}>
          <span style={{ 
            fontSize: '13px',
            fontWeight: 600,
            padding: '7px 14px',
            borderRadius: '30px',
            backgroundColor: `${status.color}15`,
            color: status.color,
            border: `1px solid ${status.color}40`,
            letterSpacing: '0.2px'
          }}>
            {status.text}
          </span>
        </div>
        
        {/* Botón de detalle */}
        <button style={{
          backgroundColor: '#F9FAFB',
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
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = '#EEF2FF';
          e.currentTarget.style.borderColor = '#818CF8';
          e.currentTarget.style.color = '#4338CA';
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = '#F9FAFB';
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
      
      {/* Información adicional para productos */}
      {item.type === 'producto' && productInfo && (
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '13px',
        }}>
          {/* Código QR */}
          {hasQRCode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#EEF2FF',
              padding: '6px 10px',
              borderRadius: '4px',
              color: '#4F46E5',
            }}>
              <QrCodeIcon style={{ width: '16px', height: '16px' }} />
              <span>QR disponible</span>
            </div>
          )}
          
          {/* Precio */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEF3C7',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#D97706',
          }}>
            <CurrencyDollarIcon style={{ width: '16px', height: '16px' }} />
            <span>Precio: {formatPrice(productInfo.precio_venta)}</span>
          </div>
          
          {/* Categoría */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EFF6FF',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#3B82F6',
          }}>
            <TagIcon style={{ width: '16px', height: '16px' }} />
            <span>{productInfo.categoria}</span>
          </div>
          
          {/* Tiempo de fabricación */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#F0FDF4',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#10B981',
          }}>
            <ClockIcon style={{ width: '16px', height: '16px' }} />
            <span>Tiempo: {productInfo.tiempo_fabricacion}</span>
          </div>
          
          {/* Popularidad */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEFCE8',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#CA8A04',
          }}>
            <ChartBarIcon style={{ width: '16px', height: '16px' }} />
            <span>Popularidad: {productInfo.popularidad}/10</span>
          </div>
          
          {/* Margen */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EDE9FE',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#8B5CF6',
          }}>
            <span>Margen: {productInfo.margen_ganancia}</span>
          </div>
          
          {/* Temporada */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FCE7F3',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#DB2777',
          }}>
            <span>Temporada: {productInfo.temporada}</span>
          </div>
          
          {/* Tallas */}
          {productInfo?.tallas_disponibles?.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#F3F4F6',
              padding: '6px 10px',
              borderRadius: '4px',
              color: '#4B5563',
            }}>
              <SwatchIcon style={{ width: '16px', height: '16px' }} />
              <span>Tallas: {productInfo.tallas_disponibles.join(', ')}</span>
            </div>
          )}
          
          {/* Fecha última venta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#F3F4F6',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#4B5563',
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
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '13px',
        }}>
          {/* Código QR */}
          {hasQRCode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#EEF2FF',
              padding: '6px 10px',
              borderRadius: '4px',
              color: '#4F46E5',
            }}>
              <QrCodeIcon style={{ width: '16px', height: '16px' }} />
              <span>QR disponible</span>
            </div>
          )}
          
          {/* Proveedor */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#F0FDF4',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#10B981',
          }}>
            <ShoppingBagIcon style={{ width: '16px', height: '16px' }} />
            <span>Proveedor: {materialInfo.proveedor}</span>
          </div>
          
          {/* Precio unitario */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEF3C7',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#D97706',
          }}>
            <CurrencyDollarIcon style={{ width: '16px', height: '16px' }} />
            <span>Precio: {materialInfo.precio_unitario}</span>
          </div>
          
          {/* Calidad */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EDE9FE',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#8B5CF6',
          }}>
            <TagIcon style={{ width: '16px', height: '16px' }} />
            <span>Calidad: {materialInfo.calidad}</span>
          </div>
          
          {/* Color */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EFF6FF',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#3B82F6',
          }}>
            <SwatchIcon style={{ width: '16px', height: '16px' }} />
            <span>Color: {materialInfo.color}</span>
          </div>
          
          {/* Medidas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#F3F4F6',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#4B5563',
          }}>
            <ScaleIcon style={{ width: '16px', height: '16px' }} />
            <span>Medidas: {materialInfo.medidas}</span>
          </div>
          
          {/* Tiempo de entrega */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FCE7F3',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#DB2777',
          }}>
            <ClockIcon style={{ width: '16px', height: '16px' }} />
            <span>Entrega: {materialInfo.tiempo_entrega}</span>
          </div>
          
          {/* Última compra */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEFCE8',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#CA8A04',
          }}>
            <CalendarIcon style={{ width: '16px', height: '16px' }} />
            <span>Última compra: {materialInfo.ultima_compra}</span>
          </div>
        </div>
      )}
      
      {/* Información adicional para herramientas */}
      {item.type === 'herramienta' && herramientaInfo && (
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '13px',
        }}>
          {/* Código QR */}
          {hasQRCode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#EEF2FF',
              padding: '6px 10px',
              borderRadius: '4px',
              color: '#4F46E5',
            }}>
              <QrCodeIcon style={{ width: '16px', height: '16px' }} />
              <span>QR disponible</span>
            </div>
          )}
          
          {/* Marca y modelo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EFF6FF',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#3B82F6',
          }}>
            <TagIcon style={{ width: '16px', height: '16px' }} />
            <span>{herramientaInfo.marca} {herramientaInfo.modelo}</span>
          </div>
          
          {/* Ubicación */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#F0FDF4',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#10B981',
          }}>
            <CubeIcon style={{ width: '16px', height: '16px' }} />
            <span>Ubicación: {herramientaInfo.ubicacion}</span>
          </div>
          
          {/* Garantía */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EDE9FE',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#8B5CF6',
          }}>
            <span>Garantía: {herramientaInfo.garantia}</span>
          </div>
          
          {/* Fecha adquisición */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEFCE8',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#CA8A04',
          }}>
            <CalendarIcon style={{ width: '16px', height: '16px' }} />
            <span>Adquirido: {herramientaInfo.fecha_adquisicion}</span>
          </div>
          
          {/* Último mantenimiento */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FCE7F3',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#DB2777',
          }}>
            <span>Último mant.: {herramientaInfo.fecha_ultimo_mantenimiento}</span>
          </div>
          
          {/* Próxima revisión */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEF3C7',
            padding: '6px 10px',
            borderRadius: '4px',
            color: '#D97706',
          }}>
            <ClockIcon style={{ width: '16px', height: '16px' }} />
            <span>Próx. revisión: {herramientaInfo.proxima_revision}</span>
          </div>
          
          {/* Accesorios */}
          {herramientaInfo.accesorios.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#F3F4F6',
              padding: '6px 10px',
              borderRadius: '4px',
              color: '#4B5563',
            }}>
              <span>Accesorios: {herramientaInfo.accesorios.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 