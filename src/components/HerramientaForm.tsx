import { useState, useRef } from 'react';
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

// Tipos para herramientas
export interface HerramientaForm {
  nombre: string;
  modelo: string;
  numeroSerie: string;
  estado: string;
  fechaAdquisicion: string;
  ultimoMantenimiento: string;
  proximoMantenimiento: string;
  ubicacion: string;
  responsable: string;
  descripcion: string;
  imagenUrl?: string;
  qrCode?: string;
}

interface HerramientaFormProps {
  onClose: () => void;
  isClosing: boolean;
}

function HerramientaFormComponent({ onClose, isClosing }: HerramientaFormProps) {
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
  
  // Estado para el formulario de herramientas
  const [herramientaForm, setHerramientaForm] = useState<HerramientaForm>({
    nombre: '',
    modelo: '',
    numeroSerie: '',
    estado: '',
    fechaAdquisicion: '',
    ultimoMantenimiento: '',
    proximoMantenimiento: '',
    ubicacion: '',
    responsable: '',
    descripcion: ''
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HerramientaForm, string>>>({});

  // Estado para previsualización de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleHerramientaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setHerramientaForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (formErrors[name as keyof HerramientaForm]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const triggerFormImageInput = () => {
    formImageInputRef.current?.click();
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof HerramientaForm, string>> = {};
    
    // Validar campos requeridos
    if (!herramientaForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitHerramienta = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setServerError(null);
    
    try {
      // Transformar los campos a formato snake_case para la base de datos
      const herramientaData = {
        nombre: herramientaForm.nombre,
        modelo: herramientaForm.modelo,
        numero_serie: herramientaForm.numeroSerie,
        estado: herramientaForm.estado,
        fecha_adquisicion: herramientaForm.fechaAdquisicion,
        ultimo_mantenimiento: herramientaForm.ultimoMantenimiento,
        proximo_mantenimiento: herramientaForm.proximoMantenimiento,
        ubicacion: herramientaForm.ubicacion,
        responsable: herramientaForm.responsable,
        descripcion: herramientaForm.descripcion,
        imagen_url: herramientaForm.imagenUrl
      };
      
      // Usar el hook de inventario para agregar la herramienta
      // El código QR se genera y guarda automáticamente dentro del hook
      const result = await addInventarioItem('herramienta', herramientaData);
      
      if (result && result.id) {
        console.log('Herramienta guardada con éxito:', result);
        
        // El QR ya fue generado y guardado en el hook, solo necesitamos obtenerlo para mostrar
        // Si el resultado tiene la URL del QR, usamos esa
        if (result.qr_code) {
          setQrCodeUrl(result.qr_code);
        } else {
          // Si por alguna razón no tiene el QR, generamos uno solo para mostrar
          // pero no lo guardamos de nuevo
          const qrCode = await generateQRCode('herramienta', result.id);
          setQrCodeUrl(qrCode);
        }
        
        setSavedItemId(result.id);
        
        // Mostrar modal con el código QR
        setShowQrModal(true);
      } else {
        setServerError('No se pudo guardar la herramienta. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error al guardar la herramienta:', error);
      setServerError('Ocurrió un error al guardar. Intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Opciones de estados para el select
  const estados = [
    'Nuevo',
    'Excelente',
    'Bueno',
    'Regular',
    'Necesita reparación',
    'Fuera de servicio'
  ];

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
          setHerramientaForm(prev => ({
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
      aria-labelledby="herramienta-form-title"
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
          id="herramienta-form-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          Agregar herramienta
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
      
      <form onSubmit={handleSubmitHerramienta}>
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
                Nombre herramienta <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={herramientaForm.nombre}
                onChange={handleHerramientaChange}
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
              Modelo
            </label>
            <input
              type="text"
              name="modelo"
              value={herramientaForm.modelo}
              onChange={handleHerramientaChange}
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
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Número de serie
            </label>
            <input
              type="text"
              name="numeroSerie"
              value={herramientaForm.numeroSerie}
              onChange={handleHerramientaChange}
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
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Estado
            </label>
            <select
              name="estado"
              value={herramientaForm.estado}
              onChange={handleHerramientaChange}
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
              <option value="">Seleccionar estado</option>
              {estados.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Fecha de adquisición
            </label>
            <input
              type="date"
              name="fechaAdquisicion"
              value={herramientaForm.fechaAdquisicion}
              onChange={handleHerramientaChange}
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
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Último mantenimiento
            </label>
            <input
              type="date"
              name="ultimoMantenimiento"
              value={herramientaForm.ultimoMantenimiento}
              onChange={handleHerramientaChange}
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
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Próximo mantenimiento
            </label>
            <input
              type="date"
              name="proximoMantenimiento"
              value={herramientaForm.proximoMantenimiento}
              onChange={handleHerramientaChange}
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

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Ubicación
            </label>
            <input
              type="text"
              name="ubicacion"
              value={herramientaForm.ubicacion}
              onChange={handleHerramientaChange}
              placeholder="ej: Taller principal, estante 2"
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
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Responsable
            </label>
            <input
              type="text"
              name="responsable"
              value={herramientaForm.responsable}
              onChange={handleHerramientaChange}
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
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={herramientaForm.descripcion}
            onChange={handleHerramientaChange}
            placeholder="Características, observaciones, instrucciones de uso, etc."
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
            disabled={isSaving}
            style={{
              backgroundColor: 'white',
              color: '#666',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '5px',
              cursor: isSaving ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
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
              borderRadius: '5px',
              cursor: isSaving ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              opacity: isSaving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isSaving ? 'Guardando...' : 'Añadir herramienta'}
          </button>
        </div>
      </form>
      
      {/* Modal para mostrar el código QR generado */}
      {showQrModal && (
        <QRCodeModal
          qrUrl={qrCodeUrl}
          itemName={herramientaForm.nombre}
          itemType="herramienta"
          itemId={savedItemId}
          onClose={handleCloseQrModal}
          isClosing={isQrModalClosing}
        />
      )}
    </div>
  );
}

export default HerramientaFormComponent; 