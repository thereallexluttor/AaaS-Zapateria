import { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Trabajador } from '../lib/supabase';

interface TrabajadorFormProps {
  onClose: () => void;
  onSave: (trabajador: Omit<Trabajador, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  trabajadorToEdit?: Trabajador;
  isClosing: boolean;
}

type FormData = {
  nombre: string;
  apellido: string;
  cedula: string;
  fecha_contratacion: string;
  correo: string;
  telefono: string;
  direccion: string;
  salario: string;
  tipo: 'produccion' | 'administrativo' | 'diseno';
  area: 'corte' | 'aparado' | 'montaje' | 'suela' | 'acabado' | 'ventas' | 'administracion' | 'diseno';
  especialidad: string;
  tipo_contrato: 'completo' | 'parcial' | 'temporal' | 'practica';
  horas_trabajo: string;
  fecha_nacimiento: string;
};

function TrabajadorFormComponent({ onClose, onSave, trabajadorToEdit, isClosing }: TrabajadorFormProps) {
  // Estado del formulario
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    apellido: '',
    cedula: '',
    fecha_contratacion: new Date().toISOString().split('T')[0],
    correo: '',
    telefono: '',
    direccion: '',
    salario: '',
    tipo: 'produccion',
    area: 'corte',
    especialidad: '',
    tipo_contrato: 'completo',
    horas_trabajo: '',
    fecha_nacimiento: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Referencia al primer campo para enfocar al abrir
  const firstFieldRef = useRef<HTMLInputElement>(null);
  
  // Si se proporciona un trabajador para editar, cargar sus datos
  useEffect(() => {
    if (trabajadorToEdit) {
      setFormData({
        nombre: trabajadorToEdit.nombre || '',
        apellido: trabajadorToEdit.apellido || '',
        cedula: trabajadorToEdit.cedula || '',
        fecha_contratacion: trabajadorToEdit.fecha_contratacion?.split('T')[0] || new Date().toISOString().split('T')[0],
        correo: trabajadorToEdit.correo || '',
        telefono: trabajadorToEdit.telefono || '',
        direccion: trabajadorToEdit.direccion || '',
        salario: trabajadorToEdit.salario?.toString() || '',
        tipo: trabajadorToEdit.tipo || 'produccion',
        area: trabajadorToEdit.area || 'corte',
        especialidad: trabajadorToEdit.especialidad || '',
        tipo_contrato: trabajadorToEdit.tipo_contrato || 'completo',
        horas_trabajo: trabajadorToEdit.horas_trabajo?.toString() || '',
        fecha_nacimiento: trabajadorToEdit.fecha_nacimiento?.split('T')[0] || ''
      });
    }
  }, [trabajadorToEdit]);
  
  // Establecer el foco en el primer campo al montar
  useEffect(() => {
    if (firstFieldRef.current) {
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 100);
    }
  }, []);
  
  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando cambia
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Validar el formulario antes de guardar
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validar campos requeridos
    if (!formData.nombre) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido) newErrors.apellido = 'El apellido es requerido';
    if (!formData.cedula) newErrors.cedula = 'La cédula es requerida';
    if (!formData.fecha_contratacion) newErrors.fecha_contratacion = 'La fecha de contratación es requerida';
    if (!formData.correo) newErrors.correo = 'El correo es requerido';
    if (!formData.tipo) newErrors.tipo = 'El tipo es requerido';
    if (!formData.area) newErrors.area = 'El área es requerida';
    if (!formData.tipo_contrato) newErrors.tipo_contrato = 'El tipo de contrato es requerido';
    
    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.correo && !emailRegex.test(formData.correo)) {
      newErrors.correo = 'Formato de correo inválido';
    }
    
    // Validar salario
    if (formData.salario && (isNaN(Number(formData.salario)) || Number(formData.salario) < 0)) {
      newErrors.salario = 'El salario debe ser un número positivo';
    }
    
    // Validar horas de trabajo
    if (formData.horas_trabajo) {
      const horas = Number(formData.horas_trabajo);
      if (isNaN(horas) || horas < 0 || horas > 168) {
        newErrors.horas_trabajo = 'Las horas deben estar entre 0 y 168';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Preparar los datos para guardar
      const trabajadorData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        cedula: formData.cedula,
        fecha_contratacion: formData.fecha_contratacion,
        correo: formData.correo,
        telefono: formData.telefono || undefined,
        direccion: formData.direccion || undefined,
        salario: formData.salario ? parseFloat(formData.salario) : undefined,
        tipo: formData.tipo,
        area: formData.area,
        especialidad: formData.especialidad || undefined,
        tipo_contrato: formData.tipo_contrato,
        horas_trabajo: formData.horas_trabajo ? parseInt(formData.horas_trabajo) : undefined,
        fecha_nacimiento: formData.fecha_nacimiento || undefined
      };
      
      await onSave(trabajadorData);
      onClose(); // Cerrar el formulario después de guardar exitosamente
    } catch (error) {
      console.error('Error al guardar trabajador:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Error al guardar el trabajador. Por favor, intente nuevamente.'
      }));
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '5px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden',
        animation: isClosing ? 'none' : 'modalAppear 0.3s ease',
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
        opacity: isClosing ? 0 : 1,
        transition: 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      {/* Encabezado con título y botón de cerrar */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #F3F4F6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: '#111827',
          fontFamily: "'Poppins', sans-serif"
        }}>
          {trabajadorToEdit ? 'Editar Trabajador' : 'Nuevo Trabajador'}
        </h2>
        
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '5px',
            color: '#6B7280',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <XMarkIcon style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
      
      {/* Contenido del formulario */}
      <div style={{
        padding: '0 24px 20px',
        maxHeight: 'calc(90vh - 70px)',
        overflowY: 'auto',
        fontFamily: "'Poppins', sans-serif"
      }} className="apple-scrollbar">
        <form onSubmit={handleSubmit}>
          {/* Sección Información Personal */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '16px'
            }}>
              Información Personal
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Nombre */}
              <div>
                <label 
                  htmlFor="nombre" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Nombre <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="text"
                  id="nombre"
                  name="nombre"
                  ref={firstFieldRef}
                  value={formData.nombre}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  required
                />
              </div>
              
              {/* Apellido */}
              <div>
                <label 
                  htmlFor="apellido" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Apellido <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  required
                />
              </div>
              
              {/* Cédula */}
              <div>
                <label 
                  htmlFor="cedula" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Cédula de Identidad <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="text"
                  id="cedula"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  required
                />
              </div>
              
              {/* Fecha de Nacimiento */}
              <div>
                <label 
                  htmlFor="fecha_nacimiento" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Fecha de Nacimiento
                </label>
                <input 
                  type="date"
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>
          </div>
          
          {/* Sección Información de Contacto */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '16px'
            }}>
              Información de Contacto
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Correo Electrónico */}
              <div>
                <label 
                  htmlFor="correo" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Correo Electrónico
                </label>
                <input 
                  type="email"
                  id="correo"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              
              {/* Teléfono */}
              <div>
                <label 
                  htmlFor="telefono" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Teléfono
                </label>
                <input 
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              
              {/* Dirección */}
              <div style={{ gridColumn: 'span 2' }}>
                <label 
                  htmlFor="direccion" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Dirección
                </label>
                <input 
                  type="text"
                  id="direccion"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>
          </div>
          
          {/* Sección Información Laboral */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '16px'
            }}>
              Información Laboral
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Fecha de Contratación */}
              <div>
                <label 
                  htmlFor="fecha_contratacion" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Fecha de Contratación
                </label>
                <input 
                  type="date"
                  id="fecha_contratacion"
                  name="fecha_contratacion"
                  value={formData.fecha_contratacion}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              
              {/* Tipo de Trabajador */}
              <div>
                <label 
                  htmlFor="tipo" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Rol del Trabajador
                </label>
                <select 
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                >
                  <option value="produccion">Producción</option>
                  <option value="ventas">Ventas</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="diseño">Diseño</option>
                </select>
              </div>
              
              {/* Área específica */}
              <div>
                <label 
                  htmlFor="area" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Área de trabajo
                </label>
                <select 
                  id="area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                >
                  <option value="corte">Corte de material</option>
                  <option value="aparado">Aparado (costura)</option>
                  <option value="montaje">Montaje</option>
                  <option value="suela">Colocación de suela</option>
                  <option value="acabado">Acabado y empaque</option>
                  <option value="ventas">Atención al cliente</option>
                  <option value="administracion">Administración</option>
                  <option value="diseño">Diseño de calzado</option>
                </select>
              </div>
              
              {/* Salario */}
              <div>
                <label 
                  htmlFor="salario" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Salario
                </label>
                <input 
                  type="number"
                  id="salario"
                  name="salario"
                  value={formData.salario}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              
              {/* Tipo de Contrato */}
              <div>
                <label 
                  htmlFor="tipo_contrato" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Tipo de Contrato
                </label>
                <select 
                  id="tipo_contrato"
                  name="tipo_contrato"
                  value={formData.tipo_contrato}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                >
                  <option value="completo">Tiempo Completo</option>
                  <option value="parcial">Tiempo Parcial</option>
                  <option value="obra">Por obra o servicio</option>
                  <option value="aprendiz">Aprendiz/Practicante</option>
                </select>
              </div>
              
              {/* Especialidad */}
              <div>
                <label 
                  htmlFor="especialidad" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Especialidad/Habilidades
                </label>
                <input 
                  type="text"
                  id="especialidad"
                  name="especialidad"
                  value={formData.especialidad}
                  onChange={handleChange}
                  placeholder="Ej: Costura fina, Diseño de calzado deportivo"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              
              {/* Horas de Trabajo */}
              <div>
                <label 
                  htmlFor="horas_trabajo" 
                  style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: '#111827',
                    marginBottom: '6px'
                  }}
                >
                  Horas de Trabajo (Semanal)
                </label>
                <input 
                  type="number"
                  id="horas_trabajo"
                  name="horas_trabajo"
                  value={formData.horas_trabajo}
                  onChange={handleChange}
                  placeholder="40"
                  step="1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '5px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: '16px',
            marginTop: '32px',
            borderTop: '1px solid #F3F4F6',
            paddingTop: '20px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'white',
                color: '#111827',
                border: '1px solid #E5E7EB',
                padding: '0 24px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                height: '36px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              style={{
                backgroundColor: 'white',
                color: '#4F46E5',
                border: '1px solid #E5E7EB',
                padding: '0 24px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                height: '36px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              {trabajadorToEdit ? 'Actualizar Trabajador' : 'Guardar Trabajador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TrabajadorFormComponent; 