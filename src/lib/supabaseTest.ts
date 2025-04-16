import { supabase } from './supabase';

/**
 * Función para probar la conexión a Supabase.
 * Intenta obtener la sesión actual para verificar la conexión básica.
 */
export async function testSupabaseConnection() {
  console.log('Probando conexión básica a Supabase...');
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error en conexión a Supabase:', error);
      return {
        success: false,
        message: error.message,
        error
      };
    }
    
    console.log('Conexión básica exitosa a Supabase:', data);
    return {
      success: true,
      message: 'Conexión exitosa',
      data
    };
  } catch (err: any) {
    console.error('Excepción en conexión a Supabase:', err);
    return {
      success: false,
      message: err.message,
      error: err
    };
  }
}

/**
 * Función para probar el acceso a la tabla de trabajadores.
 * Intenta contar los registros en la tabla.
 */
export async function testTrabajadoresTable() {
  console.log('Probando acceso a tabla "trabajadores"...');
  try {
    const { count, error } = await supabase
      .from('trabajadores')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error accediendo a tabla "trabajadores":', error);
      return {
        success: false,
        message: error.message,
        error
      };
    }
    
    console.log('Acceso exitoso a tabla "trabajadores". Registros:', count);
    return {
      success: true,
      message: `Acceso exitoso. ${count} registros encontrados.`,
      count
    };
  } catch (err: any) {
    console.error('Excepción accediendo a tabla "trabajadores":', err);
    return {
      success: false,
      message: err.message,
      error: err
    };
  }
}

/**
 * Función para obtener los primeros registros de la tabla trabajadores.
 * Útil para verificar que se pueden obtener datos.
 */
export async function getSampleTrabajadores(limit = 3) {
  console.log(`Obteniendo ${limit} registros de muestra...`);
  try {
    const { data, error } = await supabase
      .from('trabajadores')
      .select('*')
      .limit(limit);
    
    if (error) {
      console.error('Error obteniendo registros de muestra:', error);
      return {
        success: false,
        message: error.message,
        error
      };
    }
    
    console.log(`Obtenidos ${data?.length || 0} registros de muestra:`, data);
    return {
      success: true,
      message: `${data?.length || 0} registros obtenidos.`,
      data
    };
  } catch (err: any) {
    console.error('Excepción obteniendo registros de muestra:', err);
    return {
      success: false,
      message: err.message,
      error: err
    };
  }
}

/**
 * Función para ejecutar todas las pruebas en secuencia.
 * Útil para un diagnóstico completo.
 */
export async function runAllTests() {
  console.log('Iniciando todas las pruebas de Supabase...');
  
  const results = {
    connection: await testSupabaseConnection(),
    tableAccess: await testTrabajadoresTable(),
    sampleData: await getSampleTrabajadores(2)
  };
  
  console.log('Resultados de todas las pruebas:', results);
  return results;
}

// Ejecutar las pruebas automáticamente cuando se carga el módulo
// Comentar esta línea si no se desea la ejecución automática
runAllTests().then(results => {
  if (results.connection.success && 
      results.tableAccess.success && 
      results.sampleData.success) {
    console.log('✅ Todas las pruebas exitosas. Supabase está configurado correctamente.');
  } else {
    console.error('❌ Al menos una prueba falló. Revisa la configuración de Supabase.');
  }
}); 