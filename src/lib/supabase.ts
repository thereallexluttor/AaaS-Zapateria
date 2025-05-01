import { createClient } from '@supabase/supabase-js';

// Estas variables de entorno deberían definirse en un archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Crear y exportar el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Verificar y crear los buckets necesarios si no existen
export async function initSupabaseStorage() {
  try {
    // Buckets a verificar
    const bucketNames = ['images', 'qrcodes'];
    
    console.log('Verificando buckets de almacenamiento...');
    
    // Verificar si los buckets ya existen
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error al listar los buckets:', listError);
      return;
    }
    
    console.log('Buckets disponibles:', buckets?.map(b => b.name) || []);
    
    // Verificar y crear cada bucket si es necesario
    for (const bucketName of bucketNames) {
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (bucketExists) {
        console.log(`El bucket '${bucketName}' ya existe`);
        
        // Verificar los permisos del bucket
        try {
          const { data: files, error: listFilesError } = await supabase.storage
            .from(bucketName)
            .list('public');
            
          if (listFilesError) {
            console.error(`Error al listar archivos en el bucket '${bucketName}':`, listFilesError);
          } else {
            console.log(`Archivos en ${bucketName}/public:`, files);
          }
        } catch (e) {
          console.error(`Error al verificar archivos en el bucket '${bucketName}':`, e);
        }
      } else {
        console.log(`Creando el bucket '${bucketName}'...`);
        
        // Si el bucket no existe, crearlo
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true, // Hacer público el acceso a las imágenes
          allowedMimeTypes: bucketName === 'qrcodes' 
            ? ['image/png'] 
            : ['image/jpeg', 'image/jpg'],
          fileSizeLimit: 5 * 1024 * 1024 // 5MB
        });
        
        if (createError) {
          console.error(`Error al crear el bucket '${bucketName}':`, createError);
        } else {
          console.log(`Bucket '${bucketName}' creado correctamente`);
          
          // Crear la carpeta public dentro del bucket
          try {
            const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload('public/.keep', new Blob([''], { type: 'text/plain' }));
              
            if (uploadError) {
              console.error(`Error al crear la carpeta public en '${bucketName}':`, uploadError);
            } else {
              console.log(`Carpeta public creada correctamente en '${bucketName}'`);
            }
          } catch (e) {
            console.error(`Error al crear la carpeta public en '${bucketName}':`, e);
          }
        }
      }
    }
    
    console.log('Inicialización del almacenamiento completada');
  } catch (error) {
    console.error('Error al inicializar el almacenamiento:', error);
  }
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
  qr_code: string | null;
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
  qr_code: string | null;
  created_at?: string;
};

// Interface for the structure within the 'tallas' JSONB field
export interface TallaStock {
  numero: string;
  stock: number;
  stockMinimo: number;
}

export type Producto = {
  id?: string; // Typically number, but Supabase might return as string
  nombre: string;
  precio: number; // Changed from string
  categoria: string | null; // Added null
  descripcion: string | null; // Added null
  materiales: string[]; // Added, assuming array of strings based on form
  herramientas: string[]; // Added, assuming array of strings based on form
  tallas: TallaStock[]; // Changed from string to specific interface array
  colores: string | null; // Added null
  tiempo_fabricacion: number | null; // Changed from string, added null
  destacado: boolean;
  imagen_url: string | null; // Added null
  qr_code: string | null; // Renamed from QR_Code, added null
  created_at: string | null; // Added null (assuming timestamp comes as string)
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