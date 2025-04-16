import { useState, useEffect } from 'react';
import { Cliente } from '../lib/supabase';
import { XMarkIcon, ArrowLeftIcon, BuildingOfficeIcon, UserIcon } from '@heroicons/react/24/outline';

interface ClienteFormProps {
  onClose: () => void;
  onSave: (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  initialData?: Cliente;
  isClosing: boolean;
}

// Tipo de cliente (persona o compañía)
type ClienteType = 'persona' | 'compania';

export default function ClienteFormComponent({ onClose, onSave, initialData, isClosing }: ClienteFormProps) {
  // Estado para el tipo de cliente
  const [clienteType, setClienteType] = useState<ClienteType>('persona');

  const [formData, setFormData] = useState<Partial<Cliente>>({
    tipo_cliente: 'persona',
    nombre: '',
    apellidos: '',
    nombre_compania: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigo_postal: '',
    notas: '',
    fecha_registro: new Date().toISOString().split('T')[0],
    contacto_nombre: '',
    contacto_email: '',
    contacto_telefono: '',
    contacto_cargo: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Si hay datos iniciales, actualizar el formulario
  useEffect(() => {
    if (initialData) {
      // Convertir la fecha al formato YYYY-MM-DD
      const fechaRegistro = initialData.fecha_registro 
        ? new Date(initialData.fecha_registro).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      // Determinar el tipo de cliente
      const tipo = initialData.tipo_cliente === 'compania' ? 'compania' : 'persona';
        
      setFormData({
        ...initialData,
        fecha_registro: fechaRegistro
      });
      
      setClienteType(tipo);
    }
  }, [initialData]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manejar cambio de tipo de cliente
  const handleClienteTypeChange = (type: ClienteType) => {
    setClienteType(type);
    setFormData(prev => ({
      ...prev,
      tipo_cliente: type
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validación según tipo de cliente
      if (clienteType === 'persona') {
        if (!formData.nombre || !formData.apellidos) {
          setError('Los campos nombre y apellidos son obligatorios para clientes personales');
          setLoading(false);
          return;
        }
      } else {
        if (!formData.nombre_compania) {
          setError('El nombre de la compañía es obligatorio');
          setLoading(false);
          return;
        }
        
        if (!formData.contacto_nombre) {
          setError('El nombre del contacto es obligatorio para compañías');
          setLoading(false);
          return;
        }
      }
      
      // Si el correo electrónico está presente, validar formato
      if (formData.email && !validateEmail(formData.email)) {
        setError('El formato del correo electrónico no es válido');
        setLoading(false);
        return;
      }
      
      // Si el correo de contacto está presente, validar formato
      if (formData.contacto_email && !validateEmail(formData.contacto_email)) {
        setError('El formato del correo electrónico de contacto no es válido');
        setLoading(false);
        return;
      }
      
      // Guardar cliente
      await onSave(formData as Omit<Cliente, 'id' | 'created_at' | 'updated_at'>);
      onClose();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setError('Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para validar email
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>
            {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
        </div>
      </div>
      
      {/* Selector de tipo de cliente */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}>
          Tipo de Cliente
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => handleClienteTypeChange('persona')}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: clienteType === 'persona' ? '#F3F4FF' : 'white',
              border: `1px solid ${clienteType === 'persona' ? '#4F46E5' : '#e0e0e0'}`,
              borderRadius: '8px',
              color: clienteType === 'persona' ? '#4F46E5' : '#666',
              fontWeight: clienteType === 'persona' ? 500 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <UserIcon style={{ width: '18px', height: '18px', marginRight: '8px' }} />
            Persona
          </button>
          <button
            type="button"
            onClick={() => handleClienteTypeChange('compania')}
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: clienteType === 'compania' ? '#F3F4FF' : 'white',
              border: `1px solid ${clienteType === 'compania' ? '#4F46E5' : '#e0e0e0'}`,
              borderRadius: '8px',
              color: clienteType === 'compania' ? '#4F46E5' : '#666',
              fontWeight: clienteType === 'compania' ? 500 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <BuildingOfficeIcon style={{ width: '18px', height: '18px', marginRight: '8px' }} />
            Compañía
          </button>
        </div>
      </div>
      
      {/* Mostrar mensaje de error si existe */}
      {error && (
        <div style={{ 
          backgroundColor: 'rgba(220, 38, 38, 0.1)', 
          color: '#DC2626', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          fontFamily: "'Poppins', sans-serif"
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Campos específicos según tipo de cliente */}
        {clienteType === 'persona' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Nombre */}
            <div>
              <label 
                htmlFor="nombre" 
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
              >
                Nombre <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre || ''}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Poppins', sans-serif"
                }}
                required={clienteType === 'persona'}
              />
            </div>
            
            {/* Apellidos */}
            <div>
              <label 
                htmlFor="apellidos" 
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
              >
                Apellidos <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos || ''}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Poppins', sans-serif"
                }}
                required={clienteType === 'persona'}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            {/* Nombre de la Compañía */}
            <div>
              <label 
                htmlFor="nombre_compania" 
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
              >
                Nombre de la Compañía <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="nombre_compania"
                name="nombre_compania"
                value={formData.nombre_compania || ''}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Poppins', sans-serif"
                }}
                required={clienteType === 'compania'}
              />
            </div>
          </div>
        )}
        
        {/* Información de contacto común */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Email */}
          <div>
            <label 
              htmlFor="email" 
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
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
          
          {/* Teléfono */}
          <div>
            <label 
              htmlFor="telefono" 
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
            >
              Teléfono
            </label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono || ''}
              onChange={handleChange}
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

        {/* Campos específicos para compañía - Persona de contacto */}
        {clienteType === 'compania' && (
          <div style={{ marginBottom: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 500, marginTop: 0, marginBottom: '16px', color: '#4F46E5' }}>
              Persona responsable de compras
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* Nombre del contacto */}
              <div>
                <label 
                  htmlFor="contacto_nombre" 
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
                >
                  Nombre <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  id="contacto_nombre"
                  name="contacto_nombre"
                  value={formData.contacto_nombre || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    fontFamily: "'Poppins', sans-serif"
                  }}
                  required={clienteType === 'compania'}
                />
              </div>
              
              {/* Cargo del contacto */}
              <div>
                <label 
                  htmlFor="contacto_cargo" 
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
                >
                  Cargo
                </label>
                <input
                  type="text"
                  id="contacto_cargo"
                  name="contacto_cargo"
                  value={formData.contacto_cargo || ''}
                  onChange={handleChange}
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Email del contacto */}
              <div>
                <label 
                  htmlFor="contacto_email" 
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  id="contacto_email"
                  name="contacto_email"
                  value={formData.contacto_email || ''}
                  onChange={handleChange}
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
              
