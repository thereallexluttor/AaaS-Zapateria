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

// Función para formatear una fecha en formato dd/mm/aaaa
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES');
}

// Función para generar un número de factura único
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `F${year}${month}${day}-${random}`;
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
  const currentDate = new Date().toLocaleDateString('es-ES');
  
  // Configuración de fuentes y colores
  const primaryColor = '#4F46E5';
  const secondaryColor = '#6B7280';
  
  // Título de la factura
  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.text('FACTURA ELECTRÓNICA', 105, 20, { align: 'center' });
  
  // Logo y datos de la empresa (simulados)
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('Zapatería Artesanal', 20, 40);
  
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text('Calle Principal #123', 20, 45);
  doc.text('Ciudad, País CP 12345', 20, 50);
  doc.text('Tel: +1234567890', 20, 55);
  doc.text('info@zapateria-artesanal.com', 20, 60);
  
  // Información de la factura
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text('FACTURA N°:', 150, 40);
  doc.text('FECHA:', 150, 45);
  doc.text('CLIENTE ID:', 150, 50);
  
  doc.setTextColor(0, 0, 0);
  doc.text(invoiceNumber, 180, 40, { align: 'right' });
  doc.text(currentDate, 180, 45, { align: 'right' });
  doc.text(clientePedido.tipo_cliente || 'Regular', 180, 50, { align: 'right' });
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 65, 190, 65);
  
  // Información del cliente
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.text('FACTURADO A:', 20, 75);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(clientePedido.cliente_nombre, 20, 82);
  if (clientePedido.cliente_email) doc.text(clientePedido.cliente_email, 20, 87);
  if (clientePedido.cliente_telefono) doc.text(`Tel: ${clientePedido.cliente_telefono}`, 20, 92);
  if (clientePedido.cliente_direccion) doc.text(clientePedido.cliente_direccion, 20, 97);
  if (clientePedido.cliente_ciudad) doc.text(clientePedido.cliente_ciudad, 20, 102);
  
  // Método de pago
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.text('MÉTODO DE PAGO:', 140, 75);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(clientePedido.forma_pago || 'No especificado', 140, 82);
  
  // Tabla de productos
  const tableColumn = ['#', 'Producto', 'Cantidad', 'Precio Unit.', 'Descuento', 'Subtotal'];
  const tableRows: any[] = [];
  
  let totalFactura = 0;
  let descuentoTotal = 0;
  
  // Agregar productos a la tabla
  pedidos.forEach((pedido, index) => {
    const precioConDescuento = pedido.precio_venta / pedido.cantidad;
    const descuentoMonto = (pedido.descuento_porcentaje / 100) * pedido.precio_catalogo * pedido.cantidad;
    const subtotal = pedido.precio_venta;
    
    totalFactura += subtotal;
    descuentoTotal += descuentoMonto;
    
    const coloresTallas = [];
    
    // Procesar tallas de forma segura
    try {
      if (pedido.tallas) {
        // Manejar diferentes formatos de tallas
        if (Array.isArray(pedido.tallas) && pedido.tallas.length > 0) {
          coloresTallas.push(`Tallas: ${pedido.tallas.join(', ')}`);
        } else if (typeof pedido.tallas === 'string') {
          const tallasStr = pedido.tallas as string;
          // Intenta parsear si es un string JSON
          try {
            const tallasParseadas = JSON.parse(tallasStr);
            if (Array.isArray(tallasParseadas) && tallasParseadas.length > 0) {
              coloresTallas.push(`Tallas: ${tallasParseadas.join(', ')}`);
            } else {
              // Si no es un array después de parsear, usarlo como string
              coloresTallas.push(`Tallas: ${tallasStr}`);
            }
          } catch (e) {
            // Si no se puede parsear como JSON, usarlo directamente como string
            if (tallasStr.includes(',')) {
              // Si contiene comas, dividir
              const tallasDivididas = tallasStr.split(',').map((t: string) => t.trim());
              coloresTallas.push(`Tallas: ${tallasDivididas.join(', ')}`);
            } else {
              coloresTallas.push(`Tallas: ${tallasStr}`);
            }
          }
        }
      }
      
      // Procesar colores de forma segura
      if (pedido.colores) {
        // Manejar diferentes formatos de colores
        if (Array.isArray(pedido.colores) && pedido.colores.length > 0) {
          coloresTallas.push(`Colores: ${pedido.colores.join(', ')}`);
        } else if (typeof pedido.colores === 'string') {
          const coloresStr = pedido.colores as string;
          // Intenta parsear si es un string JSON
          try {
            const coloresParseados = JSON.parse(coloresStr);
            if (Array.isArray(coloresParseados) && coloresParseados.length > 0) {
              coloresTallas.push(`Colores: ${coloresParseados.join(', ')}`);
            } else {
              // Si no es un array después de parsear, usarlo como string
              coloresTallas.push(`Colores: ${coloresStr}`);
            }
          } catch (e) {
            // Si no se puede parsear como JSON, usarlo directamente como string
            if (coloresStr.includes(',')) {
              // Si contiene comas, dividir
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
      // Si hay algún error, omitir esta información en la factura
    }
    
    const productoDetalle = coloresTallas.length > 0 
      ? `${pedido.producto_nombre}\n${coloresTallas.join('\n')}`
      : pedido.producto_nombre;
    
    tableRows.push([
      index + 1,
      productoDetalle,
      pedido.cantidad,
      `$${pedido.precio_catalogo.toFixed(2)}`,
      `${pedido.descuento_porcentaje}%`,
      `$${subtotal.toFixed(2)}`
    ]);
  });
  
  // Agregar tabla al documento
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 110,
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 30 }
    },
    didDrawPage: (data) => {
      // Añadir número de página
      doc.setFontSize(8);
      doc.text(
        `Página ${doc.getNumberOfPages()}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    }
  });
  
  // Calcular la posición Y después de la tabla
  const finalY = doc.lastAutoTable.finalY + 10;
  
  // Añadir resumen financiero
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Subtotal:', 150, finalY);
  doc.text(`$${(totalFactura + descuentoTotal).toFixed(2)}`, 190, finalY, { align: 'right' });
  
  doc.text('Descuento:', 150, finalY + 5);
  doc.text(`-$${descuentoTotal.toFixed(2)}`, 190, finalY + 5, { align: 'right' });
  
  const iva = totalFactura * 0.16; // 16% de IVA estándar
  doc.text('IVA (16%):', 150, finalY + 10);
  doc.text(`$${iva.toFixed(2)}`, 190, finalY + 10, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('TOTAL:', 150, finalY + 17);
  doc.text(`$${(totalFactura + iva).toFixed(2)}`, 190, finalY + 17, { align: 'right' });
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(140, finalY - 5, 190, finalY - 5);
  
  // Pie de página con términos y condiciones
  const footerY = finalY + 30;
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text('Términos y Condiciones', 20, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text('1. El pago debe realizarse en la fecha acordada.', 20, footerY + 5);
  doc.text('2. Los productos personalizados no admiten devolución.', 20, footerY + 10);
  doc.text('3. Esta factura es un documento legal válido según las leyes fiscales vigentes.', 20, footerY + 15);
  doc.text('4. Para cualquier consulta sobre esta factura, contacte a nuestro departamento de atención al cliente.', 20, footerY + 20);
  
  // Nota de agradecimiento
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);
  doc.text('¡Gracias por su compra!', 105, footerY + 30, { align: 'center' });
  
  // Devolver el documento y el número de factura para previsualización
  return { document: doc, invoiceNumber };
} 