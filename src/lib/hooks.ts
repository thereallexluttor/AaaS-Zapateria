import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Material, Herramienta, Producto, Cliente, Trabajador } from './supabase';
import { InventoryItemType } from '../components/InventoryItem';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

// Cache para imágenes
const imageCache = new Map<string, string>();

// Función para generar códigos QR y convertirlos a URL de datos
export async function generateQRCode(category: string, id: string): Promise<string> {
  try {
    // Formato: [categoría,id]
    const qrContent = `[${category},${id}]`;
    
    // Generar el código QR como URL de datos
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('Error al generar el código QR:', error);
    return '';
  }
}

// Función para guardar un código QR en el bucket 'qrcodes' y actualizar la entidad
export async function saveQRCodeAndUpdateEntity(
  category: string, 
  id: string, 
  tableName: 'materiales' | 'herramientas' | 'productos_table'
): Promise<string | null> {
  try {
    // Generar el código QR como URL de datos
    const qrCodeDataUrl = await generateQRCode(category, id);
    
    if (!qrCodeDataUrl) {
      console.error('No se pudo generar el código QR');
      return null;
    }
    
    // Convertir a Blob para subirlo
    const qrBlob = await dataURLtoBlob(qrCodeDataUrl);
    const qrFile = new File([qrBlob], `qr_${category}_${id}.png`, { type: 'image/png' });
    
    // Subir el código QR a Supabase Storage
    const qrImageUrl = await uploadImageToSupabase(qrFile, 'qrcodes');
    
    if (qrImageUrl) {
      // Actualizar el registro con la URL del código QR
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ QR_Code: qrImageUrl })
        .eq('id', id);
        
      if (updateError) {
        console.error(`Error al actualizar ${tableName} con el código QR:`, updateError);
        return null;
      } else {
        console.log(`Código QR guardado para ${category}:`, qrImageUrl);
        return qrImageUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error al guardar el QR de ${category}:`, error);
    return null;
  }
}

// Función para convertir una URL de datos a un archivo Blob
export async function dataURLtoBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then(res => res.blob());
}

// Función para convertir cualquier imagen a JPG usando canvas
async function convertToJpg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Crear un canvas con las dimensiones de la imagen
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Dibujar la imagen en el canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Fondo blanco para imágenes con transparencia
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Convertir a JPG (formato 'image/jpeg')
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('No se pudo convertir la imagen a JPG'));
            }
          },
          'image/jpeg',
          0.9 // Calidad (0-1)
        );
      };
      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo'));
    };
    reader.readAsDataURL(file);
  });
}

// Función para reducir el tamaño de una imagen si es muy grande
async function resizeImageIfNeeded(blob: Blob, maxWidth = 1200, maxHeight = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Si la imagen es más pequeña que los límites, devolver la original
      if (img.width <= maxWidth && img.height <= maxHeight) {
        resolve(blob);
        return;
      }
      
      // Calcular nuevas dimensiones manteniendo la proporción
      let newWidth = img.width;
      let newHeight = img.height;
      
      if (newWidth > maxWidth) {
        newHeight = (newHeight * maxWidth) / newWidth;
        newWidth = maxWidth;
      }
      
      if (newHeight > maxHeight) {
        newWidth = (newWidth * maxHeight) / newHeight;
        newHeight = maxHeight;
      }
      
      // Redimensionar usando canvas
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            resolve(resizedBlob);
          } else {
            reject(new Error('No se pudo redimensionar la imagen'));
          }
        },
        'image/jpeg',
        0.85 // Calidad (0-1)
      );
    };
    
    img.onerror = () => {
      reject(new Error('No se pudo cargar la imagen para redimensionar'));
    };
    
    img.src = URL.createObjectURL(blob);
  });
}

// Función para subir una imagen a Supabase Storage con optimización y caché
export async function uploadImageToSupabase(file: File, bucket: string = 'images'): Promise<string | null> {
  try {
    // Verificar si el tipo de archivo es una imagen
    if (!file.type.startsWith('image/')) {
      console.error('El archivo no es una imagen válida');
      return null;
    }
    
    // Crear un hash simple del archivo para usar como clave de caché
    const fileHash = await createFileHash(file);
    
    // Verificar si ya tenemos esta imagen en caché
    if (imageCache.has(fileHash)) {
      console.log('Imagen recuperada desde caché:', fileHash);
      return imageCache.get(fileHash) || null;
    }
    
    let fileToUpload: File | Blob = file;
    
    // Convertir la imagen a JPG si no lo es ya
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      console.log('Convirtiendo imagen a formato JPG...');
      try {
        fileToUpload = await convertToJpg(file);
        console.log('Imagen convertida a JPG exitosamente');
      } catch (error) {
        console.error('Error al convertir la imagen a JPG:', error);
        // Continuar con el archivo original si falla la conversión
      }
    }
    
    // Redimensionar la imagen si es muy grande
    try {
      fileToUpload = await resizeImageIfNeeded(fileToUpload);
      console.log('Imagen redimensionada si era necesario');
    } catch (error) {
      console.error('Error al redimensionar la imagen:', error);
      // Continuar con el archivo original si falla el redimensionamiento
    }
    
    // Crear un nombre único para el archivo
    const fileName = `${uuidv4()}.jpg`;
    
    // Ruta del archivo en la carpeta 'public' según la política del bucket
    const filePath = `public/${fileName}`;
    
    console.log('Subiendo imagen a:', filePath);
    
    // Subir el archivo a Supabase Storage
    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, {
        contentType: 'image/jpeg', // Forzar el content type a jpeg
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error al subir la imagen:', uploadError);
      return null;
    }
    
    console.log('Imagen subida exitosamente:', data);
    
    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData.publicUrl;
    console.log('URL pública generada:', publicUrl);
    
    // Guardar la URL en la caché
    imageCache.set(fileHash, publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Error al procesar la imagen:', error);
    return null;
  }
}

// Función para crear un hash simple de un archivo
async function createFileHash(file: File): Promise<string> {
  // Usar una combinación de nombre, tamaño y última modificación como hash simple
  return `${file.name}-${file.size}-${file.lastModified}`;
}

// Limpiar caché de imágenes periódicamente (cada 2 horas)
setInterval(() => {
  console.log('Limpiando caché de imágenes...');
  imageCache.clear();
}, 2 * 60 * 60 * 1000);

// Hook para manejar las operaciones con materiales
export function useMateriales() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Función para obtener todos los materiales
  const getMateriales = async (searchQuery = '') => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('materiales')
        .select('*');
      
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('nombre', `%${searchQuery}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Obtenidos ${data?.length || 0} materiales${searchQuery ? ' para búsqueda: ' + searchQuery : ''}`);
      setMaterials(data || []);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al obtener los materiales');
      console.error('Error al obtener los materiales:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar un nuevo material
  const addMaterial = async (material: Omit<Material, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Transformar los nombres de los campos al formato de snake_case para la BD
      const materialData = {
        nombre: material.nombre,
        referencia: material.referencia,
        unidades: material.unidades,
        stock: material.stock,
        stock_minimo: material.stock_minimo,
        precio: material.precio,
        categoria: material.categoria,
        proveedor: material.proveedor,
        descripcion: material.descripcion,
        fecha_adquisicion: material.fecha_adquisicion,
        ubicacion: material.ubicacion,
        imagen_url: material.imagen_url
      };
      
      console.log('Guardando material en la base de datos:', materialData);
      
      const { data, error } = await supabase
        .from('materiales')
        .insert([materialData])
        .select();
      
      if (error) {
        console.error('Error de Supabase al guardar el material:', error);
        throw error;
      }
      
      console.log('Material guardado exitosamente:', data);
      
      // Si hay datos, generar el código QR y actualizarlo en la base de datos
      if (data?.[0]?.id) {
        try {
          // Usar la nueva función para guardar el QR en el bucket 'qrcodes'
          const qrImageUrl = await saveQRCodeAndUpdateEntity('material', data[0].id, 'materiales');
          
          if (qrImageUrl) {
            // Actualizar el objeto para devolverlo con el QR
            data[0].QR_Code = qrImageUrl;
          }
        } catch (qrError) {
          console.error('Error al generar o guardar el código QR:', qrError);
        }
      }
      
      // Actualizar el estado local añadiendo el nuevo material
      if (data?.[0]) {
        setMaterials(prevMaterials => [data[0], ...prevMaterials]);
      }
      
      return data?.[0];
    } catch (err: any) {
      setError(err.message || 'Error al guardar el material');
      console.error('Error al guardar el material:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    materials,
    getMateriales,
    addMaterial,
    setMaterials
  };
}

// Hook para manejar las operaciones con herramientas
export function useHerramientas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);

  // Función para obtener todas las herramientas
  const getHerramientas = async (searchQuery = '') => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('herramientas')
        .select('*');
      
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('nombre', `%${searchQuery}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Obtenidas ${data?.length || 0} herramientas${searchQuery ? ' para búsqueda: ' + searchQuery : ''}`);
      setHerramientas(data || []);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al obtener las herramientas');
      console.error('Error al obtener las herramientas:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar una nueva herramienta
  const addHerramienta = async (herramienta: Omit<Herramienta, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Transformar los nombres de los campos al formato de snake_case para la BD
      const herramientaData = {
        nombre: herramienta.nombre,
        modelo: herramienta.modelo,
        numero_serie: herramienta.numero_serie,
        estado: herramienta.estado,
        fecha_adquisicion: herramienta.fecha_adquisicion,
        ultimo_mantenimiento: herramienta.ultimo_mantenimiento,
        proximo_mantenimiento: herramienta.proximo_mantenimiento,
        ubicacion: herramienta.ubicacion,
        responsable: herramienta.responsable,
        descripcion: herramienta.descripcion,
        imagen_url: herramienta.imagen_url
      };
      
      console.log('Guardando herramienta en la base de datos:', herramientaData);
      
      const { data, error } = await supabase
        .from('herramientas')
        .insert([herramientaData])
        .select();
      
      if (error) {
        console.error('Error de Supabase al guardar la herramienta:', error);
        throw error;
      }
      
      console.log('Herramienta guardada exitosamente:', data);
      
      // Si hay datos, generar el código QR y actualizarlo en la base de datos
      if (data?.[0]?.id) {
        try {
          // Usar la nueva función para guardar el QR en el bucket 'qrcodes'
          const qrImageUrl = await saveQRCodeAndUpdateEntity('herramienta', data[0].id, 'herramientas');
          
          if (qrImageUrl) {
            // Actualizar el objeto para devolverlo con el QR
            data[0].QR_Code = qrImageUrl;
          }
        } catch (qrError) {
          console.error('Error al generar o guardar el código QR:', qrError);
        }
      }
      
      // Actualizar el estado local añadiendo la nueva herramienta
      if (data?.[0]) {
        setHerramientas(prevHerramientas => [data[0], ...prevHerramientas]);
      }
      
      return data?.[0];
    } catch (err: any) {
      setError(err.message || 'Error al guardar la herramienta');
      console.error('Error al guardar la herramienta:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    herramientas,
    getHerramientas,
    addHerramienta,
    setHerramientas
  };
}

// Hook para manejar las operaciones con productos
export function useProductos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Función para obtener todos los productos
  const getProductos = async (searchQuery = '') => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('productos_table')
        .select('*');
      
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('nombre', `%${searchQuery}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Obtenidos ${data?.length || 0} productos${searchQuery ? ' para búsqueda: ' + searchQuery : ''}`);
      setProductos(data || []);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al obtener los productos');
      console.error('Error al obtener los productos:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar un nuevo producto
  const addProducto = async (producto: Omit<Producto, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Transformar los nombres de los campos al formato de snake_case para la BD
      const productoData = {
        nombre: producto.nombre,
        precio: producto.precio,
        categoria: producto.categoria,
        descripcion: producto.descripcion,
        tallas: producto.tallas,
        colores: producto.colores,
        tiempo_fabricacion: producto.tiempo_fabricacion,
        destacado: producto.destacado,
        imagen_url: producto.imagen_url
      };
      
      console.log('Guardando producto en la base de datos:', productoData);
      
      const { data, error } = await supabase
        .from('productos_table')
        .insert([productoData])
        .select();
      
      if (error) {
        console.error('Error de Supabase al guardar el producto:', error);
        throw error;
      }
      
      console.log('Producto guardado exitosamente:', data);
      
      // Si hay datos, generar el código QR y actualizarlo en la base de datos
      if (data?.[0]?.id) {
        try {
          // Usar la nueva función para guardar el QR en el bucket 'qrcodes'
          const qrImageUrl = await saveQRCodeAndUpdateEntity('producto', data[0].id, 'productos_table');
          
          if (qrImageUrl) {
            // Actualizar el objeto para devolverlo con el QR
            data[0].QR_Code = qrImageUrl;
          }
        } catch (qrError) {
          console.error('Error al generar o guardar el código QR:', qrError);
        }
      }
      
      // Actualizar el estado local añadiendo el nuevo producto
      if (data?.[0]) {
        setProductos(prevProductos => [data[0], ...prevProductos]);
      }
      
      return data?.[0];
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
      console.error('Error al guardar el producto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    productos,
    getProductos,
    addProducto,
    setProductos
  };
}

// Hook combinado para obtener todos los elementos del inventario
export function useInventario() {
  const { 
    materials, 
    getMateriales, 
    addMaterial,
    loading: loadingMateriales,
    setMaterials 
  } = useMateriales();
  
  const { 
    herramientas, 
    getHerramientas, 
    addHerramienta,
    loading: loadingHerramientas,
    setHerramientas 
  } = useHerramientas();
  
  const { 
    productos, 
    getProductos, 
    addProducto,
    loading: loadingProductos,
    setProductos 
  } = useProductos();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Caché para almacenar resultados de búsquedas previas con timestamps
  const [searchCache, setSearchCache] = useState<Record<string, { data: InventoryItemType[], timestamp: number }>>({});

  // Un flag para controlar si necesitamos actualizar después de crear un nuevo elemento
  const [needsUpdate, setNeedsUpdate] = useState(false);

  // Función para buscar en todo el inventario (solo se ejecuta cuando el usuario busca)
  const searchInventario = useCallback(async (query: string) => {
    if (!initialized) return;
    
    // Si el término de búsqueda no ha cambiado, no hacemos nada
    if (query === searchQuery) return;
    
    // Si el término de búsqueda está vacío, recargar todos los datos originales
    if (!query.trim()) {
      setLoading(true);
      setSearchQuery('');
      
      console.log('Búsqueda vacía: recargando todos los elementos');
      
      // Recargar todos los datos originales
      await Promise.all([
        getMateriales(''),
        getHerramientas(''),
        getProductos('')
      ]);
      
      setLoading(false);
      return;
    }
    
    // Verificar si ya hemos buscado este término recientemente y usar el caché
    const cacheTimeLimit = 60000; // 1 minuto
    if (searchCache[query] && (Date.now() - searchCache[query].timestamp) < cacheTimeLimit) {
      console.log('Usando resultados en caché para:', query);
      setSearchQuery(query);
      return;
    }
    
    setLoading(true);
    setSearchQuery(query);
    
    await Promise.all([
      getMateriales(query),
      getHerramientas(query),
      getProductos(query)
    ]);
    
    // Actualizar caché con timestamp y resultados
    const allItems = [
      ...materials.map(m => ({ ...m, type: 'material' as const })),
      ...herramientas.map(h => ({ ...h, type: 'herramienta' as const })),
      ...productos.map(p => ({ ...p, type: 'producto' as const }))
    ];
    
    setSearchCache(prev => ({
      ...prev,
      [query]: { 
        data: allItems,
        timestamp: Date.now() 
      }
    }));
    
    setLoading(false);
  }, [getMateriales, getHerramientas, getProductos, initialized, searchQuery, searchCache, materials, herramientas, productos]);

  // Función para añadir un nuevo elemento al inventario con optimización inmediata
  const addInventarioItem = useCallback(async (
    tipo: 'material' | 'herramienta' | 'producto',
    item: any
  ) => {
    // Guardar el estado de loading anterior
    let prevLoading = loading;
    
    // Activar estado de carga solo para esta operación específica
    setLoading(true);
    
    let result;
    
    try {
      switch (tipo) {
        case 'material':
          result = await addMaterial(item);
          break;
        case 'herramienta':
          result = await addHerramienta(item);
          break;
        case 'producto':
          result = await addProducto(item);
          break;
        default:
          return null;
      }
      
      if (result) {
        console.log(`${tipo} añadido exitosamente:`, result);
        
        // Para búsquedas activas, actualizar también el caché
        if (searchQuery) {
          const newItemWithType = { ...result, type: tipo as any };
          setSearchCache(prev => {
            if (!prev[searchQuery]) return prev;
            
            // Añadir el nuevo elemento al principio de los resultados
            return {
              ...prev,
              [searchQuery]: {
                data: [newItemWithType, ...prev[searchQuery].data],
                timestamp: Date.now()
              }
            };
          });
        }
        
        // Marcar que necesitamos una sola actualización
        setNeedsUpdate(true);
        
        // Indicar que ya terminamos la carga
        setLoading(false);
      }
      
      return result;
    } catch (error) {
      console.error(`Error al añadir ${tipo}:`, error);
      return null;
    } finally {
      // Restaurar estado de carga anterior en caso de error
      if (loading) {
        setLoading(prevLoading);
      }
    }
  }, [addMaterial, addHerramienta, addProducto, loading, searchQuery]);

  // Actualización mejorada con carga selectiva para mejor rendimiento (sólo carga inicial)
  useEffect(() => {
    // Desactivar las suscripciones automáticas de Supabase para evitar
    // actualizaciones constantes que podrían degradar el rendimiento
    // Cargaremos los datos de forma más controlada
    
    const loadInitialData = async () => {
      if (initialized) return;
      
      setLoading(true);
      
      try {
        console.log('Cargando datos iniciales...');
        // Cargar todos los datos en paralelo para mayor eficiencia
        await Promise.all([
          getMateriales(),
          getHerramientas(),
          getProductos()
        ]);
        
        setInitialized(true);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    // Ya no configuramos suscripciones realtime para evitar
    // actualizaciones constantes que degradan el rendimiento
    
  }, [getMateriales, getHerramientas, getProductos, initialized]);

  // Función para limpiar el caché de búsquedas periódicamente
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setSearchCache(prev => {
        const now = Date.now();
        const cacheDuration = 10 * 60 * 1000; // 10 minutos
        const newCache: Record<string, { data: InventoryItemType[], timestamp: number }> = {};
        
        // Solo mantenemos las búsquedas de los últimos 10 minutos
        Object.entries(prev).forEach(([key, entry]) => {
          if ((now - entry.timestamp) < cacheDuration) {
            newCache[key] = entry;
          }
        });
        
        return newCache;
      });
    }, 5 * 60 * 1000); // Limpiar cada 5 minutos
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Efecto para manejar la actualización única después de crear un elemento
  useEffect(() => {
    // Solo ejecutar si realmente necesitamos una actualización
    if (needsUpdate && initialized) {
      console.log('Realizando actualización única después de añadir elemento');
      
      // Función para realizar la actualización una sola vez
      const singleUpdate = async () => {
        try {
          setLoading(true);
          
          // Actualizar un tipo a la vez para minimizar la carga
          if (searchQuery === '') {
            await getMateriales();
            await getHerramientas();
            await getProductos();
          } else {
            await getMateriales(searchQuery);
            await getHerramientas(searchQuery);
            await getProductos(searchQuery);
          }
          
          // Indicar que ya no necesitamos más actualizaciones
          setNeedsUpdate(false);
        } catch (error) {
          console.error('Error en actualización única:', error);
        } finally {
          setLoading(false);
        }
      };
      
      // Ejecutar después de un pequeño retraso para permitir que React actualice el UI
      const timeoutId = setTimeout(singleUpdate, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [needsUpdate, initialized, getMateriales, getHerramientas, getProductos, searchQuery]);

  // Reemplazamos el efecto anterior por uno optimizado que no genera bucles
  useEffect(() => {
    // Si no está inicializado o no hay refreshTrigger, no hacer nada
    if (!initialized || refreshTrigger <= 0) return;
    
    console.log(`Ejecutando refreshTrigger: ${refreshTrigger}`);
    
    // Marcar que necesitamos una actualización
    setNeedsUpdate(true);
    
    // No necesitamos hacer nada más aquí, la actualización real
    // se maneja en el efecto de needsUpdate
    
  }, [refreshTrigger, initialized]);

  // Obtener todos los elementos como un solo array con tipos específicos
  const getAllItems = useCallback((): InventoryItemType[] => {
    // Implementación optimizada para reducir carga de procesamiento
    const allItems = [
      ...materials.map(m => ({ ...m, type: 'material' as const })),
      ...herramientas.map(h => ({ ...h, type: 'herramienta' as const })),
      ...productos.map(p => ({ ...p, type: 'producto' as const }))
    ];
    
    // Ordenar por fecha de creación (más recientes primero)
    return allItems.sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [materials, herramientas, productos]);

  // Forzar una actualización de todos los datos (versión optimizada)
  const refreshAllData = useCallback(() => {
    // En lugar de usar refreshTrigger, activamos directamente la bandera de actualización única
    setNeedsUpdate(true);
    
    // No es necesario establecer el refreshTrigger, ya que ahora usamos needsUpdate
    // para controlar las actualizaciones
    console.log('Solicitando actualización única del inventario');
  }, []);

  // Nueva función para obtener un elemento por ID sin recargar toda la lista
  const getItemById = useCallback(async (
    tipo: 'material' | 'herramienta' | 'producto',
    id: string
  ): Promise<any | null> => {
    if (!id) return null;
    
    try {
      // Mapear el tipo a la tabla correspondiente
      const tableName = tipo === 'producto' ? 'productos_table' : `${tipo}s` as 'materiales' | 'herramientas' | 'productos_table';
      
      // Consultar solo el elemento específico
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error al obtener ${tipo} por ID:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error al consultar ${tipo} por ID:`, error);
      return null;
    }
  }, []);

  // Función específica para generar y guardar el código QR de un elemento existente
  const generateAndSaveQR = useCallback(async (
    tipo: 'material' | 'herramienta' | 'producto',
    id: string
  ): Promise<string | null> => {
    if (!id) return null;
    
    try {
      // Mapear el tipo a la tabla correspondiente
      const tableName = tipo === 'producto' ? 'productos_table' : `${tipo}s` as 'materiales' | 'herramientas' | 'productos_table';
      
      // Verificar si el elemento ya tiene un QR
      const { data: existingItem, error: fetchError } = await supabase
        .from(tableName)
        .select('QR_Code')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error(`Error al verificar QR existente para ${tipo}:`, fetchError);
        return null;
      }
      
      // Si ya tiene un QR, devolverlo
      if (existingItem?.QR_Code) {
        console.log(`El ${tipo} ya tiene un código QR asociado:`, existingItem.QR_Code);
        return existingItem.QR_Code;
      }
      
      // Si no tiene QR, generar uno nuevo
      console.log(`Generando nuevo QR para ${tipo} con ID ${id}`);
      const qrImageUrl = await saveQRCodeAndUpdateEntity(tipo, id, tableName);
      
      if (qrImageUrl) {
        // Ya no necesitamos un refresh completo, podemos actualizar solo este elemento
        // Obtenemos los datos actualizados del elemento
        const updatedItem = await getItemById(tipo, id);
        
        // Actualizamos solo el estado correspondiente
        if (updatedItem) {
          switch (tipo) {
            case 'material':
              setMaterials(prev => prev.map(item => 
                item.id === id ? { ...item, QR_Code: qrImageUrl } : item
              ));
              break;
            case 'herramienta':
              setHerramientas(prev => prev.map(item => 
                item.id === id ? { ...item, QR_Code: qrImageUrl } : item
              ));
              break;
            case 'producto':
              setProductos(prev => prev.map(item => 
                item.id === id ? { ...item, QR_Code: qrImageUrl } : item
              ));
              break;
          }
        } else {
          // Si no encontramos el elemento localmente, necesitamos una actualización controlada
          setNeedsUpdate(true);
        }
        
        return qrImageUrl;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al generar QR para ${tipo}:`, error);
      return null;
    }
  }, [getItemById]);

  // Actualizar un elemento existente en el inventario
  const updateInventarioItem = async (
    type: 'material' | 'producto' | 'herramienta', 
    id: string, 
    data: any
  ): Promise<any> => {
    try {
      setLoading(true);
      let result;

      // Actualizar el elemento según su tipo
      if (type === 'material') {
        const { error, data: updatedMaterial } = await supabase
          .from('materiales')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        result = updatedMaterial;
        
        // Actualizar el estado local del material
        setMaterials(prevState => 
          prevState.map(item => 
            item.id === id ? { ...item, ...data } : item
          )
        );
      } 
      else if (type === 'producto') {
        const { error, data: updatedProducto } = await supabase
          .from('productos')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        result = updatedProducto;
        
        // Actualizar el estado local del producto
        setProductos(prevState => 
          prevState.map(item => 
            item.id === id ? { ...item, ...data } : item
          )
        );
      } 
      else if (type === 'herramienta') {
        const { error, data: updatedHerramienta } = await supabase
          .from('herramientas')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        result = updatedHerramienta;
        
        // Actualizar el estado local de la herramienta
        setHerramientas(prevState => 
          prevState.map(item => 
            item.id === id ? { ...item, ...data } : item
          )
        );
      }

      return result;
    } catch (error: any) {
      console.error(`Error al actualizar ${type}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading: loading || loadingMateriales || loadingHerramientas || loadingProductos,
    materials,
    herramientas,
    productos,
    initialized,
    searchQuery,
    searchInventario,
    getAllItems,
    addInventarioItem,
    refreshAllData,
    generateAndSaveQR,
    getItemById,
    updateInventarioItem
  };
}

// Hook para manejar los clientes
export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Obtener clientes con búsqueda opcional
  const getClientes = async (searchQuery = '') => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Si hay término de búsqueda, filtrar por campos relevantes
      if (searchQuery) {
        query = query.or(
          `nombre.ilike.%${searchQuery}%,` + 
          `apellidos.ilike.%${searchQuery}%,` +
          `nombre_compania.ilike.%${searchQuery}%,` +
          `email.ilike.%${searchQuery}%,` +
          `telefono.ilike.%${searchQuery}%,` +
          `contacto_nombre.ilike.%${searchQuery}%`
        );
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error al obtener clientes:', error);
        setError('Error al cargar clientes');
        return;
      }
      
      setClientes(data || []);
    } catch (error) {
      console.error('Error inesperado:', error);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };
  
  // Añadir un nuevo cliente
  const addCliente = async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Preparar objeto de cliente con valores por defecto
      const newCliente = {
        ...cliente,
        // Asegurar que fechas sean correctas
        fecha_registro: cliente.fecha_registro || new Date().toISOString().split('T')[0]
      };
      
      console.log('Guardando cliente en la base de datos:', newCliente);
      
      const { data, error } = await supabase
        .from('clientes')
        .insert([newCliente])
        .select()
        .single();
      
      if (error) {
        console.error('Error al añadir cliente:', error);
        setError('Error al guardar el cliente');
        return null;
      }
      
      console.log('Cliente guardado exitosamente:', data);
      
      // Actualizar estado local
      setClientes(prev => [data, ...prev]);
      
      return data;
    } catch (error) {
      console.error('Error al añadir cliente:', error);
      setError('Error al guardar el cliente');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Actualizar un cliente existente
  const updateCliente = async (id: string, updates: Partial<Cliente>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Asegurar que updated_at se actualice
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('clientes')
        .update(updatesWithTimestamp)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error al actualizar cliente:', error);
        setError('Error al actualizar el cliente');
        return null;
      }
      
      // Actualizar estado local
      setClientes(prev => 
        prev.map(cliente => 
          cliente.id === id ? { ...cliente, ...data } : cliente
        )
      );
      
      return data;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      setError('Error al actualizar el cliente');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Eliminar un cliente
  const deleteCliente = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error al eliminar cliente:', error);
        setError('Error al eliminar el cliente');
        return false;
      }
      
      // Actualizar estado local
      setClientes(prev => prev.filter(cliente => cliente.id !== id));
      
      return true;
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      setError('Error al eliminar el cliente');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Efecto para cargar los clientes al montar el componente
  useEffect(() => {
    getClientes();
  }, []);
  
  return {
    clientes,
    loading,
    error,
    getClientes,
    addCliente,
    updateCliente,
    deleteCliente,
    setClientes
  };
}

