import { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon, DocumentIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { uploadImageToSupabase, generateQRCode } from '../lib/hooks';
import QRCodeModal from './QRCodeModal';
import { supabase } from '../lib/supabase';
import axios from 'axios';

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

  // Estado para mostrar el texto extraído del PDF
  const [extractedText, setExtractedText] = useState<string>('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

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

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoadingAI(true);
      setShowAIOptions(false);
      setOcrError(null);
      
      try {
        // Crear un objeto FormData para enviar el archivo
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Enviando PDF al servidor OCR...');
        
        // Enviar el PDF al servidor OCR con mayor tiempo de timeout
        const response = await axios.post('http://localhost:5000/ocr', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000, // 60 segundos de timeout
        });
        
        console.log('Respuesta recibida:', response);
        
        // Verificar si la respuesta es válida
        if (response.data && response.data.text) {
          // Obtener el texto extraído
          const extractedText = response.data.text;
          console.log('Texto extraído (primeros 100 caracteres):', extractedText.substring(0, 100));
          setExtractedText(extractedText);
          setShowExtractedText(true);
        } else {
          console.error('La respuesta no contiene el campo text esperado:', response.data);
          setOcrError('La respuesta del servidor OCR no tiene el formato esperado.');
        }
      } catch (error: any) {
        console.error('Error al procesar el PDF:', error);
        
        // Mostrar detalles específicos del error
        if (error.response) {
          // El servidor respondió con un código que no es 2xx
          console.error('Error de respuesta del servidor:', error.response.data);
          console.error('Código de estado:', error.response.status);
          setOcrError(`Error del servidor OCR: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          // La solicitud se hizo pero no hubo respuesta
          console.error('No hubo respuesta del servidor:', error.request);
          setOcrError('No hay respuesta del servidor OCR. Verifica que esté en funcionamiento en http://localhost:5000');
        } else {
          // Algo sucedió al configurar la solicitud
          console.error('Error al configurar la solicitud:', error.message);
          setOcrError(`Error al procesar el PDF: ${error.message}`);
        }
      } finally {
        setLoadingAI(false);
      }
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
      setHerramientaForm({
        nombre: 'Sierra Circular Profesional',
        modelo: 'SC-1500',
        numeroSerie: 'SCP-2023-789',
        estado: 'Bueno',
        fechaAdquisicion: new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0],
        ultimoMantenimiento: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
        proximoMantenimiento: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
        ubicacion: 'Taller de corte, estante 2',
        responsable: 'Ana Martínez',
        descripcion: 'Sierra circular profesional con disco de 7 pulgadas. Potencia de 1500W. Incluye guía de corte y protector de seguridad. Velocidad ajustable.',
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
      setHerramientaForm({
        nombre: 'Máquina de Coser Industrial',
        modelo: 'MSI-5000',
        numeroSerie: 'MCI-2023-123',
        estado: 'Nuevo',
        fechaAdquisicion: new Date().toISOString().split('T')[0],
        ultimoMantenimiento: new Date().toISOString().split('T')[0],
        proximoMantenimiento: new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0],
        ubicacion: 'Área de producción, sección 3',
        responsable: 'María López',
        descripcion: 'Máquina de coser industrial de alta velocidad. Ideal para trabajos con cuero y materiales gruesos. Incluye 10 tipos de puntadas diferentes y sistema de lubricación automática.',
      });
      
      setLoadingAI(false);
    }, 1500);
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

  // Función para cerrar el modal de texto extraído
  const closeExtractedTextModal = () => {
    setShowExtractedText(false);
  };

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
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Agregar herramienta</h2>
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
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Ingresar descripción de la herramienta</h2>
          </div>
          
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontFamily: "'Poppins', sans-serif" }}>
            Describe la herramienta con todos los detalles que puedas (nombre, modelo, características, estado, etc.) y la IA extraerá la información para completar el formulario.
          </p>
          
          <textarea
            value={rawText}
            onChange={handleRawTextChange}
            placeholder="Ej: Sierra circular profesional modelo SC-1500, número de serie SCP-2023-789, en buen estado. Adquirida hace 6 meses, último mantenimiento hace un mes. Está a cargo de Ana Martínez y se encuentra en el taller de corte..."
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
      
      <form onSubmit={handleSubmitHerramienta}>
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
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
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
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Estado
            </label>
            <select
              name="estado"
              value={herramientaForm.estado}
              onChange={handleHerramientaChange}
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
              <option value="">Seleccionar estado</option>
              {estados.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
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
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
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
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
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
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Poppins', sans-serif"
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
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
            value={herramientaForm.descripcion}
            onChange={handleHerramientaChange}
            placeholder="Características, observaciones, instrucciones de uso, etc."
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
      
      {/* Modal para mostrar el texto extraído del PDF */}
      {showExtractedText && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <button
              onClick={closeExtractedTextModal}
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
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Texto extraído del PDF</h2>
          </div>
          
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f9f9f9',
              fontSize: '14px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              marginBottom: '20px',
            }}
            className="apple-scrollbar"
          >
            {extractedText || 'No se pudo extraer texto del documento.'}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button
              onClick={closeExtractedTextModal}
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
              Cerrar
            </button>
            
            <button
              onClick={completeWithAI}
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
              <SparklesIcon style={{ width: '16px', height: '16px', marginRight: '6px', color: '#4F46E5' }} />
              Procesar con IA
            </button>
          </div>
        </div>
      )}
      
      {/* Mostrar mensaje de error de OCR si existe */}
      {ocrError && (
        <div style={{ 
          backgroundColor: 'rgba(220, 38, 38, 0.1)', 
          color: '#DC2626', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          fontFamily: "'Poppins', sans-serif"
        }}>
          {ocrError}
        </div>
      )}
    </div>
  );
}

export default HerramientaFormComponent; 