import { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon, DocumentIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';

// Estilo global para aplicar Poppins a todo el componente
const globalStyles = {
  fontFamily: "'Poppins', sans-serif",
};

// Tipos para materiales
export interface MaterialForm {
  nombre: string;
  referencia: string;
  unidades: string;
  stock: string;
  stockMinimo: string;
  precio: string;
  categoria: string;
  proveedor: string;
  descripcion: string;
  fechaAdquisicion: string;
  ubicacion: string;
  imagenUrl?: string;
}

interface MaterialFormProps {
  onClose: () => void;
  isClosing: boolean;
}

function MaterialFormComponent({ onClose, isClosing }: MaterialFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [rawText, setRawText] = useState('');
  
  // Estado para el formulario de materiales con campos adicionales
  const [materialForm, setMaterialForm] = useState<MaterialForm>({
    nombre: '',
    referencia: '',
    unidades: '',
    stock: '',
    stockMinimo: '',
    precio: '',
    categoria: '',
    proveedor: '',
    descripcion: '',
    fechaAdquisicion: '',
    ubicacion: '',
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MaterialForm, string>>>({});

  // Estado para previsualización de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleMaterialChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMaterialForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (formErrors[name as keyof MaterialForm]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Crear URL para previsualización
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // En una implementación real, aquí se subiría la imagen a un servidor
      // y se obtendría la URL para guardarla en el formulario
      setMaterialForm(prev => ({
        ...prev,
        imagenUrl: previewUrl
      }));
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
        setMaterialForm({
          nombre: 'Piel Sintética Ecológica',
          referencia: 'PSE-2023-789',
          unidades: 'metros cuadrados',
          stock: '85',
          stockMinimo: '20',
          precio: '32.75',
          categoria: 'Textil',
          proveedor: 'EcoMateriales S.L.',
          descripcion: 'Material sintético de alta calidad con apariencia de cuero. Impermeable y resistente a manchas. Ideal para calzado casual y bolsos. Disponible en varios colores.',
          fechaAdquisicion: new Date().toISOString().split('T')[0],
          ubicacion: 'Almacén B, Estante 2',
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
      setMaterialForm({
        nombre: 'Corcho Natural Premium',
        referencia: 'CNP-2023-789',
        unidades: 'láminas',
        stock: '50',
        stockMinimo: '15',
        precio: '28.99',
        categoria: 'Otros',
        proveedor: 'Corcheras Ibéricas S.L.',
        descripcion: 'Material de corcho natural para plantillas. Proporiona amortiguación y es antibacteriano. Espesor de 3mm. Ideal para plantillas de calzado de alta gama.',
        fechaAdquisicion: new Date().toISOString().split('T')[0],
        ubicacion: 'Almacén C, Estante 2',
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
    const errors: Partial<Record<keyof MaterialForm, string>> = {};
    
    // Validar campos requeridos
    if (!materialForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!materialForm.stock.trim()) errors.stock = 'El stock es obligatorio';
    
    // Validar que stock y precio sean números
    if (materialForm.stock && !/^\d+$/.test(materialForm.stock)) 
      errors.stock = 'El stock debe ser un número';
    
    if (materialForm.precio && !/^\d+(\.\d{1,2})?$/.test(materialForm.precio)) 
      errors.precio = 'El precio debe ser un número válido';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    console.log('Material enviado:', materialForm);
    // Aquí iría la lógica para guardar el material
    onClose();
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

  // Completar con IA automáticamente (función original)
  const completeWithAI = () => {
    setLoadingAI(true);
    setShowAIOptions(false);
    
    // Simulación de carga - en producción, aquí iría una llamada a la API de IA
    setTimeout(() => {
      setMaterialForm({
        nombre: 'Cuero Vacuno Premium',
        referencia: 'CV-2023-456',
        unidades: 'metros cuadrados',
        stock: '120',
        stockMinimo: '30',
        precio: '45.50',
        categoria: 'Cuero',
        proveedor: 'Curtidos Superiores S.A.',
        descripcion: 'Cuero vacuno de alta calidad, curtido al vegetal. Ideal para la fabricación de calzado de gama alta. Resistente al desgaste y con un acabado premium. Grosor de 2mm. Color marrón oscuro.',
        fechaAdquisicion: new Date().toISOString().split('T')[0],
        ubicacion: 'Almacén A, Estante 3',
      });
      
      setLoadingAI(false);
    }, 1500);
  };

  // Opciones de categorías para el select
  const categorias = [
    'Cuero',
    'Textil',
    'Hilo',
    'Adhesivo',
    'Suela',
    'Hebilla',
    'Ornamento',
    'Plantilla',
    'Otros'
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
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Agregar material</h2>
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
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Ingresar descripción del material</h2>
          </div>
          
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontFamily: "'Poppins', sans-serif" }}>
            Describe el material con todos los detalles que puedas (nombre, tipo, características, cantidad, precio, etc.) y la IA extraerá la información para completar el formulario.
          </p>
          
          <textarea
            value={rawText}
            onChange={handleRawTextChange}
            placeholder="Ej: 50 láminas de corcho natural premium de 3mm de espesor para plantillas. Precio unitario 28.99€. Proveedor: Corcheras Ibéricas S.L. Son antibacterianas e ideales para calzado de alta gama..."
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
      
      <form onSubmit={handleSubmitMaterial}>
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
                Nombre material <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={materialForm.nombre}
                onChange={handleMaterialChange}
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
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#555',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Agregar foto
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
              Referencia
            </label>
            <input
              type="text"
              name="referencia"
              value={materialForm.referencia}
              onChange={handleMaterialChange}
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
              Unidades
            </label>
            <input
              type="text"
              name="unidades"
              value={materialForm.unidades}
              placeholder="metros, kg, litros..."
              onChange={handleMaterialChange}
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
              Proveedor
            </label>
            <input
              type="text"
              name="proveedor"
              value={materialForm.proveedor}
              onChange={handleMaterialChange}
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
              Stock actual <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="stock"
              value={materialForm.stock}
              onChange={handleMaterialChange}
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
              value={materialForm.stockMinimo}
              onChange={handleMaterialChange}
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
              Precio
            </label>
            <input
              type="text"
              name="precio"
              value={materialForm.precio}
              onChange={handleMaterialChange}
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
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Categoría
            </label>
            <select
              name="categoria"
              value={materialForm.categoria}
              onChange={handleMaterialChange}
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
              Fecha de adquisición
            </label>
            <input
              type="date"
              name="fechaAdquisicion"
              value={materialForm.fechaAdquisicion}
              onChange={handleMaterialChange}
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
              Ubicación
            </label>
            <input
              type="text"
              name="ubicacion"
              value={materialForm.ubicacion}
              onChange={handleMaterialChange}
              placeholder="Almacén, estante..."
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
            value={materialForm.descripcion}
            onChange={handleMaterialChange}
            placeholder="Características, observaciones, etc."
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
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
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
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Añadir material
          </button>
        </div>
      </form>
    </div>
  );
}

export default MaterialFormComponent; 