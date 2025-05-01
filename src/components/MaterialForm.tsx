import { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { uploadImageToSupabase, generateQRCode } from '../lib/hooks';
import QRCodeModal from './QRCodeModal';
import React from 'react';

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
  qrCode?: string;
}

interface MaterialFormProps {
  onClose: () => void;
  isClosing: boolean;
}

function MaterialFormComponent({ onClose, isClosing }: MaterialFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const formImageInputRef = useRef<HTMLInputElement>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [processingImageWithOCR, setProcessingImageWithOCR] = useState(false);
  const [processingPDFWithOCR, setProcessingPDFWithOCR] = useState(false);
  const [processingText, setProcessingText] = useState(false);
  
  // Estados para el QR
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [isQrModalClosing, setIsQrModalClosing] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string>('');
  
  // Estado para el texto extraído del PDF/imagen
  const [extractedText, setExtractedText] = useState<string>('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [isExtractedTextClosing, setIsExtractedTextClosing] = useState(false);
  
  // Usamos el hook personalizado para inventario
  const { addInventarioItem } = useInventario();
  
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
  // Estado para mensajes de errores del servidor
  const [serverError, setServerError] = useState<string | null>(null);

  // Estado para previsualización de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  // Opciones de unidades para el select
  const unidades = [
    'metros',
    'metros cuadrados',
    'unidades',
    'pares',
    'kilogramos',
    'gramos',
    'litros',
    'mililitros',
    'pulgadas',
    'centímetros',
    'rollos',
    'cajas',
    'bobinas'
  ];

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar el tamaño del archivo (límite 5MB)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 5) {
        setServerError('La imagen es demasiado grande. El tamaño máximo permitido es 5MB.');
        // Limpiar el input para permitir subir el mismo archivo después de corregirlo
        e.target.value = '';
        return;
      }

      // Verificar el tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setServerError('Formato no válido. Por favor, sube una imagen en formato JPG o PNG.');
        e.target.value = '';
        return;
      }
      
      // Indicar que estamos procesando la imagen
      setLoadingAI(true);
      setProcessingImageWithOCR(true);
      setServerError(null); // Limpiar errores previos
      
      try {
        // Guardar temporalmente el archivo para procesarlo con Python OCR
        const tempPath = await saveTemporaryFile(file);
        
        if (!tempPath) {
          throw new Error('No se pudo guardar la imagen temporalmente');
        }
        
        console.log('Enviando imagen para procesamiento OCR:', tempPath);
        
        // Llamar al procesamiento OCR usando IPC
        const result = await window.ipcRenderer.invoke('process-material-ocr', tempPath);
        
        console.log('Resultado del OCR de imagen:', result);
        
        if (result) {
          // Actualizar el formulario con los datos extraídos preservando valores existentes
          setMaterialForm(prev => ({
            ...prev,
            nombre: prev.nombre || result.nombre || '',
            referencia: prev.referencia || result.referencia || '',
            unidades: prev.unidades || result.unidades || '',
            stock: prev.stock || result.stock || '',
            stockMinimo: prev.stockMinimo || result.stockMinimo || '',
            precio: prev.precio || result.precio || '',
            categoria: prev.categoria || result.categoria || '',
            proveedor: prev.proveedor || result.proveedor || '',
            descripcion: prev.descripcion || result.descripcion || '',
            fechaAdquisicion: prev.fechaAdquisicion || result.fechaAdquisicion || '',
            ubicacion: prev.ubicacion || result.ubicacion || ''
            // No actualizamos imagenUrl aquí
          }));
          
          // Mostrar el texto extraído en su formato original JSON
          if (typeof result === 'string') {
            setExtractedText(result);
          } else {
            setExtractedText(JSON.stringify(result, null, 2));
          }
          
          setShowExtractedText(true);
        }
      } catch (error: any) {
        console.error('Error al procesar la imagen:', error);
        
        // Mensaje de error más detallado y orientado al usuario
        let errorMessage = error.message || 'Error desconocido';
        let errorTitle = "Error de procesamiento";
        let errorDescription = "No se pudo analizar la imagen";
        
        // Verificar si es un error específico y proporcionar mensajes más útiles
        if (errorMessage.includes('unicodeescape') || errorMessage.includes('path')) {
          errorMessage = 'Hay caracteres especiales en el nombre del archivo. Renómbralo con caracteres simples e intenta de nuevo.';
        } else if (errorMessage.includes('OCR') || errorMessage.includes('tesseract')) {
          errorMessage = 'No se pudo leer el texto en la imagen. Asegúrate de que la imagen tenga buena calidad, esté bien iluminada y el texto sea legible.';
          errorTitle = "Problema con el reconocimiento de texto";
          errorDescription = "La imagen no contiene texto legible o su calidad es insuficiente";
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timedout')) {
          errorMessage = 'El procesamiento tomó demasiado tiempo. Intenta con una imagen más pequeña o menos compleja.';
          errorTitle = "Tiempo de espera agotado";
        } else if (errorMessage.includes('memory') || errorMessage.includes('RAM')) {
          errorMessage = 'No hay suficiente memoria para procesar esta imagen. Intenta con una imagen más pequeña.';
          errorTitle = "Memoria insuficiente";
        }
        
        // Crear datos para mostrar el error
        const errorData = {
          error: true,
          nombre: errorTitle,
          descripcion: errorDescription,
          message: errorMessage,
          sugerencia: "Consejo: Usa imágenes claras y con buena iluminación. Formatos recomendados: JPG, PNG."
        };
        
        // Mostrar información sobre el error
        setExtractedText(JSON.stringify(errorData, null, 2));
        setShowExtractedText(true);
        
        // Mostrar mensaje de error en la consola para diagnóstico
        console.error('Error detallado:', error);
      } finally {
        setLoadingAI(false);
        setProcessingImageWithOCR(false);
        // Limpiar el input para permitir subir el mismo archivo de nuevo si es necesario
        if (e.target) e.target.value = '';
      }
    }
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar el tamaño del archivo (límite 10MB para PDFs)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 10) {
        setServerError('El PDF es demasiado grande. El tamaño máximo permitido es 10MB.');
        // Limpiar el input para permitir subir el mismo archivo después de corregirlo
        e.target.value = '';
        return;
      }

      // Verificar el tipo de archivo
      if (file.type !== 'application/pdf') {
        setServerError('Formato no válido. Por favor, sube un archivo PDF.');
        e.target.value = '';
        return;
      }
      
      setLoadingAI(true);
      setShowAIOptions(false);
      setProcessingPDFWithOCR(true);
      setServerError(null); // Limpiar errores previos
      
      try {
        // Guardar temporalmente el archivo PDF para procesarlo con Python
        const tempPath = await saveTemporaryFile(file);
        
        if (!tempPath) {
          throw new Error('No se pudo guardar el archivo temporalmente');
        }
        
        console.log('Enviando PDF para procesamiento OCR:', tempPath);
        
        // Llamar al procesamiento OCR usando IPC
        const result = await window.ipcRenderer.invoke('process-material-ocr', tempPath);
        
        console.log('Resultado del OCR:', result);
        
        if (result) {
          // Actualizar el formulario con los datos extraídos preservando valores existentes
          setMaterialForm(prev => ({
            ...prev,
            nombre: prev.nombre || result.nombre || '',
            referencia: prev.referencia || result.referencia || '',
            unidades: prev.unidades || result.unidades || '',
            stock: prev.stock || result.stock || '',
            stockMinimo: prev.stockMinimo || result.stockMinimo || '',
            precio: prev.precio || result.precio || '',
            categoria: prev.categoria || result.categoria || '',
            proveedor: prev.proveedor || result.proveedor || '',
            descripcion: prev.descripcion || result.descripcion || '',
            fechaAdquisicion: prev.fechaAdquisicion || result.fechaAdquisicion || '',
            ubicacion: prev.ubicacion || result.ubicacion || ''
          }));
          
          // Mostrar el texto extraído en su formato original JSON
          if (typeof result === 'string') {
            setExtractedText(result);
          } else {
            setExtractedText(JSON.stringify(result, null, 2));
          }
          
          setShowExtractedText(true);
        } else {
          throw new Error('No se pudieron extraer datos del PDF');
        }
      } catch (error: any) {
        console.error('Error al procesar el PDF:', error);
        
        // Mensaje de error más detallado y orientado al usuario
        let errorMessage = error.message || 'Error desconocido';
        let errorTitle = "Error de procesamiento";
        let errorDescription = "No se pudo analizar el PDF";
        let sugerencia = "Consejo: Asegúrate de que el PDF no esté protegido y contenga texto seleccionable, no solo imágenes.";
        
        // Verificar si es un error específico para proporcionar mensajes más útiles
        if (errorMessage.includes('unicodeescape') || errorMessage.includes('path')) {
          errorMessage = 'Hay caracteres especiales en el nombre del archivo. Renómbralo con caracteres simples e intenta de nuevo.';
        } else if (errorMessage.includes('PDF') || errorMessage.includes('PyMuPDF')) {
          errorMessage = 'El PDF está dañado o protegido. Asegúrate de que no tenga restricciones de seguridad.';
          errorTitle = "Problema con el archivo PDF";
          errorDescription = "El archivo PDF no se puede leer correctamente";
        } else if (errorMessage.includes('OCR') || errorMessage.includes('tesseract')) {
          errorMessage = 'No se pudo extraer texto legible del PDF. El documento podría contener solo imágenes o texto de baja calidad.';
          errorTitle = "Problema con el reconocimiento de texto";
          sugerencia = "Consejo: Sube un PDF que contenga texto seleccionable, no solo imágenes escaneadas.";
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timedout')) {
          errorMessage = 'El procesamiento tomó demasiado tiempo. El PDF podría ser muy grande o complejo.';
          errorTitle = "Tiempo de espera agotado";
          sugerencia = "Consejo: Intenta con un PDF más pequeño o menos complejo.";
        } else if (errorMessage.includes('memory') || errorMessage.includes('RAM')) {
          errorMessage = 'No hay suficiente memoria para procesar este PDF. Intenta con un archivo más pequeño.';
          errorTitle = "Memoria insuficiente";
        }
        
        // Crear datos para mostrar el error
        const errorData = {
          error: true,
          nombre: errorTitle,
          descripcion: errorDescription,
          message: errorMessage,
          sugerencia: sugerencia
        };
        
        // Mostrar información sobre el error
        setExtractedText(JSON.stringify(errorData, null, 2));
        setShowExtractedText(true);
        
        // Mostrar mensaje de error en la consola para diagnóstico
        console.error('Error detallado:', error);
      } finally {
        setLoadingAI(false);
        setProcessingPDFWithOCR(false);
        // Limpiar el input para permitir subir el mismo archivo de nuevo si es necesario
        if (e.target) e.target.value = '';
      }
    }
  };

  // Función para subir una imagen para el formulario
  const handleFormImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar el tamaño del archivo (límite 5MB)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 5) {
        setServerError('La imagen es demasiado grande. El tamaño máximo permitido es 5MB.');
        // Limpiar el input para permitir subir el mismo archivo después de corregirlo
        e.target.value = '';
        return;
      }

      // Verificar el tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setServerError('Formato no válido. Por favor, sube una imagen en formato JPG o PNG.');
        e.target.value = '';
        return;
      }
      
      // Crear URL para previsualización local
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Indicar que estamos subiendo la imagen
      setIsUploadingImage(true);
      setServerError(null); // Limpiar errores previos
      
      try {
        // Subir la imagen a Supabase Storage
        const imageUrl = await uploadImageToSupabase(file);
        
        if (imageUrl) {
          setMaterialForm(prev => ({
            ...prev,
            imagenUrl: imageUrl
          }));
        } else {
          // Si falla, aún podemos usar la URL local para la vista previa
          console.error('No se pudo subir la imagen a Supabase');
        }
      } catch (error) {
        console.error('Error al subir la imagen:', error);
        setServerError('Error al subir la imagen. Por favor, inténtalo de nuevo.');
      } finally {
        setIsUploadingImage(false);
        // Limpiar el input para permitir subir el mismo archivo de nuevo si es necesario
        if (e.target) e.target.value = '';
      }
    }
  };

  // Función para guardar temporalmente un archivo y obtener su ruta
  const saveTemporaryFile = async (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          // Generar un nombre único para el archivo temporal
          const tempFileName = `temp_${Date.now()}_${file.name}`;
          
          // Solicitar al proceso principal que guarde el archivo
          const tempPath = await window.ipcRenderer.invoke(
            'save-temp-file', 
            {
              fileName: tempFileName,
              data: event.target?.result
            }
          );
          
          resolve(tempPath);
        } catch (error) {
          console.error('Error al guardar archivo temporal:', error);
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('No se pudo leer el archivo'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
  };

  const processRawText = async () => {
    if (rawText.trim() === '') {
      return;
    }
    
    setLoadingAI(true);
    setShowTextInput(false);
    setShowAIOptions(false);
    setProcessingText(true);
    
    try {
      console.log('Enviando texto para análisis con IA:', rawText);
      
      // Llamar al servicio de IA para procesar el texto directamente
      const result = await window.ipcRenderer.invoke('process-material-text', rawText);
      
      console.log('Resultado del análisis de texto:', result);
      
      if (result) {
        // Actualizar el formulario con los datos extraídos preservando valores existentes
        setMaterialForm(prev => ({
          ...prev,
          nombre: prev.nombre || result.nombre || '',
          referencia: prev.referencia || result.referencia || '',
          unidades: prev.unidades || result.unidades || '',
          stock: prev.stock || result.stock || '',
          stockMinimo: prev.stockMinimo || result.stockMinimo || '',
          precio: prev.precio || result.precio || '',
          categoria: prev.categoria || result.categoria || '',
          proveedor: prev.proveedor || result.proveedor || '',
          descripcion: prev.descripcion || result.descripcion || '',
          fechaAdquisicion: prev.fechaAdquisicion || result.fechaAdquisicion || '',
          ubicacion: prev.ubicacion || result.ubicacion || ''
        }));
        
        // Mostrar el texto extraído en su formato original JSON
        if (typeof result === 'string') {
          setExtractedText(result);
        } else {
          setExtractedText(JSON.stringify(result, null, 2));
        }
        
        setShowExtractedText(true);
      } else {
        throw new Error('No se pudieron extraer datos del texto');
      }
    } catch (error: any) {
      console.error('Error al procesar el texto:', error);
      
      // Mensaje de error más detallado
      let errorMessage = error.message || 'Error desconocido';
      
      // Verificar si es un error específico de la ruta o codificación
      if (errorMessage.includes('unicodeescape') || errorMessage.includes('path')) {
        errorMessage = 'Error en la codificación de caracteres. Por favor contacte al soporte técnico.';
      }
      
      // Crear datos para mostrar el error
      const errorData = {
        error: true,
        nombre: "Error de procesamiento",
        descripcion: "No se pudo analizar el texto con IA",
        message: `Error: ${errorMessage}`
      };
      
      // Mostrar información sobre el error
      setExtractedText(JSON.stringify(errorData, null, 2));
      setShowExtractedText(true);
      
      // Mostrar mensaje de error en la consola para diagnóstico
      console.error('Error detallado:', error);
    } finally {
      setRawText('');
      setLoadingAI(false);
      setProcessingText(false);
    }
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

  const triggerFormImageInput = () => {
    formImageInputRef.current?.click();
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof MaterialForm, string>> = {};
    
    // Validar campos requeridos
    if (!materialForm.nombre.trim()) errors.nombre = 'Por favor, ingresa el nombre del material';
    if (!materialForm.stock.trim()) errors.stock = 'Por favor, ingresa la cantidad de stock actual';
    
    // Validar que stock y precio sean números
    if (materialForm.stock && !/^\d+$/.test(materialForm.stock)) 
      errors.stock = 'El stock debe ser un número entero (ej: 120)';
    
    if (materialForm.precio && !/^\d+(\.\d{1,2})?$/.test(materialForm.precio)) 
      errors.precio = 'El precio debe ser un número con hasta 2 decimales (ej: 45.99)';
    
    if (materialForm.stockMinimo && !/^\d+$/.test(materialForm.stockMinimo))
      errors.stockMinimo = 'El stock mínimo debe ser un número entero (ej: 30)';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setServerError(null);
    
    try {
      // Transformar los campos a formato snake_case para la base de datos
      const materialData = {
        nombre: materialForm.nombre,
        referencia: materialForm.referencia,
        unidades: materialForm.unidades,
        stock: materialForm.stock,
        stock_minimo: materialForm.stockMinimo,
        precio: materialForm.precio,
        categoria: materialForm.categoria,
        proveedor: materialForm.proveedor,
        descripcion: materialForm.descripcion,
        fecha_adquisicion: materialForm.fechaAdquisicion,
        ubicacion: materialForm.ubicacion,
        imagen_url: materialForm.imagenUrl
      };
      
      // Usar el hook de inventario para agregar el material
      // El código QR se genera y guarda automáticamente dentro del hook
      const result = await addInventarioItem('material', materialData);
      
      if (result && result.id) {
        console.log('Material guardado con éxito:', result);
        
        // El QR ya fue generado y guardado en el hook, solo necesitamos obtenerlo para mostrar
        // Si el resultado tiene la URL del QR, usamos esa
        if (result.qr_code) {
          setQrCodeUrl(result.qr_code);
        } else {
          // Si por alguna razón no tiene el QR, generamos uno solo para mostrar
          // pero no lo guardamos de nuevo
          const qrCode = await generateQRCode('material', result.id);
          setQrCodeUrl(qrCode);
        }
        
        setSavedItemId(result.id);
        
        // Mostrar modal con el código QR
        setShowQrModal(true);
      } else {
        setServerError('No se pudo guardar el material. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error al guardar el material:', error);
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
      aria-labelledby="material-form-title"
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
          id="material-form-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          Agregar material
        </h2>
      </header>
      
      {serverError && (
        <div 
          style={{ 
            backgroundColor: 'rgba(220, 38, 38, 0.1)', 
            color: '#DC2626', 
            padding: '12px', 
            borderRadius: '5px',
            marginBottom: '16px',
            fontSize: '14px',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
          }}
          role="alert"
          aria-live="assertive"
        >
          {serverError}
        </div>
      )}
      
      <form onSubmit={handleSubmitMaterial}>
        <section>
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
                  alt="Vista previa del material" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <PhotoIcon style={{ width: '40px', height: '40px', color: '#aaa' }} aria-hidden="true" />
              )}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label 
                  htmlFor="nombre-material"
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  Nombre material <span style={{ color: '#4F46E5' }}>*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  id="nombre-material"
                  value={materialForm.nombre}
                  onChange={handleMaterialChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: formErrors.nombre ? '1px solid red' : '1px solid #ddd',
                    fontSize: '14px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                  }}
                  placeholder="Ej: Cuero vacuno curtido vegetal"
                  aria-required="true"
                  aria-invalid={!!formErrors.nombre}
                  aria-describedby={formErrors.nombre ? "nombre-error" : undefined}
                />
                {formErrors.nombre && (
                  <p 
                    id="nombre-error"
                    style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                  >
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
                  id="form-image-input"
                  aria-label="Subir foto del material"
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
                  aria-busy={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
        </section>
        
        <section aria-label="Información de referencia">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="referencia-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Referencia
              </label>
              <input
                type="text"
                name="referencia"
                id="referencia-material"
                value={materialForm.referencia}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                placeholder="Ej: CV-2023-456"
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="unidades-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Unidades
              </label>
              <select
                name="unidades"
                id="unidades-material"
                value={materialForm.unidades}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  ...selectStyle(!!materialForm.unidades)
                }}
                aria-label="Selecciona unidades de medida"
              >
                <option value="" style={{color: placeholderColor}}>Seleccionar unidades</option>
                {unidades.map(unidad => (
                  <option key={unidad} value={unidad}>{unidad}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="proveedor-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                id="proveedor-material"
                value={materialForm.proveedor}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                placeholder="Ej: Curtidos Superiores S.A."
              />
            </div>
          </div>
        </section>

        <section aria-label="Información de inventario">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="stock-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Stock actual <span style={{ color: '#4F46E5' }}>*</span>
              </label>
              <input
                type="text"
                name="stock"
                id="stock-material"
                value={materialForm.stock}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.stock ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                inputMode="numeric"
                placeholder="Ej: 120"
                aria-required="true"
                aria-invalid={!!formErrors.stock}
                aria-describedby={formErrors.stock ? "stock-error" : undefined}
              />
              {formErrors.stock && (
                <p 
                  id="stock-error"
                  style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {formErrors.stock}
                </p>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="stock-minimo-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Stock mínimo
              </label>
              <input
                type="text"
                name="stockMinimo"
                id="stock-minimo-material"
                value={materialForm.stockMinimo}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                inputMode="numeric"
                placeholder="Ej: 30"
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="precio-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Precio
              </label>
              <input
                type="text"
                name="precio"
                id="precio-material"
                value={materialForm.precio}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.precio ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                inputMode="decimal"
                placeholder="Ej: 45.50"
                aria-invalid={!!formErrors.precio}
                aria-describedby={formErrors.precio ? "precio-error" : undefined}
              />
              {formErrors.precio && (
                <p 
                  id="precio-error"
                  style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {formErrors.precio}
                </p>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Clasificación y ubicación">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="categoria-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Categoría
              </label>
              <select
                name="categoria"
                id="categoria-material"
                value={materialForm.categoria}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  ...selectStyle(!!materialForm.categoria)
                }}
              >
                <option value="" style={{color: placeholderColor}}>Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="fecha-adquisicion-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Fecha de adquisición
              </label>
              <input
                type="date"
                name="fechaAdquisicion"
                id="fecha-adquisicion-material"
                value={materialForm.fechaAdquisicion}
                onChange={handleMaterialChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  color: materialForm.fechaAdquisicion ? 'inherit' : placeholderColor
                }}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="ubicacion-material"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Ubicación
              </label>
              <input
                type="text"
                name="ubicacion"
                id="ubicacion-material"
                value={materialForm.ubicacion}
                onChange={handleMaterialChange}
                placeholder="Almacén, estante..."
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
        </section>
        
        <section aria-label="Descripción">
          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="descripcion-material"
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              Descripción
            </label>
            <textarea
              name="descripcion"
              id="descripcion-material"
              value={materialForm.descripcion}
              onChange={handleMaterialChange}
              placeholder="Características, observaciones, etc."
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
        </section>
        
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
            aria-busy={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Añadir material'}
          </button>
        </div>
      </form>
      
      {showQrModal && (
        <QRCodeModal
          qrUrl={qrCodeUrl}
          itemName={materialForm.nombre}
          itemType="material"
          itemId={savedItemId}
          onClose={handleCloseQrModal}
          isClosing={isQrModalClosing}
        />
      )}
    </div>
  );
}

export default MaterialFormComponent; 