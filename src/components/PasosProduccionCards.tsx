import { useState, useEffect } from 'react';
import { ClockIcon, WrenchIcon, QrCodeIcon, PrinterIcon, UserIcon, CheckCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import QRCodeModal from './QRCodeModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import CryptoJS from 'crypto-js';

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

interface ProductoPedido {
  id: number;
  nombre: string;
  cantidad: number;
  pasos: PasoProduccion[];
  pedido_id?: number; // ID del pedido relacionado
  venta_id?: number;  // ID de la venta relacionada
}

interface PasosProduccionCardsProps {
  productos: ProductoPedido[];
  onClose: () => void;
  pedido_id?: number; // ID del pedido actual
}

// Función para generar un hash único para cada paso
function generateUniqueHash(producto_id: number, paso_id: number, pedido_id?: number, venta_id?: number, unit_index: number = 0): string {
  const data = `${producto_id}_${paso_id}_${pedido_id || ''}_${venta_id || ''}_${unit_index}_${Date.now()}`;
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex).substring(0, 16);
}

// Función para parsear intervalos de PostgreSQL
function parsePostgresInterval(interval: string): number {
  if (!interval) return 0;
  
  let totalMinutes = 0;
  
  const dayMatch = interval.match(/(\d+) days?/);
  const monthMatch = interval.match(/(\d+) mons?/);
  const yearMatch = interval.match(/(\d+) years?/);
  
  if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
  if (monthMatch) totalMinutes += parseInt(monthMatch[1]) * 30 * 24 * 60;
  if (yearMatch) totalMinutes += parseInt(yearMatch[1]) * 365 * 24 * 60;
  
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

function PasosProduccionCards({ productos, onClose, pedido_id }: PasosProduccionCardsProps) {
  const [selectedQR, setSelectedQR] = useState<{ url: string; name: string; id: string } | null>(null);
  const [isQrModalClosing, setIsQrModalClosing] = useState(false);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string[] }>({});
  const [hashCodes, setHashCodes] = useState<{ [key: string]: string[] }>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [ventasIds, setVentasIds] = useState<{ [key: number]: number }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Crear la función RPC para crear la tabla si no existe
  useEffect(() => {
    const crearTablaOrdenesProduccion = async () => {
      try {
        // Primero, intentamos llamar a la función RPC si existe
        const { error: rpcError } = await supabase.rpc('crear_tabla_ordenes_produccion');
        
        if (rpcError) {
          console.log('La función RPC no existe, creando tabla mediante SQL...');
          
          // Si la función RPC no existe, intentamos crear la tabla directamente mediante SQL
          const sql = `
            CREATE TABLE IF NOT EXISTS ordenes_produccion (
                id SERIAL PRIMARY KEY,
                id_ventas INT REFERENCES ventas(id) NOT NULL,
                id_pedidos INT REFERENCES pedidos(id) NOT NULL,
                hash_code VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `;
          
          // Creamos la función RPC que usaremos en el futuro
          const createFunctionSql = `
            CREATE OR REPLACE FUNCTION crear_tabla_ordenes_produccion()
            RETURNS void AS $$
            BEGIN
                CREATE TABLE IF NOT EXISTS ordenes_produccion (
                    id SERIAL PRIMARY KEY,
                    id_ventas INT REFERENCES ventas(id) NOT NULL,
                    id_pedidos INT REFERENCES pedidos(id) NOT NULL,
                    hash_code VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            END;
            $$ LANGUAGE plpgsql;
          `;
          
          // Ejecutar SQL para crear la tabla
          const { error: sqlError } = await supabase.rpc('exec_sql', { sql });
          
          if (sqlError) {
            console.error('No se pudo crear la tabla mediante SQL:', sqlError);
          } else {
            console.log('Tabla ordenes_produccion creada exitosamente mediante SQL');
            
            // Intentar crear la función RPC
            const { error: funcError } = await supabase.rpc('exec_sql', { sql: createFunctionSql });
            
            if (funcError) {
              console.error('No se pudo crear la función RPC:', funcError);
            } else {
              console.log('Función RPC crear_tabla_ordenes_produccion creada exitosamente');
            }
          }
        } else {
          console.log('Tabla ordenes_produccion verificada o creada exitosamente mediante RPC');
        }
      } catch (error) {
        console.error('Error al crear tabla ordenes_produccion:', error);
      }
    };
    
    crearTablaOrdenesProduccion();
  }, []);

  // Obtener IDs de ventas relacionadas con los productos y el pedido
  useEffect(() => {
    const fetchVentasIds = async () => {
      if (!pedido_id) return;
      
      try {
        // Para cada producto, intentamos encontrar la venta correspondiente
        const ventasMap: { [key: number]: number } = {};
        
        for (const producto of productos) {
          const { data, error } = await supabase
            .from('ventas')
            .select('id')
            .eq('producto_id', producto.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (!error && data && data.length > 0) {
            ventasMap[producto.id] = data[0].id;
          }
        }
        
        setVentasIds(ventasMap);
      } catch (error) {
        console.error('Error al obtener IDs de ventas:', error);
      }
    };
    
    fetchVentasIds();
  }, [productos, pedido_id]);

  // Generar y almacenar hashes únicos y URLs de QR para cada instancia de paso
  useEffect(() => {
    const generateQRCodesAndHashes = async () => {
      const stepQrUrls: { [key: string]: string[] } = {};
      const stepHashes: { [key: string]: string[] } = {};
      
      productos.forEach(producto => {
        const venta_id = ventasIds[producto.id];
        
        producto.pasos.forEach(paso => {
          const pasoKey = `paso_${producto.id}_${paso.id}`;
          stepQrUrls[pasoKey] = [];
          stepHashes[pasoKey] = [];

          // Generate a unique hash and QR URL for each unit
          for (let i = 0; i < producto.cantidad; i++) {
            const uniqueHash = generateUniqueHash(producto.id, paso.id, pedido_id, venta_id, i);
            stepHashes[pasoKey].push(uniqueHash);
            stepQrUrls[pasoKey].push(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${uniqueHash}`);
          }
        });
      });
      
      setQrCodes(stepQrUrls);
      setHashCodes(stepHashes);
    };
    
    generateQRCodesAndHashes();
  }, [productos, pedido_id, ventasIds]);

  const handleCloseQrModal = () => {
    setIsQrModalClosing(true);
    setTimeout(() => {
      setSelectedQR(null);
      setIsQrModalClosing(false);
    }, 300);
  };

  const guardarOrdenesProduccion = async () => {
    if (!pedido_id) {
      console.error('No se puede guardar sin un ID de pedido');
      return true; // Devolvemos true para que de todas formas se genere el PDF
    }

    setIsSaving(true);
    try {
      console.log('Guardando los hashes únicos de cada instancia de paso de producción...');
      
      const registrosAGuardar = [];
      
      for (const producto of productos) {
        const venta_id = ventasIds[producto.id];
        if (!venta_id) {
          console.warn(`No se encontró ID de venta para el producto: ${producto.id}`);
          continue;
        }

        for (const paso of producto.pasos) {
          const pasoKey = `paso_${producto.id}_${paso.id}`;
          const hashesForStep = hashCodes[pasoKey] || []; // Get the array of hashes for this step

          for (let i = 0; i < producto.cantidad; i++) {
            const uniqueHash = hashesForStep[i]; // Get the specific hash for this unit index
            if (uniqueHash) {
              registrosAGuardar.push({
                id_ventas: venta_id,
                id_pedidos: pedido_id,
                hash_code: uniqueHash, // Save the unique hash for this instance
              });
            } else {
              console.warn(`No se encontró hash para producto ${producto.id}, paso ${paso.id}, unidad ${i}`);
            }
          }
        }
      }
      
      if (registrosAGuardar.length === 0) {
        console.warn('No hay hashes únicos de pasos para guardar');
        return true;
      }
      
      console.log(`Intentando guardar ${registrosAGuardar.length} hashes únicos de pasos`);
      
      // Guardamos los registros uno por uno para mayor control
      let guardadosCorrectamente = 0;
      
      for (const registro of registrosAGuardar) {
        try {
          const { data, error } = await supabase
            .from('ordenes_produccion')
            .insert(registro)
            .select();
            
          if (error) {
            console.error('Error al guardar hash:', error);
            if (error.code === '23505') {
              console.log(`El hash ${registro.hash_code} ya existe, ignorando`);
            }
          } else {
            guardadosCorrectamente++;
          }
        } catch (e) {
          console.error('Error inesperado al guardar hash:', e);
        }
      }
      
      console.log(`Se guardaron ${guardadosCorrectamente} de ${registrosAGuardar.length} hashes correctamente`);
      
      // Siempre devolvemos true para que se genere el PDF
      return true;
    } catch (error) {
      console.error('Error al guardar en ordenes_produccion:', error);
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDescargarPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Generar el PDF primero (código existente)
      await generatePDF();
      
      // Guardar la información en la tabla ordenes_produccion
      const isSaving = await guardarOrdenesProduccion();
      setIsSaving(isSaving);
      
      if (isSaving) {
        // Mensaje de éxito
        alert('El PDF se ha generado correctamente. Los datos se están guardando en segundo plano y el formulario se cerrará en breve.');
        
        // Si se inició el guardado correctamente, cerrar el formulario con un pequeño retraso
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        alert('Se generó el PDF pero hubo un problema al guardar los datos. Por favor, intente nuevamente.');
      }
    } catch (error) {
      console.error('Error al generar PDF y guardar datos:', error);
      alert('Hubo un error al generar el PDF y guardar los datos. Por favor, intente nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Crear un contenedor temporal para las cards
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '210mm'; // Tamaño A4
      tempContainer.style.height = '297mm';
      tempContainer.style.margin = '0';
      tempContainer.style.backgroundColor = 'white';
      
      // Generar todas las cards primero
      const allCards = productos.flatMap(producto => 
        producto.pasos.flatMap((paso) => {
          const pasoKey = `paso_${producto.id}_${paso.id}`;
          const urlsForStep = qrCodes[pasoKey] || [];
          const hashesForStep = hashCodes[pasoKey] || [];
          const venta_id = ventasIds[producto.id];
          
          return Array.from({ length: producto.cantidad }).map((_, i) => ({
            html: `
              <div style="
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                padding: 12px;
                background-color: white;
                width: 75mm;
                height: 110mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              ">
                <div>
                  <div style="
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-bottom: 10px;
                  ">
                    <div style="
                      background-color: #EEF2FF;
                      border-radius: 50%;
                      width: 32px;
                      height: 32px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 15px;
                      font-weight: bold;
                      color: #4F46E5;
                      flex-shrink: 0;
                    ">${paso.orden}</div>
                    <div style="flex: 1;">
                      <h3 style="
                        font-size: 15px;
                        font-weight: bold;
                        margin: 0 0 6px 0;
                        color: #111827;
                      ">${producto.nombre}</h3>
                      <p style="
                        font-size: 13px;
                        color: #4B5563;
                        margin: 0;
                        line-height: 1.4;
                      ">${paso.descripcion}</p>
                    </div>
                  </div>
                  
                  <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-bottom: 12px;
                  ">
                    <div style={{
                      padding: 8,
                      backgroundColor: '#F3F4F6',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#4B5563'
                    }}>
                      ⏱️ ${formatTotalTime(parsePostgresInterval(paso.tiempo_estimado))}
                    </div>
                    <div style={{
                      padding: 8,
                      backgroundColor: '#F3F4F6',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#4B5563'
                    }}>
                      🔧 ${paso.herramienta.nombre}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      padding: 8,
                      backgroundColor: '#DBEAFE',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#1E40AF'
                    }}>
                      🔢 Pedido: ${pedido_id || 'N/A'}
                    </div>
                    <div style={{
                      padding: 8,
                      backgroundColor: '#DBEAFE',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#1E40AF'
                    }}>
                      💰 Venta: ${venta_id || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  padding: 12px;
                  background-color: #F9FAFB;
                  border-radius: 8px;
                  border: 1px solid #E5E7EB;
                ">
                  <img 
                    src="${urlsForStep[i]}"
                    alt="QR Code"
                    style={{
                      width: 60,
                      height: 60,
                      padding: 6,
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      marginBottom: 6
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM8 8l8 8M15 15h2v2h-2z"/>
                    </svg>
                    Hash: ${hashesForStep[i]}
                  </div>
                </div>
              </div>
            `,
            pasoKey
          }));
        })
      );

      // Agrupar las cards en páginas de 4 (2x2)
      const pages = [];
      for (let i = 0; i < allCards.length; i += 4) {
        const pageCards = allCards.slice(i, i + 4);
        const pageHtml = `
          <div style="
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background-color: white;
            display: flex;
            justify-content: center;
            align-items: center;
          ">
            <div style="
              display: grid;
              grid-template-columns: repeat(2, 75mm);
              grid-template-rows: repeat(2, 110mm);
              gap: 20mm;
              justify-content: center;
              align-content: center;
            ">
              ${pageCards.map(card => card.html).join('\n')}
            </div>
          </div>
        `;
        pages.push(pageHtml);
      }

      // Crear el contenido HTML completo
      tempContainer.innerHTML = pages[0]; // Solo la primera página inicialmente
      document.body.appendChild(tempContainer);

      // Configurar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Procesar cada página
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          tempContainer.innerHTML = pages[i];
        }

        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        // Añadir la imagen al PDF
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      // Descargar el PDF
      pdf.save('pasos_produccion.pdf');

      // Limpiar
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      width: '100%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      overflowY: 'auto',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 10,
        paddingBottom: '16px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 600, 
            color: '#111827',
            margin: '0 0 4px 0'
          }}>
            Pasos de Producción
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#6B7280',
            margin: 0
          }}>
            {productos.reduce((total, prod) => total + (prod.pasos.length * prod.cantidad), 0)} pasos en total
            {pedido_id && <span> - Pedido #{pedido_id}</span>}
          </p>
        </div>
        
        <button
          onClick={handleDescargarPDF}
          disabled={isGeneratingPDF || isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: (isGeneratingPDF || isSaving) ? '#A5B4FC' : '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isGeneratingPDF || isSaving) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isGeneratingPDF && !isSaving) {
              e.currentTarget.style.backgroundColor = '#4338CA';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGeneratingPDF && !isSaving) {
              e.currentTarget.style.backgroundColor = '#4F46E5';
            }
          }}
        >
          <ArrowDownTrayIcon style={{ width: '20px', height: '20px' }} />
          {isGeneratingPDF ? 'Generando PDF...' : 
           isSaving ? 'Guardando...' : 
           'Descargar y finalizar'}
        </button>
      </div>

      {/* Cards Grid */}
      <div 
        id="production-cards"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          padding: '4px'
        }}
      >
        {productos.map((producto) => (
          producto.pasos.map((paso) => {
            const pasoKey = `paso_${producto.id}_${paso.id}`;
            const urlsForStep = qrCodes[pasoKey] || [];
            const hashesForStep = hashCodes[pasoKey] || [];
            const venta_id = ventasIds[producto.id];
            
            // Iterate through each unit (cantidad)
            return Array.from({ length: producto.cantidad }).map((_, copiaIndex) => {
              const qrUrl = urlsForStep[copiaIndex]; // Get the specific URL for this unit
              const uniqueHash = hashesForStep[copiaIndex]; // Get the specific hash for this unit

              // Return null or a placeholder if data isn't ready
              if (!qrUrl || !uniqueHash) {
                return (
                  <div key={`${paso.id}-placeholder-${copiaIndex}`} style={{ /* Placeholder style */ }}>
                    Cargando...
                  </div>
                );
              }

              return (
                <div
                  key={`${paso.id}-${uniqueHash}`}
                  className="card"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  {/* Card Header */}
                  <div className="card-header" style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                  }}>
                    <div style={{
                      backgroundColor: '#EEF2FF',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{
                        color: '#4F46E5',
                        fontSize: '18px',
                        fontWeight: 600
                      }}>
                        {paso.orden}
                      </span>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        {producto.nombre}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#4B5563',
                        margin: 0,
                        lineHeight: 1.5
                      }}>
                        {paso.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="card-content" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* Info Rows */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '6px'
                      }}>
                        <ClockIcon style={{ width: '18px', height: '18px', color: '#4B5563' }} />
                        <span style={{ fontSize: '13px', color: '#4B5563' }}>
                          {formatTotalTime(parsePostgresInterval(paso.tiempo_estimado))}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '6px'
                      }}>
                        <WrenchIcon style={{ width: '18px', height: '18px', color: '#4B5563' }} />
                        <span style={{ fontSize: '13px', color: '#4B5563' }}>
                          {paso.herramienta.nombre}
                        </span>
                      </div>
                    </div>

                    {/* ID Info Rows */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: '#DBEAFE',
                        borderRadius: '6px'
                      }}>
                        <span style={{ fontSize: '13px', color: '#1E40AF' }}>
                          🔢 Pedido: {pedido_id || 'N/A'}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: '#DBEAFE',
                        borderRadius: '6px'
                      }}>
                        <span style={{ fontSize: '13px', color: '#1E40AF' }}>
                          💰 Venta: {venta_id || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Section */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB'
                    }}>
                      <img 
                        src={qrUrl}
                        alt="QR Code"
                        style={{
                          width: '150px',
                          height: '150px',
                          marginBottom: '12px',
                          padding: '8px',
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px'
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <QrCodeIcon style={{ width: '16px', height: '16px', color: '#4F46E5' }} />
                        <span style={{ fontSize: '13px', color: '#4B5563' }}>
                          Hash: {uniqueHash}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })
        ))}
      </div>

      {/* QR Code Modal */}
      {selectedQR && (
        <QRCodeModal
          qrUrl={selectedQR.url}
          itemName={selectedQR.name}
          itemType="paso_produccion"
          itemId={selectedQR.id}
          onClose={handleCloseQrModal}
          isClosing={isQrModalClosing}
        />
      )}
    </div>
  );
}

export default PasosProduccionCards; 