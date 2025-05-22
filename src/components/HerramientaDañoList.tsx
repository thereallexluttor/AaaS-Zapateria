import { useState, useEffect } from 'react';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon, ExclamationTriangleIcon, WrenchIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { Herramienta } from '../lib/types';

// Estilo global para aplicar Helvetica Neue a todo el componente
const globalStyles = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// CSS para animaciones de foco y otros estilos personalizados
const customStyles = `
  input, select, textarea, button {
    transition: border 0.2s ease-in-out, box-shadow 0.2s ease-in-out, transform 0.1s ease-in-out;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #4F46E5 !important; /* Azul índigo para el foco */
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    transform: translateY(-1px);
  }
  
  /* Ocultar flechas de input number */
  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  
  input[type=number] {
    -moz-appearance: textfield; /* Firefox */
  }
`;

// Tipos para los reportes de daños
interface ReporteDaño {
  id: string;
  herramienta_id: string;
  descripcion_daño: string;
  fecha_reporte: string;
  nivel_urgencia: string;
  solicitante: string;
  imagen_daño_url: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  reparacion_fecha?: string | null;
  reparacion_descripcion?: string | null;
  reparacion_costo?: number | null;
  reparacion_responsable?: string | null;
}

interface HerramientaDañoListProps {
  onClose: () => void;
  isClosing: boolean;
  herramienta: Herramienta & { type: 'herramienta' } | null;
}

