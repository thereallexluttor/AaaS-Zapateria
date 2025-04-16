from phi.agent import Agent, RunResponse
from phi.model.ollama import Ollama
from phi.model.deepseek import DeepSeekChat
import json
import time
import os

# Intenta importar una configuración local para las claves API
try:
    from .config import API_KEYS
    DEEPSEEK_API_KEY = API_KEYS.get('DEEPSEEK_API_KEY', "")
except ImportError:
    # Usa la clave de entorno o una predeterminada si no está disponible la configuración
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', "sk-836e4f1623514c2298ada6bbd6bc562f")

# Modelo de respaldo por si falla DeepSeek
try:
    local_llm = Ollama(model="llama3")
except Exception as e:
    print(f"No se pudo cargar Ollama como respaldo: {str(e)}")
    local_llm = None

# Agente para formatear y validar datos
formatting_agent = Agent(
    name="Formatting Agent",
    role="Data Formatter",
    model=DeepSeekChat(api_key=DEEPSEEK_API_KEY),
    instructions=[
        "You are a data formatting specialist.",
        "Format and validate extracted product information to ensure it's ready for the inventory form.",
        "Ensure all numeric fields (price, stock, stockMinimo) are properly formatted.",
        "Ensure tallas and colores are in a readable, comma-separated format.",
        "Provide default values for missing but important fields.",
        "Ensure 'nombre' is always filled - infer it from the description if needed.",
        "Output must be a valid JSON object with these exact fields in camelCase format: nombre, precio, stock, stockMinimo, categoria, descripcion, tallas, colores, tiempoFabricacion, destacado."
    ],
    structured_outputs=True
)

# Agente de extracción para productos
extraction_agent = Agent(
    name="Extraction Agent",
    role="Extract product information from text",
    model=DeepSeekChat(api_key=DEEPSEEK_API_KEY),
    instructions=[
        "You are a specialized information extraction agent.",
        "Extract relevant information about footwear products from the given text.",
        "Your goal is to identify key information that would be useful for filling out a product inventory form.",
        "The fields to extract are: nombre, precio, stock, stockMinimo, categoria, descripcion, tallas, colores, tiempoFabricacion, destacado.",
        "Output must be a valid JSON object with all these fields included, even if some are empty.",
        "Use camelCase for compound field names like 'stockMinimo' and 'tiempoFabricacion'."
    ],
    structured_outputs=True
)

# Equipo de agentes para el proceso completo
producto_form_team = Agent(
    team=[extraction_agent, formatting_agent],
    model=DeepSeekChat(api_key=DEEPSEEK_API_KEY),
    instructions=[
        "This team works together to extract and structure information about footwear products from text.",
        "OCR Processing Agent: Handles the initial text analysis and coordination.",
        "Extraction Agent: Identifies key information from the text.",
        "Formatting Agent: Ensures data is properly formatted for the inventory form.",
        "The final output MUST be a valid JSON object with these exact fields in camelCase format: nombre, precio, stock, stockMinimo, categoria, descripcion, tallas, colores, tiempoFabricacion, destacado."
    ],
    structured_outputs=True
)

# Método de respaldo para cuando falla el servicio de IA
def fallback_extraction(texto):
    """Método simple de extracción como respaldo en caso de fallo de los agentes de IA"""
    # Crear un resultado predeterminado con campos vacíos
    default_result = {
        "nombre": "Producto sin identificar",
        "precio": "0",
        "stock": "0",
        "stockMinimo": "0",
        "categoria": "",
        "descripcion": texto[:200] if texto else "Sin descripción",
        "tallas": "",
        "colores": "",
        "tiempoFabricacion": "",
        "destacado": False
    }
    
    # Intentar extraer al menos el nombre si es posible
    if texto:
        lines = texto.split('\n')
        for line in lines:
            line = line.strip()
            if len(line) > 3 and len(line) < 50:  # Posible nombre
                default_result["nombre"] = line
                break
    
    return default_result

