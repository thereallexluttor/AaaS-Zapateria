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
        "Format and validate extracted material information to ensure it's ready for the inventory form.",
        "Ensure all numeric fields (precio, stock, stockMinimo) are properly formatted.",
        "Ensure unidades is a valid unit type (metros, kg, litros, etc.).",
        "Provide default values for missing but important fields.",
        "Ensure 'nombre' is always filled - infer it from the description if needed.",
        "Output must be a valid JSON object with these exact fields in camelCase format: nombre, referencia, unidades, stock, stockMinimo, precio, categoria, proveedor, descripcion, fechaAdquisicion, ubicacion."
    ],
    structured_outputs=True
)

# Agente de extracción para materiales
extraction_agent = Agent(
    name="Extraction Agent",
    role="Extract material information from text",
    model=DeepSeekChat(api_key=DEEPSEEK_API_KEY),
    instructions=[
        "You are a specialized information extraction agent.",
        "Extract relevant information about footwear materials from the given text.",
        "Your goal is to identify key information that would be useful for filling out a material inventory form.",
        "The fields to extract are: nombre, referencia, unidades, stock, stockMinimo, precio, categoria, proveedor, descripcion, fechaAdquisicion, ubicacion.",
        "Output must be a valid JSON object with all these fields included, even if some are empty.",
        "Use camelCase for compound field names like 'stockMinimo' and 'fechaAdquisicion'."
    ],
    structured_outputs=True
)

# Equipo de agentes para el proceso completo
material_form_team = Agent(
    team=[extraction_agent, formatting_agent],
    model=DeepSeekChat(api_key=DEEPSEEK_API_KEY),
    instructions=[
        "This team works together to extract and structure information about footwear materials from text.",
        "OCR Processing Agent: Handles the initial text analysis and coordination.",
        "Extraction Agent: Identifies key information from the text.",
        "Formatting Agent: Ensures data is properly formatted for the inventory form.",
        "The final output MUST be a valid JSON object with these exact fields in camelCase format: nombre, referencia, unidades, stock, stockMinimo, precio, categoria, proveedor, descripcion, fechaAdquisicion, ubicacion."
    ],
    structured_outputs=True
)

# Método de respaldo para cuando falla el servicio de IA
def fallback_extraction(texto):
    """Método simple de extracción como respaldo en caso de fallo de los agentes de IA"""
    # Crear un resultado predeterminado con campos vacíos
    default_result = {
        "nombre": "Material sin identificar",
        "referencia": "",
        "unidades": "",
        "stock": "0",
        "stockMinimo": "0",
        "precio": "0",
        "categoria": "",
        "proveedor": "",
        "descripcion": texto[:200] if texto else "Sin descripción",
        "fechaAdquisicion": "",
        "ubicacion": ""
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

# Función principal de extracción de datos de materiales
def extraer_datos_material(texto):
    print("Procesando texto para extraer información de materiales...")
    
    if not texto or len(texto.strip()) == 0:
        print("ADVERTENCIA: Texto vacío recibido para análisis")
        return fallback_extraction(texto)
    
    # Prompt principal
    prompt = f"""
    Analiza el siguiente texto y extrae toda la información relevante para un formulario de inventario de materiales para fabricación de calzado:
    
    ```
    {texto}
    ```
    
    Tu objetivo es identificar y extraer información para los siguientes campos:
    - nombre: Nombre del material
    - referencia: Referencia o código interno
    - unidades: Unidad de medida (metros, kg, litros, unidades, etc.)
    - stock: Cantidad disponible (solo números)
    - stockMinimo: Cantidad mínima para alerta (solo números)
    - precio: Precio por unidad (solo números)
    - categoria: Tipo de material (Cuero, Textil, Hilo, Adhesivo, Suela, Hebilla, Ornamento, Plantilla, Otros)
    - proveedor: Nombre del proveedor
    - descripcion: Descripción detallada del material
    - fechaAdquisicion: Fecha de compra (YYYY-MM-DD)
    - ubicacion: Ubicación física en almacén
    
    IMPORTANTE: 
    1. Devuelve ÚNICAMENTE un objeto JSON válido con estos campos exactos.
    2. Usa el formato camelCase para los nombres compuestos (stockMinimo, fechaAdquisicion).
    3. Si no encuentras alguna información específica, incluye el campo con valor vacío o 0.
    4. No incluyas ningún texto adicional antes o después del JSON.
    
    Ejemplo de formato de respuesta esperada:
    ```json
    {{
      "nombre": "Cuero Vacuno Premium",
      "referencia": "CV-2023-456",
      "unidades": "metros cuadrados",
      "stock": "120",
      "stockMinimo": "30",
      "precio": "45.50",
      "categoria": "Cuero",
      "proveedor": "Curtidos Superiores S.A.",
      "descripcion": "Cuero vacuno de alta calidad, curtido al vegetal. Ideal para la fabricación de calzado de gama alta.",
      "fechaAdquisicion": "2023-10-15",
      "ubicacion": "Almacén A, Estante 3"
    }}
    ```
    """
    
    # Intentar con el equipo de agentes
    try:
        # Establecer un tiempo límite para el procesamiento del modelo
        start_time = time.time()
        timeout = 30  # segundos
        
        resultado = material_form_team.run(prompt)
        
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
            "nombre", "referencia", "unidades", "stock", "stockMinimo", 
            "precio", "categoria", "proveedor", "descripcion", 
            "fechaAdquisicion", "ubicacion"
        ]
        
        for field in expected_fields:
            if field not in content:
                content[field] = ""
        
        # Asegurarse de que el nombre no esté vacío
        if not content["nombre"] or content["nombre"].strip() == "":
            content["nombre"] = "Material sin identificar"
        
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
                    instructions=["Extract material information from text and format as JSON."]
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