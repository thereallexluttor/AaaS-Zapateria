import { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentTextIcon, PhotoIcon, TableCellsIcon } from '@heroicons/react/24/outline';

interface PedidoFormProps {
  onClose: () => void;
  isEditing?: boolean;
  initialData?: any;
  isClosing?: boolean;
}

function PedidoForm({ onClose, isEditing = false, initialData = null, isClosing = false }: PedidoFormProps) {
  // Estado para manejar la subida de archivos
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'excel' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      width: '100%',
      maxWidth: '640px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      animation: 'modalAppear 0.3s forwards',
      opacity: isClosing ? 0 : 1,
      transform: isClosing ? 'scale(0.95)' : 'scale(1)',
      transition: 'opacity 0.3s ease, transform 0.3s ease'
    }}>
      <h2 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        marginBottom: '16px' 
      }}>
        {isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}
      </h2>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#6B7280', 
          marginBottom: '16px' 
        }}>
          Sube un archivo para que nuestro sistema de IA lo analice y genere automáticamente los detalles del pedido.
        </p>

        {/* Sección de carga de archivos */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: '#374151' }}>
            Análisis inteligente de documentos
          </h3>
          
          {/* Botones para subir diferentes tipos de archivo */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => triggerFileInput('image')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#DBEAFE',
                color: '#1E40AF',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#BFDBFE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#DBEAFE';
              }}
            >
              <PhotoIcon style={{ width: '20px', height: '20px' }} />
              Subir imagen
            </button>
            
            <button
              onClick={() => triggerFileInput('pdf')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FEE2E2',
                color: '#B91C1C',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
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
                gap: '8px',
                backgroundColor: '#D1FAE5',
                color: '#065F46',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
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
        
        {/* Formulario manual */}
        <div style={{ 
          marginTop: '24px',
          borderTop: '1px solid #E5E7EB',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: '#374151' }}>
            O ingresa la información manualmente
          </h3>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            Este formulario será rellenado automáticamente después del análisis del archivo.
          </p>
          <button 
            style={{
              backgroundColor: '#F3F4F6',
              color: '#4B5563',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              marginTop: '8px'
            }}
          >
            Completar manualmente
          </button>
        </div>
      </div>
      
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
            padding: '8px 16px',
            fontSize: '14px',
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
        
        <button
          style={{
            backgroundColor: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
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
      </div>
    </div>
  );
}

export default PedidoForm; 