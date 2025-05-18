import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, DocumentArrowDownIcon, PrinterIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';

interface InvoicePreviewModalProps {
  onClose: () => void;
  pdfDocument: jsPDF;
  invoiceNumber: string;
}

function InvoicePreviewModal({ onClose, pdfDocument, invoiceNumber }: InvoicePreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Convertir el documento PDF a URL de datos
  useEffect(() => {
    if (pdfDocument) {
      const pdfDataUri = pdfDocument.output('datauristring');
      setPdfUrl(pdfDataUri);
    }
    
    return () => {
      // Limpiar URL cuando el componente se desmonta
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfDocument]);
  
  // Manejar la impresión de factura
  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };
  
  // Manejar la descarga de factura
  const handleDownload = () => {
    pdfDocument.save(`factura_${invoiceNumber}.pdf`);
  };
  
  return (
    <div className="invoice-modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
      }}
    >
      <div className="invoice-modal" 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '850px',
          height: '90%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Cabecera del modal */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#111827',
            margin: 0 
          }}>
            Vista previa de factura - {invoiceNumber}
          </h2>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Botón de imprimir */}
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#4B5563',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              <PrinterIcon style={{ width: '18px', height: '18px' }} />
              Imprimir
            </button>
            
            {/* Botón de descargar */}
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #4F46E5',
                backgroundColor: '#4F46E5',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'white',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4338CA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4F46E5';
              }}
            >
              <DocumentArrowDownIcon style={{ width: '18px', height: '18px' }} />
              Descargar PDF
            </button>
            
            {/* Botón de cerrar */}
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#6B7280'
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
        </div>
        
        {/* Contenido del PDF */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#F3F4F6',
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            {pdfUrl && (
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  overflow: 'hidden'
                }}
                title="Vista previa de factura"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicePreviewModal; 