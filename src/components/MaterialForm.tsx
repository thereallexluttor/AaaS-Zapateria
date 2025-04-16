import { useState, useRef, useEffect } from 'react';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon, DocumentIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { uploadImageToSupabase, generateQRCode } from '../lib/hooks';
import QRCodeModal from './QRCodeModal';
import { supabase } from '../lib/supabase';
import React from 'react';

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
      // Para análisis OCR, NO mostramos la imagen en el formulario
      // No actualizar setImagePreview
      
      // Indicar que estamos procesando la imagen
      setLoadingAI(true);
      setProcessingImageWithOCR(true);
      
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
        
        // Mensaje de error más detallado
        let errorMessage = error.message || 'Error desconocido';
        
        // Verificar si es un error específico de la ruta o codificación
        if (errorMessage.includes('unicodeescape') || errorMessage.includes('path')) {
          errorMessage = 'Error en la codificación de caracteres. Por favor contacte al soporte técnico.';
        } else if (errorMessage.includes('OCR') || errorMessage.includes('tesseract')) {
          errorMessage = 'Error en el procesamiento OCR. Verifique que la imagen tenga buena calidad.';
        }
        
        // Crear datos para mostrar el error
        const errorData = {
          error: true,
          nombre: "Error de procesamiento",
          descripcion: "No se pudo analizar la imagen",
          message: `Error: ${errorMessage}`
        };
        
        // Mostrar información sobre el error
        setExtractedText(JSON.stringify(errorData, null, 2));
        setShowExtractedText(true);
        
        // Mostrar mensaje de error en la consola para diagnóstico
        console.error('Error detallado:', error);
      } finally {
        setLoadingAI(false);
        setProcessingImageWithOCR(false);
      }
    }
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoadingAI(true);
      setShowAIOptions(false);
      setProcessingPDFWithOCR(true);
      
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
        
        // Mensaje de error más detallado
        let errorMessage = error.message || 'Error desconocido';
        
        // Verificar si es un error específico de la ruta o codificación
        if (errorMessage.includes('unicodeescape') || errorMessage.includes('path')) {
          errorMessage = 'Error en la codificación de caracteres. Por favor contacte al soporte técnico.';
        } else if (errorMessage.includes('PDF') || errorMessage.includes('PyMuPDF')) {
          errorMessage = 'Error en el procesamiento del PDF. El archivo podría estar dañado o protegido.';
        } else if (errorMessage.includes('OCR') || errorMessage.includes('tesseract')) {
          errorMessage = 'Error en el procesamiento OCR. Verifique que el PDF contenga texto legible.';
        }
        
        // Crear datos para mostrar el error
        const errorData = {
          error: true,
          nombre: "Error de procesamiento",
          descripcion: "No se pudo analizar el PDF",
          message: `Error: ${errorMessage}`
        };
        
        // Mostrar información sobre el error
        setExtractedText(JSON.stringify(errorData, null, 2));
        setShowExtractedText(true);
        
        // Mostrar mensaje de error en la consola para diagnóstico
        console.error('Error detallado:', error);
      } finally {
        setLoadingAI(false);
        setProcessingPDFWithOCR(false);
      }
    }
  };

  // Función para subir una imagen para el formulario (no para OCR)
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
      } finally {
        setIsUploadingImage(false);
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
      setMaterialForm(prev => ({
        ...prev,
        nombre: prev.nombre || 'Cuero Vacuno Premium',
        referencia: prev.referencia || 'CV-2023-456',
        unidades: prev.unidades || 'metros cuadrados',
        stock: prev.stock || '120',
        stockMinimo: prev.stockMinimo || '30',
        precio: prev.precio || '45.50',
        categoria: prev.categoria || 'Cuero',
        proveedor: prev.proveedor || 'Curtidos Superiores S.A.',
        descripcion: prev.descripcion || 'Cuero vacuno de alta calidad, curtido al vegetal. Ideal para la fabricación de calzado de gama alta. Resistente al desgaste y con un acabado premium. Grosor de 2mm. Color marrón oscuro.',
        fechaAdquisicion: prev.fechaAdquisicion || new Date().toISOString().split('T')[0],
        ubicacion: prev.ubicacion || 'Almacén A, Estante 3'
      }));
      
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

  // Función para cerrar el modal de texto extraído
  const closeExtractedTextModal = () => {
    setIsExtractedTextClosing(true);
    setTimeout(() => {
      setShowExtractedText(false);
      setIsExtractedTextClosing(false);
    }, 300);
  };

  // Función para formatear los datos extraídos para mostrarlos
  const formatExtractedDataForDisplay = (jsonText: string) => {
    try {
      let data;
      if (typeof jsonText === 'string') {
        data = JSON.parse(jsonText);
      } else {
        data = jsonText;
      }
      
      // Crear un objeto con las etiquetas en español
      const labels: Record<string, string> = {
        nombre: 'Nombre',
        referencia: 'Referencia',
        unidades: 'Unidades',
        stock: 'Stock',
        stockMinimo: 'Stock Mínimo',
        precio: 'Precio',
        categoria: 'Categoría',
        proveedor: 'Proveedor',
        descripcion: 'Descripción',
        fechaAdquisicion: 'Fecha de Adquisición',
        ubicacion: 'Ubicación'
      };
      
      // Crear el HTML para mostrar los datos
      return (
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '16px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            Datos extraídos:
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '8px',
            fontSize: '14px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            {Object.entries(data).map(([key, value]) => {
              if (key !== 'error' && key !== 'message' && labels[key]) {
                return (
                  <React.Fragment key={key}>
                    <div style={{ 
                      fontWeight: 500, 
                      color: '#555',
                      padding: '4px 0'
                    }}>
                      {labels[key] || key}:
                    </div>
                    <div style={{ 
                      color: '#333',
                      padding: '4px 0'
                    }}>
                      {value as string || '-'}
                    </div>
                  </React.Fragment>
                );
              }
              return null;
            })}
          </div>
          
          {data.error && (
            <div style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#DC2626',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '14px'
            }}>
              <strong>Error:</strong> {data.message}
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error al formatear datos:', error);
      return <div>Error al procesar datos</div>;
    }
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
          
          {/* Mensaje de procesamiento de imagen */}
          {processingImageWithOCR && (
            <div style={{ 
              position: 'absolute', 
              top: '44px', 
              right: 0,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '8px',
              padding: '12px 16px',
              width: '240px',
              zIndex: 15,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <PhotoIcon style={{ width: '16px', height: '16px', marginRight: '8px', color: '#16A34A' }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#16A34A' }}>Analizando imagen</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
                Extrayendo texto con OCR y procesando con IA para completar el formulario...
              </p>
            </div>
          )}
          
          {/* Mensaje de procesamiento de PDF */}
          {processingPDFWithOCR && (
            <div style={{ 
              position: 'absolute', 
              top: '44px', 
              right: 0,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '8px',
              padding: '12px 16px',
              width: '240px',
              zIndex: 15,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <DocumentIcon style={{ width: '16px', height: '16px', marginRight: '8px', color: '#DC2626' }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#DC2626' }}>Analizando PDF</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D' }}>
                Extrayendo texto del documento y procesando con IA para completar el formulario...
              </p>
            </div>
          )}
          
          {/* Mensaje de procesamiento de texto */}
          {processingText && (
            <div style={{ 
              position: 'absolute', 
              top: '44px', 
              right: 0,
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '8px',
              padding: '12px 16px',
              width: '240px',
              zIndex: 15,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <ChatBubbleBottomCenterTextIcon style={{ width: '16px', height: '16px', marginRight: '8px', color: '#0EA5E9' }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#0EA5E9' }}>Analizando texto</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#0C4A6E' }}>
                Procesando descripción textual con IA para completar el formulario...
              </p>
            </div>
          )}
          
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
                  borderRadius: '8px',
                  cursor: isUploadingImage ? 'default' : 'pointer',
                  fontSize: '14px',
                  color: '#555',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Poppins', sans-serif",
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
                fontFamily: "'Poppins', sans-serif",
                fontStyle: 'italic'
              }}>
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
            {isSaving ? 'Guardando...' : 'Añadir material'}
          </button>
        </div>
      </form>
      
      {/* Modal para mostrar el código QR generado */}
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
      
      {/* Modal para mostrar el texto extraído del PDF/imagen */}
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
            opacity: isExtractedTextClosing ? 0 : 1,
            transform: isExtractedTextClosing ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.3s ease-in-out',
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
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>
              Datos extraídos del documento
            </h2>
          </div>
          
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '2px solid #4F46E5',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f9f9f9',
              fontSize: '14px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              marginBottom: '20px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            className="apple-scrollbar"
          >
            {extractedText || 'No se pudo extraer texto del documento.'}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ 
                fontSize: '14px', 
                color: '#16A34A', 
                fontFamily: "'Poppins', sans-serif", 
                margin: '0 0 8px 0' 
              }}>
                Los datos extraídos han sido aplicados al formulario
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialFormComponent; 