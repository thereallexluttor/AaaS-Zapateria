import { useState, useRef } from 'react';
import { ArrowLeftIcon, CalendarIcon, WrenchIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
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

// Tipos para programación de mantenimiento
export interface HerramientaMantenimientoForm {
  fechaMantenimiento: string;
  tipoMantenimiento: string;
  descripcion: string;
  responsable: string;
  recordatorio: boolean;
}

interface HerramientaMantenimientoFormProps {
  onClose: () => void;
  isClosing: boolean;
  herramienta: Herramienta & { type: 'herramienta' } | null;
}

function HerramientaMantenimientoFormComponent({ onClose, isClosing, herramienta }: HerramientaMantenimientoFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para errores del servidor
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Obtener la fecha actual para el valor por defecto
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  const defaultDate = nextMonth.toISOString().split('T')[0];
  
  // Estado para el formulario de mantenimiento
  const [mantenimientoForm, setMantenimientoForm] = useState<HerramientaMantenimientoForm>({
    fechaMantenimiento: defaultDate,
    tipoMantenimiento: 'Preventivo',
    descripcion: '',
    responsable: '',
    recordatorio: true
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HerramientaMantenimientoForm, string>>>({});

  const handleMantenimientoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setMantenimientoForm(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setMantenimientoForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Limpiar error cuando el usuario empieza a escribir
    if (formErrors[name as keyof HerramientaMantenimientoForm]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof HerramientaMantenimientoForm, string>> = {};
    
    // Validar campos requeridos
    if (!mantenimientoForm.fechaMantenimiento) errors.fechaMantenimiento = 'La fecha de mantenimiento es obligatoria';
    if (!mantenimientoForm.tipoMantenimiento) errors.tipoMantenimiento = 'El tipo de mantenimiento es obligatorio';
    if (!mantenimientoForm.responsable.trim()) errors.responsable = 'El responsable es obligatorio';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !herramienta) {
      return;
    }
    
    setIsSaving(true);
    setServerError(null);
    
    try {
      // Transformar los datos del formulario para la base de datos
      const mantenimientoData = {
        herramienta_id: herramienta.id,
        fecha_programada: mantenimientoForm.fechaMantenimiento,
        tipo_mantenimiento: mantenimientoForm.tipoMantenimiento,
        descripcion: mantenimientoForm.descripcion,
        responsable: mantenimientoForm.responsable,
        recordatorio: mantenimientoForm.recordatorio,
        estado: 'Programado',
        fecha_creacion: new Date().toISOString()
      };
      
      // Insertar el mantenimiento programado en la base de datos
      const { data, error } = await supabase
        .from('herramientas_mantenimientos')
        .insert(mantenimientoData)
        .select();
      
      if (error) {
        throw error;
      }
      
      // Actualizar la fecha del próximo mantenimiento en la herramienta
      const { error: herramientaError } = await supabase
        .from('herramientas')
        .update({ 
          proximo_mantenimiento: mantenimientoForm.fechaMantenimiento,
          ultimo_mantenimiento: today.toISOString().split('T')[0] // Si es un nuevo mantenimiento, actualizar la fecha del último
        })
        .eq('id', herramienta.id);
        
      if (herramientaError) {
        console.error('Error al actualizar las fechas de mantenimiento de la herramienta:', herramientaError);
      }
      
      console.log('Mantenimiento programado con éxito:', data);
      
      // Cerrar el formulario después de guardar
      onClose();
      
    } catch (error: any) {
      console.error('Error al programar el mantenimiento:', error);
      setServerError('Ocurrió un error al guardar. Intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Opciones de tipos de mantenimiento
  const tiposMantenimiento = [
    'Preventivo',
    'Correctivo',
    'Predictivo',
    'Calibración',
    'Limpieza'
  ];

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '5px',
        padding: '24px',
        width: '720px',
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
      aria-labelledby="herramienta-mantenimiento-form-title"
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
          id="herramienta-mantenimiento-form-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          Programar mantenimiento
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
            <WrenchIcon style={{ width: '20px', height: '20px', color: '#4F46E5' }} />
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
      
      <form onSubmit={handleSubmitMantenimiento}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Fecha de mantenimiento <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                name="fechaMantenimiento"
                value={mantenimientoForm.fechaMantenimiento}
                onChange={handleMantenimientoChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  paddingLeft: '36px',
                  borderRadius: '5px',
                  border: formErrors.fechaMantenimiento ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
              />
              <CalendarIcon style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                width: '18px', 
                height: '18px', 
                color: '#6B7280' 
              }} />
            </div>
            {formErrors.fechaMantenimiento && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {formErrors.fechaMantenimiento}
              </p>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Tipo de mantenimiento <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              name="tipoMantenimiento"
              value={mantenimientoForm.tipoMantenimiento}
              onChange={handleMantenimientoChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: formErrors.tipoMantenimiento ? '1px solid red' : '1px solid #ddd',
                fontSize: '14px',
                backgroundColor: 'white',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            >
              {tiposMantenimiento.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            {formErrors.tipoMantenimiento && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {formErrors.tipoMantenimiento}
              </p>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Responsable <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="responsable"
              value={mantenimientoForm.responsable}
              onChange={handleMantenimientoChange}
              placeholder="Nombre de quien realizará el mantenimiento"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: formErrors.responsable ? '1px solid red' : '1px solid #ddd',
                fontSize: '14px',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            />
            {formErrors.responsable && (
              <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {formErrors.responsable}
              </p>
            )}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Descripción o notas
          </label>
          <textarea
            name="descripcion"
            value={mantenimientoForm.descripcion}
            onChange={handleMantenimientoChange}
            placeholder="Detalles sobre el mantenimiento a realizar..."
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
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '14px',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              name="recordatorio"
              checked={mantenimientoForm.recordatorio}
              onChange={handleMantenimientoChange}
              style={{
                marginRight: '8px',
                cursor: 'pointer'
              }}
            />
            Generar recordatorio 3 días antes del mantenimiento
          </label>
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
          <strong>Nota:</strong> La programación de mantenimiento actualizará automáticamente la fecha de próximo mantenimiento de la herramienta en el inventario.
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
              backgroundColor: '#3B82F6',
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
            {isSaving ? 'Guardando...' : 'Programar mantenimiento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default HerramientaMantenimientoFormComponent; 