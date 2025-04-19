import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Producto, ProductoSeleccionado } from '../lib/types';

interface ProductSelectorProps {
  onProductSelect: (producto: ProductoSeleccionado) => void;
  onProductRemove: (productoId: number) => void;
  productosSeleccionados: ProductoSeleccionado[];
}

function ProductSelector({ onProductSelect, onProductRemove, productosSeleccionados }: ProductSelectorProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string>('');
  const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
  const [cantidad, setCantidad] = useState(1);

  // Cargar productos desde Supabase
  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .order('nombre');
        
        if (error) throw error;
        setProductos(data || []);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProductos();
  }, []);

  const productosFiltrados = productos;

  // Parsear tallas y colores del string formato {valor1, valor2}
  const parsearOpciones = (opciones: string): string[] => {
    if (!opciones) return [];
    // Eliminar los corchetes y separar por comas
    return opciones
      .replace(/{|}/g, '')
      .split(',')
      .map(opcion => opcion.trim());
  };

  // Manejar cambio de producto seleccionado
  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productoId = parseInt(e.target.value);
    if (productoId) {
      const producto = productos.find(p => p.id === productoId) || null;
      setProductoSeleccionado(producto);
      
      // Resetear tallas y colores
      setTallaSeleccionada('');
      setColorSeleccionado('');
      setCantidad(1);
    } else {
      setProductoSeleccionado(null);
    }
  };

  // Manejar cambio en la selección de talla (ahora solo una)
  const handleTallaChange = (talla: string) => {
    setTallaSeleccionada(talla);
  };

  // Manejar cambio en la selección de color (ahora solo uno)
  const handleColorChange = (color: string) => {
    setColorSeleccionado(color);
  };

  // Agregar producto a la selección
  const handleAgregarProducto = () => {
    if (!productoSeleccionado) return;
    
    if (!tallaSeleccionada) {
      alert('Por favor, seleccione una talla');
      return;
    }
    
    if (!colorSeleccionado) {
      alert('Por favor, seleccione un color');
      return;
    }

    const tallas = parsearOpciones(productoSeleccionado.tallas);
    const colores = parsearOpciones(productoSeleccionado.colores);
    
    const nuevoProducto: ProductoSeleccionado = {
      id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      tallas,
      tallasSeleccionadas: [tallaSeleccionada],
      colores,
      coloresSeleccionados: [colorSeleccionado],
      cantidad,
      precio: productoSeleccionado.precio
    };
    
    onProductSelect(nuevoProducto);
    
    // Resetear selección
    setProductoSeleccionado(null);
    setTallaSeleccionada('');
    setColorSeleccionado('');
    setCantidad(1);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>
        Añadir un producto
      </h3>
      
      {/* Selector de producto */}
      <div style={{ 
        backgroundColor: '#F9FAFB', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px' 
      }}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="producto"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              color: '#374151',
              fontWeight: 500
            }}
          >
            1. Selecciona un producto
          </label>
          <select
            id="producto"
            value={productoSeleccionado?.id || ''}
            onChange={handleProductoChange}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Seleccione un producto</option>
            {loading ? (
              <option disabled>Cargando productos...</option>
            ) : (
              productosFiltrados.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre} - ${producto.precio} ({producto.stock} en stock)
                </option>
              ))
            )}
          </select>
        </div>
        
        {/* Si hay un producto seleccionado, mostrar opciones de tallas y colores */}
        {productoSeleccionado && (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              marginBottom: '16px' 
            }}>
              {/* Selector de tallas */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
                  }}
                >
                  2. Selecciona una talla
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  backgroundColor: 'white',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  minHeight: '100px'
                }}>
                  {parsearOpciones(productoSeleccionado.tallas).map((talla) => (
                    <div
                      key={talla}
                      onClick={() => handleTallaChange(talla)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        backgroundColor: tallaSeleccionada === talla ? '#4F46E5' : 'white',
                        color: tallaSeleccionada === talla ? 'white' : '#374151',
                        fontSize: '13px'
                      }}
                    >
                      {talla}
                    </div>
                  ))}
                </div>
                {!tallaSeleccionada && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                    * Debes seleccionar una talla
                  </div>
                )}
              </div>
              
              {/* Selector de colores */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
                  }}
                >
                  3. Selecciona un color
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  backgroundColor: 'white',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  minHeight: '100px'
                }}>
                  {parsearOpciones(productoSeleccionado.colores).map((color) => (
                    <div
                      key={color}
                      onClick={() => handleColorChange(color)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        backgroundColor: colorSeleccionado === color ? '#4F46E5' : 'white',
                        color: colorSeleccionado === color ? 'white' : '#374151',
                        fontSize: '13px'
                      }}
                    >
                      {color}
                    </div>
                  ))}
                </div>
                {!colorSeleccionado && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                    * Debes seleccionar un color
                  </div>
                )}
              </div>
            </div>
            
            {/* Selector de cantidad */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="cantidad"
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: 500
                }}
              >
                4. Especifica la cantidad
              </label>
              <input
                id="cantidad"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>
            
            {/* Resumen y botón para agregar producto */}
            <div style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                <strong>Resumen:</strong> {productoSeleccionado.nombre}
                {tallaSeleccionada && (
                  <span> - Talla: {tallaSeleccionada}</span>
                )}
                {colorSeleccionado && (
                  <span> - Color: {colorSeleccionado}</span>
                )}
                <span> - Cantidad: {cantidad}</span>
                <div style={{ marginTop: '4px', color: '#4F46E5', fontWeight: 500 }}>
                  Subtotal: ${(productoSeleccionado.precio * cantidad).toFixed(2)}
                </div>
              </div>
              
              <button
                onClick={handleAgregarProducto}
                disabled={!tallaSeleccionada || !colorSeleccionado}
                style={{
                  backgroundColor: (!tallaSeleccionada || !colorSeleccionado) ? '#E5E7EB' : '#4F46E5',
                  color: (!tallaSeleccionada || !colorSeleccionado) ? '#9CA3AF' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: (!tallaSeleccionada || !colorSeleccionado) ? 'not-allowed' : 'pointer',
                  width: '100%'
                }}
              >
                Añadir a este pedido
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductSelector; 