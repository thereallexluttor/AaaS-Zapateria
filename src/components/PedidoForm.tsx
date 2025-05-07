import { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentTextIcon, PhotoIcon, TableCellsIcon, ClockIcon, WrenchIcon, ListBulletIcon, CheckCircleIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import ProductSelector from './ProductSelector';
import { supabase } from '../lib/supabase';
import { Producto, ProductoSeleccionado, PedidoFormData, Cliente } from '../lib/types';
import PasosProduccionCards from './PasosProduccionCards';

interface PedidoFormProps {
  onClose: () => void;
  isEditing?: boolean;
  initialData?: any;
  isClosing?: boolean;
}

interface Trabajador {
  id: number;
  nombre: string;
  apellido: string;
}

// Función para parsear intervalos de PostgreSQL
function parsePostgresInterval(interval: string): number {
  if (!interval) return 0;

  // PostgreSQL INTERVAL puede venir en varios formatos:
  // "1 day" -> P1D
  // "01:02:03" -> PT1H2M3S
  // "1 day 01:02:03" -> P1DT1H2M3S
  // "1 mon" -> P1M
  // "1 year" -> P1Y
  
  let totalMinutes = 0;
  
  // Si el intervalo incluye días/meses/años
  const dayMatch = interval.match(/(\d+) days?/);
  const monthMatch = interval.match(/(\d+) mons?/);
  const yearMatch = interval.match(/(\d+) years?/);
  
  if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
  if (monthMatch) totalMinutes += parseInt(monthMatch[1]) * 30 * 24 * 60; // Aproximado
  if (yearMatch) totalMinutes += parseInt(yearMatch[1]) * 365 * 24 * 60; // Aproximado
  
  // Buscar el componente de tiempo HH:MM:SS
  const timeMatch = interval.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    const [_, hours, minutes, seconds] = timeMatch;
    totalMinutes += parseInt(hours) * 60;
    totalMinutes += parseInt(minutes);
    totalMinutes += Math.round(parseInt(seconds) / 60);
  }
  
  return totalMinutes;
}

// Función para formatear tiempo total en un formato legible
function formatTotalTime(totalHours: number): string {
  if (totalHours === 0) return '0 horas';

  const days = Math.floor(totalHours / 24);
  totalHours %= 24;
  
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);

  const parts = [];
  
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);

  return parts.join(', ');
}

// Función para formatear un intervalo para mostrar en la UI
function formatInterval(interval: string): string {
  const minutes = parsePostgresInterval(interval);
  return formatTotalTime(minutes / 60);
}

