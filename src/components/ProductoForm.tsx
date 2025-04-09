import { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon, DocumentIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { uploadImageToSupabase, generateQRCode } from '../lib/hooks';
import QRCodeModal from './QRCodeModal';
import { supabase } from '../lib/supabase';

// Tipos para productos
export interface ProductoForm {
  nombre: string;
  precio: string;
  stock: string;
  stockMinimo: string;
  categoria: string;
  descripcion: string;
  tallas: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [rawText, setRawText] = useState('');
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
    stock: '',
    stockMinimo: '',
    categoria: '',
    descripcion: '',
    tallas: '',
    colores: '',
    tiempoFabricacion: '',
    destacado: false
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductoForm, string>>>({});

  // Estado para previsualización de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          // Si falla, aún podemos usar la URL local para la vista previa
          console.error('No se pudo subir la imagen a Supabase');
        }
      } catch (error) {
        console.error('Error al subir la imagen:', error);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoadingAI(true);
      setShowAIOptions(false);
      
      // Simulación de carga - en producción, aquí iría una llamada a la API de IA
      // que procesaría el PDF y extraería la información
      setTimeout(() => {
        setProductoForm({
          nombre: 'Botas Elegantes de Cuero',
          precio: '89.99',
          stock: '35',
          stockMinimo: '10',
          categoria: 'Botas',
          descripcion: 'Botas de cuero genuino con acabado premium. Forro interior térmico y suela antideslizante. Ideales para uso diario o casual. Resistentes al agua y durables.',
          tallas: '36, 37, 38, 39, 40, 41',
          colores: 'Negro, Marrón, Camel',
          tiempoFabricacion: '7-10 días',
          destacado: true
        });
        
        setLoadingAI(false);
      }, 2000);
    }
  };

  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
  };

  const processRawText = () => {
    if (rawText.trim() === '') {
      return;
    }
    
    setLoadingAI(true);
    setShowTextInput(false);
    setShowAIOptions(false);
    
    // Simulación de procesamiento - aquí la IA analizaría el texto
    setTimeout(() => {
      // Ejemplo de extracción de información del texto
      setProductoForm({
        nombre: 'Zapatos Deportivos Ultra Light',
        precio: '64.50',
        stock: '48',
        stockMinimo: '15',
        categoria: 'Calzado deportivo',
        descripcion: 'Zapatos deportivos ultraligeros con tecnología de amortiguación avanzada. Parte superior de malla transpirable y suela flexible de goma. Ideales para correr y entrenar. Disponibles en varios colores y tallas.',
        tallas: '38, 39, 40, 41, 42, 43, 44',
        colores: 'Negro, Azul, Rojo, Gris',
        tiempoFabricacion: '5-7 días',
        destacado: true
      });
      
      setRawText('');
      setLoadingAI(false);
    }, 2000);
  };

  const openTextInput = () => {
    setShowTextInput(true);
    setShowAIOptions(false);
  };

  const closeTextInput = () => {
    setShowTextInput(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerPdfInput = () => {
    pdfInputRef.current?.click();
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ProductoForm, string>> = {};
    
    // Validar campos requeridos
    if (!productoForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!productoForm.precio.trim()) errors.precio = 'El precio es obligatorio';
    
    // Validar que stock y precio sean números
    if (productoForm.stock && !/^\d+$/.test(productoForm.stock)) 
      errors.stock = 'El stock debe ser un número';
    
    if (productoForm.precio && !/^\d+(\.\d{1,2})?$/.test(productoForm.precio)) 
      errors.precio = 'El precio debe ser un número válido';
    
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
      // Transformar los campos a formato snake_case para la base de datos
      const productoData = {
        nombre: productoForm.nombre,
        precio: productoForm.precio,
        stock: productoForm.stock,
        stock_minimo: productoForm.stockMinimo,
        categoria: productoForm.categoria,
        descripcion: productoForm.descripcion,
        tallas: productoForm.tallas,
        colores: productoForm.colores,
        tiempo_fabricacion: productoForm.tiempoFabricacion,
        destacado: productoForm.destacado,
        imagen_url: productoForm.imagenUrl
      };
      
      // Usar el hook de inventario para agregar el producto
      // El código QR se genera y guarda automáticamente dentro del hook
      const result = await addInventarioItem('producto', productoData);
      
      if (result && result.id) {
        console.log('Producto guardado con éxito:', result);
        
        // El QR ya fue generado y guardado en el hook, solo necesitamos obtenerlo para mostrar
        // Si el resultado tiene la URL del QR, usamos esa
        if (result.qr_code) {
          setQrCodeUrl(result.qr_code);
        } else {
          // Si por alguna razón no tiene el QR, generamos uno solo para mostrar
          // pero no lo guardamos de nuevo
          const qrCode = await generateQRCode('producto', result.id);
          setQrCodeUrl(qrCode);
        }
        
        setSavedItemId(result.id);
        
        // Mostrar modal con el código QR
        setShowQrModal(true);
      } else {
        setServerError('No se pudo guardar el producto. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      setServerError('Ocurrió un error al guardar. Intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para cerrar el modal QR
  const handleCloseQrModal = () => {
    setIsQrModalClosing(true);
    setTimeout(() => {
      setShowQrModal(false);
      setIsQrModalClosing(false);
      // Cerrar el formulario después de mostrar el QR
      onClose();
    }, 300);
  };

  // Gestionar el menú de opciones de IA
  const toggleAIOptions = () => {
    setShowAIOptions(!showAIOptions);
  };

  // Simular completado con IA desde una foto
  const completeWithAIFromImage = () => {
    setShowAIOptions(false);
    triggerFileInput();
  };

  // Simular completado con IA desde un PDF
  const completeWithAIFromPdf = () => {
    setShowAIOptions(false);
    triggerPdfInput();
  };

  // Completar con IA automáticamente
  const completeWithAI = () => {
    setLoadingAI(true);
    setShowAIOptions(false);
    
    // Simulación de carga - en producción, aquí iría una llamada a la API de IA
    setTimeout(() => {
      setProductoForm({
        nombre: 'Zapatos Oxford Clásicos',
        precio: '120.00',
        stock: '25',
        stockMinimo: '8',
        categoria: 'Calzado formal',
        descripcion: 'Zapatos Oxford de cuero genuino con acabado brillante. Diseño clásico y elegante con puntera refinada. Plantilla acolchada para mayor comodidad. Fabricación artesanal con materiales de primera calidad.',
        tallas: '39, 40, 41, 42, 43, 44',
        colores: 'Negro, Marrón oscuro',
        tiempoFabricacion: '10-14 días',
        destacado: true
      });
      
      setLoadingAI(false);
    }, 1500);
  };

  // Opciones de categorías para el select
  const categorias = [
    'Zapatos de hombre',
    'Zapatos de mujer',
    'Zapatos infantiles',
    'Botas',
    'Sandalias',
    'Calzado deportivo',
    'Calzado formal',
    'Calzado de trabajo',
    'Accesorios'
  ];

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
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
        fontFamily: "'Poppins', sans-serif",
      }}
      className="apple-scrollbar"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginRight: '12px',
              borderRadius: '8px',
              padding: '4px',
            }}
          >
            <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#666' }} />
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Agregar producto</h2>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleAIOptions}
            disabled={loadingAI}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loadingAI ? 'default' : 'pointer',
              opacity: loadingAI ? 0.7 : 1,
              transition: 'all 0.2s ease',
              height: '36px',
            }}
            onMouseEnter={(e) => !loadingAI && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loadingAI && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <SparklesIcon style={{ width: '16px', height: '16px', marginRight: '6px', color: '#4F46E5' }} />
            {loadingAI ? 'Generando...' : 'Completar con IA'}
          </button>
          
          {/* Menú de opciones de IA */}
          {showAIOptions && (
            <div 
              style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                width: '200px',
                zIndex: 10,
              }}
            >
              <div 
                style={{ 
                  padding: '10px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  color: '#666',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                SELECCIONAR FUENTE
              </div>
              
              <button
                onClick={completeWithAIFromImage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <PhotoIcon style={{ width: '16px', height: '16px', marginRight: '10px', color: '#16A34A' }} />
                <div>
                  <div style={{ fontSize: '14px', color: '#333', fontFamily: "'Poppins', sans-serif" }}>Subir foto</div>
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: "'Poppins', sans-serif" }}>Extraer datos de imagen</div>
                </div>
              </button>
              
              <button
                onClick={completeWithAIFromPdf}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <DocumentIcon style={{ width: '16px', height: '16px', marginRight: '10px', color: '#DC2626' }} />
                <div>
                  <div style={{ fontSize: '14px', color: '#333', fontFamily: "'Poppins', sans-serif" }}>Subir PDF</div>
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: "'Poppins', sans-serif" }}>Extraer datos de documento</div>
                </div>
              </button>
              
              <button
                onClick={openTextInput}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <ChatBubbleBottomCenterTextIcon style={{ width: '16px', height: '16px', marginRight: '10px', color: '#0EA5E9' }} />
                <div>
                  <div style={{ fontSize: '14px', color: '#333', fontFamily: "'Poppins', sans-serif" }}>Ingresar texto</div>
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: "'Poppins', sans-serif" }}>Procesar descripción textual</div>
                </div>
              </button>
            </div>
          )}
          
          {/* Input oculto para subir PDF */}
          <input
            type="file"
            ref={pdfInputRef}
            style={{ display: 'none' }}
            onChange={handlePdfChange}
            accept=".pdf"
          />
        </div>
      </div>
      
      {/* Modal para ingresar texto */}
      {showTextInput && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <button
              onClick={closeTextInput}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                marginRight: '12px',
                borderRadius: '8px',
                padding: '4px',
              }}
            >
              <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#666' }} />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Ingresar descripción del producto</h2>
          </div>
          
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontFamily: "'Poppins', sans-serif" }}>
            Describe el producto con todos los detalles que puedas (nombre, características, tallas, colores, precio, etc.) y la IA extraerá la información para completar el formulario.
          </p>
          
          <textarea
            value={rawText}
            onChange={handleRawTextChange}
            placeholder="Ej: Zapatos deportivos ultraligeros para correr. Disponibles en tallas del 38 al 44 y en colores negro, azul, rojo y gris. Precio de venta 64,50€. Actualmente tenemos 48 unidades en stock. Se fabrican en 5-7 días..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: "'Poppins', sans-serif",
              flex: 1,
              marginBottom: '20px',
              resize: 'none',
            }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button
              onClick={closeTextInput}
              style={{
                backgroundColor: 'white',
                color: '#666',
                border: '1px solid #e0e0e0',
                padding: '0 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                height: '36px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Cancelar
            </button>
            
            <button
              onClick={processRawText}
              disabled={rawText.trim() === ''}
              style={{
                backgroundColor: 'white',
                color: '#4F46E5',
                border: '1px solid #e0e0e0',
                padding: '0 24px',
                borderRadius: '8px',
                cursor: rawText.trim() === '' ? 'default' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                height: '36px',
                opacity: rawText.trim() === '' ? 0.7 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <SparklesIcon style={{ width: '16px', height: '16px', marginRight: '6px', color: '#4F46E5' }} />
              Procesar con IA
            </button>
          </div>
        </div>
      )}
      
      {/* Mostrar mensaje de error del servidor si existe */}
      {serverError && (
        <div style={{ 
          backgroundColor: 'rgba(220, 38, 38, 0.1)', 
          color: '#DC2626', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          fontFamily: "'Poppins', sans-serif"
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
              borderRadius: '8px',
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
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
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
                  borderRadius: '8px',
                  border: formErrors.nombre ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Poppins', sans-serif"
                }}
              />
              {formErrors.nombre && (
                <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Poppins', sans-serif" }}>
                  {formErrors.nombre}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageChange}
                accept="image/*"
              />
              <button 
                type="button"
                onClick={triggerFileInput}
                disabled={isUploadingImage}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: isUploadingImage ? 'default' : 'pointer',
                  fontSize: '14px',
                  color: '#555',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Poppins', sans-serif",
                  opacity: isUploadingImage ? 0.7 : 1,
                }}
                onMouseEnter={(e) => !isUploadingImage && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !isUploadingImage && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isUploadingImage ? 'Subiendo...' : 'Agregar foto'}
              </button>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666', fontFamily: "'Poppins', sans-serif" }}>
                Formatos: JPG, PNG. Máx 5MB
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Precio <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="precio"
              value={productoForm.precio}
              onChange={handleProductoChange}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: formErrors.precio ? '1px solid red' : '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
            {formErrors.precio && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Poppins', sans-serif" }}>
                {formErrors.precio}
              </p>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Categoría
            </label>
            <select
              name="categoria"
              value={productoForm.categoria}
              onChange={handleProductoChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                backgroundColor: 'white',
                fontFamily: "'Poppins', sans-serif"
              }}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Tiempo de fabricación
            </label>
            <input
              type="text"
              name="tiempoFabricacion"
              value={productoForm.tiempoFabricacion}
              placeholder="ej: 3-5 días"
              onChange={handleProductoChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Stock actual
            </label>
            <input
              type="text"
              name="stock"
              value={productoForm.stock}
              onChange={handleProductoChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: formErrors.stock ? '1px solid red' : '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
            {formErrors.stock && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Poppins', sans-serif" }}>
                {formErrors.stock}
              </p>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Stock mínimo
            </label>
            <input
              type="text"
              name="stockMinimo"
              value={productoForm.stockMinimo}
              onChange={handleProductoChange}
              placeholder="Cantidad para alerta"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Destacado
            </label>
            <div style={{ display: 'flex', alignItems: 'center', height: '41px' }}>
              <input
                type="checkbox"
                name="destacado"
                checked={productoForm.destacado}
                onChange={handleCheckboxChange}
                style={{
                  width: '18px',
                  height: '18px',
                  marginRight: '8px'
                }}
              />
              <span style={{ fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
                Mostrar en página principal
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Tallas disponibles
            </label>
            <input
              type="text"
              name="tallas"
              value={productoForm.tallas}
              onChange={handleProductoChange}
              placeholder="ej: 35, 36, 37, 38, 39"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Colores disponibles
            </label>
            <input
              type="text"
              name="colores"
              value={productoForm.colores}
              onChange={handleProductoChange}
              placeholder="ej: Negro, Marrón, Beige"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={productoForm.descripcion}
            onChange={handleProductoChange}
            placeholder="Características, materiales, instrucciones de cuidado, etc."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: "'Poppins', sans-serif",
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              backgroundColor: 'white',
              color: '#666',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '8px',
              cursor: isSaving ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Poppins', sans-serif",
              opacity: isSaving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '8px',
              cursor: isSaving ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Poppins', sans-serif",
              opacity: isSaving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isSaving ? 'Guardando...' : 'Añadir producto'}
          </button>
        </div>
      </form>
      
      {/* Modal para mostrar el código QR generado */}
      {showQrModal && (
        <QRCodeModal
          qrUrl={qrCodeUrl}
          itemName={productoForm.nombre}
          itemType="producto"
          itemId={savedItemId}
          onClose={handleCloseQrModal}
          isClosing={isQrModalClosing}
        />
      )}
    </div>
  );
}

export default ProductoFormComponent; 