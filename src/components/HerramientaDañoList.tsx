import { useState, useEffect } from 'react';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon, ExclamationTriangleIcon, WrenchIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { Herramienta } from '../lib/types';

// Estilo global para aplicar Helvetica Neue a todo el componente
const globalStyles = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

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
      
      const costo = repairForm.costo ? parseFloat(repairForm.costo) : 0;
      
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
        ...globalStyles,
      }}
      className="apple-scrollbar"
      aria-labelledby="herramienta-daño-list-title"
    >
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
          id="herramienta-daño-list-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, ...globalStyles }}
        >
          Reportes de Daños y Reparaciones
        </h2>
      </header>
      
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
            backgroundColor: '#FEF2F2',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ExclamationTriangleIcon style={{ width: '20px', height: '20px', color: '#EF4444' }} />
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

      {/* Pestañas para filtrar reportes */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #E5E7EB', 
        marginBottom: '20px'
      }}>
        <button 
          onClick={() => setActiveTab('pendientes')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'pendientes' ? 600 : 400,
            color: activeTab === 'pendientes' ? '#F97316' : '#6B7280',
            borderBottom: activeTab === 'pendientes' ? '2px solid #F97316' : 'none',
            marginBottom: activeTab === 'pendientes' ? '-1px' : '0',
            ...globalStyles
          }}
        >
          Pendientes
        </button>
        <button 
          onClick={() => setActiveTab('reparados')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'reparados' ? 600 : 400,
            color: activeTab === 'reparados' ? '#F97316' : '#6B7280',
            borderBottom: activeTab === 'reparados' ? '2px solid #F97316' : 'none',
            marginBottom: activeTab === 'reparados' ? '-1px' : '0',
            ...globalStyles
          }}
        >
          Reparados
        </button>
      </div>

      {/* Mostrar mensaje de carga o error */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Cargando reportes de daños...
        </div>
      )}

      {error && (
        <div style={{ 
          backgroundColor: 'rgba(220, 38, 38, 0.1)', 
          color: '#DC2626', 
          padding: '12px', 
          borderRadius: '5px',
          marginBottom: '16px',
          fontSize: '14px',
          ...globalStyles
        }}>
          {error}
        </div>
      )}

      {/* Formulario de registro de reparación */}
      {isRepairing && currentRepairId && (
        <div style={{
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: '#F9FAFB'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
            Registrar Reparación
          </div>
          
          <form onSubmit={handleSubmitRepair}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                Descripción de la reparación <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                name="descripcion"
                value={repairForm.descripcion}
                onChange={handleRepairFormChange}
                placeholder="Detalles de la reparación realizada"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                Responsable <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="responsable"
                value={repairForm.responsable}
                onChange={handleRepairFormChange}
                placeholder="Nombre de quien realizó la reparación"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                Costo (opcional)
              </label>
              <input
                type="number"
                name="costo"
                value={repairForm.costo}
                onChange={handleRepairFormChange}
                placeholder="Costo de la reparación"
                step="0.01"
                min="0"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCancelRepair}
                style={{
                  padding: '8px 16px',
                  borderRadius: '5px',
                  border: '1px solid #D1D5DB',
                  background: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '5px',
                  border: 'none',
                  background: '#10B981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
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
          fontSize: '14px',
          ...globalStyles
        }}>
          No hay reportes de daños {activeTab === 'pendientes' ? 'pendientes' : 'reparados'} para esta herramienta.
        </div>
      )}

      {!loading && !error && filteredReportes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredReportes.map(reporte => (
            <div 
              key={reporte.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                ...globalStyles
              }}
            >
              {/* Encabezado del reporte */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    backgroundColor: `${getUrgenciaColor(reporte.nivel_urgencia)}20`,
                    color: getUrgenciaColor(reporte.nivel_urgencia),
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ExclamationTriangleIcon style={{ width: '14px', height: '14px' }} />
                    Urgencia: {reporte.nivel_urgencia}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  Reporte: {reporte.id.slice(0, 8)}...
                </div>
              </div>
              
              {/* Fecha del reporte */}
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#374151' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon style={{ width: '16px', height: '16px', color: '#F97316' }} />
                  <div>
                    <span style={{ marginRight: '4px', fontWeight: 500 }}>Fecha reporte:</span>
                    {formatDate(reporte.fecha_reporte)}
                  </div>
                </div>
                
                {/* Fecha de reparación (solo para reparados) */}
                {activeTab === 'reparados' && reporte.reparacion_fecha && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircleIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />
                    <div>
                      <span style={{ marginRight: '4px', fontWeight: 500 }}>Reparado:</span>
                      {formatDate(reporte.reparacion_fecha)}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Descripción del daño */}
              <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px', color: '#374151', fontSize: '14px' }}>
                  Descripción del daño:
                </div>
                <div style={{ color: '#4B5563', fontSize: '14px' }}>
                  {reporte.descripcion_daño}
                </div>
              </div>
              
              {/* Imagen del daño (si existe) */}
              {reporte.imagen_daño_url && (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px', color: '#374151', fontSize: '14px' }}>
                    Imagen del daño:
                  </div>
                  <div style={{ maxWidth: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '5px' }}>
                    <img 
                      src={reporte.imagen_daño_url} 
                      alt="Daño reportado" 
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              )}
              
              {/* Solicitante */}
              <div style={{ fontSize: '14px' }}>
                <span style={{ fontWeight: 500, marginRight: '4px', color: '#374151' }}>
                  Reportado por:
                </span>
                <span style={{ color: '#4B5563' }}>{reporte.solicitante}</span>
              </div>
              
              {/* Detalles de la reparación (solo para reparados) */}
              {activeTab === 'reparados' && reporte.reparacion_descripcion && (
                <div style={{ backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px', color: '#374151', fontSize: '14px' }}>
                    Detalles de la reparación:
                  </div>
                  <div style={{ color: '#4B5563', fontSize: '14px' }}>
                    {reporte.reparacion_descripcion}
                  </div>
                  {reporte.reparacion_responsable && (
                    <div style={{ color: '#4B5563', fontSize: '14px', marginTop: '8px' }}>
                      <span style={{ fontWeight: 500, marginRight: '4px' }}>Responsable:</span>
                      {reporte.reparacion_responsable}
                    </div>
                  )}
                  {reporte.reparacion_costo && (
                    <div style={{ color: '#4B5563', fontSize: '14px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 500, marginRight: '4px' }}>Costo:</span>
                      ${reporte.reparacion_costo.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              
              {/* Acciones (solo para pendientes) */}
              {activeTab === 'pendientes' && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleStartRepair(reporte.id)}
                    style={{
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      ...globalStyles
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10B981';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <WrenchIcon style={{ width: '16px', height: '16px' }} />
                    Registrar Reparación
                  </button>
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
            color: '#666',
            border: '1px solid #e0e0e0',
            padding: '0 24px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            height: '36px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            ...globalStyles
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#D1D5DB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default HerramientaDañoListComponent; 