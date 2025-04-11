from phi.agent import Agent, RunResponse
from phi.model.ollama import Ollama
#sk-836e4f1623514c2298ada6bbd6bc562f

from phi.model.deepseek import DeepSeekChat

#agent = Agent(model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"), markdown=True)

# Agente para formatear y validar datos
formatting_agent = Agent(
    name="Formatting Agent",
    role="Data Formatter",
    model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
    instructions=[
        "You are a data formatting specialist.",
        "Format and validate extracted tool information to ensure it's ready for the inventory form.",
        "Ensure dates are in correct format (YYYY-MM-DD).",
        "Ensure the 'estado' field has a valid value (Nuevo, Excelente, Bueno, Regular, Necesita reparación, Fuera de servicio).",
        "Provide default values for missing but important fields.",
        "Ensure 'nombre' is always filled - infer it from the description if needed.",
        "Output must be a valid JSON object with these exact fields in camelCase format: nombre, modelo, numeroSerie, estado, fechaAdquisicion, ultimoMantenimiento, proximoMantenimiento, ubicacion, responsable, descripcion."
    ],
    structured_outputs=True
)



# Agente de extracción para el equipo
extraction_agent = Agent(
    name="Extraction Agent",
    role="Extract tool information from text",
    model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
    instructions=[
        "You are a specialized information extraction agent.",
        "Extract relevant information about tools from the given text.",
        "Your goal is to identify key information that would be useful for filling out a tool inventory form.",
        "The fields to extract are: nombre, modelo, numeroSerie, estado, fechaAdquisicion, ultimoMantenimiento, proximoMantenimiento, ubicacion, responsable, descripcion.",
        "Output must be a valid JSON object with all these fields included, even if some are empty.",
        "Use camelCase for compound field names like 'numeroSerie' and 'fechaAdquisicion'."
    ],
    structured_outputs=True
)

# Equipo de agentes para el proceso completo
herramienta_form_team = Agent(
    team=[extraction_agent, formatting_agent],
    model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
    instructions=[
        "This team works together to extract and structure information about tools from text.",
        "OCR Processing Agent: Handles the initial text analysis and coordination.",
        "Extraction Agent: Identifies key information from the text.",
        "Formatting Agent: Ensures data is properly formatted for the inventory form.",
        "The final output MUST be a valid JSON object with these exact fields in camelCase format: nombre, modelo, numeroSerie, estado, fechaAdquisicion, ultimoMantenimiento, proximoMantenimiento, ubicacion, responsable, descripcion."
    ],
    structured_outputs=True
)

# Ejemplo de uso
def extraer_datos_herramienta(texto):
    print("Procesando texto para extraer información de herramientas...")
    
    # Prompt principal
    prompt = f"""
    Analiza el siguiente texto y extrae toda la información relevante para un formulario de inventario de herramientas:
    
    ```
    {texto}
    ```
    
    Tu objetivo es identificar y extraer información para los siguientes campos:
    - nombre: Nombre de la herramienta
    - modelo: Modelo o referencia
    - numeroSerie: Número de serie o identificador único
    - estado: Estado actual (Nuevo, Excelente, Bueno, Regular, Necesita reparación, Fuera de servicio)
    - fechaAdquisicion: Fecha de compra (YYYY-MM-DD)
    - ultimoMantenimiento: Último mantenimiento (YYYY-MM-DD)
    - proximoMantenimiento: Próximo mantenimiento (YYYY-MM-DD)
    - ubicacion: Ubicación física
    - responsable: Persona responsable
    - descripcion: Descripción detallada
    
    IMPORTANTE: 
    1. Devuelve ÚNICAMENTE un objeto JSON válido con estos campos exactos.
    2. Usa el formato camelCase para los nombres compuestos (numeroSerie, fechaAdquisicion, etc.)
    3. Si no encuentras alguna información específica, incluye el campo con valor vacío.
    4. No incluyas ningún texto adicional antes o después del JSON.
    
    Ejemplo de formato de respuesta esperada:
    ```json
    {{
      "nombre": "TIRSO - Zapatos de seguridad",
      "modelo": "No especificado",
      "numeroSerie": "12345",
      "estado": "Nuevo",
      "fechaAdquisicion": "2023-09-15",
      "ultimoMantenimiento": "2023-10-20",
      "proximoMantenimiento": "2024-01-20",
      "ubicacion": "Almacén principal",
      "responsable": "Juan Pérez",
      "descripcion": "Zapatos de seguridad con punta de acero y suela antideslizante."
    }}
    ```
    """
    
    # Ejecutar el equipo de agentes
    resultado = herramienta_form_team.run(prompt)
    
    # El contenido podría ser una cadena JSON o un diccionario
    content = resultado.content
   
    # Devolver el contenido original si no se pudo convertir
    return content


#datos = extraer_datos_herramienta("""""")
#print(datos)