// Hook para manejar operaciones de trabajadores
export function useTrabajadores() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener trabajadores
  const getTrabajadores = async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('trabajadores')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`nombre.ilike.%${searchQuery}%,apellido.ilike.%${searchQuery}%,cedula.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTrabajadores(data || []);
    } catch (err) {
      console.error('Error al obtener trabajadores:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener trabajadores');
    } finally {
      setLoading(false);
    }
  };

  // Agregar trabajador
  const addTrabajador = async (trabajador: Omit<Trabajador, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      // Validar campos requeridos según el esquema
      if (!trabajador.nombre || !trabajador.apellido || !trabajador.cedula || 
          !trabajador.fecha_contratacion || !trabajador.correo || 
          !trabajador.tipo || !trabajador.area || !trabajador.tipo_contrato) {
        throw new Error('Faltan campos requeridos');
      }

      // Validar el tipo y área según los valores permitidos
      if (!['produccion', 'administrativo', 'diseno'].includes(trabajador.tipo)) {
        throw new Error('Tipo de trabajador no válido');
      }

      if (!['corte', 'aparado', 'montaje', 'suela', 'acabado', 'ventas', 'administracion', 'diseno']
          .includes(trabajador.area)) {
        throw new Error('Área no válida');
      }

      if (!['completo', 'parcial', 'temporal', 'practica'].includes(trabajador.tipo_contrato)) {
        throw new Error('Tipo de contrato no válido');
      }

      // Validar salario y horas de trabajo
      if (trabajador.salario !== undefined && trabajador.salario < 0) {
        throw new Error('El salario no puede ser negativo');
      }

      if (trabajador.horas_trabajo !== undefined && 
          (trabajador.horas_trabajo < 0 || trabajador.horas_trabajo > 168)) {
        throw new Error('Las horas de trabajo deben estar entre 0 y 168');
      }

      const { data, error } = await supabase
        .from('trabajadores')
        .insert([{
          ...trabajador,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setTrabajadores(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error al agregar trabajador:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar trabajador');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar trabajador
  const updateTrabajador = async (id: string, changes: Partial<Trabajador>) => {
    try {
      setLoading(true);
      setError(null);

      // Validaciones similares a addTrabajador para los campos que se están actualizando
      if (changes.tipo && !['produccion', 'administrativo', 'diseno'].includes(changes.tipo)) {
        throw new Error('Tipo de trabajador no válido');
      }

      if (changes.area && !['corte', 'aparado', 'montaje', 'suela', 'acabado', 'ventas', 'administracion', 'diseno']
          .includes(changes.area)) {
        throw new Error('Área no válida');
      }

      if (changes.tipo_contrato && !['completo', 'parcial', 'temporal', 'practica']
          .includes(changes.tipo_contrato)) {
        throw new Error('Tipo de contrato no válido');
      }

      if (changes.salario !== undefined && changes.salario < 0) {
        throw new Error('El salario no puede ser negativo');
      }

      if (changes.horas_trabajo !== undefined && 
          (changes.horas_trabajo < 0 || changes.horas_trabajo > 168)) {
        throw new Error('Las horas de trabajo deben estar entre 0 y 168');
      }

      const { data, error } = await supabase
        .from('trabajadores')
        .update({
          ...changes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTrabajadores(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      console.error('Error al actualizar trabajador:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar trabajador');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar trabajador
  const deleteTrabajador = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrabajadores(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error al eliminar trabajador:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar trabajador');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cargar trabajadores al montar el componente
  useEffect(() => {
    getTrabajadores();
  }, []);

  return {
    trabajadores,
    loading,
    error,
    getTrabajadores,
    addTrabajador,
    updateTrabajador,
    deleteTrabajador
  };
}

// Hook para obtener las tareas completadas de un trabajador específico
export function useTareasTrabajador() {
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareasAgrupadas, setTareasAgrupadas] = useState<{
    diarias: any[];
    semanales: any[];
    mensuales: any[];
  }>({
    diarias: [],
    semanales: [],
    mensuales: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener tareas completadas para un trabajador específico
  const getTareasTrabajador = useCallback(async (trabajadorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Obteniendo tareas para trabajador ID:', trabajadorId);
      
      // Convertir el trabajadorId a número, ya que la base de datos espera un entero
      const trabajadorIdNumerico = parseInt(trabajadorId, 10);
      
      if (isNaN(trabajadorIdNumerico)) {
        throw new Error('ID de trabajador inválido');
      }

      // Obtener la fecha actual
      const hoy = new Date();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo de la semana actual
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      // Formatear fechas para la consulta
      const formatoFecha = (fecha: Date) => fecha.toISOString().split('T')[0];
      const fechaHoy = formatoFecha(hoy);
      const fechaInicioSemana = formatoFecha(inicioSemana);
      const fechaInicioMes = formatoFecha(inicioMes);

      console.log('Consultando tareas completadas con estado=Completado');
      
      // Obtener todas las tareas completadas del trabajador
      const { data, error } = await supabase
        .from('tareas_produccion')
        .select(`
          id, 
          venta_id, 
          numero_producto, 
          producto_id, 
          paso_id, 
          nombre_paso, 
          descripcion, 
          duracion_estimada, 
          rol_requerido, 
          estado, 
          fecha_asignacion, 
          fecha_inicio, 
          fecha_fin, 
          timer,
          productos_table:producto_id(nombre)
        `)
        .eq('trabajador_id', trabajadorIdNumerico)
        .eq('estado', 'Completado')
        .order('fecha_fin', { ascending: false });

      if (error) {
        console.error('Error en la consulta Supabase:', error);
        throw error;
      }

      console.log(`Se encontraron ${data?.length || 0} tareas completadas`);
      
      const allTareas = data || [];
      setTareas(allTareas);

      // Filtrar tareas por día, semana y mes
      const tareasHoy = allTareas.filter(tarea => 
        tarea.fecha_fin && tarea.fecha_fin.startsWith(fechaHoy)
      );
      
      const tareasSemana = allTareas.filter(tarea => 
        tarea.fecha_fin && tarea.fecha_fin >= fechaInicioSemana
      );
      
      const tareasMes = allTareas.filter(tarea => 
        tarea.fecha_fin && tarea.fecha_fin >= fechaInicioMes
      );

      console.log(`Tareas agrupadas - Hoy: ${tareasHoy.length}, Semana: ${tareasSemana.length}, Mes: ${tareasMes.length}`);
      
      setTareasAgrupadas({
        diarias: tareasHoy,
        semanales: tareasSemana,
        mensuales: tareasMes
      });

    } catch (err) {
      console.error('Error al obtener tareas del trabajador:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener tareas');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tareas,
    tareasAgrupadas,
    loading,
    error,
    getTareasTrabajador
  };
} 