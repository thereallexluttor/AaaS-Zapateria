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

export type Producto = {
  id?: string;
  nombre: string;
  precio: string;
  stock: string;
  stock_minimo: string;
  categoria: string;
  descripcion: string;
  tallas: string;
  colores: string;
  tiempo_fabricacion: string;
  destacado: boolean;
  imagen_url?: string;
  QR_Code?: string;
  created_at?: string;
}; 