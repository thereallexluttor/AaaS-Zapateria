import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useInventario } from '../lib/hooks';
import { InventoryItemType } from './InventoryItem';
import { Material, supabase } from '../lib/supabase';

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

// Tipos para órdenes de materiales
export interface OrdenMaterialForm {
  proveedor: string;
  referencia: string;
  cantidadSolicitada: string;
  unidades: string;
  fechaEntregaEstimada: string;
  precioUnitario: string;
  notas: string;
  estado: string;
  fechaOrden: string;
  numeroOrden: string;
  responsable: string;
}

interface OrdenMaterialFormProps {
  onClose: () => void;
  isClosing: boolean;
  material: InventoryItemType | null;
}

function OrdenMaterialForm({ onClose, isClosing, material = null }: OrdenMaterialFormProps) {
  // Estado para el formulario de órdenes
  const [ordenForm, setOrdenForm] = useState<OrdenMaterialForm>({
    proveedor: '',
    referencia: '',
    cantidadSolicitada: '',
    unidades: '',
    fechaEntregaEstimada: '',
    precioUnitario: '',
    notas: '',
    estado: 'Pendiente',
    fechaOrden: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    numeroOrden: `ORD-${Date.now().toString().substring(6)}`, // Generar un número de orden básico
    responsable: '',
  });

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OrdenMaterialForm, string>>>({});
  // Estado para mensajes de errores del servidor
  const [serverError, setServerError] = useState<string | null>(null);
  // Estado para controlar guardado
  const [isSaving, setIsSaving] = useState(false);

  // Estado para precios totales
  const [precioTotal, setPrecioTotal] = useState<string>('0.00');
  
  // Opciones de estados para el select
  const estadosOrden = [
    'Pendiente',
    'Enviada',
    'Recibida',
    'Cancelada'
  ];

  // Opciones de unidades para el select
  const unidades = [
    'metros',
    'metros cuadrados',
    'unidades',
    'pares',
    'kilogramos',
    'gramos',
    'litros',
    'mililitros',
    'pulgadas',
    'centímetros',
    'rollos',
    'cajas',
    'bobinas'
  ];

  // Cargar datos del material cuando se abre el formulario
  useEffect(() => {
    if (material && material.type === 'material') {
      // Calcular fecha de entrega estimada (7 días después de la fecha actual)
      const fechaEntregaEstimada = new Date();
      fechaEntregaEstimada.setDate(fechaEntregaEstimada.getDate() + 7);
      const fechaEntregaString = fechaEntregaEstimada.toISOString().split('T')[0];
      
      // Calcular cantidad sugerida basada en stock mínimo
      const cantidadSugerida = material.stock_minimo 
        ? Math.max(parseInt(material.stock_minimo) - parseInt(material.stock || '0'), 0).toString()
        : '100'; // Valor por defecto si no hay stock mínimo
      
      // Asegurarse de que las unidades coincidan con las opciones del select
      const unidadesNormalizadas = unidades.includes(material.unidades) 
        ? material.unidades 
        : 'unidades';
      
      setOrdenForm(prev => ({
        ...prev,
        proveedor: material.proveedor || 'Proveedor por defecto',
        referencia: material.referencia || `REF-${material.id || ''}`,
        precioUnitario: material.precio || '0.00',
        unidades: unidadesNormalizadas,
        cantidadSolicitada: cantidadSugerida,
        fechaEntregaEstimada: fechaEntregaString,
        estado: 'Pendiente',
        notas: `Pedido de ${material.nombre || 'material'} para reposición de inventario.`,
        responsable: 'Administrador', // Valor por defecto para responsable
      }));
    }
  }, [material, unidades]);

  const handleOrdenChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOrdenForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (formErrors[name as keyof OrdenMaterialForm]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Actualizar precio total cuando cambia la cantidad o el precio
    if (name === 'cantidadSolicitada' || name === 'precioUnitario') {
      calcularPrecioTotal({
        ...ordenForm,
        [name]: value
      });
    }
  };

  // Función para calcular el precio total
  const calcularPrecioTotal = useCallback((form: OrdenMaterialForm) => {
    const cantidad = parseInt(form.cantidadSolicitada) || 0;
    const precio = parseFloat(form.precioUnitario) || 0;
    const total = cantidad * precio;
    setPrecioTotal(total.toFixed(2));
  }, []);
  
  // Calcular precio total cuando se cargan datos iniciales
  useEffect(() => {
    calcularPrecioTotal(ordenForm);
  }, [ordenForm.cantidadSolicitada, ordenForm.precioUnitario, calcularPrecioTotal]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof OrdenMaterialForm, string>> = {};
    
    // Validar campos requeridos
    if (!ordenForm.proveedor.trim()) errors.proveedor = 'Por favor, ingresa el proveedor';
    if (!ordenForm.cantidadSolicitada.trim()) errors.cantidadSolicitada = 'Por favor, ingresa la cantidad a ordenar';
    if (!ordenForm.fechaOrden.trim()) errors.fechaOrden = 'Por favor, selecciona la fecha de orden';
    
    // Validar que cantidad y precio sean números
    if (ordenForm.cantidadSolicitada && !/^\d+$/.test(ordenForm.cantidadSolicitada)) 
      errors.cantidadSolicitada = 'La cantidad debe ser un número entero (ej: 120)';
    
    if (ordenForm.precioUnitario && !/^\d+(\.\d{1,2})?$/.test(ordenForm.precioUnitario)) 
      errors.precioUnitario = 'El precio debe ser un número con hasta 2 decimales (ej: 45.99)';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setServerError(null);
    
    try {
      // Transformar los campos para la orden
      const ordenData = {
        material_id: material?.id ? parseInt(material.id) : null,
        nombre_material: material?.nombre,
        proveedor: ordenForm.proveedor,
        referencia: ordenForm.referencia,
        cantidad_solicitada: parseInt(ordenForm.cantidadSolicitada),
        unidades: ordenForm.unidades,
        fecha_entrega_estimada: ordenForm.fechaEntregaEstimada || null,
        precio_unitario: ordenForm.precioUnitario ? parseFloat(ordenForm.precioUnitario) : null,
        notas: ordenForm.notas || null,
        estado: ordenForm.estado,
        fecha_orden: ordenForm.fechaOrden,
        numero_orden: ordenForm.numeroOrden,
        responsable: ordenForm.responsable || null
      };
      
      console.log("Datos de orden a enviar:", ordenData);
      
      // Insertar en la tabla ordenes_materiales
      const { data, error } = await supabase
        .from('ordenes_materiales')
        .insert([ordenData])
        .select();
      
      if (error) {
        console.error('Error al guardar la orden:', error);
        setServerError(`Error al guardar: ${error.message}`);
        return;
      }
      
      console.log('Orden guardada exitosamente:', data);
      
      // Mostrar una notificación de éxito
      const successMessage = document.createElement('div');
      successMessage.textContent = 'Orden de material registrada con éxito';
      successMessage.style.position = 'fixed';
      successMessage.style.bottom = '20px';
      successMessage.style.left = '50%';
      successMessage.style.transform = 'translateX(-50%)';
      successMessage.style.backgroundColor = '#10B981';
      successMessage.style.color = 'white';
      successMessage.style.padding = '10px 20px';
      successMessage.style.borderRadius = '5px';
      successMessage.style.zIndex = '10000';
      
      document.body.appendChild(successMessage);
      
      // Remover la notificación después de 3 segundos
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
      
      // Cerrar formulario
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error al registrar la orden:', error);
      setServerError(`Ocurrió un error: ${error.message}`);
    } finally {
      setIsSaving(false);
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
      aria-labelledby="orden-material-form-title"
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
        <div style={{ flex: 1 }}>
          <h2 
            id="orden-material-form-title"
            style={{ fontSize: '20px', fontWeight: 400, margin: 0, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
          >
            Ordenar Material: {material?.nombre}
          </h2>
          {material?.type === 'material' && (
            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
              {material.referencia && <span>Ref: {material.referencia}</span>}
              {material.proveedor && <span style={{ marginLeft: material.referencia ? '12px' : '0' }}>Proveedor: {material.proveedor}</span>}
            </div>
          )}
        </div>
      </header>
      
      {serverError && (
        <div 
          style={{ 
            backgroundColor: 'rgba(220, 38, 38, 0.1)', 
            color: '#DC2626', 
            padding: '12px', 
            borderRadius: '5px',
            marginBottom: '16px',
            fontSize: '14px',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
          }}
          role="alert"
          aria-live="assertive"
        >
          {serverError}
        </div>
      )}
      
      <form onSubmit={handleSubmitOrden}>
        <section>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="numero-orden"
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  Número de Orden
                </label>
                <input
                  type="text"
                  name="numeroOrden"
                  id="numero-orden"
                  value={ordenForm.numeroOrden}
                  onChange={handleOrdenChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    backgroundColor: '#f9f9f9'
                  }}
                  readOnly
                />
              </div>

              <div>
                <label 
                  htmlFor="referencia"
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  Referencia del Material
                </label>
                <input
                  type="text"
                  name="referencia"
                  id="referencia"
                  value={ordenForm.referencia}
                  onChange={handleOrdenChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    backgroundColor: '#f9f9f9'
                  }}
                  readOnly
                />
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="fecha-orden"
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  Fecha de Orden <span style={{ color: '#4F46E5' }}>*</span>
                </label>
                <input
                  type="date"
                  name="fechaOrden"
                  id="fecha-orden"
                  value={ordenForm.fechaOrden}
                  onChange={handleOrdenChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: formErrors.fechaOrden ? '1px solid red' : '1px solid #ddd',
                    fontSize: '14px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                  }}
                  aria-required="true"
                  aria-invalid={!!formErrors.fechaOrden}
                />
                {formErrors.fechaOrden && (
                  <p 
                    id="fecha-orden-error"
                    style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                  >
                    {formErrors.fechaOrden}
                  </p>
                )}
              </div>

              <div>
                <label 
                  htmlFor="fecha-entrega"
                  style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  Fecha de Entrega Estimada
                </label>
                <input
                  type="date"
                  name="fechaEntregaEstimada"
                  id="fecha-entrega"
                  value={ordenForm.fechaEntregaEstimada}
                  onChange={handleOrdenChange}
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
            </div>
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="proveedor"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Proveedor <span style={{ color: '#4F46E5' }}>*</span>
              </label>
              <input
                type="text"
                name="proveedor"
                id="proveedor"
                value={ordenForm.proveedor}
                onChange={handleOrdenChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.proveedor ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                placeholder="Nombre del proveedor"
                aria-required="true"
                aria-invalid={!!formErrors.proveedor}
                aria-describedby={formErrors.proveedor ? "proveedor-error" : undefined}
              />
              {formErrors.proveedor && (
                <p 
                  id="proveedor-error"
                  style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {formErrors.proveedor}
                </p>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="cantidad-solicitada"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Cantidad a Ordenar <span style={{ color: '#4F46E5' }}>*</span>
              </label>
              <input
                type="text"
                name="cantidadSolicitada"
                id="cantidad-solicitada"
                value={ordenForm.cantidadSolicitada}
                onChange={handleOrdenChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.cantidadSolicitada ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                inputMode="numeric"
                placeholder="Ej: 100"
                aria-required="true"
                aria-invalid={!!formErrors.cantidadSolicitada}
                aria-describedby={formErrors.cantidadSolicitada ? "cantidad-error" : undefined}
              />
              {formErrors.cantidadSolicitada && (
                <p 
                  id="cantidad-error"
                  style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {formErrors.cantidadSolicitada}
                </p>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="unidades"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Unidades
              </label>
              <select
                name="unidades"
                id="unidades"
                value={ordenForm.unidades}
                onChange={handleOrdenChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  ...selectStyle(!!ordenForm.unidades)
                }}
              >
                <option value="" style={{color: placeholderColor}}>Seleccionar unidades</option>
                {unidades.map(unidad => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="precio-unitario"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Precio Unitario
              </label>
              <input
                type="text"
                name="precioUnitario"
                id="precio-unitario"
                value={ordenForm.precioUnitario}
                onChange={handleOrdenChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: formErrors.precioUnitario ? '1px solid red' : '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                inputMode="decimal"
                placeholder="Ej: 45.50"
                aria-invalid={!!formErrors.precioUnitario}
                aria-describedby={formErrors.precioUnitario ? "precio-error" : undefined}
              />
              {formErrors.precioUnitario && (
                <p 
                  id="precio-error"
                  style={{ color: 'red', fontSize: '12px', margin: '4px 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {formErrors.precioUnitario}
                </p>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="estado-orden"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Estado
              </label>
              <select
                name="estado"
                id="estado-orden"
                value={ordenForm.estado}
                onChange={handleOrdenChange}
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
                {estadosOrden.map(estado => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="responsable"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                Responsable
              </label>
              <input
                type="text"
                name="responsable"
                id="responsable"
                value={ordenForm.responsable}
                onChange={handleOrdenChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}
                placeholder="Nombre del responsable"
              />
            </div>
          </div>
          
          {/* Sección de precio total */}
          <div style={{ 
            marginBottom: '20px', 
            backgroundColor: '#F0FDF4', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #DCFCE7' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center' 
            }}>
              <div>
                <span style={{ 
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#166534',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}>
                  Resumen de la orden
                </span>
                <div style={{ 
                  fontSize: '14px',
                  color: '#166534',
                  marginTop: '4px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                }}>
                  {ordenForm.cantidadSolicitada || '0'} {ordenForm.unidades || 'unidades'} × ${ordenForm.precioUnitario || '0.00'}
                </div>
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#166534',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}>
                Total: ${precioTotal}
              </div>
            </div>
          </div>
        </section>
        
        <section>
          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="notas-orden"
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              Notas adicionales
            </label>
            <textarea
              name="notas"
              id="notas-orden"
              value={ordenForm.notas}
              onChange={handleOrdenChange}
              placeholder="Instrucciones especiales, observaciones, etc."
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
        </section>
        
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
              backgroundColor: '#10B981',
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
            aria-busy={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Registrar Orden'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OrdenMaterialForm; 