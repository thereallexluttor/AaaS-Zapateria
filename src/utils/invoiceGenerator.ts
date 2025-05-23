import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

// Declaración de tipos para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface Pedido {
  venta_id: number;
  fecha_venta: string;
  fecha_entrega: string;
  estado: string;
  forma_pago: string;
  observaciones: string;
  cantidad: number;
  precio_venta: number;
  descuento_porcentaje: number;
  tipo_cliente: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  cliente_ciudad: string;
  cliente_direccion: string;
  trabajador_nombre: string;
  trabajador_email: string;
  trabajador_telefono: string;
  rol_trabajador: string;
  area_trabajador: string;
  producto_nombre: string;
  categoria_producto: string;
  precio_catalogo: number;
  tiempo_fabricacion: number;
  pasos_produccion: number;
  tallas: string[] | string | any;  // Puede ser array, string u otro formato
  colores: string[] | string | any; // Puede ser array, string u otro formato
  total_tareas: number;
  tareas_completadas: number;
}

// Información de la empresa para compliance DIAN
const EMPRESA_INFO = {
  razonSocial: 'VIERCO SOLUTIONS S.A.S.',
  nit: '901.557.416-1',
  regimenTributario: 'Régimen Común - Declarante de IVA',
  resolucionDian: '18760000001234',
  fechaResolucion: '2023-01-15',
  rangoFacturacion: 'Del 1 al 5000000',
  actividadEconomica: 'Comercio al por mayor de calzado',
  direccion: 'Carrera 27 #65-112 Piso 3, Bucaramanga, Colombia',
  telefono: '+57 317 825 5067',
  email: 'viercosolutions.sas@gmail.com',
  website: 'www.viercosolutions.com'
};

// Constantes para Colombia
const IVA_COLOMBIA = 0.19; // 19% IVA en Colombia

// Función para formatear números eliminando .00 innecesarios
function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    // Si es un número entero, no mostrar decimales
    return amount.toLocaleString('es-CO');
  } else {
    // Si tiene decimales, mostrarlos
    return amount.toFixed(2).replace(/\.00$/, '').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  }
}

// Función para formatear una fecha en formato dd/mm/aaaa
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO');
}

// Función para generar un número de factura único compatible con DIAN
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // Formato DIAN: FE + año + mes + día + hora/minuto + aleatorio
  return `FE${year}${month}${day}${time}${random}`;
}

interface InvoiceResult {
  document: jsPDF;
  invoiceNumber: string;
}

