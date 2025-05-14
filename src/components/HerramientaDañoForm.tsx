import { useState, useRef } from 'react';
import { ArrowLeftIcon, PhotoIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { uploadImageToSupabase } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { Herramienta } from '../lib/types';

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

// Tipos para reporte de daños
export interface HerramientaDañoForm {
  descripcionDaño: string;
  fechaReporte: string; 
  nivelUrgencia: string;
  solicitante: string;
  imagenDañoUrl?: string;
}

interface HerramientaDañoFormProps {
  onClose: () => void;
  isClosing: boolean;
  herramienta: Herramienta & { type: 'herramienta' } | null;
}

function HerramientaDañoFormComponent({ onClose, isClosing, herramienta }: HerramientaDañoFormProps) {
  const formImageInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Estado para errores del servidor
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Estado para el formulario de reporte de daños
  const [reporteForm, setReporteForm] = useState<HerramientaDañoForm>({
    descripcionDaño: '',
    fechaReporte: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    nivelUrgencia: 'Media',
    solicitante: '',
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HerramientaDañoForm, string>>>({});

  // Estado para previsualización de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleReporteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReporteForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (formErrors[name as keyof HerramientaDañoForm]) {
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
    const errors: Partial<Record<keyof HerramientaDañoForm, string>> = {};
    
    // Validar campos requeridos
    if (!reporteForm.descripcionDaño.trim()) errors.descripcionDaño = 'La descripción del daño es obligatoria';
    if (!reporteForm.solicitante.trim()) errors.solicitante = 'El solicitante es obligatorio';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !herramienta) {
      return;
    }
    
    setIsSaving(true);
    setServerError(null);
    
    try {
      // Transformar los campos a formato snake_case para la base de datos
      const reporteData = {
        herramienta_id: herramienta.id,
        descripcion_daño: reporteForm.descripcionDaño,
        fecha_reporte: reporteForm.fechaReporte,
        nivel_urgencia: reporteForm.nivelUrgencia,
        solicitante: reporteForm.solicitante,
        imagen_daño_url: reporteForm.imagenDañoUrl,
        estado: 'Pendiente' // Estado inicial del reporte
      };
      
      // Insertar el reporte en la tabla de reportes de daños
      const { data, error } = await supabase
        .from('herramientas_reportes_daños')
        .insert(reporteData)
        .select();
      
      if (error) {
        throw error;
      }
      
      // Actualizar el estado de la herramienta si es necesario
      if (reporteForm.nivelUrgencia === 'Alta') {
        // Para urgencias altas, actualizar automáticamente el estado de la herramienta
        const { error: herramientaError } = await supabase
          .from('herramientas')
          .update({ estado: 'Necesita reparación' })
          .eq('id', herramienta.id);
          
        if (herramientaError) {
          console.error('Error al actualizar el estado de la herramienta:', herramientaError);
        }
      } else if (reporteForm.nivelUrgencia === 'Crítica') {
        // Para urgencias críticas, marcar como fuera de servicio
        const { error: herramientaError } = await supabase
          .from('herramientas')
          .update({ estado: 'Fuera de servicio' })
          .eq('id', herramienta.id);
          
        if (herramientaError) {
          console.error('Error al actualizar el estado de la herramienta a fuera de servicio:', herramientaError);
        }
      } else if (reporteForm.nivelUrgencia === 'Media') {
        // Para urgencias medias, actualizar a Regular
        const { error: herramientaError } = await supabase
          .from('herramientas')
          .update({ estado: 'Regular' })
          .eq('id', herramienta.id);
          
        if (herramientaError) {
          console.error('Error al actualizar el estado de la herramienta a regular:', herramientaError);
        }
      }
      
      console.log('Reporte de daño guardado con éxito:', data);
      
      // Cerrar el formulario después de guardar
      onClose();
      
    } catch (error: any) {
      console.error('Error al guardar el reporte de daño:', error);
      setServerError('Ocurrió un error al guardar el reporte. Intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Opciones de niveles de urgencia para el select
  const nivelesUrgencia = [
    'Baja',
    'Media',
    'Alta',
    'Crítica'
  ];

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
          setReporteForm(prev => ({
            ...prev,
            imagenDañoUrl: imageUrl
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
      aria-labelledby="herramienta-daño-form-title"
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
          id="herramienta-daño-form-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          Reportar daño de herramienta
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
      
      {/* Información de la herramienta */}
      {herramienta && (
        <div style={{
          backgroundColor: '#F9FAFB',
          borderRadius: '5px',
          padding: '16px',
          marginBottom: '20px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#EEF2FF',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#4F46E5' }} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              {herramienta.nombre}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
              {herramienta.modelo ? `Modelo: ${herramienta.modelo}` : ''}
              {herramienta.numero_serie ? ` • Serie: ${herramienta.numero_serie}` : ''}
            </div>
            <div style={{ 
              fontSize: '14px', 
              marginTop: '6px', 
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              display: 'inline-block',
              borderRadius: '16px',
              padding: '2px 10px',
              color: 
                herramienta.estado === 'Nuevo' || herramienta.estado === 'Excelente' ? '#10B981' :
                herramienta.estado === 'Bueno' ? '#3B82F6' :
                herramienta.estado === 'Regular' ? '#F59E0B' :
                herramienta.estado === 'Necesita reparación' || herramienta.estado === 'Fuera de servicio' ? '#EF4444' : '#6B7280'
            }}>
              Estado actual: {herramienta.estado || 'No especificado'}
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmitReporte}>
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
                Descripción del daño <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                name="descripcionDaño"
                value={reporteForm.descripcionDaño}
                onChange={handleReporteChange}
                placeholder="Describe el problema o daño de la herramienta..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.descripcionDaño ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
              {formErrors.descripcionDaño && (
                <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  {formErrors.descripcionDaño}
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
                  'Agregar foto del daño'
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
              Fecha del reporte
            </label>
            <input
              type="date"
              name="fechaReporte"
              value={reporteForm.fechaReporte}
              onChange={handleReporteChange}
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
              Nivel de urgencia
            </label>
            <select
              name="nivelUrgencia"
              value={reporteForm.nivelUrgencia}
              onChange={handleReporteChange}
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
              {nivelesUrgencia.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Solicitante <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="solicitante"
              value={reporteForm.solicitante}
              onChange={handleReporteChange}
              placeholder="Nombre de quien reporta"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: formErrors.solicitante ? '1px solid red' : '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            />
            {formErrors.solicitante && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {formErrors.solicitante}
              </p>
            )}
          </div>
        </div>
        
        {/* Nota informativa */}
        <div style={{ 
          backgroundColor: 'rgba(79, 70, 229, 0.1)', 
          borderRadius: '5px', 
          padding: '12px', 
          marginTop: '16px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#4F46E5',
          lineHeight: '1.5',
          border: '1px solid rgba(79, 70, 229, 0.2)',
        }}>
          <strong>Nota:</strong> Dependiendo del nivel de urgencia, el estado de la herramienta se actualizará automáticamente:
          <ul style={{ margin: '6px 0', paddingLeft: '20px' }}>
            <li>Urgencia <strong>Media</strong>: estado "Regular"</li>
            <li>Urgencia <strong>Alta</strong>: estado "Necesita reparación"</li> 
            <li>Urgencia <strong>Crítica</strong>: estado "Fuera de servicio"</li>
          </ul>
          Los reportes de daños serán revisados por el personal de mantenimiento.
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
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
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
            {isSaving ? 'Guardando...' : 'Enviar reporte'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default HerramientaDañoFormComponent; 