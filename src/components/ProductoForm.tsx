import { useState, useRef, useEffect } from 'react';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { uploadImageToSupabase, generateQRCode } from '../lib/hooks';
import QRCodeModal from './QRCodeModal';
import { supabase } from '../lib/supabase';

// Estilo global para aplicar Helvetica Neue a todo el componente
const globalStyles = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// Estilos para placeholder más gris
const placeholderColor = '#a0a0a0';

// CSS para los placeholders y animaciones de foco
const customStyles = `
  ::placeholder {
    color: ${placeholderColor};
    opacity: 1;
  }
  
  input, select, textarea {
    transition: border 0.2s ease-in-out, box-shadow 0.2s ease-in-out, transform 0.1s ease-in-out;
  }
  
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #4F46E5 !important;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    transform: translateY(-1px);
  }
`;

// Estilos para opciones y selects vacíos
const selectStyle = (hasValue: boolean) => ({
  color: hasValue ? 'inherit' : placeholderColor
});

interface Material {
  id: number;
  nombre: string;
}

// Nueva interfaz para herramientas
interface Herramienta {
  id: number;
  nombre: string;
}

// Añadir interfaz para tallas
interface Talla {
  numero: string;
  stock: string;
  stockMinimo: string;
}

// Tipos para productos
export interface ProductoForm {
  nombre: string;
  precio: string;
  categoria: string;
  descripcion: string;
  materiales: string[]; // Array de strings
  herramientas: string[]; // Nuevo campo para herramientas
  tallas: Talla[];
  colores: string;
  tiempoFabricacion: string;
  destacado: boolean;
  imagenUrl?: string;
  qrCode?: string;
}

interface ProductoFormProps {
  onClose: () => void;
  isClosing: boolean;
}

