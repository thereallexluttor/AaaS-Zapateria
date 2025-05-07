// Tipos para los productos seleccionados en un pedido
export interface ProductoSeleccionado {
  id: number;
  nombre: string;
  tallas: string[];
  tallasSeleccionadas: string[];
  colores: string[];
  coloresSeleccionados: string[];
  cantidad: number;
  precio: number;
  totalUnidades?: number;
}

// Tipo para los productos del inventario
export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string | null;
  descripcion: string | null;
  materiales: string[];
  herramientas: string[];
  tallas: { numero: string; stock: number; stockMinimo: number }[];
  colores: string | null;
  tiempo_fabricacion: number | null;
  pasos_produccion: number | null;
  destacado: boolean;
  imagen_url: string | null;
  qr_code: string | null;
  created_at: string | null;
}

// Tipo para los datos del formulario de pedido
export interface PedidoFormData {
  cliente: string;
  fechaInicio: string;
  fechaEntrega: string;
  estado: 'Pendiente' | 'Completada' | 'Cancelada';
  observaciones: string;
  productos: ProductoSeleccionado[];
  // Campos para ventas
  trabajador_id?: number;
  descuento?: number;
  forma_pago?: 'Efectivo' | 'Tarjeta crédito' | 'Tarjeta débito' | 'Transferencia' | 'Crédito';
  estado_venta?: 'Completada' | 'Pendiente' | 'Cancelada';
}

// Tipos para entidades de base de datos
export type Material = {
  id?: string;
  nombre: string;
  referencia: string;
  unidades: string;
  stock: string;
  stock_minimo: string;
  precio: string;
  categoria: string;
  proveedor: string;
  descripcion: string;
  fecha_adquisicion: string;
  ubicacion: string;
  imagen_url?: string;
  QR_Code?: string;
  created_at?: string;
};

export type Herramienta = {
  id?: string;
  nombre: string;
  modelo: string;
  numero_serie: string;
  estado: string;
  fecha_adquisicion: string;
  ultimo_mantenimiento: string;
  proximo_mantenimiento: string;
  ubicacion: string;
  responsable: string;
  descripcion: string;
  imagen_url?: string;
  QR_Code?: string;
  created_at?: string;
};

export type Cliente = {
  id?: string;
  tipo_cliente?: string;
  nombre?: string;
  apellidos?: string;
  nombre_compania?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
  notas?: string;
  fecha_registro?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  contacto_cargo?: string;
  created_at?: string;
  updated_at?: string;
};

export type Trabajador = {
  id?: string;
  nombre: string;
  apellido: string;
  cedula: string;
  fecha_contratacion?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  salario?: number;
  tipo: 'produccion' | 'administrativo' | 'diseno';
  area?: 'corte' | 'aparado' | 'montaje' | 'suela' | 'acabado' | 'ventas' | 'administracion' | 'diseno';
  especialidad?: string;
  tipo_contrato?: 'completo' | 'parcial' | 'temporal' | 'practica';
  horas_trabajo?: number;
  fecha_nacimiento?: string;
  imagen_url?: string;
  created_at?: string;
  updated_at?: string;
}; 