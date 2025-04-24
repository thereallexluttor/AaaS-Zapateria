import React, { useRef } from 'react';
import { ArrowLeftIcon, PrinterIcon, ArrowDownTrayIcon, XMarkIcon, QrCodeIcon } from '@heroicons/react/24/outline';

interface QRCodeModalProps {
  qrUrl: string;
  itemName: string;
  itemType: 'producto' | 'herramienta' | 'material' | 'paso_produccion';
  itemId: string;
  onClose: () => void;
  isClosing: boolean;
}

function QRCodeModal({ qrUrl, itemName, itemType, itemId, onClose, isClosing }: QRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Función para imprimir el código QR
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    // Crear contenido HTML para la impresión
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Código QR - ${itemName}</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .qr-container {
              display: inline-block;
              padding: 20px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              background-color: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            img {
              width: 200px;
              height: 200px;
            }
            h3 {
              margin-top: 10px;
              margin-bottom: 5px;
              font-size: 16px;
              color: #333;
            }
            p {
              margin: 5px 0;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrUrl}" alt="Código QR">
            <h3>${itemName}</h3>
            <p>${itemType.charAt(0).toUpperCase() + itemType.slice(1)} #${itemId}</p>
            <p>[${itemType},${itemId}]</p>
          </div>
          <script>
            // Imprimir automáticamente y luego cerrar
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Función para descargar el código QR
  const handleDownload = () => {
    // Crear un enlace temporal para descargar la imagen
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr_${itemType}_${itemId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Traducir tipo de elemento
  const getItemTypeLabel = (type: string): string => {
    switch (type) {
      case 'producto': return 'Producto';
      case 'herramienta': return 'Herramienta';
      case 'material': return 'Material';
      case 'paso_produccion': return 'Paso de Producción';
      default: return type;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '400px',
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
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <XMarkIcon style={{ width: '20px', height: '20px', color: '#666' }} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#EEF2FF',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            marginBottom: '16px'
          }}>
            <QrCodeIcon style={{ width: '30px', height: '30px', color: '#4F46E5' }} />
          </div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 600, 
            margin: '0 0 8px', 
            fontFamily: "'Poppins', sans-serif" 
          }}>
            Código QR generado
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            margin: '0', 
            fontFamily: "'Poppins', sans-serif" 
          }}>
            Para {getItemTypeLabel(itemType)}: {itemName}
          </p>
        </div>

        {/* Contenedor para impresión */}
        <div 
          ref={printRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
            backgroundColor: '#f9fafb',
          }}
        >
          <img 
            src={qrUrl} 
            alt="Código QR" 
            style={{ 
              width: '200px', 
              height: '200px', 
              marginBottom: '16px',
              border: '1px solid #e5e7eb',
              padding: '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
            }} 
          />
          
          <p style={{ 
            fontSize: '14px', 
            color: '#4F46E5', 
            fontWeight: 500,
            margin: '4px 0',
            fontFamily: "'Poppins', sans-serif" 
          }}>
            [{itemType},{itemId}]
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: 'white',
              color: '#1F2937',
              border: '1px solid #e0e0e0',
              padding: '0 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '40px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Poppins', sans-serif",
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
            <PrinterIcon style={{ width: '18px', height: '18px', marginRight: '8px' }} />
            Imprimir
          </button>
          
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: 'white',
              color: '#4F46E5',
              border: '1px solid #e0e0e0',
              padding: '0 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              height: '40px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'Poppins', sans-serif",
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
            <ArrowDownTrayIcon style={{ width: '18px', height: '18px', marginRight: '8px' }} />
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeModal; 