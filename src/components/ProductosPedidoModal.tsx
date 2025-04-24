import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

// Define the structure for a single product within the modal
interface ProductoPedido {
  nombre: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  cantidad: number;
  precio_venta: number;
  forma_pago: string; // Consider if this is still needed
  descuento: number;   // Consider if this is still needed
  tallas: string[];
  colores: string[];
  producto_id: number;
  total_steps: number; // Retained even if progress bar removed, might be useful info
  completed_steps: number; // Retained even if progress bar removed
  ventas_id?: number | null;
  cliente_id?: number | null;
  tasks_complete?: number | null;
  total_orders?: number | null;
}

// Define the props for the modal component
interface ProductosPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  productos: ProductoPedido[];
  loading: boolean;
}

function ProductosPedidoModal({ isOpen, onClose, productos, loading }: ProductosPedidoModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="productos-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Productos del Pedido</h3>
            <button
              onClick={onClose}
              className="close-button"
            >
              ×
            </button>
          </div>
          <div className="modal-content apple-scrollbar">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Cargando productos...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="no-productos">
                <p>No hay productos asociados a este pedido</p>
              </div>
            ) : (
              <div className="productos-lista">
                {productos.map((producto, index) => (
                  <div key={`${producto.producto_id}-${index}`} className="producto-item">
                    <div className="producto-imagen">
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Consider a more robust placeholder strategy if needed
                            target.src = 'placeholder.png';
                            target.style.objectFit = 'contain';
                            target.style.filter = 'grayscale(1)';
                          }}
                        />
                      ) : (
                        <div className="imagen-placeholder">
                          <PhotoIcon style={{ width: '32px', height: '32px', color: '#9CA3AF' }} />
                        </div>
                      )}
                    </div>
                    <div className="producto-detalles">
                      <div className="producto-header">
                        <h4>{producto.nombre}</h4>
                        <span className="categoria-tag">{producto.categoria}</span>
                      </div>
                      <div className="producto-info-grid">
                        <div className="info-item">
                          <span className="info-label">Cantidad</span>
                          <span className="info-value">{producto.cantidad}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Precio unitario</span>
                          <span className="info-value">${producto.precio.toFixed(2)}</span>
                        </div>
                        {producto.tallas && producto.tallas.length > 0 && (
                          <div className="info-item info-item-tags">
                            <span className="info-label">Tallas</span>
                            <div className="tags-container">
                              {producto.tallas.map((talla, idx) => (
                                <span key={idx} className="tag talla-tag">{talla}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {producto.colores && producto.colores.length > 0 && (
                          <div className="info-item info-item-tags">
                            <span className="info-label">Colores</span>
                            <div className="tags-container">
                              {producto.colores.map((color, idx) => (
                                <span key={idx} className="tag color-tag">{color}</span>
                              ))}
                            </div>
                          </div>
                        )}
                         <div className="info-item">
                          <span className="info-label">Total</span>
                          <span className="info-value precio-total">${producto.precio_venta.toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">tasks_complete</span>
                          <div className="progress-container">
                            <div className="progress-stats">
                              <span className="progress-value">{producto.tasks_complete ?? 0}</span>
                              <span className="progress-separator">/</span>
                              <span className="progress-total">{producto.total_orders ?? 0}</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div 
                                className="progress-bar-fill"
                                style={{ 
                                  width: `${Math.min(100, Math.round(((producto.tasks_complete ?? 0) / (producto.total_orders || 1)) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Styles specific to this modal */}
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .productos-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: modalZoomIn 0.3s ease-out;
        }

        @keyframes modalZoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #F9FAFB;
          flex-shrink: 0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #111827;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 28px;
          color: #6B7280;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .close-button:hover {
          color: #111827;
          background-color: #E5E7EB;
        }

        .modal-content {
          padding: 24px;
          overflow-y: auto; /* Scroll within the content */
          flex-grow: 1;
        }

        /* Apply apple-scrollbar styles if needed, or use default */
        .apple-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .apple-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .apple-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        .apple-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.4); }
        .apple-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(0, 0, 0, 0.2) transparent; }


        .productos-lista {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .producto-item {
          display: flex;
          gap: 20px;
          padding: 24px;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          background-color: white;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .producto-item:hover {
          border-color: #E9D5FF;
          box-shadow: 0 10px 15px -3px rgba(168, 85, 247, 0.1), 0 4px 6px -2px rgba(168, 85, 247, 0.05);
          transform: translateY(-2px);
        }

        .producto-imagen {
          width: 140px;
          height: 140px;
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
          background-color: #F9FAFB;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #F3F4F6;
          transition: all 0.3s ease;
        }

        .producto-item:hover .producto-imagen {
          border-color: #E9D5FF;
        }

        .producto-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.3s ease;
        }

        .producto-item:hover .producto-imagen img {
          transform: scale(1.05);
        }

        .imagen-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #F3F4F6;
        }

        .producto-detalles {
          flex: 1;
          min-width: 0; /* Prevent overflow issues */
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .producto-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .producto-header h4 {
          margin: 0;
          font-size: 17px;
          font-weight: 600;
          color: #111827;
          line-height: 1.3;
        }

        .categoria-tag {
          padding: 6px 12px;
          background-color: #F3E8FF;
          color: #9333EA;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          letter-spacing: 0.025em;
          border: 1px solid #E9D5FF;
        }

        .producto-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px 12px; /* row-gap column-gap */
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item-tags {
            /* Allow tags section to span more columns if needed */
            grid-column: span 2; /* Adjust as needed */
        }

        .info-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 500;
        }

        .info-value {
          font-size: 15px;
          color: #1F2937;
          font-weight: 600;
        }

        .precio-total {
          color: #7C3AED;
          font-weight: 700;
          font-size: 16px;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }

        .tag {
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
        }

        .talla-tag {
          background-color: #F3E8FF;
          color: #9333EA;
          border: 1px solid #E9D5FF;
        }

        .color-tag {
          background-color: #F3E8FF;
          color: #9333EA;
          border: 1px solid #E9D5FF;
        }

        .no-productos {
          text-align: center;
          padding: 60px 20px;
          color: #6B7280;
          font-size: 15px;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
          color: #6B7280;
          font-size: 15px;
        }

        /* Ensure spinner styles are present if not globally defined */
        .spinner {
           width: 32px;
           height: 32px;
           border: 4px solid rgba(79, 70, 229, 0.2);
           border-radius: 50%;
           border-top-color: #4F46E5; /* Example color */
           animation: spin 1s linear infinite;
         }
        @keyframes spin { to { transform: rotate(360deg); } }


         /* Responsive Adjustments */
         @media (max-width: 768px) {
             .productos-modal {
                max-width: 95%;
             }
             .producto-item {
                flex-direction: column;
                align-items: center; /* Center items when stacked */
             }
            .producto-imagen {
                width: 150px; /* Slightly larger image on smaller screens */
                height: 150px;
            }
            .producto-detalles {
                 width: 100%; /* Take full width when stacked */
            }
            .producto-info-grid {
                 /* Adjust grid for smaller screens */
                 grid-template-columns: repeat(2, 1fr);
             }
             .info-item-tags {
                /* Ensure tags span full width if needed */
                grid-column: span 2;
            }
        }

        @media (max-width: 480px) {
            .modal-header h3 {
                font-size: 18px;
            }
            .producto-header h4 {
                font-size: 16px;
            }
             /* Reduce font sizes slightly on very small screens */
             .info-value, .tag, .info-label {
                font-size: 11px;
            }
            .tag { padding: 2px 6px; }
             .categoria-tag { padding: 3px 8px; font-size: 11px;}
            .producto-item { padding: 16px; }
            .productos-lista { gap: 16px; }
        }

        /* Estilos para la barra de progreso */
        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }

        .progress-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #4B5563;
        }

        .progress-value {
          font-weight: 600;
          color: #7C3AED;
        }

        .progress-separator {
          color: #9CA3AF;
        }

        .progress-total {
          font-weight: 500;
          color: #6B7280;
        }

        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background-color: #F3E8FF;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #9333EA 0%, #7C3AED 100%);
          border-radius: 999px;
          transition: width 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
}

export default ProductosPedidoModal; 