export function generateInvoicePDF(pedidos: Pedido[]): InvoiceResult {
  if (!pedidos || pedidos.length === 0) {
    throw new Error('No se han proporcionado pedidos para generar la factura');
  }
  
  // Referencia al primer pedido para datos del cliente
  const clientePedido = pedidos[0];
  
  // Crear instancia de jsPDF
  const doc = new jsPDF();
  
  // Generar número de factura y fecha actual
  const invoiceNumber = generateInvoiceNumber();
  const currentDate = new Date().toLocaleDateString('es-CO');
  const currentTime = new Date().toLocaleTimeString('es-CO', { hour12: false });
  
  // Configuración de fuentes y colores mejorados
  const primaryColor = '#1E40AF'; // Azul más profesional
  const secondaryColor = '#64748B';
  const accentColor = '#059669'; // Verde para montos
  const warningColor = '#DC2626'; // Rojo para alertas
  
  // Encabezado principal con mejor diseño
  doc.setFillColor(240, 245, 255);
  doc.rect(0, 0, 210, 35, 'F');
  
  // Título de la factura electrónica
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text('FACTURA ELECTRÓNICA DE VENTA', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor);
  doc.text('Documento Equivalente según Resolución DIAN', 105, 28, { align: 'center' });
  
  // Información de la empresa - lado izquierdo
  let yPos = 45;
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text(EMPRESA_INFO.razonSocial, 20, yPos);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  yPos += 6;
  doc.text(`NIT: ${EMPRESA_INFO.nit}`, 20, yPos);
  yPos += 4;
  doc.text(`${EMPRESA_INFO.regimenTributario}`, 20, yPos);
  yPos += 4;
  doc.text(EMPRESA_INFO.direccion, 20, yPos);
  yPos += 4;
  doc.text(`Tel: ${EMPRESA_INFO.telefono}`, 20, yPos);
  yPos += 4;
  doc.text(EMPRESA_INFO.email, 20, yPos);
  yPos += 4;
  doc.text(`Actividad: ${EMPRESA_INFO.actividadEconomica}`, 20, yPos);
  
  // Información de la factura - lado derecho con recuadro
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.rect(140, 40, 55, 35);
  
  doc.setFillColor(240, 245, 255);
  doc.rect(140, 40, 55, 8, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.text('INFORMACIÓN FISCAL', 167, 46, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Factura N°:', 142, 52);
  doc.text('Fecha emisión:', 142, 56);
  doc.text('Hora emisión:', 142, 60);
  doc.text('Resolución DIAN:', 142, 64);
  doc.text('Rango autorizado:', 142, 68);
  doc.text('Fecha resolución:', 142, 72);
  
  doc.setTextColor(primaryColor);
  doc.text(invoiceNumber, 193, 52, { align: 'right' });
  doc.text(currentDate, 193, 56, { align: 'right' });
  doc.text(currentTime, 193, 60, { align: 'right' });
  doc.text(EMPRESA_INFO.resolucionDian, 193, 64, { align: 'right' });
  doc.text(EMPRESA_INFO.rangoFacturacion, 193, 68, { align: 'right' });
  doc.text(formatDate(EMPRESA_INFO.fechaResolucion), 193, 72, { align: 'right' });
  
  // Línea separadora más elegante
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(2);
  doc.line(20, 85, 190, 85);
  
  // Información del cliente con mejor formato
  yPos = 95;
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('DATOS DEL CLIENTE', 20, yPos);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  yPos += 7;
  doc.text(`Cliente: ${clientePedido.cliente_nombre}`, 20, yPos);
  if (clientePedido.cliente_email) {
    yPos += 5;
    doc.text(`Email: ${clientePedido.cliente_email}`, 20, yPos);
  }
  if (clientePedido.cliente_telefono) {
    yPos += 5;
    doc.text(`Teléfono: ${clientePedido.cliente_telefono}`, 20, yPos);
  }
  if (clientePedido.cliente_direccion) {
    yPos += 5;
    doc.text(`Dirección: ${clientePedido.cliente_direccion}`, 20, yPos);
  }
  if (clientePedido.cliente_ciudad) {
    yPos += 5;
    doc.text(`Ciudad: ${clientePedido.cliente_ciudad}`, 20, yPos);
  }
  
  // Método de pago
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('CONDICIONES DE PAGO', 130, 95);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Forma de pago: ${clientePedido.forma_pago || 'Contado'}`, 130, 102);
  doc.text(`Tipo de cliente: ${clientePedido.tipo_cliente || 'Regular'}`, 130, 107);
  
  // Tabla de productos con mejor diseño
  const tableColumn = ['#', 'Descripción del Producto', 'Cant.', 'Valor Unit.', 'Desc.', 'Valor Total'];
  const tableRows: any[] = [];
  
  let subtotalSinIva = 0;
  let descuentoTotal = 0;
  
  // Agregar productos a la tabla
  pedidos.forEach((pedido, index) => {
    // Los descuentos vienen como valores aplicados, no como porcentajes
    const descuentoMonto = pedido.descuento_porcentaje; // Es un valor, no un porcentaje
    const subtotal = pedido.precio_venta;
    
    subtotalSinIva += subtotal;
    descuentoTotal += descuentoMonto;
    
    const coloresTallas = [];
    
    // Procesar tallas y colores (código existente...)
    try {
      if (pedido.tallas) {
        if (Array.isArray(pedido.tallas) && pedido.tallas.length > 0) {
          coloresTallas.push(`Tallas: ${pedido.tallas.join(', ')}`);
        } else if (typeof pedido.tallas === 'string') {
          const tallasStr = pedido.tallas as string;
          try {
            const tallasParseadas = JSON.parse(tallasStr);
            if (Array.isArray(tallasParseadas) && tallasParseadas.length > 0) {
              coloresTallas.push(`Tallas: ${tallasParseadas.join(', ')}`);
            } else {
              coloresTallas.push(`Tallas: ${tallasStr}`);
            }
          } catch (e) {
            if (tallasStr.includes(',')) {
              const tallasDivididas = tallasStr.split(',').map((t: string) => t.trim());
              coloresTallas.push(`Tallas: ${tallasDivididas.join(', ')}`);
            } else {
              coloresTallas.push(`Tallas: ${tallasStr}`);
            }
          }
        }
      }
      
      if (pedido.colores) {
        if (Array.isArray(pedido.colores) && pedido.colores.length > 0) {
          coloresTallas.push(`Colores: ${pedido.colores.join(', ')}`);
        } else if (typeof pedido.colores === 'string') {
          const coloresStr = pedido.colores as string;
          try {
            const coloresParseados = JSON.parse(coloresStr);
            if (Array.isArray(coloresParseados) && coloresParseados.length > 0) {
              coloresTallas.push(`Colores: ${coloresParseados.join(', ')}`);
            } else {
              coloresTallas.push(`Colores: ${coloresStr}`);
            }
          } catch (e) {
            if (coloresStr.includes(',')) {
              const coloresDivididos = coloresStr.split(',').map((c: string) => c.trim());
              coloresTallas.push(`Colores: ${coloresDivididos.join(', ')}`);
            } else {
              coloresTallas.push(`Colores: ${coloresStr}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al procesar tallas o colores:', error);
    }
    
    const productoDetalle = coloresTallas.length > 0 
      ? `${pedido.producto_nombre}\n${coloresTallas.join(' | ')}`
      : pedido.producto_nombre;
    
    // Calcular porcentaje de descuento para mostrar en la tabla
    const porcentajeDescuento = pedido.precio_catalogo > 0 
      ? ((descuentoMonto / (pedido.precio_catalogo * pedido.cantidad)) * 100).toFixed(1)
      : '0';
    
    tableRows.push([
      index + 1,
      productoDetalle,
      pedido.cantidad,
      `$${formatCurrency(pedido.precio_catalogo)}`,
      descuentoMonto > 0 ? `${porcentajeDescuento}%` : '0%',
      `$${formatCurrency(subtotal)}`
    ]);
  });
  
  // Agregar tabla al documento con mejor estilo
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 125,
    styles: { 
      fontSize: 9, 
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [30, 64, 175], // primaryColor
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 65 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 30 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.text(
        `Página ${doc.getNumberOfPages()}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    }
  });
  
  // Calcular la posición Y después de la tabla
  const finalY = doc.lastAutoTable.finalY + 15;
  
  // Recuadro para resumen financiero
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.rect(130, finalY - 5, 65, 45);
  
  doc.setFillColor(240, 245, 255);
  doc.rect(130, finalY - 5, 65, 8, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.text('RESUMEN FINANCIERO', 162, finalY + 1, { align: 'center' });
  
  // Cálculos financieros con IVA del 19%
  const subtotalConDescuento = subtotalSinIva;
  const baseGravable = subtotalConDescuento; // Base para IVA
  const ivaCalculado = baseGravable * IVA_COLOMBIA; // 19% IVA Colombia
  const totalFinal = baseGravable + ivaCalculado;
  
  // Mostrar resumen financiero
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  yPos = finalY + 8;
  doc.text('Subtotal:', 132, yPos);
  doc.text(`$${formatCurrency(subtotalSinIva + descuentoTotal)}`, 193, yPos, { align: 'right' });
  
  if (descuentoTotal > 0) {
    yPos += 5;
    doc.setTextColor(warningColor);
    doc.text('Descuentos:', 132, yPos);
    doc.text(`-$${formatCurrency(descuentoTotal)}`, 193, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
  
  yPos += 5;
  doc.text('Base gravable IVA:', 132, yPos);
  doc.text(`$${formatCurrency(baseGravable)}`, 193, yPos, { align: 'right' });
  
  yPos += 5;
  doc.setTextColor(accentColor);
  doc.text('IVA (19%):', 132, yPos);
  doc.text(`$${formatCurrency(ivaCalculado)}`, 193, yPos, { align: 'right' });
  
  // Total con estilo destacado (sin línea encima problemática)
  yPos += 8;
  
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('TOTAL A PAGAR:', 132, yPos);
  doc.text(`$${formatCurrency(totalFinal)}`, 193, yPos, { align: 'right' });
  
  // Información legal DIAN
  const legalY = finalY + 55;
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text('INFORMACIÓN LEGAL DIAN', 20, legalY);
  
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text(`• Esta factura electrónica es un documento equivalente según la Resolución DIAN ${EMPRESA_INFO.resolucionDian}`, 20, legalY + 5);
  doc.text('• Los productos personalizados no admiten devolución según el Estatuto del Consumidor', 20, legalY + 10);
  doc.text('• Esta factura constituye título valor y presta mérito ejecutivo conforme al Código de Comercio', 20, legalY + 15);
  doc.text('• La mercancía viaja por cuenta y riesgo del comprador', 20, legalY + 20);
  doc.text(`• Consulte la autenticidad de este documento en: ${EMPRESA_INFO.website}`, 20, legalY + 25);
  
  // Código QR simulado (placeholder)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(20, legalY + 30, 15, 15);
  doc.setFontSize(6);
  doc.text('QR DIAN', 27, legalY + 38, { align: 'center' });
  
  // Nota de agradecimiento
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.text('¡Gracias por confiar en nosotros!', 105, legalY + 42, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text('Su satisfacción es nuestro compromiso', 105, legalY + 47, { align: 'center' });
  
  // Devolver el documento y el número de factura
  return { document: doc, invoiceNumber };
} 