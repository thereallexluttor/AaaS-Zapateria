import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTareasTrabajador } from '../lib/hooks';
import { XMarkIcon, ClockIcon, CheckCircleIcon, CalendarDaysIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface TrabajadorDashboardProps {
  trabajadorId: string;
  nombreCompleto: string;
  onClose: () => void;
  isClosing: boolean;
}

function TrabajadorDashboard({ 
  trabajadorId, 
  nombreCompleto, 
  onClose, 
  isClosing 
}: TrabajadorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'diarias' | 'semanales' | 'mensuales'>('diarias');
  const { tareasAgrupadas, loading, error, getTareasTrabajador } = useTareasTrabajador();
  const [dataLoaded, setDataLoaded] = useState(false);
  
  useEffect(() => {
    console.log('Iniciando carga de tareas para trabajador:', trabajadorId);
    // Cargar tareas al montar el componente
    getTareasTrabajador(trabajadorId)
      .then(() => {
        console.log('Tareas cargadas exitosamente');
        setDataLoaded(true);
      })
      .catch(err => {
        console.error('Error al cargar tareas:', err);
        setDataLoaded(true);
      });
  }, [trabajadorId, getTareasTrabajador]);
  
  // Calcular estadísticas de rendimiento
  const calcularEstadisticas = useCallback((tareas: any[]) => {
    if (!tareas || tareas.length === 0) {
      return { 
        totalTareas: 0, 
        tiempoPromedio: 0, 
        tiempoTotal: 0,
        tiempoReal: 0,
        eficiencia: 0 
      };
    }
    
    const totalTareas = tareas.length;
    let tiempoTotal = 0;
    let tiempoReal = 0;
    
    tareas.forEach(tarea => {
      // Sumar tiempo total estimado (asumiendo que duracion_estimada está en minutos)
      if (tarea.duracion_estimada) {
        const duracionEstimada = typeof tarea.duracion_estimada === 'string' 
          ? parseInt(tarea.duracion_estimada.match(/\d+/)?.[0] || '0', 10)
          : 0;
        tiempoTotal += duracionEstimada;
      }
      
      // Sumar tiempo real registrado
      if (tarea.timer) {
        tiempoReal += tarea.timer;
      }
    });
    
    // Calcular tiempo promedio (tiempo real dividido por número de tareas)
    const tiempoPromedio = totalTareas > 0 ? tiempoReal / totalTareas : 0;
    
    // Calcular eficiencia (relación entre tiempo estimado y tiempo real)
    // Si tiempoReal < tiempoTotal, entonces eficiencia > 100% (mejor que lo esperado)
    const eficiencia = tiempoReal > 0 && tiempoTotal > 0 
      ? (tiempoTotal / tiempoReal) * 100 
      : 0;
    
    return {
      totalTareas,
      tiempoPromedio,
      tiempoTotal,
      tiempoReal,
      eficiencia: isNaN(eficiencia) ? 0 : eficiencia
    };
  }, []);
  
  // Formatear tiempo (convertir minutos a formato hora:minutos)
  const formatearTiempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = Math.floor(minutos % 60);
    return `${horas}h ${mins}m`;
  };
  
  // Obtener las tareas según la pestaña activa
  const getTareasPorTab = useCallback(() => {
    return tareasAgrupadas[activeTab] || [];
  }, [tareasAgrupadas, activeTab]);
  
  // Obtener estadísticas para la pestaña activa
  const estadisticas = useMemo(() => 
    calcularEstadisticas(getTareasPorTab()), 
    [calcularEstadisticas, getTareasPorTab]
  );
  
  return (
    <div 
      style={{
        width: '800px',
        maxWidth: '95vw',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        animation: isClosing ? 'none' : 'modalAppear 0.25s ease-out',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Encabezado */}
      <div style={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            margin: 0,
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <ChartBarIcon style={{ width: '24px', height: '24px', color: '#4F46E5' }} />
            Dashboard de Desempeño
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#6B7280', 
            margin: '5px 0 0 0' 
          }}>
            {nombreCompleto}
          </p>
        </div>
        
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <XMarkIcon style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
      
      {/* Pestañas */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 24px'
      }}>
        {(['diarias', 'semanales', 'mensuales'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#4F46E5' : '#6B7280',
              borderBottom: activeTab === tab ? '2px solid #4F46E5' : 'none',
              marginBottom: activeTab === tab ? '-1px' : '0',
              transition: 'all 0.2s',
              fontFamily: "'Poppins', sans-serif",
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {tab === 'diarias' && '📅 Tareas Diarias'}
            {tab === 'semanales' && '🗓️ Tareas Semanales'}
            {tab === 'mensuales' && '📆 Tareas Mensuales'}
          </button>
        ))}
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '20px 24px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        {/* Total de tareas */}
        <div style={{
          background: '#F3F4F6',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CheckCircleIcon style={{ width: '24px', height: '24px', color: '#10B981', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {estadisticas.totalTareas}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
            Tareas Completadas
          </div>
        </div>
        
        {/* Tiempo total */}
        <div style={{
          background: '#F3F4F6',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ClockIcon style={{ width: '24px', height: '24px', color: '#3B82F6', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {formatearTiempo(estadisticas.tiempoReal)}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
            Tiempo Total
          </div>
        </div>
        
        {/* Tiempo promedio */}
        <div style={{
          background: '#F3F4F6',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CalendarDaysIcon style={{ width: '24px', height: '24px', color: '#EC4899', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {formatearTiempo(estadisticas.tiempoPromedio)}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
            Tiempo Promedio
          </div>
        </div>
        
        {/* Eficiencia */}
        <div 
          style={{
            background: '#F3F4F6',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'help'
          }}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.eficiencia-tooltip') as HTMLElement;
            if (tooltip) tooltip.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget.querySelector('.eficiencia-tooltip') as HTMLElement;
            if (tooltip) tooltip.style.opacity = '0';
          }}
        >
          <ChartBarIcon style={{ width: '24px', height: '24px', color: '#F59E0B', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {estadisticas.eficiencia.toFixed(0)}%
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
            Eficiencia
          </div>
          
          {/* Tooltip con explicación de eficiencia */}
          <div 
            className="eficiencia-tooltip"
            style={{
              position: 'absolute',
              bottom: '-110px',
              right: '0',
              width: '290px',
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '10px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
              color: '#4B5563',
              zIndex: 10,
              textAlign: 'left',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#111827' }}>
              ¿Cómo interpretar la eficiencia?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><span style={{ fontWeight: 500 }}>100%:</span> Completa tareas exactamente en tiempo estimado</div>
              <div><span style={{ fontWeight: 500 }}>&gt;100%:</span> Más rápido que lo esperado</div>
              <div><span style={{ fontWeight: 500 }}>&lt;100%:</span> Tarda más de lo estimado</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de tareas */}
      <div style={{ 
        flex: '1 1 auto',
        overflowY: 'auto',
        padding: '0 24px 24px',
        maxHeight: '400px'
      }} className="custom-scrollbar">
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 500, 
          color: '#111827',
          marginTop: '20px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {activeTab === 'diarias' && '📅 Tareas completadas hoy'}
          {activeTab === 'semanales' && '🗓️ Tareas completadas esta semana'}
          {activeTab === 'mensuales' && '📆 Tareas completadas este mes'}
          
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 400 }}>
            ({getTareasPorTab().length})
          </span>
        </h3>
        
        {loading && !dataLoaded ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            Cargando tareas...
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#EF4444',
            fontSize: '14px' 
          }}>
            Error: {error}
          </div>
        ) : getTareasPorTab().length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#6B7280',
            fontSize: '14px' 
          }}>
            {activeTab === 'diarias' && 'No hay tareas completadas hoy'}
            {activeTab === 'semanales' && 'No hay tareas completadas esta semana'}
            {activeTab === 'mensuales' && 'No hay tareas completadas este mes'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getTareasPorTab().map((tarea: any) => (
              <div 
                key={tarea.id}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '15px', 
                      fontWeight: 500, 
                      color: '#111827' 
                    }}>
                      {tarea.nombre_paso}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>
                      Producto: {tarea?.productos_table?.nombre || 'Producto no disponible'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#10B981',
                    backgroundColor: '#ECFDF5',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircleIcon style={{ width: '14px', height: '14px' }} />
                    Completado
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280' }}>
                  {tarea.duracion_estimada && (
                    <div>
                      Estimado: <span style={{ fontWeight: 500, color: '#4B5563' }}>
                        {tarea.duracion_estimada}
                      </span>
                    </div>
                  )}
                  
                  {tarea.timer && (
                    <div>
                      Real: <span style={{ fontWeight: 500, color: '#4B5563' }}>
                        {formatearTiempo(tarea.timer)}
                      </span>
                    </div>
                  )}
                  
                  {tarea.fecha_fin && (
                    <div>
                      Fecha: <span style={{ fontWeight: 500, color: '#4B5563' }}>
                        {new Date(tarea.fecha_fin).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Espacio para el scroll */}
            <div style={{ height: '20px' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrabajadorDashboard; 