import { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentTextIcon, PhotoIcon, TableCellsIcon, ClockIcon, WrenchIcon, ListBulletIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import ProductSelector from './ProductSelector';
import { supabase } from '../lib/supabase';
import { ProductoSeleccionado, PedidoFormData, Cliente } from '../lib/types';

interface PedidoFormProps {
  onClose: () => void;
  isEditing?: boolean;
  initialData?: any;
  isClosing?: boolean;
}

interface PasoProduccion {
  id: number;
  producto_id: number;
  herramienta_id: number;
  descripcion: string;
  tiempo_estimado: string;
  orden: number;
  herramienta: {
    nombre: string;
  };
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

// Función para formatear minutos en un formato legible
function formatTotalTime(totalMinutes: number): string {
  if (totalMinutes === 0) return '0 minutos';

  const days = Math.floor(totalMinutes / (24 * 60));
  totalMinutes %= (24 * 60);
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);

  return parts.join(', ');
}

// Función para calcular el tiempo total de un producto
function calculateProductTime(pasos: PasoProduccion[]): number {
  return pasos.reduce((total, paso) => {
    const minutosDelPaso = parsePostgresInterval(paso.tiempo_estimado);
    return total + minutosDelPaso;
  }, 0);
}

// Función para formatear un intervalo para mostrar en la UI
function formatInterval(interval: string): string {
  const minutes = parsePostgresInterval(interval);
  return formatTotalTime(minutes);
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
    estado: 'pendiente',
    observaciones: '',
    productos: [],
    // Valores por defecto para los nuevos campos
    trabajador_id: undefined,
    descuento: 0,
    forma_pago: 'Efectivo'
  });
  
  const [pasosProduccion, setPasosProduccion] = useState<{ [key: number]: PasoProduccion[] }>({});
  const [loadingPasos, setLoadingPasos] = useState<{ [key: number]: boolean }>({});

  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        cliente: initialData.cliente || '',
        fechaInicio: initialData.fechaInicio || new Date().toISOString().split('T')[0],
        fechaEntrega: initialData.fechaEntrega || '',
        estado: initialData.estado || 'pendiente',
        observaciones: initialData.observaciones || '',
        productos: initialData.productos || [],
        trabajador_id: initialData.trabajador_id,
        descuento: initialData.descuento || 0,
        forma_pago: initialData.forma_pago || 'Efectivo'
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

  // Función para cargar los pasos de producción de un producto
  const fetchPasosProduccion = async (productoId: number) => {
    if (pasosProduccion[productoId] || loadingPasos[productoId]) return;

    setLoadingPasos(prev => ({ ...prev, [productoId]: true }));
    try {
      const { data, error } = await supabase
        .from('pasos_produccion')
        .select(`
          *,
          herramienta:herramienta_id (
            nombre
          )
        `)
        .eq('producto_id', productoId)
        .order('orden');

      if (error) throw error;
      setPasosProduccion(prev => ({ ...prev, [productoId]: data || [] }));
    } catch (error) {
      console.error('Error al cargar pasos de producción:', error);
    } finally {
      setLoadingPasos(prev => ({ ...prev, [productoId]: false }));
    }
  };

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
    fetchPasosProduccion(producto.id);
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
    
    try {
      // Crear un pedido en la tabla pedidos
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .upsert({
          id: isEditing && initialData ? initialData.id : undefined,
          cliente: formData.cliente,
          fecha_inicio: formData.fechaInicio,
          fecha_entrega: formData.fechaEntrega,
          estado: formData.estado,
          observaciones: formData.observaciones,
        })
        .select('id')
        .single();
      
      if (pedidoError) throw pedidoError;
      
      // Insertar en detalle_pedidos
      const detallesPedidos = formData.productos.map(producto => ({
        pedido_id: pedidoData.id,
        producto_id: producto.id,
        tallas: JSON.stringify(producto.tallasSeleccionadas),
        colores: JSON.stringify(producto.coloresSeleccionados),
        cantidad: producto.cantidad,
        precio_unitario: producto.precio
      }));
      
      const { error: detalleError } = await supabase
        .from('detalle_pedidos')
        .upsert(detallesPedidos);
      
      if (detalleError) throw detalleError;

      // Insertar en ventas
      const ventasData = formData.productos.map(producto => {
        // Calculamos el precio total de la venta (precio * cantidad) con 2 decimales
        const precio_venta_total_aux = Number((producto.precio).toFixed(2));
        const precio_venta_total = Number((producto.cantidad * producto.precio).toFixed(2));
        
        // El descuento se calcula como porcentaje del precio total
        const descuento_calculado = Number(((precio_venta_total * (formData.descuento || 0)) / 100).toFixed(2));

        return {
          producto_id: producto.id,
          cliente_id: formData.cliente,
          trabajador_id: formData.trabajador_id,
          cantidad: producto.cantidad,
          precio_venta: precio_venta_total_aux,
          descuento: descuento_calculado,
          forma_pago: formData.forma_pago,
          estado: 'Completada' // Valor por defecto
        };
      });

      const { error: ventasError } = await supabase
        .from('ventas')
        .upsert(ventasData);

      if (ventasError) throw ventasError;
      
      // Notificar éxito y cerrar modal
      alert(isEditing ? 'Pedido actualizado con éxito!' : 'Pedido creado con éxito!');
      onClose();
    } catch (error) {
      console.error('Error al guardar el pedido:', error);
      alert('Ocurrió un error al guardar el pedido. Por favor intente nuevamente.');
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      width: '100%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      animation: 'modalAppear 0.3s forwards',
      opacity: isClosing ? 0 : 1,
      transform: isClosing ? 'scale(0.95)' : 'scale(1)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #F3F4F6',
        paddingBottom: '16px'
      }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 600,
          color: '#111827',
          margin: 0
        }}>
          {isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}
        </h2>
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
            borderRadius: '12px',
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
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z" fill="#065F46"/>
                    </svg>
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
            borderRadius: '12px',
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
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
                borderRadius: '8px',
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
                <path d="M12 5v14M5 12h14"/>
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
          {/* Información del Pedido section */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
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
                backgroundColor: '#4F46E5',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>1</span>
              Información del Pedido
            </h3>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {/* Cliente selector with improved styling */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label 
                  htmlFor="cliente"
                  style={{
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
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
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.tipo_cliente === 'empresa' || !cliente.nombre 
                          ? cliente.nombre_compania 
                          : `${cliente.nombre} ${cliente.apellidos || ''}`}
                      </option>
                    ))
                  )}
                </select>
                {clientes.length === 0 && !loadingClientes && (
                  <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>
                    No hay clientes disponibles. Por favor, agregue clientes primero.
                  </div>
                )}
              </div>

              {/* Fecha Inicio */}
              <div>
                <label 
                  htmlFor="fechaInicio"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
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
              
              {/* Fecha Entrega */}
              <div>
                <label 
                  htmlFor="fechaEntrega"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
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

              {/* Observaciones */}
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="observaciones"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
                  }}
                >
                  Observaciones
                </label>
                <textarea 
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Notas adicionales sobre este pedido..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Nueva sección para información de venta */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            marginTop: '24px'
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
                backgroundColor: '#4F46E5',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>3</span>
              Información de Venta
            </h3>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {/* Trabajador */}
              <div>
                <label 
                  htmlFor="trabajador_id"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
                  }}
                >
                  Trabajador
                </label>
                <select
                  id="trabajador_id"
                  name="trabajador_id"
                  value={formData.trabajador_id || ''}
                  onChange={handleInputChange}
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
                      <option key={trabajador.id} value={trabajador.id}>
                        {`${trabajador.nombre} ${trabajador.apellido}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Descuento */}
              <div>
                <label 
                  htmlFor="descuento"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
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
                    step="0.01"
                    value={formData.descuento || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (value >= 0 && value <= 100) {
                        handleInputChange(e);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
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

              {/* Forma de Pago */}
              <div>
                <label 
                  htmlFor="forma_pago"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    fontWeight: 500
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
            </div>
          </div>

          {/* Productos del Pedido section */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
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
                backgroundColor: '#4F46E5',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>2</span>
              Productos del Pedido {formData.productos.length > 0 && `(${formData.productos.length})`}
            </h3>

            {/* ProductSelector with improved spacing */}
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
                  overflowY: 'auto'
                }}>
                  {formData.productos.map((producto, index) => (
                    <div 
                      key={`${producto.id}-${index}`} 
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid #E5E7EB',
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
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span 
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#DBEAFE', // Light blue
                                  color: '#1E40AF', // Dark blue
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
                                {producto.tallasSeleccionadas[0] || 'N/A'}
                              </span>
                              <span 
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#FEF9C3', // Light yellow
                                  color: '#854D0E', // Dark yellow/brown
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
                                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                {producto.coloresSeleccionados[0] || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Pasos de producción */}
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
                                Proceso de producción
                              </span>
                            </div>

                            {loadingPasos[producto.id] ? (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                color: '#64748B',
                                fontSize: '13px',
                                padding: '8px'
                              }}>
                                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                                </svg>
                                Cargando pasos de producción...
                              </div>
                            ) : pasosProduccion[producto.id]?.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pasosProduccion[producto.id].map((paso, idx) => (
                                  <div 
                                    key={paso.id}
                                    style={{
                                      display: 'flex',
                                      gap: '12px',
                                      padding: '8px',
                                      backgroundColor: 'white',
                                      borderRadius: '4px',
                                      border: '1px solid #E2E8F0'
                                    }}
                                  >
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
                                      {paso.orden}
                                    </div>
                                    
                                    <div style={{ flex: 1 }}>
                                      <div style={{ 
                                        fontSize: '14px', 
                                        color: '#1F2937',
                                        marginBottom: '8px'
                                      }}>
                                        {paso.descripcion}
                                      </div>
                                      
                                      <div style={{ 
                                        display: 'flex', 
                                        gap: '16px',
                                        fontSize: '13px',
                                        color: '#4B5563'
                                      }}>
                                        <div style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '4px' 
                                        }}>
                                          <ClockIcon style={{ width: '15px', height: '15px', color: '#6B7280' }} />
                                          {formatInterval(paso.tiempo_estimado)}
                                        </div>
                                        
                                        <div style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '4px'
                                        }}>
                                          <WrenchIcon style={{ width: '15px', height: '15px', color: '#6B7280' }} />
                                          {paso.herramienta?.nombre || 'Herramienta no especificada'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Tiempo por producto y total */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '12px',
                                  padding: '12px',
                                  backgroundColor: '#F0FDF4',
                                  borderRadius: '6px',
                                  color: '#166534',
                                  fontSize: '13px',
                                  marginTop: '8px'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    paddingRight: '12px',
                                    borderRight: '1px dashed #BBF7D0'
                                  }}>
                                    <ClockIcon style={{ width: '18px', height: '18px' }} />
                                    <div>
                                      <span style={{ fontWeight: 500 }}>Tiempo / unidad:</span>
                                      <div style={{ marginTop: '2px', color: '#15803D', fontWeight: '500' }}>
                                        {formatTotalTime(calculateProductTime(pasosProduccion[producto.id]))}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <ListBulletIcon style={{ width: '18px', height: '18px' }} />
                                    <div>
                                      <span style={{ fontWeight: 500 }}>Pasos / unidad:</span>
                                      <div style={{ marginTop: '2px', color: '#15803D', fontWeight: '500' }}>
                                        {pasosProduccion[producto.id].length} {pasosProduccion[producto.id].length === 1 ? 'paso' : 'pasos'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                padding: '8px',
                                color: '#64748B',
                                fontSize: '13px',
                                fontStyle: 'italic'
                              }}>
                                No hay pasos de producción definidos para este producto.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones y precio */}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end',
                          gap: '8px'
                        }}>
                          <div style={{ 
                            fontSize: '15px', 
                            fontWeight: 600, 
                            color: '#4F46E5'
                          }}>
                            ${(producto.cantidad * producto.precio).toFixed(2)}
                          </div>
                          <button
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
                  ))}
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
                    Total del pedido ({formData.productos.reduce((total, p) => total + p.cantidad, 0)} artículos)
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    ${formData.productos.reduce((total, producto) => total + (producto.cantidad * producto.precio), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mensaje de validación al final */}
          {formData.productos.length === 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              borderRadius: '6px',
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
              Para crear un pedido, debes añadir al menos un producto.
            </div>
          )}
        </form>
      )}
      
      {/* Agregar el tiempo total del pedido al final del formulario */}
      {formData.productos.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#F3F4F6',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Resumen total del pedido
          </h4>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {formData.productos.map((prod, idx) => (
              pasosProduccion[prod.id] && (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#E0E7FF',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4338CA'
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 500 }}>{prod.nombre}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span 
                          style={{
                            padding: '1px 5px',
                            backgroundColor: '#DBEAFE',
                            color: '#1E40AF',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                          </svg>
                          {prod.tallasSeleccionadas[0] || 'N/A'}
                        </span>
                        <span 
                          style={{
                            padding: '1px 5px',
                            backgroundColor: '#FEF9C3',
                            color: '#854D0E',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          {prod.coloresSeleccionados[0] || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{prod.cantidad} {prod.cantidad === 1 ? 'unidad' : 'unidades'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#1F2937', fontWeight: 500 }}>
                      {formatTotalTime(calculateProductTime(pasosProduccion[prod.id]) * prod.cantidad)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '4px' }}>
                      ({pasosProduccion[prod.id].length * prod.cantidad} pasos)
                    </span>
                  </div>
                </div>
              )
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginTop: '16px',
            padding: '16px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingRight: '12px',
              borderRight: '1px solid #E5E7EB'
            }}>
              <ClockIcon style={{ width: '18px', height: '18px', color: '#4B5563' }} />
              <div>
                <span style={{ fontSize: '14px', color: '#4B5563' }}>Tiempo total:</span>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                  {formatTotalTime(
                    formData.productos.reduce((total, prod) => {
                      if (!pasosProduccion[prod.id]) return total;
                      const tiempoPorProducto = calculateProductTime(pasosProduccion[prod.id]);
                      return total + (tiempoPorProducto * prod.cantidad);
                    }, 0)
                  )}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ListBulletIcon style={{ width: '18px', height: '18px', color: '#4B5563' }} />
              <div>
                <span style={{ fontSize: '14px', color: '#4B5563' }}>Pasos totales:</span>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                  {formData.productos.reduce((total, prod) => {
                    if (!pasosProduccion[prod.id]) return total;
                    return total + (pasosProduccion[prod.id].length * prod.cantidad);
                  }, 0)} pasos
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '24px',
        borderTop: '1px solid #E5E7EB',
        paddingTop: '16px'
      }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: '#E5E7EB',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
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
        
        {showManualForm ? (
          <button
            onClick={handleSubmit}
            type="submit"
            disabled={formData.productos.length === 0}
            style={{
              backgroundColor: formData.productos.length === 0 ? '#A5B4FC' : '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: formData.productos.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (formData.productos.length > 0) {
                e.currentTarget.style.backgroundColor = '#4338CA';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = formData.productos.length === 0 ? '#A5B4FC' : '#4F46E5';
            }}
          >
            {isEditing ? 'Guardar cambios' : 'Crear pedido'}
          </button>
        ) : (
          <button
            style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: selectedFile && !isUploading ? 1 : 0.5,
              pointerEvents: selectedFile && !isUploading ? 'auto' : 'none'
            }}
            onMouseEnter={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = '#4338CA';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4F46E5';
            }}
          >
            Analizar y procesar
          </button>
        )}
      </div>
    </div>
  );
}

export default PedidoForm; 