function PedidoForm({ onClose, isEditing = false, initialData = null, isClosing = false }: PedidoFormProps) {
  // Estado para manejar la subida de archivos
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'excel' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para los clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  
  // Nuevo estado para trabajadores
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false);
  
  // Estado para el formulario manual
  const [showManualForm, setShowManualForm] = useState(false);
  const [formData, setFormData] = useState<PedidoFormData>({
    cliente: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaEntrega: '',
    estado: 'Pendiente',
    observaciones: '',
    productos: [],
    // Valores por defecto para los nuevos campos
    trabajador_id: undefined,
    descuento: 0,
    forma_pago: 'Efectivo'
  });
  
  const [showPasosProduccion, setShowPasosProduccion] = useState(false);
  const [productosConPasos, setProductosConPasos] = useState<Array<{
    id: number;
    nombre: string;
    cantidad: number;
    pasos: Array<{
      id: number;
      producto_id: number;
      herramienta_id: number;
      descripcion: string;
      tiempo_estimado: string;
      orden: number;
      herramienta: {
        nombre: string;
      };
    }>;
  }>>([]);

  // Agregar estado para guardar el ID del pedido
  const [pedidoId, setPedidoId] = useState<number | undefined>(undefined);

  // Add productos state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Add pagination state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Function to handle step navigation
  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to check if current step is valid
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.cliente && formData.fechaEntrega;
      case 2:
        return true; // Observaciones are optional
      case 3:
        return formData.productos.length > 0;
      case 4:
        return formData.trabajador_id && formData.forma_pago;
      default:
        return false;
    }
  };

  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        // Ensure cliente is treated as string ID initially if it comes from data
        cliente: String(initialData.cliente_id || initialData.cliente || ''),
        fechaInicio: initialData.fecha_inicio || new Date().toISOString().split('T')[0],
        fechaEntrega: initialData.created_at || '',
        estado: initialData.estado || 'pendiente',
        observaciones: initialData.observaciones || '',
        // Assuming initialData.productos is already in ProductoSeleccionado format
        productos: initialData.detalle_pedidos?.map((detalle: any) => ({
            id: detalle.producto_id,
            nombre: detalle.productos_table?.nombre || 'Producto Desconocido', // Adjust based on how product name is fetched/stored
            precio: detalle.precio_unitario,
            cantidad: detalle.cantidad,
            tallasSeleccionadas: typeof detalle.tallas === 'string' ? JSON.parse(detalle.tallas) : detalle.tallas || [],
            coloresSeleccionados: typeof detalle.colores === 'string' ? JSON.parse(detalle.colores) : detalle.colores || []
        })) || initialData.productos || [],
        // Ensure trabajador_id is parsed to number or kept as undefined
        trabajador_id: initialData.trabajador_id ? parseInt(String(initialData.trabajador_id), 10) : undefined,
        descuento: initialData.ventas?.[0]?.descuento_porcentaje || initialData.descuento || 0, // Example: get discount percentage if available
        forma_pago: initialData.ventas?.[0]?.forma_pago || initialData.forma_pago || 'Efectivo' // Example: get payment method if available
      });
      setShowManualForm(true);
    }
  }, [isEditing, initialData]);

  // Cargar clientes desde Supabase
  useEffect(() => {
    async function fetchClientes() {
      setLoadingClientes(true);
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .order('nombre');
        
        if (error) throw error;
        setClientes(data || []);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
      } finally {
        setLoadingClientes(false);
      }
    }

    if (showManualForm) {
      fetchClientes();
    }
  }, [showManualForm]);

  // Cargar trabajadores desde Supabase
  useEffect(() => {
    async function fetchTrabajadores() {
      setLoadingTrabajadores(true);
      try {
        const { data, error } = await supabase
          .from('trabajadores')
          .select('*')
          .eq('area', 'ventas')  // Solo trabajadores del área de ventas
          .order('nombre');
        
        if (error) throw error;
        setTrabajadores(data || []);
      } catch (error) {
        console.error('Error al cargar trabajadores:', error);
      } finally {
        setLoadingTrabajadores(false);
      }
    }

    if (showManualForm) {
      fetchTrabajadores();
    }
  }, [showManualForm]);

  // Add useEffect to load products
  useEffect(() => {
    async function fetchProductos() {
      setLoadingProductos(true);
      try {
        const { data, error } = await supabase
          .from('productos_table')
          .select('*')
          .order('nombre');
        
        if (error) throw error;
        setProductos(data || []);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      } finally {
        setLoadingProductos(false);
      }
    }

    if (showManualForm) {
      fetchProductos();
    }
  }, [showManualForm]);

  // Función para manejar la selección de archivos
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf' | 'excel') => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setFileType(type);
      
      // Simular un progreso de carga
      setIsUploading(true);
      setUploadProgress(0);
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
  }, []);

  // Función para activar el input de archivo
  const triggerFileInput = useCallback((type: 'image' | 'pdf' | 'excel') => {
    setFileType(type);
    if (fileInputRef.current) {
      // Limpiar el valor para permitir seleccionar el mismo archivo
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // Obtener texto según el tipo de archivo
  const getFileTypeText = useCallback(() => {
    switch (fileType) {
      case 'image':
        return 'imagen';
      case 'pdf':
        return 'PDF';
      case 'excel':
        return 'Excel';
      default:
        return 'archivo';
    }
  }, [fileType]);
  
  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manejar la adición de un producto
  const handleProductoSeleccionado = (producto: ProductoSeleccionado) => {
    setFormData(prev => ({
      ...prev,
      productos: [...prev.productos, producto]
    }));
  };
  
  // Manejar la eliminación de un producto
  const handleProductoRemovido = (productoId: number) => {
    setFormData(prev => ({
      ...prev,
      productos: prev.productos.filter(p => p.id !== productoId)
    }));
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar datos básicos
    if (!formData.cliente || !formData.fechaEntrega) {
      alert('Por favor complete los campos cliente y fecha de entrega.');
      return;
    }
    
    // Validar que haya al menos un producto
    if (formData.productos.length === 0) {
      alert('Por favor seleccione al menos un producto.');
      return;
    }

    // Validar que se haya seleccionado un trabajador
    if (!formData.trabajador_id) { // Check if it's falsy (empty string, undefined, null, 0)
      alert('Por favor seleccione un trabajador.');
      return;
    }
    
    // Ensure IDs are parsed correctly and handle potential errors
    const clienteIdParsed = parseInt(formData.cliente, 10);
    // We know trabajador_id is truthy here due to the validation above, safe to convert
    const trabajadorIdParsed = parseInt(String(formData.trabajador_id), 10);

    if (isNaN(clienteIdParsed)) {
      alert('El ID del cliente seleccionado no es válido.');
      return;
    }
    if (isNaN(trabajadorIdParsed)) {
      alert('El ID del trabajador seleccionado no es válido.');
      return;
    }

    // *** WORKAROUND LOGIC DUE TO USING ONLY 'ventas' TABLE ***
    // This approach is NOT recommended. Editing is disabled.
    // Assumes 'ventas' table holds all order item details.
    // WARNING: 'ventas.observaciones' is DATE type in schema, which is incorrect for text.
    // WARNING: Editing logic is removed as it's unreliable without a proper 'pedidos' table and pedido_id.

    if (isEditing) {
        alert('La edición de pedidos no está soportada con la estructura actual de la base de datos. Por favor, contacte al administrador.');
        return;
    }

    try {
      // REMOVED: First upsert into 'ventas' (conflicted with schema)
      // REMOVED: Deletion logic for editing
      // REMOVED: Insertion into 'detalle_pedidos' (assuming ventas holds details)

      // Prepare Ventas Data (One row per product)
      const ventasData = formData.productos.map(producto => {
        const precio_venta_total = Number((producto.cantidad * producto.precio).toFixed(2));
        const descuento_calculado = Number(((precio_venta_total * (formData.descuento ?? 0)) / 100).toFixed(2));

        // Ensure estado matches database constraint - use only allowed values
        // Direct assignment of a valid value ensures no constraint violation
        // This approach is safer than trying to transform the value
        const estado = formData.estado === 'Pendiente' || formData.estado === 'Completada' || formData.estado === 'Cancelada'
          ? formData.estado 
          : 'Pendiente'; // Default fallback

        return {
          // No pedido_id available with this structure
          cliente_id: clienteIdParsed,
          producto_id: producto.id,
          trabajador_id: trabajadorIdParsed,
          cantidad: producto.cantidad,
          precio_venta: precio_venta_total,
          descuento: descuento_calculado,
          forma_pago: formData.forma_pago,
          estado: estado, // Direct assignment of validated value
          fecha_entrega: formData.fechaEntrega,
          fecha_inicio: formData.fechaInicio,
          // Add tallas and colores data
          tallas: JSON.stringify(producto.tallasSeleccionadas || []),
          colores: JSON.stringify(producto.coloresSeleccionados || []),
          // Include observaciones as TEXT
          observaciones: formData.observaciones,
        };
      });

      // Insert Ventas Data
      const { error: ventasError } = await supabase
        .from('ventas')
        .insert(ventasData);

      if (ventasError) {
        console.error('Error en insert de ventas:', ventasError);
        // Check for specific errors if needed
        if (ventasError?.message?.includes('invalid input syntax for type date')) {
             throw new Error(`Error al guardar datos de venta: Formato de fecha inválido para 'fecha_inicio' (${formData.fechaInicio}) o 'fecha_entrega' (${formData.fechaEntrega}). Verifique las fechas.`);
        }
        if (ventasError?.message?.includes('null value in column "observaciones"')) {
            throw new Error(`Error al guardar datos de venta: La columna 'observaciones' en la tabla 'ventas' no puede ser nula.`);
        }
        if (ventasError?.message?.includes('violates not-null constraint')) {
             // General NOT NULL error, check required fields
             throw new Error(`Error al guardar datos de venta: Falta un campo requerido. Detalles: ${ventasError.message}`);
        }
        throw new Error(`Error al guardar datos de venta: ${ventasError.message}`);
      }

      // REMOVED: Production steps logic (no single pedido_id)
      // setProductosConPasos(productosConPasosTemp);
      // setShowPasosProduccion(true);

      alert('¡Ventas registradas exitosamente!'); // Simple success message
      onClose(); // Close the form

    } catch (error: any) {
      console.error('Error detallado al guardar las ventas:', error);
      alert(error.message || 'Ocurrió un error inesperado al guardar las ventas.');
    }
  };

  // REMOVED: PasosProduccionCards rendering logic
  // if (showPasosProduccion) { ... }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '5px',
      padding: '20px',
      width: '100%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      animation: 'modalAppear 0.3s forwards',
      opacity: isClosing ? 0 : 1,
      transform: isClosing ? 'scale(0.95)' : 'scale(1)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      scrollbarWidth: 'thin',
      scrollbarColor: '#E5E7EB #F3F4F6'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #F3F4F6',
        paddingBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={currentStep === 1 ? onClose : handlePrevStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F3F4F6',
              color: '#4B5563',
              border: 'none',
              borderRadius: '5px',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#4B5563';
            }}
            aria-label={currentStep === 1 ? "Cerrar" : "Volver"}
          >
            <ArrowLeftIcon style={{ width: '20px', height: '20px' }} />
          </button>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 600,
            color: '#111827',
            margin: 0
          }}>
            {isEditing ? 'Editar Pedido' : 'Nuevo Pedido'} - Paso {currentStep} de {totalSteps}
          </h2>
        </div>

        {/* Progress indicators */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: currentStep > index ? '#4F46E5' : '#E5E7EB',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
      
      {!showManualForm && (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* File upload section */}
          <div style={{ 
            backgroundColor: '#F9FAFB',
            borderRadius: '5px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#4F46E5',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#111827',
                  margin: 0
                }}>
                  Análisis inteligente de documentos
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6B7280',
                  margin: '4px 0 0 0'
                }}>
                  Sube un archivo para que nuestro sistema de IA lo analice automáticamente.
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {/* Upload buttons with improved styling */}
              <button
                onClick={() => triggerFileInput('image')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#EEF2FF',
                  color: '#4F46E5',
                  border: '1px solid #E0E7FF',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '48px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E0E7FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EEF2FF';
                }}
              >
                <PhotoIcon style={{ width: '20px', height: '20px' }} />
                Subir imagen
              </button>
              
              {/* Similar styling for PDF and Excel buttons */}
              <button
                onClick={() => triggerFileInput('pdf')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#FEE2E2',
                  color: '#B91C1C',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '48px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FECACA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                }}
              >
                <DocumentTextIcon style={{ width: '20px', height: '20px' }} />
                Subir PDF
              </button>
              
              <button
                onClick={() => triggerFileInput('excel')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#D1FAE5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '48px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#A7F3D0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#D1FAE5';
                }}
              >
                <TableCellsIcon style={{ width: '20px', height: '20px' }} />
                Subir Excel
              </button>
            </div>
            
            {/* Input de archivo oculto */}
            <input 
              ref={fileInputRef}
              type="file" 
              style={{ display: 'none' }}
              accept={
                fileType === 'image' ? 'image/*' : 
                fileType === 'pdf' ? '.pdf' :
                fileType === 'excel' ? '.xlsx,.xls,.csv' : '*'
              }
              onChange={(e) => fileType && handleFileSelect(e, fileType)}
            />
            
            {/* Mostrar archivo seleccionado */}
            {selectedFile && (
              <div style={{ 
                marginTop: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '12px', 
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {fileType === 'image' && <PhotoIcon style={{ width: '18px', height: '18px', color: '#1E40AF' }} />}
                    {fileType === 'pdf' && <DocumentTextIcon style={{ width: '18px', height: '18px', color: '#B91C1C' }} />}
                    {fileType === 'excel' && <TableCellsIcon style={{ width: '18px', height: '18px', color: '#065F46' }} />}
                    <span style={{ fontSize: '14px', color: '#374151' }}>{selectedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6B7280',
                      fontSize: '14px'
                    }}
                  >
                    Quitar
                  </button>
                </div>
                
                {/* Barra de progreso */}
                {isUploading && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${uploadProgress}%`,
                          backgroundColor: '#4F46E5',
                          transition: 'width 0.1s ease'
                        }}
                      />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      fontSize: '12px',
                      color: '#6B7280'
                    }}>
                      <span>Subiendo archivo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>
                )}
                
                {!isUploading && uploadProgress === 100 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '13px',
                    color: '#065F46',
                    backgroundColor: '#D1FAE5',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}>
                    <CheckCircleIcon style={{ width: '16px', height: '16px', color: '#065F46' }} />
                    <span>Archivo listo para análisis</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Mensaje informativo */}
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
              <p>Nuestro sistema de IA analizará el {getFileTypeText()} y extraerá automáticamente:</p>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', listStyleType: 'disc' }}>
                <li>Datos del cliente</li>
                <li>Especificaciones del producto</li>
                <li>Cantidades y medidas</li>
                <li>Fechas de entrega</li>
                <li>Otros requisitos especiales</li>
              </ul>
            </div>
          </div>
          
          {/* Manual form option */}
          <div style={{ 
            backgroundColor: '#FFFFFF',
            borderRadius: '5px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#F3F4F6',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4B5563'
              }}>
                <WrenchIcon style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#111827',
                  margin: 0
                }}>
                  Ingreso manual de pedido
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6B7280',
                  margin: '4px 0 0 0'
                }}>
                  Prefiere completar el formulario manualmente con la información del pedido.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowManualForm(true)}
              style={{
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                border: '1px solid #E5E7EB',
                borderRadius: '5px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Completar manualmente
            </button>
          </div>
        </div>
      )}
      
      {/* Formulario Manual */}
      {showManualForm && (
        <form onSubmit={handleSubmit} style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Main content - now showing one section at a time */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Section 1: Cliente y Fechas */}
            {currentStep === 1 && (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '5px',
                border: '1px solid #E5E7EB',
                padding: '24px'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#111827', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    backgroundColor: '#4F46E5', // Purple for section 1
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>1</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Información del Cliente y Fechas
                </h3>

                {/* Content for Cliente y Fechas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Cliente selector */}
                  <div>
                    <label 
                      htmlFor="cliente"
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: 500,
                        marginBottom: '6px',
                        display: 'block'
                      }}
                    >
                      Cliente*
                    </label>
                    <select
                      id="cliente"
                      name="cliente"
                      value={formData.cliente}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="">Seleccione un cliente</option>
                      {loadingClientes ? (
                        <option disabled>Cargando clientes...</option>
                      ) : (
                        clientes.map((cliente) => (
                          <option key={cliente.id} value={String(cliente.id)}>
                            {cliente.tipo_cliente === 'empresa' || !cliente.nombre
                              ? cliente.nombre_compania
                              : `${cliente.nombre} ${cliente.apellidos || ''}`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Fechas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label 
                        htmlFor="fechaInicio"
                        style={{
                          fontSize: '14px',
                          color: '#374151',
                          fontWeight: 500,
                          marginBottom: '6px',
                          display: 'block'
                        }}
                      >
                        Fecha Inicio
                      </label>
                      <input 
                        id="fechaInicio"
                        name="fechaInicio"
                        type="date"
                        value={formData.fechaInicio}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label 
                        htmlFor="fechaEntrega"
                        style={{
                          fontSize: '14px',
                          color: '#374151',
                          fontWeight: 500,
                          marginBottom: '6px',
                          display: 'block'
                        }}
                      >
                        Fecha Entrega*
                      </label>
                      <input 
                        id="fechaEntrega"
                        name="fechaEntrega"
                        type="date"
                        value={formData.fechaEntrega}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Observaciones */}
            {currentStep === 2 && (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '5px',
                border: '1px solid #E5E7EB',
                padding: '24px'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#111827', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    backgroundColor: '#6366F1', // Lighter purple for section 2
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>2</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Observaciones
                </h3>

                {/* Content for Observaciones */}
                <textarea 
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Notas adicionales sobre este pedido..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
              </div>
            )}

            {/* Section 3: Productos del Pedido */}
            {currentStep === 3 && (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '5px',
                border: '1px solid #E5E7EB',
                padding: '24px'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#111827', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    backgroundColor: '#10B981', // Green for section 3
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>3</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  Productos del Pedido {formData.productos.length > 0 && `(${formData.productos.length})`}
                </h3>

                {/* Content for Productos del Pedido */}
                <div style={{ marginBottom: '20px' }}>
                  <ProductSelector 
                    onProductSelect={handleProductoSeleccionado}
                    onProductRemove={handleProductoRemovido}
                    productosSeleccionados={formData.productos}
                  />
                </div>

                {/* Resumen de Productos */}
                {formData.productos.length > 0 && (
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '16px',
                      borderBottom: '1px solid #E5E7EB',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF'
                    }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: '#111827',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Productos en este pedido
                      </h4>
                      <span style={{ 
                        backgroundColor: '#EEF2FF', 
                        color: '#4F46E5',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}>
                        {formData.productos.length} {formData.productos.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    <div style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#E5E7EB #F3F4F6'
                    }}>
                      {formData.productos.map((producto, index) => {
                        const productoInfo = productos.find(p => p.id === producto.id);
                        const precioTotal = producto.precio * producto.cantidad;
                        const descuentoAplicado = precioTotal * ((formData.descuento ?? 0) / 100);
                        const precioFinal = precioTotal - descuentoAplicado;

                        return (
                          <div
                            key={`${producto.id}-${index}`}
                            style={{
                              padding: '16px',
                              borderBottom: index === formData.productos.length - 1 ? 'none' : '1px solid #E5E7EB',
                              backgroundColor: '#FFFFFF',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            <div style={{ 
                              display: 'grid',
                              gridTemplateColumns: 'auto 1fr auto',
                              gap: '16px',
                              alignItems: 'start'
                            }}>
                              {/* Número de producto */}
                              <div style={{
                                backgroundColor: '#EEF2FF',
                                color: '#4F46E5',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600
                              }}>
                                {index + 1}
                              </div>

                              {/* Información del producto */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <h5 style={{ 
                                    fontSize: '15px', 
                                    fontWeight: 600, 
                                    color: '#111827',
                                    margin: 0
                                  }}>
                                    {producto.nombre}
                                  </h5>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {(producto.tallasSeleccionadas || []).map((talla, i) => (
                                        <span
                                          key={`talla-${i}`}
                                          style={{
                                              padding: '2px 6px',
                                              backgroundColor: '#DBEAFE',
                                              color: '#1E40AF',
                                              borderRadius: '4px',
                                              fontSize: '11px',
                                              fontWeight: 500,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px'
                                          }}
                                        >
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                          </svg>
                                          {talla || 'N/A'}
                                        </span>
                                    ))}
                                    {(producto.coloresSeleccionados || []).map((color, i) => (
                                        <span
                                          key={`color-${i}`}
                                          style={{
                                              padding: '2px 6px',
                                              backgroundColor: '#FEF9C3',
                                              color: '#854D0E',
                                              borderRadius: '4px',
                                              fontSize: '11px',
                                              fontWeight: 500,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px'
                                          }}
                                        >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <circle cx="12" cy="12" r="10"></circle>
                                          {/* Simple color palette icon */}
                                          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                                          <path d="M12 12.5a.5.5 0 0 1 0-1 .5.5 0 0 1 0 1z" fill="currentColor"></path>
                                        </svg>
                                          {color || 'N/A'}
                                        </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Precio unitario y cantidad */}
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  fontSize: '13px',
                                  color: '#6B7280'
                                }}>
                                  <span>Precio unitario: ${producto.precio.toFixed(2)}</span>
                                  <span>•</span>
                                  <span>Cantidad: {producto.cantidad}</span>
                                </div>

                                {/* Tiempo de fabricación y pasos */}
                                <div style={{ 
                                  marginTop: '12px',
                                  padding: '12px',
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: '6px',
                                  border: '1px solid #E2E8F0'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '8px'
                                  }}>
                                    <ClockIcon style={{ width: '16px', height: '16px', color: '#64748B' }} />
                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>
                                      Información de producción
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{
                                      display: 'flex',
                                      gap: '12px',
                                      padding: '8px',
                                      backgroundColor: 'white',
                                      borderRadius: '4px',
                                      border: '1px solid #E2E8F0'
                                    }}>
                                      <div style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: '#E0E7FF',
                                        color: '#4338CA',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 600
                                      }}>
                                        1
                                      </div>
                                      
                                      <div style={{ flex: 1 }}>
                                        <div style={{ 
                                          fontSize: '14px', 
                                          color: '#1F2937',
                                          marginBottom: '8px'
                                        }}>
                                          Tiempo de fabricación
                                        </div>
                                        
                                        <div style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '4px',
                                          fontSize: '13px',
                                          color: '#4B5563'
                                        }}>
                                          <ClockIcon style={{ width: '15px', height: '15px', color: '#6B7280' }} />
                                          {formatTotalTime((productoInfo?.tiempo_fabricacion || 0) * producto.cantidad)}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{
                                      display: 'flex',
                                      gap: '12px',
                                      padding: '8px',
                                      backgroundColor: 'white',
                                      borderRadius: '4px',
                                      border: '1px solid #E2E8F0'
                                    }}>
                                      <div style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: '#E0E7FF',
                                        color: '#4338CA',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 600
                                      }}>
                                        2
                                      </div>
                                      
                                      <div style={{ flex: 1 }}>
                                        <div style={{ 
                                          fontSize: '14px', 
                                          color: '#1F2937',
                                          marginBottom: '8px'
                                        }}>
                                          Pasos de producción
                                        </div>
                                        
                                        <div style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '4px',
                                          fontSize: '13px',
                                          color: '#4B5563'
                                        }}>
                                          <ListBulletIcon style={{ width: '15px', height: '15px', color: '#6B7280' }} />
                                          {(productoInfo?.pasos_produccion || 0) * producto.cantidad} pasos
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Acciones y precio */}
                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'flex-end',
                                gap: '8px'
                              }}>
                                {(formData.descuento ?? 0) > 0 && (
                                  <div style={{ 
                                    fontSize: '13px', 
                                    color: '#6B7280',
                                    textDecoration: 'line-through'
                                  }}>
                                    ${precioTotal.toFixed(2)}
                                  </div>
                                )}
                                <div style={{ 
                                  fontSize: '15px', 
                                  fontWeight: 600, 
                                  color: '#4F46E5'
                                }}>
                                  ${precioFinal.toFixed(2)}
                                </div>
                                {(formData.descuento ?? 0) > 0 && (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#059669',
                                    backgroundColor: '#D1FAE5',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    -${descuentoAplicado.toFixed(2)} ({formData.descuento}%)
                                  </div>
                                )}
                                <button
                                  type="button" // Prevent form submission
                                  onClick={() => handleProductoRemovido(producto.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    color: '#EF4444',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total del pedido */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderTop: '1px solid #E5E7EB',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                       <div style={{ fontSize: '14px', color: '#4B5563' }}>
                        Total ({formData.productos.reduce((total, p) => total + p.cantidad, 0)} artículos)
                      </div>
                      <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '4px'
                      }}>
                        {(formData.descuento ?? 0) > 0 && (
                          <div style={{ 
                            fontSize: '13px', 
                            color: '#6B7280',
                            textDecoration: 'line-through'
                          }}>
                            ${formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0).toFixed(2)}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 600, 
                          color: '#4F46E5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ${(formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0) * (1 - ((formData.descuento ?? 0) / 100))).toFixed(2)}
                        </div>
                        {(formData.descuento ?? 0) > 0 && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#059669',
                            backgroundColor: '#D1FAE5',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            -${(formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0) * (((formData.descuento ?? 0) / 100))).toFixed(2)} ({formData.descuento}%)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Información de Venta */}
            {currentStep === 4 && (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '5px',
                border: '1px solid #E5E7EB',
                padding: '24px'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#111827', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>4</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  Información de Venta
                </h3>

                {/* Content for Información de Venta */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px'
                }}>
                  {/* Trabajador */}
                  <div>
                    <label 
                      htmlFor="trabajador_id"
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: 500,
                        marginBottom: '6px',
                        display: 'block'
                      }}
                    >
                      Trabajador*
                    </label>
                    <select
                      id="trabajador_id"
                      name="trabajador_id"
                      value={formData.trabajador_id || ''}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Seleccione un trabajador</option>
                      {loadingTrabajadores ? (
                        <option disabled>Cargando trabajadores...</option>
                      ) : (
                        trabajadores.map((trabajador) => (
                          <option key={trabajador.id} value={String(trabajador.id)}>
                            {`${trabajador.nombre} ${trabajador.apellido}`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Forma de Pago */}
                  <div>
                    <label 
                      htmlFor="forma_pago"
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: 500,
                        marginBottom: '6px',
                        display: 'block'
                      }}
                    >
                      Forma de Pago*
                    </label>
                    <select
                      id="forma_pago"
                      name="forma_pago"
                      value={formData.forma_pago}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta crédito">Tarjeta crédito</option>
                      <option value="Tarjeta débito">Tarjeta débito</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Crédito">Crédito</option>
                    </select>
                  </div>

                  {/* Descuento */}
                  <div>
                    <label 
                      htmlFor="descuento"
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: 500,
                        marginBottom: '6px',
                        display: 'block'
                      }}
                    >
                      Descuento (%)
                    </label>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <input
                        type="number"
                        id="descuento"
                        name="descuento"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.descuento ?? 0}
                        onChange={(e) => {
                          // Allow empty input or valid numbers
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                          if (value === undefined || (!isNaN(value) && value >= 0 && value <= 100)) {
                             setFormData(prev => ({ ...prev, descuento: value }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="0"
                      />
                      <span style={{ 
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>%</span>
                    </div>
                     <span style={{ 
                      fontSize: '12px',
                      color: '#6B7280',
                      marginTop: '4px',
                      display: 'block'
                    }}>
                      Ingrese un valor entre 0 y 100
                    </span>
                  </div>
                </div>

                {/* New Price Summary Section */}
                <div style={{
                  marginTop: '32px',
                  borderTop: '1px solid #E5E7EB',
                  paddingTop: '24px'
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Resumen de Precios
                  </h4>

                  <div style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden'
                  }}>
                    {/* Products Summary */}
                    <div style={{
                      padding: '16px',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '14px', color: '#4B5563' }}>
                          Productos ({formData.productos.reduce((total, p) => total + p.cantidad, 0)} artículos)
                        </span>
                        <span style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>
                          ${formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Individual Products */}
                      <div style={{ marginLeft: '16px' }}>
                        {formData.productos.map((producto, index) => (
                          <div 
                            key={`${producto.id}-${index}`}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              fontSize: '13px',
                              color: '#6B7280',
                              marginBottom: '4px'
                            }}
                          >
                            <span>{producto.nombre} (x{producto.cantidad})</span>
                            <span>${(producto.cantidad * producto.precio).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Discount if applicable */}
                    {(formData.descuento ?? 0) > 0 && (
                      <div style={{
                        padding: '16px',
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ 
                          fontSize: '14px', 
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                          Descuento ({formData.descuento}%)
                        </span>
                        <span style={{ fontSize: '14px', color: '#059669', fontWeight: 500 }}>
                          -${(formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0) * ((formData.descuento ?? 0) / 100)).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        Total Final
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        {(formData.descuento ?? 0) > 0 && (
                          <div style={{ 
                            fontSize: '13px', 
                            color: '#6B7280',
                            textDecoration: 'line-through',
                            marginBottom: '4px'
                          }}>
                            ${formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0).toFixed(2)}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 600, 
                          color: '#4F46E5'
                        }}>
                          ${(formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0) * (1 - ((formData.descuento ?? 0) / 100))).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation and action buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '24px',
            borderTop: '1px solid #E5E7EB',
            paddingTop: '16px'
          }}>
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#4B5563',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                >
                  <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
                  Anterior
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
              >
                Cancelar
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!isCurrentStepValid()}
                  style={{
                    backgroundColor: isCurrentStepValid() ? '#4F46E5' : '#A5B4FC',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isCurrentStepValid() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (isCurrentStepValid()) {
                      e.currentTarget.style.backgroundColor = '#4338CA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCurrentStepValid()) {
                      e.currentTarget.style.backgroundColor = '#4F46E5';
                    }
                  }}
                >
                  Siguiente
                  <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isCurrentStepValid()}
                  style={{
                    backgroundColor: isCurrentStepValid() ? '#4F46E5' : '#A5B4FC',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isCurrentStepValid() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (isCurrentStepValid()) {
                      e.currentTarget.style.backgroundColor = '#4338CA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCurrentStepValid()) {
                      e.currentTarget.style.backgroundColor = '#4F46E5';
                    }
                  }}
                >
                  {isEditing ? 'Guardar cambios' : 'Crear pedido y ver producción'}
                </button>
              )}
            </div>
          </div>

          {/* Step-specific validation messages */}
          {currentStep === 3 && formData.productos.length === 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              borderRadius: '5px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Para continuar, debes añadir al menos un producto.
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default PedidoForm; 