function HerramientaDañoListComponent({ onClose, isClosing, herramienta }: HerramientaDañoListProps) {
  const [reportes, setReportes] = useState<ReporteDaño[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'reparados'>('pendientes');
  
  // Estado para el formulario de reparación
  const [isRepairing, setIsRepairing] = useState(false);
  const [currentRepairId, setCurrentRepairId] = useState<string | null>(null);
  const [repairForm, setRepairForm] = useState({
    descripcion: '',
    responsable: '',
    costo: ''
  });

  // Cargar los reportes de daños de la herramienta al montar el componente
  useEffect(() => {
    if (!herramienta) return;

    const fetchReportes = async () => {
      setLoading(true);
      setError(null);

      try {
        // Consultar los reportes de daños de la herramienta específica
        const { data, error } = await supabase
          .from('herramientas_reportes_daños')
          .select('*')
          .eq('herramienta_id', herramienta.id)
          .order('fecha_reporte', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setReportes(data || []);
      } catch (error: any) {
        console.error('Error al cargar los reportes de daños:', error);
        setError('No se pudieron cargar los reportes. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportes();
  }, [herramienta]);

  // Filtrar reportes según la pestaña activa
  const filteredReportes = reportes.filter(reporte => {
    if (activeTab === 'pendientes') {
      return reporte.estado === 'Pendiente';
    } else {
      return reporte.estado === 'Reparado';
    }
  });

  // Función para registrar una reparación
  const handleStartRepair = (reporteId: string) => {
    setCurrentRepairId(reporteId);
    setIsRepairing(true);
  };

  // Manejar cambios en el formulario de reparación
  const handleRepairFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRepairForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enviar el formulario de reparación
  const handleSubmitRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentRepairId || !herramienta) return;
    
    try {
      // Validar campos
      if (!repairForm.descripcion || !repairForm.responsable) {
        alert('Por favor complete los campos obligatorios.');
        return;
      }
      
      // Asegurar que el costo sea un número válido
      let costo = null;
      if (repairForm.costo.trim() !== '') {
        costo = parseFloat(repairForm.costo);
        if (isNaN(costo) || costo < 0) {
          alert('El costo debe ser un número positivo.');
          return;
        }
      }
      
      // Actualizar el reporte con los datos de la reparación
      const { error } = await supabase
        .from('herramientas_reportes_daños')
        .update({
          estado: 'Reparado',
          reparacion_fecha: new Date().toISOString(),
          reparacion_descripcion: repairForm.descripcion,
          reparacion_responsable: repairForm.responsable,
          reparacion_costo: costo
        })
        .eq('id', currentRepairId);
        
      if (error) {
        throw error;
      }
      
      // Actualizar el estado de la herramienta a "Bueno" después de la reparación
      const { error: herramientaError } = await supabase
        .from('herramientas')
        .update({ estado: 'Bueno' })
        .eq('id', herramienta.id);
        
      if (herramientaError) {
        console.error('Error al actualizar el estado de la herramienta:', herramientaError);
      }
      
      // Actualizar la lista de reportes
      setReportes(prevReportes => 
        prevReportes.map(r => 
          r.id === currentRepairId 
            ? { 
                ...r, 
                estado: 'Reparado',
                reparacion_fecha: new Date().toISOString(),
                reparacion_descripcion: repairForm.descripcion,
                reparacion_responsable: repairForm.responsable,
                reparacion_costo: costo
              } 
            : r
        )
      );
      
      // Reset del formulario y estados
      setIsRepairing(false);
      setCurrentRepairId(null);
      setRepairForm({
        descripcion: '',
        responsable: '',
        costo: ''
      });
      
      // Cambiar a la pestaña de reparados
      setActiveTab('reparados');
      
    } catch (error: any) {
      console.error('Error al registrar la reparación:', error);
      alert('No se pudo registrar la reparación. Intente nuevamente.');
    }
  };

  // Cancelar el registro de reparación
  const handleCancelRepair = () => {
    setIsRepairing(false);
    setCurrentRepairId(null);
    setRepairForm({
      descripcion: '',
      responsable: '',
      costo: ''
    });
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Formatear fecha y hora
  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return 'N/A';
    const options: Intl.DateTimeFormatOptions = {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleString('es-ES', options).replace(',', '');
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Obtener el color según el nivel de urgencia
  const getUrgenciaColor = (nivel: string) => {
    switch (nivel) {
      case 'Baja':
        return '#10B981'; // Verde
      case 'Media':
        return '#F59E0B'; // Naranja
      case 'Alta':
        return '#EF4444'; // Rojo
      case 'Crítica':
        return '#7F1D1D'; // Rojo oscuro
      default:
        return '#6B7280'; // Gris
    }
  };

  // Obtener el color del icono y fondo según el nivel de urgencia (similar al formulario)
  const getUrgenciaStyles = (nivel: string) => {
    switch (nivel) {
      case 'Baja':
        return { iconColor: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
      case 'Media':
        return { iconColor: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' };
      case 'Alta':
        return { iconColor: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
      case 'Crítica':
        return { iconColor: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)' }; // Rojo más intenso para crítica
      default:
        return { iconColor: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
    }
  };

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '8px', // Bordes más redondeados como en el form
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
        ...globalStyles, // Aplicar Helvetica Neue
      }}
      className="apple-scrollbar"
      aria-labelledby="herramienta-daño-list-title"
    >
      <style>{customStyles}</style> {/* Añadir estilos personalizados */}

      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}> {/* Mayor margen inferior */}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            marginRight: '16px', // Mayor margen derecho
            padding: '6px', // Padding más uniforme
            borderRadius: '50%', // Botón redondo
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label="Volver atrás"
        >
          <ArrowLeftIcon style={{ width: '20px', height: '20px', color: '#4B5563' }} /> {/* Color de icono más oscuro */}
        </button>
        <h2 
          id="herramienta-daño-list-title"
          style={{ fontSize: '22px', fontWeight: 500, margin: 0, ...globalStyles, color: '#1F2937' }} // Fuente más grande y color
        >
          Reportes de Daños y Reparaciones
        </h2>
      </header>
      
      {/* Información de la herramienta */}
      {herramienta && (
        <div style={{
          backgroundColor: '#F9FAFB',
          borderRadius: '8px', // Bordes más redondeados
          padding: '20px', // Mayor padding
          marginBottom: '24px', // Mayor margen
          border: '1px solid #E5E7EB',
          display: 'flex',
          gap: '20px', // Mayor gap
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: getUrgenciaStyles(herramienta.estado === 'Necesita reparación' || herramienta.estado === 'Fuera de servicio' ? 'Alta' : 'Media').bgColor, // Color de fondo dinámico
            width: '48px', // Icono más grande
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ExclamationTriangleIcon style={{ 
              width: '24px', 
              height: '24px', 
              color: getUrgenciaStyles(herramienta.estado === 'Necesita reparación' || herramienta.estado === 'Fuera de servicio' ? 'Alta' : 'Media').iconColor 
            }} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', ...globalStyles }}> {/* Fuente más grande */}
              {herramienta.nombre}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '6px', ...globalStyles }}> {/* Mayor margen */}
              {herramienta.modelo ? `Modelo: ${herramienta.modelo}` : ''}
              {herramienta.numero_serie ? ` • Serie: ${herramienta.numero_serie}` : ''}
            </div>
            <div style={{ 
              fontSize: '13px', // Ligeramente más pequeño
              marginTop: '8px', 
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              display: 'inline-block',
              borderRadius: '16px',
              padding: '4px 12px', // Padding ajustado
              fontWeight: 500, // Peso de fuente
              color: 
                herramienta.estado === 'Nuevo' || herramienta.estado === 'Excelente' ? '#10B981' : // Verde
                herramienta.estado === 'Bueno' ? '#3B82F6' : // Azul
                herramienta.estado === 'Regular' ? '#F59E0B' : // Naranja
                herramienta.estado === 'Necesita reparación' || herramienta.estado === 'Fuera de servicio' ? '#EF4444' : '#6B7280', // Rojo o Gris
              ...globalStyles
            }}>
              Estado: {herramienta.estado || 'No especificado'}
            </div>
          </div>
        </div>
      )}

      {/* Pestañas para filtrar reportes */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #E5E7EB', 
        marginBottom: '24px' // Mayor margen
      }}>
        <button 
          onClick={() => setActiveTab('pendientes')}
          style={{
            padding: '12px 20px', // Mayor padding
            fontSize: '15px', // Fuente más grande
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'pendientes' ? 600 : 500, // Ajuste de peso
            color: activeTab === 'pendientes' ? '#F97316' : '#4B5563', // Naranja para activo, gris oscuro para inactivo
            borderBottom: activeTab === 'pendientes' ? '3px solid #F97316' : '3px solid transparent', // Borde más grueso
            marginBottom: '-1px', 
            transition: 'all 0.2s ease',
            ...globalStyles
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#F97316'}
          onMouseLeave={(e) => e.currentTarget.style.color = activeTab === 'pendientes' ? '#F97316' : '#4B5563'}
        >
          Pendientes
        </button>
        <button 
          onClick={() => setActiveTab('reparados')}
          style={{
            padding: '12px 20px',
            fontSize: '15px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'reparados' ? 600 : 500,
            color: activeTab === 'reparados' ? '#F97316' : '#4B5563',
            borderBottom: activeTab === 'reparados' ? '3px solid #F97316' : '3px solid transparent',
            marginBottom: '-1px',
            transition: 'all 0.2s ease',
            ...globalStyles
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#F97316'}
          onMouseLeave={(e) => e.currentTarget.style.color = activeTab === 'reparados' ? '#F97316' : '#4B5563'}
        >
          Reparados
        </button>
      </div>

      {/* Mostrar mensaje de carga o error */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280', ...globalStyles }}> {/* Mayor padding */}
          <div className="spinner" style={{ margin: '0 auto 20px', width: '32px', height: '32px' }}></div> {/* Spinner más grande */}
          Cargando reportes...
        </div>
      )}

      {error && (
        <div style={{ 
          backgroundColor: 'rgba(220, 38, 38, 0.05)', // Fondo más sutil
          color: '#B91C1C', // Rojo más oscuro
          padding: '16px', 
          borderRadius: '6px', // Bordes más redondeados
          marginBottom: '20px',
          fontSize: '14px',
          border: '1px solid rgba(220, 38, 38, 0.2)', // Borde sutil
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          ...globalStyles
        }}>
          <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#B91C1C', flexShrink: 0 }}/>
          {error}
        </div>
      )}

      {/* Formulario de registro de reparación */}
      {isRepairing && currentRepairId && (
        <div style={{
          border: '1px solid #D1D5DB', // Borde más oscuro
          borderRadius: '8px',
          padding: '20px', // Mayor padding
          marginBottom: '24px', // Mayor margen
          backgroundColor: '#F9FAFB'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827', ...globalStyles }}> {/* Fuente más grande */}
            Registrar Reparación
          </div>
          
          <form onSubmit={handleSubmitRepair}>
            <div style={{ marginBottom: '16px' }}> {/* Mayor margen */}
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151', ...globalStyles }}>
                Descripción de la reparación <span style={{ color: '#EF4444' }}>*</span> {/* Rojo más brillante */}
              </label>
              <textarea
                name="descripcion"
                value={repairForm.descripcion}
                onChange={handleRepairFormChange}
                placeholder="Detalles de la reparación realizada, herramientas usadas, etc."
                required
                style={{
                  width: '100%',
                  padding: '10px 12px', // Padding ajustado
                  borderRadius: '6px', // Bordes más redondeados
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  minHeight: '100px', // Mayor altura mínima
                  resize: 'vertical',
                  ...globalStyles
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}> {/* Layout horizontal */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151', ...globalStyles }}>
                  Responsable <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="responsable"
                  value={repairForm.responsable}
                  onChange={handleRepairFormChange}
                  placeholder="Nombre de quien reparó"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    ...globalStyles
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151', ...globalStyles }}>
                  Costo (opcional)
                </label>
                <input
                  type="number"
                  name="costo"
                  value={repairForm.costo}
                  onChange={handleRepairFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    ...globalStyles,
                    // Hacer que se vea más como un campo de texto regular
                    appearance: 'textfield'
                  }}
                  onKeyPress={(e) => {
                    // Permitir solo números y un punto decimal
                    const regex = /^[0-9.]*$/;
                    if (!regex.test(e.key)) {
                      e.preventDefault();
                    }
                    
                    // Evitar múltiples puntos decimales
                    if (e.key === '.' && repairForm.costo.includes('.')) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}> {/* Mayor margen superior */}
              <button
                type="button"
                onClick={handleCancelRepair}
                style={{
                  padding: '10px 20px', // Mayor padding
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  background: 'white',
                  fontSize: '14px',
                  fontWeight: 500, // Peso de fuente
                  cursor: 'pointer',
                  color: '#374151', // Color de texto
                  transition: 'all 0.2s ease',
                  ...globalStyles
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10B981', // Verde para guardar
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  ...globalStyles
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
              >
                Guardar Reparación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de reportes */}
      {!loading && !error && filteredReportes.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0', 
          color: '#6B7280',
          fontSize: '15px', // Fuente más grande
          ...globalStyles
        }}>
          No hay reportes {activeTab === 'pendientes' ? 'pendientes' : 'reparados'} para esta herramienta.
        </div>
      )}

      {!loading && !error && filteredReportes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}> {/* Mayor gap */}
          {filteredReportes.map(reporte => (
            <div 
              key={reporte.id}
              style={{ // Card base styles
                backgroundColor: 'white',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                padding: '12px', // Reduced padding
                display: 'flex',
                flexDirection: 'row', // Main direction is row for image + details
                gap: '12px', // Gap between image and details
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                ...globalStyles,
                // Slightly increase min-height to fit content better
                minHeight: '150px',
              }}
            >
              {/* Image Column (if image exists) */}
              {reporte.imagen_daño_url && activeTab === 'pendientes' && ( // Only show image section if URL exists and tab is 'pendientes'
                <div style={{
                  width: '100px', // Fixed width for image container
                  height: 'auto', // Adjust height, or set fixed like 100px
                  minHeight: '100px',
                  maxHeight: '120px', // Max height for the image container
                  flexShrink: 0,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                }}>
                  <img 
                    src={reporte.imagen_daño_url} 
                    alt="Daño reportado" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', // Cover to fill the container
                    }} 
                  />
                </div>
              )}

              {/* Details Column (takes remaining space or full width if no image for pending) */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                flexGrow: 1, 
                justifyContent: 'space-between', // Distribute space for top and bottom content
                minWidth: 0, // Prevents text overflow issues in flex children
              }}>
                {/* Top content grouping: Urgencia, ID, Description */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ // Urgencia Badge
                      backgroundColor: getUrgenciaStyles(reporte.nivel_urgencia).bgColor,
                      color: getUrgenciaStyles(reporte.nivel_urgencia).iconColor,
                      padding: '4px 10px', // Slightly smaller padding
                      borderRadius: '12px',
                      fontSize: '12px', // Smaller font
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ExclamationTriangleIcon style={{ width: '14px', height: '14px' }} />
                      {reporte.nivel_urgencia}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', paddingTop: '2px' }}> {/* Smaller font */}
                      ID: {reporte.id.slice(0, 6)} {/* Shorter ID slice */}
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontWeight: 500, color: '#1F2937', fontSize: '13px', marginBottom: '4px' }}> {/* Smaller font */}
                      Descripción del Daño
                    </div>
                    <div style={{ 
                      color: '#4B5563', 
                      fontSize: '13px', // Smaller font
                      lineHeight: '1.5', 
                      maxHeight: '6em', // Increased from 4.5em to 6em (approximately 4 lines)
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 4, // Increased from 3 to 4 lines
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {reporte.descripcion_daño}
                    </div>
                  </div>
                </div>

                {/* Bottom content grouping: Reporter, Date, Actions */}
                <div style={{ marginTop: 'auto' }}> {/* Pushes this block to the bottom of the details column */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'space-between', 
                    fontSize: '12px', 
                    color: '#6B7280', 
                    borderTop: '1px solid #F3F4F6', 
                    paddingTop: '8px',
                    marginTop: '8px',
                    gap: '6px', // Add spacing between rows
                  }}>
                    {/* First row - Reporter name and date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 500, color: '#1F2937' }}>De:</span> 
                        <span title={reporte.solicitante}>{reporte.solicitante}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                        <CalendarIcon style={{ width: '14px', height: '14px', color: '#F97316' }} />
                        {formatDate(reporte.fecha_reporte)}
                      </div>
                    </div>
                    
                    {/* Second row - Creation and update times */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div title={`Creado: ${formatDateTime(reporte.created_at)}`}>
                        <span style={{ fontWeight: 500, color: '#1F2937' }}>Creado:</span> {formatDateTime(reporte.created_at)}
                      </div>
                      {reporte.updated_at !== reporte.created_at && (
                        <div title={`Actualizado: ${formatDateTime(reporte.updated_at)}`} style={{color: '#888'}}>
                          <span style={{ fontWeight: 500}}>Act:</span> {formatDateTime(reporte.updated_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {activeTab === 'pendientes' && (
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleStartRepair(reporte.id)}
                        style={{
                          backgroundColor: '#F97316',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 14px', // Slightly increased padding
                          fontSize: '13px', // Smaller font
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          ...globalStyles
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EA580C';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F97316';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <WrenchIcon style={{ width: '14px', height: '14px' }} />
                        Reparar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* For REPARADOS tab, the structure is different and might need separate adjustments if this card style is applied globally */}
              {activeTab === 'reparados' && (
                <div style={{ /* This is the main details column for repaired cards */
                  display: 'flex', 
                  flexDirection: 'column', 
                  flexGrow: 1, 
                  justifyContent: 'space-between', // Pushes top up, middle, and bottom sections apart
                  minWidth: 0, // Important for flex children to prevent overflow
                }}>
                  {/* Section 1: Header (Urgencia, ID) & Dates */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ // Urgencia Badge (original)
                        backgroundColor: getUrgenciaStyles(reporte.nivel_urgencia).bgColor,
                        color: getUrgenciaStyles(reporte.nivel_urgencia).iconColor,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}>
                        <ExclamationTriangleIcon style={{ width: '14px', height: '14px' }} />
                        Original: {reporte.nivel_urgencia}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', paddingTop: '2px', textAlign: 'right' }}>
                        ID: {reporte.id.slice(0, 6)}
                      </div>
                    </div>

                    {/* Dates: Report & Repair */}
                    <div style={{ fontSize: '12px', color: '#374151', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarIcon style={{ width: '14px', height: '14px', color: '#F97316', flexShrink:0 }} />
                        <div><span style={{ fontWeight: 500 }}>Reportado:</span> {formatDate(reporte.fecha_reporte)}</div>
                      </div>
                      {reporte.reparacion_fecha && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircleIcon style={{ width: '14px', height: '14px', color: '#10B981', flexShrink:0 }} />
                          <div><span style={{ fontWeight: 500, color: '#065F46' }}>Reparado:</span> {formatDate(reporte.reparacion_fecha)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Descriptions (Scrollable) */}
                  <div style={{ 
                    backgroundColor: '#F9FAFB', 
                    padding: '8px 10px', // Adjusted padding
                    borderRadius: '6px', 
                    border: '1px solid #F3F4F6', 
                    marginBottom: '8px', 
                    maxHeight: '110px', // Increased height for scrollable area
                    overflowY: 'auto' 
                  }} className="apple-scrollbar-thin">
                    <div style={{ fontWeight: 500, color: '#1F2937', fontSize: '13px', marginBottom: '2px' }}>
                      Daño Reportado:
                    </div>
                    <div style={{ color: '#4B5563', fontSize: '13px', lineHeight: '1.4', marginBottom: reporte.reparacion_descripcion ? '6px' : '0px' }}>
                      {reporte.descripcion_daño || <span style={{fontStyle: 'italic', color: '#6B7280'}}>No especificado</span>}
                    </div>
                    {reporte.reparacion_descripcion && (
                      <>
                        <div style={{ fontWeight: 500, color: '#065F46', fontSize: '13px', marginBottom: '2px', borderTop: '1px dashed #D1FAE5', paddingTop: '6px', marginTop:'6px' }}>
                          Detalle de Reparación:
                        </div>
                        <div style={{ color: '#047857', fontSize: '13px', lineHeight: '1.4' }}>
                          {reporte.reparacion_descripcion}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Section 3: Reporter & Repair Details (Cost, Responsible) */}
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#4B5563', 
                    borderTop: '1px solid #F3F4F6', 
                    paddingTop: '8px',
                  }}>
                    <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        <span style={{ fontWeight: 500, color: '#1F2937' }}>Reportado por:</span> {reporte.solicitante || 'N/A'}
                      </div>
                      <div style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 500, color: '#1F2937' }}>Fecha:</span> {formatDate(reporte.fecha_reporte).split(' ')[0]}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>Creado:</span> {formatDateTime(reporte.created_at)}
                      </div>
                      {reporte.updated_at !== reporte.created_at && (
                        <div>
                          <span style={{ fontWeight: 500 }}>Act:</span> {formatDateTime(reporte.updated_at)}
                        </div>
                      )}
                    </div>
                    {reporte.reparacion_responsable && (
                      <div style={{ color: '#047857', marginBottom: '4px', marginTop:'6px', borderTop:'1px dashed #D1FAE5', paddingTop:'6px' }}>
                        <span style={{ fontWeight: 500 }}>Reparado por:</span> {reporte.reparacion_responsable}
                      </div>
                    )}
                    {reporte.reparacion_costo !== null && reporte.reparacion_costo !== undefined && (
                       <div style={{ color: '#047857' }}>
                         <span style={{ fontWeight: 500}}>Costo Reparación:</span> ${typeof reporte.reparacion_costo === 'number' ? reporte.reparacion_costo.toFixed(2) : 'N/A'}
                       </div>
                    )}
                     {/* Fallback message if marked repaired but no specific details */}
                     {activeTab === 'reparados' && 
                      !reporte.reparacion_descripcion && 
                      !reporte.reparacion_responsable && 
                      (reporte.reparacion_costo === null || reporte.reparacion_costo === undefined) && (
                        <div style={{ color: '#047857', fontStyle:'italic', fontSize:'12px', marginTop:'4px' }}>
                            Reparación registrada sin detalles adicionales.
                        </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
      
      {/* Botón de cerrar en la parte inferior */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'white',
            color: '#4B5563', // Color de texto más oscuro
            border: '1px solid #D1D5DB', // Borde más visible
            padding: '0 28px', // Mayor padding horizontal
            borderRadius: '6px', // Bordes más redondeados
            cursor: 'pointer',
            fontSize: '15px', // Fuente más grande
            fontWeight: 500,
            height: '40px', // Botón más alto
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            ...globalStyles
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#9CA3AF'; // Borde más oscuro al hacer hover
            e.currentTarget.style.backgroundColor = '#F9FAFB'; // Fondo sutil al hacer hover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default HerramientaDañoListComponent; 