function ProductoFormComponent({ onClose, isClosing }: ProductoFormProps) {
  const formImageInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Estados para el QR
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [isQrModalClosing, setIsQrModalClosing] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string>('');
  
  // Usamos el hook personalizado para inventario
  const { addInventarioItem } = useInventario();
  
  // Estado para errores del servidor
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Estado para el formulario de productos
  const [productoForm, setProductoForm] = useState<ProductoForm>({
    nombre: '',
    precio: '',
    categoria: '',
    descripcion: '',
    materiales: [], 
    herramientas: [], 
    tallas: [],
    colores: '',
    tiempoFabricacion: '',
    destacado: false
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductoForm, string>>>({});

  // Estado para previsualización de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState<boolean>(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  // Estado para herramientas
  const [availableHerramientas, setAvailableHerramientas] = useState<Herramienta[]>([]);
  const [herramientasLoading, setHerramientasLoading] = useState<boolean>(true);
  const [herramientasError, setHerramientasError] = useState<string | null>(null);

  // Estado para nueva talla que se está agregando
  const [nuevaTalla, setNuevaTalla] = useState<Talla>({
    numero: '',
    stock: '',
    stockMinimo: ''
  });

  // Fetch materials on component mount
  useEffect(() => {
    async function fetchMaterials() {
      setMaterialsLoading(true);
      setMaterialsError(null);
      try {
        const { data, error } = await supabase
          .from('materiales')
          .select('id, nombre');

        if (error) {
          throw error;
        }

        if (data) {
          setAvailableMaterials(data as Material[]);
        }
      } catch (error: any) {
        console.error('Error fetching materials:', error);
        setMaterialsError('No se pudieron cargar los materiales. Intente de nuevo.');
      } finally {
        setMaterialsLoading(false);
      }
    }

    fetchMaterials();
  }, []);

  // Fetch herramientas on component mount
  useEffect(() => {
    async function fetchHerramientas() {
      setHerramientasLoading(true);
      setHerramientasError(null);
      try {
        const { data, error } = await supabase
          .from('herramientas')
          .select('id, nombre');

        if (error) {
          throw error;
        }

        if (data) {
          setAvailableHerramientas(data as Herramienta[]);
        }
      } catch (error: any) {
        console.error('Error fetching herramientas:', error);
        setHerramientasError('No se pudieron cargar las herramientas. Intente de nuevo.');
      } finally {
        setHerramientasLoading(false);
      }
    }

    fetchHerramientas();
  }, []);

  const handleProductoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductoForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (formErrors[name as keyof ProductoForm]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setProductoForm(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const triggerFormImageInput = () => {
    formImageInputRef.current?.click();
  };

  // Manejador para cambios en nueva talla
  const handleNuevaTallaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNuevaTalla(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para agregar nueva talla
  const agregarTalla = () => {
    // Validar que la talla no esté vacía
    if (!nuevaTalla.numero.trim()) {
      return;
    }

    // Verificar que la talla no esté duplicada
    if (productoForm.tallas.some(t => t.numero === nuevaTalla.numero)) {
      // Mostrar error o no hacer nada
      return;
    }

    // Agregar nueva talla
    setProductoForm(prev => ({
      ...prev,
      tallas: [...prev.tallas, { ...nuevaTalla }]
    }));

    // Limpiar formulario de nueva talla
    setNuevaTalla({
      numero: '',
      stock: '',
      stockMinimo: ''
    });

    // Limpiar posibles errores
    if (formErrors.tallas) {
      setFormErrors(prev => ({
        ...prev,
        tallas: ''
      }));
    }
  };

  // Función para eliminar una talla
  const eliminarTalla = (index: number) => {
    const nuevasTallas = [...productoForm.tallas];
    nuevasTallas.splice(index, 1);
    setProductoForm(prev => ({
      ...prev,
      tallas: nuevasTallas
    }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ProductoForm, string>> = {};
    
    // Validar campos requeridos
    if (!productoForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!productoForm.precio.trim()) errors.precio = 'El precio es obligatorio';
    
    // Validar que el precio sea número
    if (productoForm.precio && !/^\d+(\.\d{1,2})?$/.test(productoForm.precio)) 
      errors.precio = 'El precio debe ser un número con hasta 2 decimales';
    
    // Validar tiempo de fabricación como número entero
    if (productoForm.tiempoFabricacion && !/^\d+$/.test(productoForm.tiempoFabricacion)) 
      errors.tiempoFabricacion = 'El tiempo de fabricación debe ser un número entero de horas';
    
    // Validar tallas
    if (productoForm.tallas.length === 0) {
      errors.tallas = 'Debe agregar al menos una talla';
    } else {
      // Verificar que stock sea número en cada talla
      for (const talla of productoForm.tallas) {
        if (talla.stock && !/^\d+$/.test(talla.stock)) {
          errors.tallas = 'El stock debe ser un número entero en todas las tallas';
          break;
        }
        
        if (talla.stockMinimo && !/^\d+$/.test(talla.stockMinimo)) {
          errors.tallas = 'El stock mínimo debe ser un número entero en todas las tallas';
          break;
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setServerError(null);
    
    try {
      // Convertir valores a tipos correctos para la base de datos
      const productoData = {
        nombre: productoForm.nombre,
        precio: parseFloat(productoForm.precio),
        categoria: productoForm.categoria,
        descripcion: productoForm.descripcion,
        materiales: productoForm.materiales, // Array será convertido a JSONB
        herramientas: productoForm.herramientas, // Array será convertido a JSONB
        tallas: productoForm.tallas.map(talla => ({
          numero: talla.numero,
          stock: parseInt(talla.stock) || 0,
          stockMinimo: parseInt(talla.stockMinimo) || 0
        })), // Array de objetos será convertido a JSONB
        colores: productoForm.colores,
        tiempo_fabricacion: parseInt(productoForm.tiempoFabricacion) || 0,
        destacado: productoForm.destacado,
        imagen_url: productoForm.imagenUrl
      };
      
      // Insertar directamente en la tabla productos_table
      const { data, error } = await supabase
        .from('productos_table')
        .insert(productoData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        console.log('Producto guardado con éxito:', data);
        
        // Generar QR code para el producto
        const qrCode = await generateQRCode('producto', data.id);
        
        // Actualizar el registro con el código QR
        if (qrCode) {
          const { error: updateError } = await supabase
            .from('productos_table')
            .update({ qr_code: qrCode })
            .eq('id', data.id);
          
          if (updateError) {
            console.error('Error al guardar el código QR:', updateError);
          }
        }
        
        // Cerrar el formulario sin mostrar el modal de QR
        onClose();
      } else {
        throw new Error('No se pudo guardar el producto');
      }
    } catch (error: any) {
      console.error('Error al guardar el producto:', error);
      setServerError('Ocurrió un error al guardar. Intente nuevamente.');
      if (error.message) {
        console.error('Mensaje de error:', error.message);
      }
      if (error.details) {
        console.error('Detalles del error:', error.details);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Función para subir una imagen para el formulario
  const handleFormImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Crear URL para previsualización local
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Indicar que estamos subiendo la imagen
      setIsUploadingImage(true);
      
      try {
        // Subir la imagen a Supabase Storage
        const imageUrl = await uploadImageToSupabase(file);
        
        if (imageUrl) {
          setProductoForm(prev => ({
            ...prev,
            imagenUrl: imageUrl
          }));
        } else {
          console.error('No se pudo subir la imagen a Supabase');
        }
      } catch (error) {
        console.error('Error al subir la imagen:', error);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setProductoForm(prev => ({
      ...prev,
      materiales: selectedOptions
    }));
     // Clear potential previous error for this field if needed
     if (formErrors.materiales) {
        setFormErrors(prev => ({
          ...prev,
          materiales: ''
        }));
      }
  };

  // Categorías de productos
  const categorias = [
    'Caballero',
    'Dama',
    'Niños',
    'Unisex',
    'Deportivo',
    'Formal',
    'Casual',
    'Botas',
    'Sandalias',
    'Zapatos'
  ];

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '5px',
        padding: '24px',
        width: '820px',
        maxWidth: '95%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
        opacity: isClosing ? 0 : 1,
        transition: 'all 0.3s ease-in-out',
        animation: isClosing ? '' : 'modalAppear 0.3s ease-out forwards',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
      className="apple-scrollbar"
      aria-labelledby="producto-form-title"
    >
      <style>
        {customStyles}
      </style>
      
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            marginRight: '12px',
            borderRadius: '5px',
            padding: '4px',
          }}
          aria-label="Volver atrás"
        >
          <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#666' }} />
        </button>
        <h2 
          id="producto-form-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          Agregar producto
        </h2>
      </header>
      
      {/* Mostrar mensaje de error del servidor si existe */}
      {serverError && (
        <div style={{ 
          backgroundColor: 'rgba(220, 38, 38, 0.1)', 
          color: '#DC2626', 
          padding: '12px', 
          borderRadius: '5px',
          marginBottom: '16px',
          fontSize: '14px',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
        }}>
          {serverError}
        </div>
      )}
      
      <form onSubmit={handleSubmitProducto}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
          <div 
            style={{ 
              width: '120px', 
              height: '120px', 
              flexShrink: 0,
              backgroundColor: '#f0f0f0',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Vista previa" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <PhotoIcon style={{ width: '40px', height: '40px', color: '#aaa' }} />
            )}
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                Nombre producto <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={productoForm.nombre}
                onChange={handleProductoChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.nombre ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
              />
              {formErrors.nombre && (
                <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  {formErrors.nombre}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              <input
                type="file"
                ref={formImageInputRef}
                style={{ display: 'none' }}
                onChange={handleFormImageChange}
                accept="image/*"
              />
              <button 
                type="button"
                onClick={triggerFormImageInput}
                disabled={isUploadingImage}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  padding: '8px 16px',
                  borderRadius: '5px',
                  cursor: isUploadingImage ? 'default' : 'pointer',
                  fontSize: '14px',
                  color: '#555',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  opacity: isUploadingImage ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => !isUploadingImage && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !isUploadingImage && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isUploadingImage ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Subiendo...
                  </>
                ) : (
                  'Agregar foto'
                )}
              </button>
              <p style={{ 
                margin: '8px 0 0', 
                fontSize: '12px', 
                color: '#666', 
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontStyle: 'italic'
              }}>
                Formatos: JPG, PNG. Máx 5MB
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Precio <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="precio"
              value={productoForm.precio}
              onChange={handleProductoChange}
              placeholder="Ej: 249.99"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: formErrors.precio ? '1px solid red' : '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            />
            {formErrors.precio && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {formErrors.precio}
              </p>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Categoría
            </label>
            <select
              name="categoria"
              value={productoForm.categoria}
              onChange={handleProductoChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '14px',
                backgroundColor: 'white',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Tiempo de fabricación (horas)
            </label>
            <div style={{ 
              display: 'flex',
              position: 'relative',
              alignItems: 'center'
            }}>
              <input
                type="text"
                name="tiempoFabricacion"
                value={productoForm.tiempoFabricacion}
                onChange={handleProductoChange}
                placeholder="Ej: 24"
                style={{
                  width: '100%',
                  padding: '10px',
                  paddingRight: '50px', // Espacio para el sufijo
                  borderRadius: '5px',
                  border: formErrors.tiempoFabricacion ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
              />
              <span style={{ 
                position: 'absolute',
                right: '10px',
                color: '#666',
                fontSize: '14px',
                pointerEvents: 'none'
              }}>
                horas
              </span>
            </div>
            {formErrors.tiempoFabricacion && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {formErrors.tiempoFabricacion}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Destacado
            </label>
            <div style={{ display: 'flex', alignItems: 'center', height: '38px' }}>
              <input
                type="checkbox"
                name="destacado"
                checked={productoForm.destacado}
                onChange={handleCheckboxChange}
                style={{
                  marginRight: '8px',
                  width: '16px',
                  height: '16px',
                }}
              />
              <span style={{ fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                Mostrar en página principal
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Colores disponibles
            </label>
            <input
              type="text"
              name="colores"
              value={productoForm.colores}
              onChange={handleProductoChange}
              placeholder="Ej: Negro, Café, Miel"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Tallas disponibles
          </label>
          
          {/* Tallas seleccionadas */}
          <div style={{ 
            marginBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {productoForm.tallas.length === 0 ? (
              <p style={{ 
                color: '#888', 
                fontStyle: 'italic',
                fontSize: '14px',
                margin: '0'
              }}>No hay tallas agregadas</p>
            ) : (
              <div style={{ 
                border: '1px solid #e5e7eb',
                borderRadius: '5px',
                padding: '12px',
                backgroundColor: 'white',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                  <div>Talla</div>
                  <div>Stock</div>
                  <div>Stock Mínimo</div>
                  <div></div>
                </div>
                {productoForm.tallas.map((talla, index) => (
                  <div key={`talla-${index}`} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr auto', 
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < productoForm.tallas.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}>
                    <div>{talla.numero}</div>
                    <div>{talla.stock}</div>
                    <div>{talla.stockMinimo}</div>
                    <button
                      type="button"
                      onClick={() => eliminarTalla(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#888',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Formulario para agregar nueva talla */}
          <div style={{ 
            border: formErrors.tallas ? '1px solid red' : '1px solid #ddd',
            borderRadius: '5px',
            padding: '12px',
            backgroundColor: 'white',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Talla</label>
                <input
                  type="text"
                  name="numero"
                  value={nuevaTalla.numero}
                  onChange={handleNuevaTallaChange}
                  placeholder="Ej: 25"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Stock</label>
                <input
                  type="text"
                  name="stock"
                  value={nuevaTalla.stock}
                  onChange={handleNuevaTallaChange}
                  placeholder="Ej: 10"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Stock Mínimo</label>
                <input
                  type="text"
                  name="stockMinimo"
                  value={nuevaTalla.stockMinimo}
                  onChange={handleNuevaTallaChange}
                  placeholder="Ej: 2"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={agregarTalla}
                disabled={!nuevaTalla.numero.trim()}
                style={{
                  background: '#4F46E5',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: !nuevaTalla.numero.trim() ? 'default' : 'pointer',
                  opacity: !nuevaTalla.numero.trim() ? 0.5 : 1,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  height: '37px'
                }}
              >
                +
              </button>
            </div>
          </div>
          
          {formErrors.tallas && (
            <p style={{ 
              color: 'red', 
              fontSize: '12px', 
              margin: '4px 0 0', 
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" 
            }}>
              {formErrors.tallas}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Materiales
          </label>
          
          {/* Selected Materials Section */}
          <div style={{ 
            marginBottom: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {productoForm.materiales.length === 0 ? (
              <p style={{ 
                color: '#888', 
                fontStyle: 'italic',
                fontSize: '14px',
                margin: '0'
              }}>No hay materiales seleccionados</p>
            ) : (
              productoForm.materiales.map((material, index) => (
                <div key={`selected-material-${index}`} style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px'
                }}>
                  {material}
                  <button
                    type="button"
                    onClick={() => {
                      // Remove this material
                      const newMaterials = [...productoForm.materiales];
                      newMaterials.splice(index, 1);
                      setProductoForm(prev => ({
                        ...prev,
                        materiales: newMaterials
                      }));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#888',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0',
                      marginLeft: '2px'
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Available Materials Section */}
          <div style={{ 
            border: formErrors.materiales ? '1px solid red' : '1px solid #ddd',
            borderRadius: '5px',
            padding: '12px',
            backgroundColor: 'white',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {materialsLoading ? (
              <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Cargando materiales...</p>
            ) : materialsError ? (
              <p style={{ fontSize: '14px', color: 'red', margin: '0' }}>{materialsError}</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableMaterials.map(material => {
                  // Check if this material is already selected
                  const isSelected = productoForm.materiales.includes(material.nombre);
                  
                  return (
                    <div 
                      key={material.id} 
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '14px',
                        opacity: isSelected ? 0.6 : 1
                      }}
                    >
                      {material.nombre}
                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={() => {
                          // Add this material if not already selected
                          if (!isSelected) {
                            setProductoForm(prev => ({
                              ...prev,
                              materiales: [...prev.materiales, material.nombre]
                            }));
                            
                            // Clear potential previous error
                            if (formErrors.materiales) {
                              setFormErrors(prev => ({
                                ...prev,
                                materiales: ''
                              }));
                            }
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: isSelected ? 'default' : 'pointer',
                          color: isSelected ? '#ccc' : '#4F46E5',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0',
                          marginLeft: '2px'
                        }}
                        title={isSelected ? "Material ya seleccionado" : "Añadir material"}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {formErrors.materiales && (
            <p style={{ 
              color: 'red', 
              fontSize: '12px', 
              margin: '4px 0 0', 
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" 
            }}>
              {formErrors.materiales}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Herramientas
          </label>
          
          {/* Selected Herramientas Section */}
          <div style={{ 
            marginBottom: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {productoForm.herramientas.length === 0 ? (
              <p style={{ 
                color: '#888', 
                fontStyle: 'italic',
                fontSize: '14px',
                margin: '0'
              }}>No hay herramientas seleccionadas</p>
            ) : (
              productoForm.herramientas.map((herramienta, index) => (
                <div key={`selected-herramienta-${index}`} style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px'
                }}>
                  {herramienta}
                  <button
                    type="button"
                    onClick={() => {
                      // Remove this herramienta
                      const newHerramientas = [...productoForm.herramientas];
                      newHerramientas.splice(index, 1);
                      setProductoForm(prev => ({
                        ...prev,
                        herramientas: newHerramientas
                      }));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#888',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0',
                      marginLeft: '2px'
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Available Herramientas Section */}
          <div style={{ 
            border: formErrors.herramientas ? '1px solid red' : '1px solid #ddd',
            borderRadius: '5px',
            padding: '12px',
            backgroundColor: 'white',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {herramientasLoading ? (
              <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Cargando herramientas...</p>
            ) : herramientasError ? (
              <p style={{ fontSize: '14px', color: 'red', margin: '0' }}>{herramientasError}</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableHerramientas.map(herramienta => {
                  // Check if this herramienta is already selected
                  const isSelected = productoForm.herramientas.includes(herramienta.nombre);
                  
                  return (
                    <div 
                      key={herramienta.id} 
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '14px',
                        opacity: isSelected ? 0.6 : 1
                      }}
                    >
                      {herramienta.nombre}
                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={() => {
                          // Add this herramienta if not already selected
                          if (!isSelected) {
                            setProductoForm(prev => ({
                              ...prev,
                              herramientas: [...prev.herramientas, herramienta.nombre]
                            }));
                            
                            // Clear potential previous error
                            if (formErrors.herramientas) {
                              setFormErrors(prev => ({
                                ...prev,
                                herramientas: ''
                              }));
                            }
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: isSelected ? 'default' : 'pointer',
                          color: isSelected ? '#ccc' : '#4F46E5',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0',
                          marginLeft: '2px'
                        }}
                        title={isSelected ? "Herramienta ya seleccionada" : "Añadir herramienta"}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {formErrors.herramientas && (
            <p style={{ 
              color: 'red', 
              fontSize: '12px', 
              margin: '4px 0 0', 
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" 
            }}>
              {formErrors.herramientas}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={productoForm.descripcion}
            onChange={handleProductoChange}
            placeholder="Características del producto, detalles, etc."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || materialsLoading}
            style={{
              backgroundColor: 'white',
              color: '#666',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '5px',
              cursor: (isSaving || materialsLoading) ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              opacity: (isSaving || materialsLoading) ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !isSaving && !materialsLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !isSaving && !materialsLoading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || materialsLoading}
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '5px',
              cursor: (isSaving || materialsLoading) ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              opacity: (isSaving || materialsLoading) ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !isSaving && !materialsLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !isSaving && !materialsLoading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isSaving ? 'Guardando...' : 'Añadir producto'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductoFormComponent; 