              {/* Teléfono del contacto */}
              <div>
                <label 
                  htmlFor="contacto_telefono" 
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
                >
                  Teléfono directo
                </label>
                <input
                  type="tel"
                  id="contacto_telefono"
                  name="contacto_telefono"
                  value={formData.contacto_telefono || ''}
                  onChange={handleChange}
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
          </div>
        )}

        {/* Dirección */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="direccion" 
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
          >
            Dirección
          </label>
          <input
            type="text"
            id="direccion"
            name="direccion"
            value={formData.direccion || ''}
            onChange={handleChange}
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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Ciudad */}
          <div>
            <label 
              htmlFor="ciudad" 
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
            >
              Ciudad
            </label>
            <input
              type="text"
              id="ciudad"
              name="ciudad"
              value={formData.ciudad || ''}
              onChange={handleChange}
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
          
          {/* Código Postal */}
          <div>
            <label 
              htmlFor="codigo_postal" 
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
            >
              Código Postal
            </label>
            <input
              type="text"
              id="codigo_postal"
              name="codigo_postal"
              value={formData.codigo_postal || ''}
              onChange={handleChange}
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
        
        {/* Fecha de Registro */}
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="fecha_registro" 
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
          >
            Fecha de Registro
          </label>
          <input
            type="date"
            id="fecha_registro"
            name="fecha_registro"
            value={formData.fecha_registro || ''}
            onChange={handleChange}
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
        
        {/* Notas */}
        <div style={{ marginBottom: '24px' }}>
          <label 
            htmlFor="notas" 
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Poppins', sans-serif" }}
          >
            Notas
          </label>
          <textarea
            id="notas"
            name="notas"
            value={formData.notas || ''}
            onChange={handleChange}
            placeholder={clienteType === 'persona' ? "Observaciones, preferencias del cliente, etc." : "Información adicional sobre la compañía"}
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
        
        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              backgroundColor: 'white',
              color: '#666',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '8px',
              cursor: loading ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Poppins', sans-serif",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '1px solid #e0e0e0',
              padding: '0 24px',
              borderRadius: '8px',
              cursor: loading ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Poppins', sans-serif",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? 'Guardando...' : initialData ? 'Actualizar' : `Añadir ${clienteType === 'persona' ? 'cliente' : 'compañía'}`}
          </button>
        </div>
      </form>
    </div>
  );
} 