import { useState, useEffect } from 'react';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon, ClockIcon, WrenchIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { Herramienta } from '../lib/types';

// Estilo global para aplicar Helvetica Neue a todo el componente
const globalStyles = {
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// Tipos para los mantenimientos
interface Mantenimiento {
  id: string;
  herramienta_id: string;
  fecha_programada: string;
  tipo_mantenimiento: string;
  descripcion: string | null;
  responsable: string;
  recordatorio: boolean;
  estado: string;
  fecha_creacion: string;
  fecha_completado: string | null;
  created_at: string;
  updated_at: string;
}

interface HerramientaMantenimientoListProps {
  onClose: () => void;
  isClosing: boolean;
  herramienta: Herramienta & { type: 'herramienta' } | null;
}

function HerramientaMantenimientoListComponent({ onClose, isClosing, herramienta }: HerramientaMantenimientoListProps) {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'programados' | 'completados'>('programados');

  // Cargar los mantenimientos de la herramienta al montar el componente
  useEffect(() => {
    if (!herramienta) return;

    const fetchMantenimientos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Consultar los mantenimientos de la herramienta específica
        const { data, error } = await supabase
          .from('herramientas_mantenimientos')
          .select('*')
          .eq('herramienta_id', herramienta.id)
          .order('fecha_programada', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        setMantenimientos(data || []);
      } catch (error: any) {
        console.error('Error al cargar los mantenimientos:', error);
        setError('No se pudieron cargar los mantenimientos. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchMantenimientos();
  }, [herramienta]);

  // Filtrar mantenimientos según la pestaña activa
  const filteredMantenimientos = mantenimientos.filter(mantenimiento => {
    if (activeTab === 'programados') {
      return mantenimiento.estado === 'Programado';
    } else {
      return mantenimiento.estado === 'Completado';
    }
  });

  // Función para marcar un mantenimiento como completado
  const handleCompletarMantenimiento = async (mantenimientoId: string) => {
    if (!herramienta) return;
    
    try {
      // Actualizar el estado del mantenimiento a "Completado" y la fecha de completado
      const fechaActual = new Date().toISOString();
      const { error } = await supabase
        .from('herramientas_mantenimientos')
        .update({ 
          estado: 'Completado', 
          fecha_completado: fechaActual 
        })
        .eq('id', mantenimientoId);
        
      if (error) {
        throw error;
      }
      
      // Actualizar el estado local
      setMantenimientos(prevMantenimientos => 
        prevMantenimientos.map(m => 
          m.id === mantenimientoId 
            ? { ...m, estado: 'Completado', fecha_completado: fechaActual } 
            : m
        )
      );
      
      // Actualizar el último mantenimiento y el estado de la herramienta a "Bueno"
      const { error: herramientaError } = await supabase
        .from('herramientas')
        .update({ 
          ultimo_mantenimiento: new Date().toISOString().split('T')[0],
          estado: 'Bueno' // Cambiar el estado a "Bueno" cuando se completa un mantenimiento
        })
        .eq('id', herramienta.id);
      
      if (herramientaError) {
        console.error('Error al actualizar el estado de la herramienta:', herramientaError);
      }
        
    } catch (error: any) {
      console.error('Error al completar el mantenimiento:', error);
      alert('No se pudo completar el mantenimiento. Intente nuevamente.');
    }
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

  // Determinar si una fecha ya pasó
  const isDatePassed = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Obtener el color según el tipo de mantenimiento
  const getTipoMantenimientoColor = (tipo: string) => {
    switch (tipo) {
      case 'Preventivo':
        return '#3B82F6'; // Azul
      case 'Correctivo':
        return '#EF4444'; // Rojo
      case 'Predictivo':
        return '#8B5CF6'; // Violeta
      case 'Calibración':
        return '#F59E0B'; // Naranja
      case 'Limpieza':
        return '#10B981'; // Verde
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
      aria-labelledby="herramienta-mantenimiento-list-title"
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
          id="herramienta-mantenimiento-list-title"
          style={{ fontSize: '20px', fontWeight: 400, margin: 0, ...globalStyles }}
        >
          Mantenimientos de Herramienta
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

      {/* Pestañas para filtrar mantenimientos */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #E5E7EB', 
        marginBottom: '20px'
      }}>
        <button 
          onClick={() => setActiveTab('programados')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'programados' ? 600 : 400,
            color: activeTab === 'programados' ? '#4F46E5' : '#6B7280',
            borderBottom: activeTab === 'programados' ? '2px solid #4F46E5' : 'none',
            marginBottom: activeTab === 'programados' ? '-1px' : '0',
            ...globalStyles
          }}
        >
          Programados
        </button>
        <button 
          onClick={() => setActiveTab('completados')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'completados' ? 600 : 400,
            color: activeTab === 'completados' ? '#4F46E5' : '#6B7280',
            borderBottom: activeTab === 'completados' ? '2px solid #4F46E5' : 'none',
            marginBottom: activeTab === 'completados' ? '-1px' : '0',
            ...globalStyles
          }}
        >
          Completados
        </button>
      </div>

      {/* Mostrar mensaje de carga o error */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Cargando mantenimientos...
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

      {/* Lista de mantenimientos */}
      {!loading && !error && filteredMantenimientos.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0', 
          color: '#6B7280',
          fontSize: '14px',
          ...globalStyles
        }}>
          No hay mantenimientos {activeTab === 'programados' ? 'programados' : 'completados'} para esta herramienta.
        </div>
      )}

      {!loading && !error && filteredMantenimientos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMantenimientos.map(mantenimiento => (
            <div 
              key={mantenimiento.id}
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
              {/* Encabezado del mantenimiento */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    backgroundColor: `${getTipoMantenimientoColor(mantenimiento.tipo_mantenimiento)}10`,
                    color: getTipoMantenimientoColor(mantenimiento.tipo_mantenimiento),
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <WrenchIcon style={{ width: '14px', height: '14px' }} />
                    {mantenimiento.tipo_mantenimiento}
                  </div>
                  {activeTab === 'programados' && isDatePassed(mantenimiento.fecha_programada) && (
                    <div style={{
                      backgroundColor: '#FEE2E2',
                      color: '#EF4444',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '13px',
                      fontWeight: 500
                    }}>
                      Vencido
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  ID: {mantenimiento.id.slice(0, 8)}...
                </div>
              </div>
              
              {/* Fechas */}
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#374151' }}>
                {/* Fecha programada */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon style={{ width: '16px', height: '16px', color: '#4F46E5' }} />
                  <div>
                    <span style={{ marginRight: '4px', fontWeight: 500 }}>Fecha programada:</span>
                    {formatDate(mantenimiento.fecha_programada)}
                  </div>
                </div>
                
                {/* Fecha de completado (solo para completados) */}
                {activeTab === 'completados' && mantenimiento.fecha_completado && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircleIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />
                    <div>
                      <span style={{ marginRight: '4px', fontWeight: 500 }}>Completado:</span>
                      {formatDate(mantenimiento.fecha_completado)}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Descripción y responsable */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                {mantenimiento.descripcion && (
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
                      Descripción:
                    </div>
                    <div style={{ color: '#4B5563' }}>
                      {mantenimiento.descripcion}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
                    Responsable:
                  </div>
                  <div style={{ color: '#4B5563' }}>
                    {mantenimiento.responsable}
                  </div>
                </div>
              </div>
              
              {/* Acciones (solo para mantenimientos programados) */}
              {activeTab === 'programados' && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleCompletarMantenimiento(mantenimiento.id)}
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
                    <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                    Marcar como completado
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

export default HerramientaMantenimientoListComponent; 