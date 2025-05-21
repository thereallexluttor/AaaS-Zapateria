import { Material, Herramienta, Producto } from '../lib/supabase';
import { EyeIcon, TagIcon, ClockIcon, CurrencyDollarIcon, ChartBarIcon, SwatchIcon, ScaleIcon, CalendarIcon, CubeIcon, ShoppingBagIcon, WrenchIcon, ArchiveBoxIcon, PencilSquareIcon, ShoppingCartIcon, ListBulletIcon, ExclamationTriangleIcon, ClipboardDocumentCheckIcon, ReceiptRefundIcon, ChevronDownIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
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
  materiales_usados: string[];
  tags: string[];
  colores: string[];
  tallas_info: { numero: string; stock: number | null; stockMinimo: number | null }[];
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

export interface InventoryItemProps {
  item: InventoryItemType;
  onViewDetails: (item: InventoryItemType) => void;
  onEdit?: (item: InventoryItemType) => void;
  onOrder?: (item: InventoryItemType) => void;
  onViewOrders?: (item: InventoryItemType) => void;
  onReportDamage?: (item: InventoryItemType) => void;
  onScheduleMaintenance?: (item: InventoryItemType) => void;
  onViewMaintenance?: (item: InventoryItemType) => void;
  onViewDamages?: (item: InventoryItemType) => void;
  onViewSalesHistory?: (item: InventoryItemType) => void;
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
  
  // Para materiales, usamos los campos directos
  if (item.type === 'material') {
    const material = item as Material & { type: 'material' };
    if (!material.stock || !material.stock_minimo) return status;
    
    const stock = parseInt(material.stock);
    const stockMinimo = parseInt(material.stock_minimo);
    
    if (stock <= 0) {
      status = { text: 'Agotado', color: '#EF4444' };
    } else if (stock <= stockMinimo) {
      status = { text: 'Bajo', color: '#F59E0B' };
    }
  }
  
  // Para productos, calculamos el estado basado en el stock total de las tallas
  if (item.type === 'producto') {
    // const producto = item as Producto & { type: 'producto' };
    
    // Verificar si el array de tallas existe y no está vacío
    // if (!producto.tallas || producto.tallas.length === 0) {
      // Si no hay tallas definidas, consideramos agotado
      // return { text: 'Sin tallas', color: '#6B7280' };
    // }
    
    // Calcular stock total y stock mínimo total <-- Removed
    // const totalStock = producto.tallas.reduce((sum, talla) => sum + (talla.stock || 0), 0);
    // const totalStockMinimo = producto.tallas.reduce((sum, talla) => sum + (talla.stockMinimo || 0), 0);
    
    // if (totalStock <= 0) {
      // status = { text: 'Agotado', color: '#EF4444' };
    // } else if (totalStock <= totalStockMinimo) {
      // Considerar 'Bajo' solo si hay un mínimo definido mayor a 0
      // if (totalStockMinimo > 0) {
        // status = { text: 'Bajo', color: '#F59E0B' };
      // }
    // }
    // Product status is now always 'Normal' in the badge, details are in the expanded view.
    return { text: 'Info', color: '#6B7280' }; // Return a neutral status like 'Info'
  }
  
  return status;
}

// Obtener icono o imagen para el item
function getItemImage(item: InventoryItemType) {
  // Si el item tiene una URL de imagen, usarla
  if ('imagen_url' in item && item.imagen_url) {
    return <img src={item.imagen_url} alt={item.nombre} style={{ 
      width: '100%', 
      height: '100%', 
      objectFit: 'cover', 
      borderRadius: '8px',
      objectPosition: 'center'
    }} />;
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
      fontSize: '24px',
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
  if (item.type === 'material') {
    const material = item as Material & { type: 'material' };
    return material.stock || '0';
  }
  
  if (item.type === 'producto') {
    // We no longer show summed stock for products here
    return '-'; // Indicate not applicable or specific detail below
  }
  
  // Las herramientas no tienen stock
  return '1'; // O podrías retornar 'N/A' o algo más apropiado
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
  
  // Usar el precio real, formateado como string
  const precio = typeof producto.precio === 'number' ? producto.precio.toFixed(2) : '0.00';
  
  // Tallas: Get the full talla info array
  const tallasInfo = producto.tallas && Array.isArray(producto.tallas)
    ? producto.tallas.map(t => ({ 
        numero: t.numero, 
        stock: t.stock,
        stockMinimo: t.stockMinimo 
      }))
    : [];
  
  // Colores (asumiendo que sigue siendo una cadena separada por comas, ajustar si es necesario)
  const colores = producto.colores ? producto.colores.split(',').map(c => c.trim()) : [];
  
  return {
    precio_venta: precio,
    categoria: categoria,
    materiales_usados: [],
    tags: [],
    colores: colores,
    tallas_info: tallasInfo,
  };
}

// Obtener la información adicional del material (mockup)
function getMaterialAdditionalInfo(material: Material & { type: 'material' }): MaterialMockupData {
  // Usar los datos reales del material en lugar de datos simulados
  const proveedor = material.proveedor || 'No especificado';
  
  // Usar el precio real del material, convertido a string
  const precioBase = material.precio ? parseFloat(material.precio) : 0;
  const precioUnitario = precioBase.toFixed(2);
  
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
    garantia: 'N/A',
    ubicacion: ubicacion,
    instrucciones: 'N/A',
    accesorios: []
  };
}

// Formatear un precio
function formatPrice(price: string | number): string {
  if (typeof price === 'number') {
    return `$${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return '$0.00';
  return `$${numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// Helper component for detail items
function DetailItem({ label, value, valueColor }: { 
  label: string, 
  value: string | number | null | undefined, 
  valueColor?: string 
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: '13px', color: '#6B7280' }}>{label}</div>
      <div style={{ 
        fontSize: '14px',
        fontWeight: 500,
        color: valueColor || '#111827'
      }}>
        {value || 'No especificado'}
      </div>
    </div>
  );
}

export default function InventoryItem({ 
  item, 
  onViewDetails, 
  onEdit, 
  onOrder, 
  onViewOrders,
  onReportDamage,
  onScheduleMaintenance,
  onViewMaintenance,
  onViewDamages,
  onViewSalesHistory
}: InventoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
      
  // Color principal según tipo
  const mainColor = item.type === 'material' 
    ? '#F97316' 
    : item.type === 'herramienta' 
      ? '#4F46E5' 
      : '#10B981';
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #E5E7EB',
      gap: '12px',
      transition: 'all 0.3s ease',
      margin: '12px 0',
      fontFamily: "'Poppins', sans-serif",
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      cursor: item.type === 'material' ? 'pointer' : 'default'
    }}
    onClick={(e) => {
      // Solo expandir si es un material
      if (item.type === 'material') {
        // Prevenir que el clic se propague si se hace clic en los botones
        if ((e.target as HTMLElement).closest('[data-action-button="true"]')) {
          return;
        }
        setIsExpanded(!isExpanded);
      } else {
        // Para otros tipos, mantener el comportamiento original
        if ((e.target as HTMLElement).closest('[data-action-button="true"]')) {
          return;
        }
        onViewDetails(item);
      }
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = '#D1D5DB';
      e.currentTarget.style.backgroundColor = '#FAFAFA';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = '#E5E7EB';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      e.currentTarget.style.backgroundColor = 'white';
    }}
    >
      {/* Botones para materiales */}
      {item.type === 'material' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}>
          {/* Botón Seguir Órdenes */}
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4F46E5',
              transition: 'all 0.2s ease',
            }}
            data-action-button="true"
            onClick={() => onViewOrders ? onViewOrders(item) : null}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <ListBulletIcon style={{ width: '16px', height: '16px' }} />
            <span>Órdenes</span>
          </button>
          
          {/* Botón Ordenar material */}
          {onOrder && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onOrder(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ShoppingCartIcon style={{ width: '16px', height: '16px' }} />
              <span>Ordenar</span>
            </button>
          )}
          
          {/* Botón Editar material */}
          {onEdit && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onEdit(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
              <span>Editar</span>
            </button>
          )}
        </div>
      )}

      {/* Botones para herramientas */}
      {item.type === 'herramienta' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}>
          {/* Botón Ver Mantenimientos */}
          {onViewMaintenance && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onViewMaintenance(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <WrenchIcon style={{ width: '16px', height: '16px' }} />
              <span>Mantenimientos</span>
            </button>
          )}

          {/* Botón Ver Daños y Reparaciones */}
          {onViewDamages && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onViewDamages(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ExclamationTriangleIcon style={{ width: '16px', height: '16px' }} />
              <span>Reparaciones</span>
            </button>
          )}
          
          {/* Botón Editar herramienta */}
          {onEdit && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onEdit(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
              <span>Editar</span>
            </button>
          )}
          
          {/* Menú desplegable para acciones adicionales */}
          <div className="dropdown" style={{ position: 'relative' }}>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={(e) => {
                e.stopPropagation();
                const dropdown = e.currentTarget.nextElementSibling;
                if (dropdown) {
                  dropdown.classList.toggle('show');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Más</span>
              <EllipsisHorizontalIcon style={{ width: '16px', height: '16px' }} />
            </button>
            <div 
              className="dropdown-content" 
              style={{
                display: 'none',
                position: 'absolute',
                right: 0,
                backgroundColor: '#FFFFFF',
                minWidth: '160px',
                boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.1)',
                zIndex: 1,
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                marginTop: '5px'
              }}
            >
              {/* Botón Programar Mantenimiento */}
              {onScheduleMaintenance && (
                <a 
                  href="#" 
                  style={{
                    color: '#4F46E5',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderBottom: '1px solid #E5E7EB'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onScheduleMaintenance(item);
                    // Cerrar el dropdown
                    document.querySelectorAll('.dropdown-content').forEach(el => {
                      el.classList.remove('show');
                    });
                  }}
                >
                  <ClipboardDocumentCheckIcon style={{ width: '16px', height: '16px' }} />
                  <span>Programar Mantenimiento</span>
                </a>
              )}
              
              {/* Botón Reportar Daño */}
              {onReportDamage && (
                <a 
                  href="#" 
                  style={{
                    color: '#4F46E5',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReportDamage(item);
                    // Cerrar el dropdown
                    document.querySelectorAll('.dropdown-content').forEach(el => {
                      el.classList.remove('show');
                    });
                  }}
                >
                  <ExclamationTriangleIcon style={{ width: '16px', height: '16px' }} />
                  <span>Reportar Daño</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botones para productos */}
      {item.type === 'producto' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}>
          {/* Botón Ver historial de ventas */}
          {onViewSalesHistory && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onViewSalesHistory(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ReceiptRefundIcon style={{ width: '16px', height: '16px' }} />
              <span>Ver ventas</span>
            </button>
          )}
          
          {/* Botón Editar producto */}
          {onEdit && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4F46E5',
                transition: 'all 0.2s ease',
              }}
              data-action-button="true"
              onClick={() => onEdit(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <PencilSquareIcon style={{ width: '16px', height: '16px' }} />
              <span>Editar</span>
            </button>
          )}
        </div>
      )}

      {/* Sección principal con información básica */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        {/* Icono/Imagen */}
        <div style={{ 
          width: '96px',
          height: '96px',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid #E5E7EB',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {getItemImage(item)}
        </div>
        
        {/* Contenido principal (nombre, tipo, referencia) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flexGrow: 1,
          gap: '4px'
        }}>
          {/* Nombre del producto con icono de expansión para materiales */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: '#111827',
            }}>
              {item.nombre}
            </div>
            {item.type === 'material' && (
              <ChevronDownIcon 
                style={{ 
                  width: '20px', 
                  height: '20px',
                  color: '#6B7280',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s ease'
                }} 
              />
            )}
          </div>
          
          {/* Tipo y referencia */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#6B7280',
          }}>
            <span>{typeIcon}</span>
            <span style={{ fontWeight: 500 }}>
              {item.type === 'material' && 'Material'}
              {item.type === 'herramienta' && 'Herramienta'}
              {item.type === 'producto' && 'Producto'}
            </span>
            {reference && (
              <>
                <span style={{ color: '#9CA3AF' }}>•</span>
                <span>{reference}</span>
              </>
            )}
          </div>
          
          {/* Badges específicos por tipo de producto */}
          {item.type === 'producto' && productInfo && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              marginTop: '6px' 
            }}>
              {/* Precio */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#FFF7E6',
                padding: '4px 10px',
                borderRadius: '16px',
                color: '#D97706',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <span>{formatPrice(productInfo.precio_venta)}</span>
              </div>

              {/* Categoría */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#EEF2FF',
                padding: '4px 10px',
                borderRadius: '16px',
                color: '#4F46E5',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <span>{productInfo.categoria || "Unisex"}</span>
              </div>

              {/* Colores */}
              {productInfo?.colores?.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#F5F5F5',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  color: '#4B5563',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  <span>{productInfo.colores.join(', ')}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Badges para materiales */}
          {item.type === 'material' && materialInfo && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              marginTop: '6px' 
            }}>
              {/* Proveedor */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#FFF7ED',
                padding: '4px 10px',
                borderRadius: '16px',
                color: '#F97316',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <ShoppingBagIcon style={{ width: '14px', height: '14px' }} />
                <span>{materialInfo.proveedor}</span>
              </div>
              
              {/* Precio */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#FFF7E6',
                padding: '4px 10px',
                borderRadius: '16px',
                color: '#D97706',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <CurrencyDollarIcon style={{ width: '14px', height: '14px' }} />
                <span>{materialInfo.precio_unitario}</span>
              </div>
              
              {/* Stock con unidades */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#F0FDF4',
                padding: '4px 10px',
                borderRadius: '16px',
                color: '#10B981',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <ArchiveBoxIcon style={{ width: '14px', height: '14px' }} />
                <span>Stock: {stock} {(item as Material & { type: 'material' }).unidades}</span>
              </div>
            </div>
          )}
          
          {/* Badges para herramientas */}
          {item.type === 'herramienta' && herramientaInfo && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              marginTop: '6px' 
            }}>
              {/* Estado */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: status.color === '#10B981' ? '#F0FDF4' : 
                               status.color === '#3B82F6' ? '#EEF2FF' :
                               status.color === '#F59E0B' ? '#FFF7E6' : '#FEE2E2',
                padding: '4px 10px',
                borderRadius: '16px',
                color: status.color,
                fontSize: '13px',
                fontWeight: 500
              }}>
                <WrenchIcon style={{ width: '14px', height: '14px' }} />
                <span>{status.text}</span>
              </div>
              
              {/* Ubicación */}
              {herramientaInfo.ubicacion && herramientaInfo.ubicacion !== 'No especificada' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#EEF2FF',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  color: '#4F46E5',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  <CubeIcon style={{ width: '14px', height: '14px' }} />
                  <span>{herramientaInfo.ubicacion}</span>
                </div>
              )}
              
              {/* Modelo */}
              {herramientaInfo.modelo && herramientaInfo.modelo !== 'No especificado' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#F5F5F5',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  color: '#4B5563',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  <TagIcon style={{ width: '14px', height: '14px' }} />
                  <span>{herramientaInfo.modelo}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Sección de tallas para productos */}
      {item.type === 'producto' && productInfo && productInfo.tallas_info.length > 0 && (
        <div style={{ 
          borderTop: '1px solid #E5E7EB', 
          paddingTop: '12px',
          marginTop: '4px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#374151', 
            marginBottom: '10px' 
          }}>
            Stock por Talla:
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {productInfo.tallas_info.map((talla, index) => (
              <div key={index} style={{
                backgroundColor: '#F9FAFB',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: '#111827',
                  fontSize: '14px'
                }}>
                  Talla {talla.numero}
                </div>
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '15px',
                  fontWeight: 500,
                  color: (talla.stock || 0) <= (talla.stockMinimo || 0) ? '#F59E0B' : '#10B981'
                }}>
                  {talla.stock ?? '0'}
                </div>
                {talla.stockMinimo !== null && talla.stockMinimo > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9CA3AF',
                    marginTop: '2px'
                  }}>
                    Min: {talla.stockMinimo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Información detallada para materiales con animación */}
      {item.type === 'material' && materialInfo && (
        <div style={{ 
          overflow: 'hidden',
          maxHeight: isExpanded ? '1000px' : '0',
          opacity: isExpanded ? 1 : 0,
          transition: 'all 0.3s ease-in-out',
          borderTop: isExpanded ? '1px solid #E5E7EB' : 'none',
          paddingTop: isExpanded ? '12px' : '0',
          marginTop: isExpanded ? '4px' : '0'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#374151', 
            marginBottom: '12px' 
          }}>
            Detalles del Material
          </div>
          
          {/* Grid principal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '12px',
          }}>
            {/* Columna 1: Información básica */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <DetailItem label="ID" value={(item as Material & { type: 'material' }).id} />
              <DetailItem label="Nombre" value={item.nombre} />
              <DetailItem label="Referencia" value={(item as Material & { type: 'material' }).referencia} />
              <DetailItem label="Categoría" value={(item as Material & { type: 'material' }).categoria} />
            </div>

            {/* Columna 2: Stock y precios */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <DetailItem label="Stock" value={(item as Material & { type: 'material' }).stock} />
              <DetailItem label="Stock Mínimo" value={(item as Material & { type: 'material' }).stock_minimo} />
              <DetailItem 
                label="Precio" 
                value={formatPrice((item as Material & { type: 'material' }).precio || 0)} 
                valueColor="#10B981"
              />
              <DetailItem label="Unidades" value={(item as Material & { type: 'material' }).unidades} />
            </div>

            {/* Columna 3: Proveedor y ubicación */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <DetailItem label="Proveedor" value={(item as Material & { type: 'material' }).proveedor} />
              <DetailItem label="Ubicación" value={(item as Material & { type: 'material' }).ubicacion} />
              <DetailItem 
                label="Fecha Adquisición" 
                value={(item as Material & { type: 'material' }).fecha_adquisicion} 
              />
            </div>
          </div>

          {/* Descripción */}
          {(item as Material & { type: 'material' }).descripcion && (
            <div style={{ 
              marginTop: '12px',
              backgroundColor: '#F9FAFB',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ 
                fontSize: '13px', 
                color: '#6B7280', 
                marginBottom: '4px',
                fontWeight: 500
              }}>
                Descripción
              </div>
              <div style={{ 
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.4'
              }}>
                {(item as Material & { type: 'material' }).descripcion}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Información detallada para herramientas */}
      {item.type === 'herramienta' && herramientaInfo && (
        <div style={{ 
          borderTop: '1px solid #E5E7EB', 
          paddingTop: '12px',
          marginTop: '4px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#374151', 
            marginBottom: '10px' 
          }}>
            Detalles de la Herramienta:
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {/* Fecha de adquisición */}
            <div style={{
              backgroundColor: '#F9FAFB',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              minWidth: '130px',
            }}>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                Fecha adquisición
              </div>
              <div style={{ 
                marginTop: '4px', 
                fontSize: '14px',
                fontWeight: 500,
                color: '#111827'
              }}>
                {herramientaInfo.fecha_adquisicion}
              </div>
            </div>
            
            {/* Último mantenimiento */}
            <div style={{
              backgroundColor: '#F9FAFB',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              minWidth: '130px',
            }}>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                Último mantenimiento
              </div>
              <div style={{ 
                marginTop: '4px', 
                fontSize: '14px',
                fontWeight: 500,
                color: '#111827'
              }}>
                {herramientaInfo.fecha_ultimo_mantenimiento}
              </div>
            </div>
            
            {/* Próxima revisión */}
            <div style={{
              backgroundColor: '#F9FAFB',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              minWidth: '130px',
            }}>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                Próxima revisión
              </div>
              <div style={{ 
                marginTop: '4px', 
                fontSize: '14px',
                fontWeight: 500,
                color: '#111827'
              }}>
                {herramientaInfo.proxima_revision}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 