# Función principal de extracción de datos de productos
def extraer_datos_producto(texto):
    print("Procesando texto para extraer información de productos...")
    
    if not texto or len(texto.strip()) == 0:
        print("ADVERTENCIA: Texto vacío recibido para análisis")
        return fallback_extraction(texto)
    
    # Prompt principal
    prompt = f"""
    Analiza el siguiente texto y extrae toda la información relevante para un formulario de inventario de productos de calzado:
    
    ```
    {texto}
    ```
    
    Tu objetivo es identificar y extraer información para los siguientes campos:
    - nombre: Nombre del producto
    - precio: Precio de venta (solo números)
    - stock: Cantidad disponible (solo números)
    - stockMinimo: Cantidad mínima para alerta (solo números)
    - categoria: Tipo de calzado (Zapatos de hombre, Zapatos de mujer, Zapatos infantiles, Botas, Sandalias, Calzado deportivo, Calzado formal, Calzado de trabajo, Accesorios)
    - descripcion: Descripción detallada del producto
    - tallas: Tallas disponibles (formato: 36, 37, 38...)
    - colores: Colores disponibles (formato: Negro, Marrón, Azul...)
    - tiempoFabricacion: Tiempo estimado de fabricación (formato: 3-5 días)
    - destacado: Si es un producto destacado (true/false)
    
    IMPORTANTE: 
    1. Devuelve ÚNICAMENTE un objeto JSON válido con estos campos exactos.
    2. Usa el formato camelCase para los nombres compuestos (stockMinimo, tiempoFabricacion).
    3. Si no encuentras alguna información específica, incluye el campo con valor vacío o 0.
    4. Si no hay información sobre 'destacado', establece un valor predeterminado de false.
    5. No incluyas ningún texto adicional antes o después del JSON.
    
    Ejemplo de formato de respuesta esperada:
    ```json
    {{
      "nombre": "Zapatos Oxford Clásicos",
      "precio": "120.00",
      "stock": "25",
      "stockMinimo": "8",
      "categoria": "Calzado formal",
      "descripcion": "Zapatos Oxford de cuero genuino con acabado brillante. Diseño clásico y elegante.",
      "tallas": "39, 40, 41, 42, 43, 44",
      "colores": "Negro, Marrón oscuro",
      "tiempoFabricacion": "10-14 días",
      "destacado": true
    }}
    ```
    """
    
    # Intentar con el equipo de agentes
    try:
        # Establecer un tiempo límite para el procesamiento del modelo
        start_time = time.time()
        timeout = 30  # segundos
        
        resultado = producto_form_team.run(prompt)
        
        # Verificar el contenido y formato del resultado
        content = resultado.content
        
        # Si es un string, intentar convertirlo a diccionario
        if isinstance(content, str):
            try:
                # Limpiar cualquier texto adicional fuera del JSON
                json_start = content.find('{')
                json_end = content.rfind('}')
                
                if json_start >= 0 and json_end > json_start:
                    json_content = content[json_start:json_end+1]
                    content = json.loads(json_content)
                    print("Convertido string a diccionario JSON")
                else:
                    # Si no se encuentra JSON válido, usar el fallback
                    print("No se encontró contenido JSON válido en la respuesta")
                    return fallback_extraction(texto)
            except json.JSONDecodeError:
                print("Error al decodificar JSON de la respuesta")
                return fallback_extraction(texto)
        
        # Verificar que el contenido tenga el formato esperado
        if not isinstance(content, dict):
            print(f"Formato de respuesta no válido: {type(content)}")
            return fallback_extraction(texto)
        
        # Asegurarse de que todos los campos requeridos estén presentes
        expected_fields = [
            "nombre", "precio", "stock", "stockMinimo", 
            "categoria", "descripcion", "tallas", "colores", 
            "tiempoFabricacion", "destacado"
        ]
        
        for field in expected_fields:
            if field not in content:
                if field == "destacado":
                    content[field] = False
                else:
                    content[field] = ""
        
        # Asegurarse de que el nombre no esté vacío
        if not content["nombre"] or content["nombre"].strip() == "":
            content["nombre"] = "Producto sin identificar"
        
        return content
    
    except Exception as e:
        print(f"Error en el procesamiento con agentes de IA: {str(e)}")
        
        # Intentar con el modelo de respaldo si está disponible
        if local_llm:
            try:
                print("Intentando extraer datos con modelo local de respaldo...")
                fallback_agent = Agent(
                    name="Fallback Extraction Agent",
                    model=local_llm,
                    instructions=["Extract product information from text and format as JSON."]
                )
                resultado = fallback_agent.run(prompt)
                content = resultado.content
                
                # Mismo proceso de validación que arriba
                if isinstance(content, str):
                    try:
                        json_start = content.find('{')
                        json_end = content.rfind('}')
                        
                        if json_start >= 0 and json_end > json_start:
                            json_content = content[json_start:json_end+1]
                            content = json.loads(json_content)
                            print("Respaldo: Convertido string a diccionario JSON")
                            return content
                    except:
                        pass
            except Exception as e2:
                print(f"Error con el modelo de respaldo: {str(e2)}")
        
        # Si todo falla, usar el método de extracción de respaldo
        return fallback_extraction(texto) 