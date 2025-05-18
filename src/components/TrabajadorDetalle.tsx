import { XMarkIcon, UserCircleIcon, IdentificationIcon, BriefcaseIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { TrabajadorItemType } from './TrabajadorItem';

interface TrabajadorDetalleProps {
  trabajador: TrabajadorItemType;
  onClose: () => void;
  isClosing: boolean;
}

function TrabajadorDetalle({ trabajador, onClose, isClosing }: TrabajadorDetalleProps) {
  // Formatear la fecha en un formato legible
  const formatearFecha = (fechaStr?: string) => {
    if (!fechaStr) return 'No disponible';
    return new Date(fechaStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Función para obtener texto según el tipo de trabajador
  const getTipoInfo = () => {
    switch (trabajador.tipo) {
      case 'produccion':
        return { label: 'Producción', color: '#16A34A', bgColor: '#DCFCE7' };
      case 'ventas':
        return { label: 'Ventas', color: '#EA580C', bgColor: '#FFEDD5' };
      case 'administrativo':
        return { label: 'Administrativo', color: '#2563EB', bgColor: '#DBEAFE' };
      default:
        return { label: 'No asignado', color: '#6B7280', bgColor: '#F3F4F6' };
    }
  };

  const tipoInfo = getTipoInfo();

  return (
    <div 
      style={{
        width: '700px',
        maxWidth: '95vw',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        animation: isClosing ? 'none' : 'modalAppear 0.25s ease-out',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        overflow: 'hidden'
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
            <UserCircleIcon style={{ width: '24px', height: '24px', color: '#4F46E5' }} />
            Detalles del Trabajador
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#6B7280', 
            margin: '5px 0 0 0' 
          }}>
            Información completa del perfil
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
      
      {/* Contenido */}
      <div style={{ padding: '24px', overflowY: 'auto' }} className="custom-scrollbar">
        {/* Información personal */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Avatar */}
            <div style={{ 
              width: '88px', 
              height: '88px', 
              borderRadius: '12px',
              backgroundColor: tipoInfo.bgColor,
              color: tipoInfo.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 600
            }}>
              {trabajador.nombre.charAt(0)}{trabajador.apellido.charAt(0)}
            </div>
            
            {/* Nombre y tipo */}
            <div>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 600, 
                margin: '0 0 8px 0',
                color: '#111827'
              }}>
                {trabajador.nombre} {trabajador.apellido}
              </h3>
              
              <div style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: tipoInfo.bgColor,
                color: tipoInfo.color,
                display: 'inline-block'
              }}>
                {tipoInfo.label}
              </div>
            </div>
          </div>
          
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <IdentificationIcon style={{ width: '20px', height: '20px', color: '#6B7280' }} />
            Información Personal
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            fontSize: '14px'
          }}>
            <DetalleItem 
              icon={<IdentificationIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
              label="Cédula de Identidad"
              value={trabajador.cedula}
            />
            
            {trabajador.fecha_nacimiento && (
              <DetalleItem 
                icon={<CalendarIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Fecha de Nacimiento"
                value={formatearFecha(trabajador.fecha_nacimiento)}
              />
            )}
            
            {trabajador.correo && (
              <DetalleItem 
                icon={<EnvelopeIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Correo Electrónico"
                value={trabajador.correo}
              />
            )}
            
            {trabajador.telefono && (
              <DetalleItem 
                icon={<PhoneIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Teléfono"
                value={trabajador.telefono}
              />
            )}
            
            {trabajador.direccion && (
              <DetalleItem 
                icon={<MapPinIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Dirección"
                value={trabajador.direccion}
              />
            )}
          </div>
        </div>
        
        {/* Información laboral */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BriefcaseIcon style={{ width: '20px', height: '20px', color: '#6B7280' }} />
            Información Laboral
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            fontSize: '14px'
          }}>
            {trabajador.area && (
              <DetalleItem 
                icon={<BriefcaseIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Área"
                value={trabajador.area.charAt(0).toUpperCase() + trabajador.area.slice(1)}
              />
            )}
            
            {trabajador.especialidad && (
              <DetalleItem 
                icon={<BriefcaseIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Especialidad"
                value={trabajador.especialidad}
              />
            )}
            
            {trabajador.fecha_contratacion && (
              <DetalleItem 
                icon={<CalendarIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Fecha de Contratación"
                value={formatearFecha(trabajador.fecha_contratacion)}
              />
            )}
            
            {trabajador.tipo_contrato && (
              <DetalleItem 
                icon={<BriefcaseIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Tipo de Contrato"
                value={trabajador.tipo_contrato.charAt(0).toUpperCase() + trabajador.tipo_contrato.slice(1)}
              />
            )}
            
            {trabajador.horas_trabajo && (
              <DetalleItem 
                icon={<CalendarIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Horas de Trabajo"
                value={`${trabajador.horas_trabajo} horas por semana`}
              />
            )}
            
            {trabajador.salario && (
              <DetalleItem 
                icon={<CurrencyDollarIcon style={{ width: '18px', height: '18px', color: '#6B7280' }} />}
                label="Salario"
                value={`$${trabajador.salario.toLocaleString('es-ES')}`}
                highlight={true}
              />
            )}
          </div>
        </div>
        
        {/* Resumen y Métricas */}
        {trabajador.tipo === 'produccion' && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px', 
            marginTop: '24px',
            border: '1px solid #E5E7EB'
          }}>
            <h4 style={{ 
              fontSize: '15px', 
              fontWeight: 600, 
              color: '#111827',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px', color: '#6B7280' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              Rendimiento y Métricas
            </h4>
            
            <p style={{ 
              fontSize: '14px', 
              color: '#6B7280',
              margin: '0 0 16px 0'
            }}>
              Para ver métricas detalladas sobre el desempeño de este trabajador, sus tareas completadas y eficiencia, utilice el botón "Ver Dashboard" en la ficha del trabajador.
            </p>
            
            <div style={{ 
              fontSize: '13px', 
              color: '#4B5563',
              backgroundColor: '#EEF2FF',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px', color: '#4F46E5' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              El Dashboard muestra estadísticas de tareas diarias, semanales y mensuales.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para mostrar un ítem de detalle
function DetalleItem({ 
  icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ marginTop: '2px' }}>
        {icon}
      </div>
      <div>
        <div style={{ color: '#6B7280', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ 
          color: highlight ? '#4F46E5' : '#111827', 
          fontWeight: highlight ? 600 : 400 
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default TrabajadorDetalle; 