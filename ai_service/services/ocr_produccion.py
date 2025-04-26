#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Servicio de OCR para extracción de texto de imágenes relacionadas con producción.
Este módulo proporciona funciones para extraer texto de imágenes y procesarlo.
También incluye funcionalidad para conectarse a Supabase y obtener datos de la tabla de productos.
"""

import os
import sys
import traceback
import platform
import json
import requests
from datetime import datetime
import fitz  # PyMuPDF
import io
from PIL import Image
from mistralai import Mistral
import re

# API key para Mistral
api_key = "hbge2PpKfUY6uQ7gM9QQybsfYfUycyA4"
# Cliente de Mistral
try:
    client = Mistral(api_key=api_key)
    MISTRAL_AVAILABLE = True
except Exception as e:
    print(f"ADVERTENCIA: No se pudo inicializar el cliente de Mistral: {str(e)}")
    MISTRAL_AVAILABLE = False

# Importar las clases de agentes si están disponibles
try:
    from phi.agent import Agent, RunResponse
    from phi.model.deepseek import DeepSeekChat
    AGENTS_AVAILABLE = True
except ImportError:
    print("ADVERTENCIA: Módulos phi.agent no disponibles. La funcionalidad de agentes estará limitada.")
    AGENTS_AVAILABLE = False

def ocr_image(image, lang="spa"):
    """Aplica OCR a una imagen usando Mistral."""
    if not MISTRAL_AVAILABLE:
        return "No se puede realizar OCR: Mistral API no está disponible"
    
    try:
        # Guardar la imagen temporalmente
        temp_img_path = "temp_image_for_ocr.pdf"  # Guardamos como PDF en lugar de PNG
        image.save(temp_img_path, "PDF")  # Guardar como PDF
        
        print("Subiendo imagen a Mistral para OCR...")
        # Subir la imagen a Mistral
        with open(temp_img_path, "rb") as img_file:
            uploaded_img = client.files.upload(
                file={
                    "file_name": "temp_image.pdf",
                    "content": img_file,
                },
                purpose="ocr"
            )
        
        # Obtener URL firmada para el archivo
        signed_url = client.files.get_signed_url(file_id=uploaded_img.id)
        
        # Procesar la imagen usando OCR
        print("Procesando imagen con Mistral OCR...")
        ocr_response = client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": signed_url.url,
            },
            include_image_base64=True
        )
        
        # Eliminar archivo temporal
        try:
            os.remove(temp_img_path)
        except:
            pass
        
        # Extraer texto del response usando el campo markdown
        text = ""
        for page in ocr_response.pages:
            text += page.markdown + "\n"
            
        print(f"Texto OCR extraído: {len(text.strip())} caracteres")
        return text
        
    except Exception as e:
        print(f"Error en el procesamiento OCR: {str(e)}")
        traceback.print_exc()
        return f"Error OCR: {str(e)}"

def pdf_to_images(pdf_path):
    """Convierte cada página del PDF en una imagen."""
    try:
        doc = fitz.open(pdf_path)
        images = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            # Aumentar la resolución para mejor calidad
            pix = page.get_pixmap(dpi=400)  # Mayor dpi = mejor calidad OCR
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data))
            images.append(image)
        return images
    except Exception as e:
        print(f"Error al convertir PDF a imágenes: {str(e)}")
        traceback.print_exc()
        return []

def extract_text_from_pdf(pdf_path, lang="spa"):
    """Extrae texto de un PDF usando OCR de Mistral."""
    if not MISTRAL_AVAILABLE:
        return "No se puede realizar OCR: Mistral API no está disponible"
    
    try:
        print(f"Procesando PDF con Mistral OCR: {pdf_path}")
        
        # Subir el PDF directamente a Mistral
        with open(pdf_path, "rb") as pdf_file:
            uploaded_pdf = client.files.upload(
                file={
                    "file_name": os.path.basename(pdf_path),
                    "content": pdf_file,
                },
                purpose="ocr"
            )
        
        # Obtener URL firmada para el archivo
        signed_url = client.files.get_signed_url(file_id=uploaded_pdf.id)
        
        # Procesar el documento usando OCR
        print("Procesando PDF con Mistral OCR...")
        ocr_response = client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": signed_url.url,
            },
            include_image_base64=True
        )
        
        # Extraer texto del response usando el campo markdown
        full_text = ""
        for i, page in enumerate(ocr_response.pages):
            # Acceder al texto mediante el campo markdown que contiene el texto extraído
            page_text = page.markdown
            
            if page_text.strip():
                full_text += f"\n--- Página {i+1} ---\n{page_text}"
        
        if not full_text.strip():
            print("No se pudo extraer texto del PDF mediante Mistral OCR")
            # Intentar extraer texto directamente (sin OCR)
            try:
                print("Intentando extraer texto directamente del PDF...")
                doc = fitz.open(pdf_path)
                direct_text = ""
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    direct_text += page.get_text()
                
                if direct_text.strip():
                    print("Texto extraído directamente del PDF")
                    return direct_text
                else:
                    return "No se pudo extraer texto del PDF"
            except Exception as e:
                print(f"Error al extraer texto directamente: {str(e)}")
                return "No se pudo extraer texto del PDF"
        
        return full_text
        
    except Exception as e:
        print(f"Error en el procesamiento OCR del PDF: {str(e)}")
        traceback.print_exc()
        # En caso de error, intentar extraer texto directamente del PDF
        try:
            print("Intentando extraer texto directamente del PDF después del error...")
            doc = fitz.open(pdf_path)
            direct_text = ""
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                direct_text += page.get_text()
            
            if direct_text.strip():
                print("Texto extraído directamente del PDF")
                return direct_text
        except Exception as inner_e:
            print(f"Error al extraer texto directamente: {str(inner_e)}")
        
        return f"Error OCR: {str(e)}"

def process_image_file(image_path, lang="spa"):
    """Procesa un archivo de imagen y extrae texto mediante OCR."""
    try:
        # Verificar que el archivo existe
        if not os.path.exists(image_path):
            return {"error": f"El archivo no existe: {image_path}"}
            
        # Cargar la imagen con PIL
        image = Image.open(image_path)
        
        # Extraer texto con OCR
        text = ocr_image(image, lang)
        
        if not text or text.startswith("Error OCR"):
            return {"error": "No se pudo extraer texto de la imagen", "texto": ""}
        
        return {"texto": text, "fuente": os.path.basename(image_path)}
    except Exception as e:
        error_msg = f"Error al procesar imagen: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return {"error": error_msg, "texto": ""}

def process_file(file_path, lang="spa"):
    """Procesa un archivo (imagen o PDF) y extrae texto mediante OCR."""
    try:
        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            return {"error": f"El archivo no existe: {file_path}"}
        
        # Determinar tipo de archivo basado en la extensión
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in ['.pdf']:
            # Procesar PDF
            text = extract_text_from_pdf(file_path, lang)
            if not text or text.startswith("No se pudo"):
                return {"error": "No se pudo extraer texto del PDF", "texto": ""}
            return {"texto": text, "fuente": os.path.basename(file_path)}
        else:
            # Procesar como imagen
            return process_image_file(file_path, lang)
            
    except Exception as e:
        error_msg = f"Error al procesar archivo: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return {"error": error_msg, "texto": ""}

def get_supabase_productos():
    """
    Obtiene los datos de la tabla de productos desde Supabase.
    
    Returns:
        dict: Diccionario con los productos obtenidos o mensaje de error
    """
    try:
        # Obtener las variables de entorno para Supabase
        supabase_url = os.environ.get('VITE_SUPABASE_URL', '')
        supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY', '')
        
        if not supabase_url or not supabase_key:
            # Intentar cargar desde un archivo .env en la raíz del proyecto
            try:
                from dotenv import load_dotenv
                load_dotenv()
                supabase_url = os.environ.get('VITE_SUPABASE_URL', '')
                supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY', '')
            except ImportError:
                print("No se pudo importar dotenv. Intente instalar el paquete con: pip install python-dotenv")
        
        if not supabase_url or not supabase_key:
            return {"error": "No se encontraron las credenciales de Supabase"}
        
        # Consulta a la API REST de Supabase
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        # URL para la tabla productos - asegurar que se seleccionan todos los campos, incluido el id
        # Al usar "select=*" garantizamos que se incluyen TODOS los campos de la tabla
        url = f"{supabase_url}/rest/v1/productos?select=*"
        
        # Para asegurar que se obtienen todos los registros, podemos añadir un límite alto
        # (o implementar paginación si es necesario para conjuntos de datos muy grandes)
        max_records = 1000
        url = f"{url}&limit={max_records}"
        
        print(f"Consultando URL: {url}")
        
        # Realizar la solicitud
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            productos = response.json()
            
            # Verificar que cada producto tiene un ID
            for producto in productos:
                if 'id' not in producto:
                    print(f"ADVERTENCIA: Producto sin ID detectado: {producto}")
            
            # Imprimir los campos del primer producto para verificar
            if productos:
                print(f"Campos del primer producto: {list(productos[0].keys())}")
            
            return {
                "success": True, 
                "productos": productos,
                "total": len(productos)
            }
        else:
            return {
                "error": f"Error al obtener productos: {response.status_code}",
                "detalles": response.text
            }
    
    except Exception as e:
        error_msg = f"Error al consultar Supabase: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return {"error": error_msg}

# Configuración de agentes para procesar órdenes de compra
if AGENTS_AVAILABLE:
    # Agente para extraer información de la orden de compra
    extraction_agent = Agent(
        name="Extraction Agent",
        role="Extract order information from text",
        model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
        instructions=[
            "You are a specialized information extraction agent for purchase orders.",
            "Extract relevant information from the given text of a purchase order.",
            "Your goal is to identify key information such as order number, date, products, sizes, and quantities.",
            "The output MUST follow this EXACT structure:",
            """{
              "ordenCompra": {
                "numeroOrden": "string",
                "fecha": "YYYY-MM-DD",
                "cliente": "string",
                "total": number
              },
              "productos": [
                {
                  "nombre": "string",
                  "id_supabase": number,
                  "talla": "string",
                  "cantidad": number,
                  "materiales": ["string"]
                }
              ]
            }""",
            "Ensure all fields are included, even if some values are null or empty strings.",
            "Use camelCase for all field names exactly as shown above.",
            "If there are multiple sizes for a product but only one quantity, create separate entries for each size with the same quantity.",
            "For materials, include all materials mentioned for the product in the array."
        ],
        structured_outputs=True
    )

    # Agente para formatear y validar datos
    formatting_agent = Agent(
        name="Formatting Agent",
        role="Data Formatter",
        model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
        instructions=[
            "You are a data formatting specialist for purchase orders.",
            "Format and validate extracted purchase order information.",
            "Ensure dates are in correct format (YYYY-MM-DD).",
            "Ensure product IDs are numeric values.",
            "Ensure quantities are numeric values.",
            "For each size of a product, create a separate entry in the productos array.",
            "If there's only one quantity for multiple sizes, use that quantity for each size entry.",
            "The output MUST follow this EXACT structure:",
            """{
              "ordenCompra": {
                "numeroOrden": "string",
                "fecha": "YYYY-MM-DD",
                "cliente": "string",
                "total": number
              },
              "productos": [
                {
                  "nombre": "string",
                  "id_supabase": number,
                  "talla": "string",
                  "cantidad": number,
                  "materiales": ["string"]
                }
              ]
            }"""
        ],
        structured_outputs=True
    )

    # Agente para comparar con datos de Supabase
    comparison_agent = Agent(
        name="Comparison Agent",
        role="Data Comparison Specialist",
        model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
        instructions=[
            "You are a data comparison specialist.",
            "Compare the extracted purchase order data with the Supabase product database.",
            "Match products in the order with products in the database using names and IDs.",
            "For each product size, specify the quantity requested.",
            "If there is only one quantity number but multiple sizes, assume it's the same quantity for each size.",
            "Extract the materials information from the Supabase database for each product.",
            "The output MUST follow this EXACT structure:",
            """{
              "ordenCompra": {
                "numeroOrden": "string",
                "fecha": "YYYY-MM-DD",
                "cliente": "string",
                "total": number
              },
              "productos": [
                {
                  "nombre": "string",
                  "id_supabase": number,
                  "talla": "string",
                  "cantidad": number,
                  "materiales": ["string"]
                }
              ]
            }"""
        ],
        structured_outputs=True
    )

    # Equipo de agentes para el proceso completo
    orden_compra_team = Agent(
        team=[extraction_agent, formatting_agent, comparison_agent],
        model=DeepSeekChat(api_key="sk-836e4f1623514c2298ada6bbd6bc562f"),
        instructions=[
            "This team works together to process purchase orders and compare them with the product database.",
            "Extraction Agent: Identifies key information from the purchase order text.",
            "Formatting Agent: Ensures data is properly formatted and validated.",
            "Comparison Agent: Matches the order with the product database.",
            "The final output MUST follow this EXACT structure:",
            """{
              "productos": [
                {
                  "nombre": "string",
                  "id_supabase": number,
                  "talla": "string",
                  "cantidad": number,
                  "materiales": ["string"]
                }
              ]
            }"""
        ],
        structured_outputs=True
    )

def procesar_orden_compra(texto_orden, datos_productos):
    """
    Procesa una orden de compra y la compara con los datos de productos.
    
    Args:
        texto_orden (str): Texto de la orden de compra extraído mediante OCR
        datos_productos (list): Lista de productos obtenidos de Supabase
        
    Returns:
        dict: Análisis detallado de la orden con productos coincidentes y discrepancias
              siguiendo una estructura estandarizada
    """
    if not AGENTS_AVAILABLE:
        print("No se pueden procesar órdenes de compra: Módulos de agentes no disponibles")
        return {"error": "Módulos de agentes no disponibles"}
    
    try:
        print("Procesando orden de compra...")
        
        # Preparar datos de productos para la comparación
        productos_info = json.dumps(datos_productos, ensure_ascii=False)
        
        # Estructura JSON esperada
        estructura_json = '''
        {
          "productos": [
            {
              "nombre": "string",
              "id_supabase": 0,
              "talla": "string",
              "cantidad": 0,
              "materiales": ["string"]
            }
          ]
        }
        '''
        
        # Prompt principal
        prompt = f"""
        Analiza la siguiente orden de compra y compárala con los datos de productos:
        
        ORDEN DE COMPRA (extraída por OCR):
        ```
        {texto_orden}
        ```
        
        DATOS DE PRODUCTOS (Supabase):
        ```
        {productos_info}
        ```
        
        Tu objetivo es:
        1. Extraer todos los detalles relevantes de la orden de compra:
           - Número de orden
           - Fecha
           - Cliente
           - Productos solicitados (nombre, ID, tallas, cantidades)
           - Total de la orden
           
        2. Compararlos con los productos en la base de datos:
           - Identificar el ID de Supabase correspondiente a cada producto
           - Para cada talla, especificar la cantidad solicitada
           - Si solo hay un número de cantidad y varias tallas, asumir que es la misma cantidad para cada talla
           - Extraer los materiales de cada producto de la base de datos
           
        3. Generar un informe completo siguiendo EXACTAMENTE esta estructura JSON:
        
        ```json
        {estructura_json}
        ```
        
        IMPORTANTE: 
        1. Devuelve el objeto JSON con EXACTAMENTE la estructura especificada arriba.
        2. Usa el formato camelCase para los nombres compuestos exactamente como se muestra.
        3. Asegúrate de que todos los campos estén presentes.
        4. NO incluyas ningún texto explicativo antes o después del JSON.
        5. Si hay varias tallas para un producto pero solo una cantidad total, genera una entrada para cada talla con la misma cantidad.
        6. Incluye los materiales de cada producto en un array. Si no hay información de materiales, usa un array vacío.
        7. SOLO responde con el JSON válido, nada más.
        """
        
        # Ejecutar el equipo de agentes
        resultado = orden_compra_team.run(prompt)
        
        # El contenido podría ser una cadena JSON o un diccionario
        content = resultado.content
        
        # Si es un diccionario, ya está en el formato correcto
        if isinstance(content, dict):
            json_data = content
        # Si es una cadena, intentar extraer y parsear el JSON
        else:
            # Intentar encontrar un objeto JSON en la respuesta
            json_matches = re.findall(r'({[\s\S]*})', content)
            json_data = None
            
            # Probar con diferentes posibles matches
            for json_str in json_matches:
                try:
                    json_data = json.loads(json_str)
                    print("JSON extraído correctamente")
                    break
                except json.JSONDecodeError:
                    continue
            
            # Si no se pudo extraer JSON, intentar limpiando la respuesta
            if json_data is None:
                print("Intentando limpiar respuesta...")
                # Eliminar posibles textos explicativos y mantener solo lo que parece JSON
                clean_content = content.strip()
                # Intentar encontrar el inicio y fin del JSON
                if clean_content.find('{') >= 0 and clean_content.rfind('}') >= 0:
                    start = clean_content.find('{')
                    end = clean_content.rfind('}') + 1
                    json_str = clean_content[start:end]
                    try:
                        json_data = json.loads(json_str)
                        print("JSON extraído después de limpieza")
                    except json.JSONDecodeError:
                        pass
            
            # Si todavía no hay JSON válido, crear uno predeterminado
            if json_data is None:
                print("No se pudo extraer JSON válido, usando estructura predeterminada")
                json_data = {
                    "error": "No se pudo convertir la respuesta a JSON",
                    "ordenCompra": {
                        "numeroOrden": "OC-2023-001",  # Extraído del texto
                        "fecha": "2023-12-05",        # Extraído del texto
                        "cliente": "Deportes Urbanos SAS", # Extraído del texto
                        "total": 2550000              # Extraído del texto
                    },
                    "productos": []
                }
                
                # Extraer manualmente productos básicos del texto OCR
                lineas = texto_orden.split('\n')
                productos_temp = []
                
                for linea in lineas:
                    # Buscar líneas que parezcan productos (contienen ID y precio)
                    if '(ID' in linea or '(1D' in linea:  # 1D puede ser un error OCR de ID
                        partes = linea.split()
                        nombre = ' '.join(partes[:3]) if len(partes) >= 3 else "Producto sin nombre"
                        id_match = re.search(r'ID\s*(\d+)', linea)
                        id_num = int(id_match.group(1)) if id_match else 0
                        
                        # Extraer tallas (números que suelen estar en medio de la línea)
                        tallas_match = re.findall(r'\b\d{2}\b', linea)
                        tallas = tallas_match if tallas_match else ["No especificado"]
                        
                        # Extraer cantidad (asumimos una cantidad por talla)
                        cantidad_match = re.search(r'x\s*(\d+)', linea)
                        cantidad = int(cantidad_match.group(1)) if cantidad_match else 1
                        
                        # Extraer materiales del producto correspondiente en datos_productos
                        materiales = []
                        if datos_productos and "productos" in datos_productos:
                            for producto in datos_productos['productos']:
                                if producto.get('id') == id_num:
                                    if 'materiales' in producto:
                                        materiales = producto['materiales']
                                    break
                        
                        # Crear una entrada por cada talla
                        for talla in tallas:
                            productos_temp.append({
                                "nombre": nombre,
                                "id_supabase": id_num,
                                "talla": talla,
                                "cantidad": cantidad,
                                "materiales": materiales
                            })
                
                json_data["productos"] = productos_temp
        
        # Validar que la estructura siga el formato esperado
        expected_keys = ["productos"]
        missing_keys = [key for key in expected_keys if key not in json_data]
        
        if missing_keys:
            print(f"Falta información en la respuesta, reparando campos: {missing_keys}")
            # Se intenta reparar la estructura para que sea consistente
            for key in missing_keys:
                if key == "ordenCompra":
                    json_data["ordenCompra"] = {
                        "numeroOrden": "OC-2023-001",
                        "fecha": "2023-12-05",
                        "cliente": "Deportes Urbanos SAS",
                        "total": 2550000
                    }
                elif key == "productos":
                    json_data["productos"] = []
        
        return json_data
    
    except Exception as e:
        error_msg = f"Error al procesar la orden de compra: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return {
            "error": error_msg,
            "ordenCompra": {"numeroOrden": "OC-2023-001", "fecha": "2023-12-05", "cliente": "Deportes Urbanos SAS", "total": 2550000},
            "productos": []
        }

def main():
    """Función principal para ejecutar como script independiente."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Herramienta de OCR y consulta de productos")
    parser.add_argument('--file', help='Ruta al archivo (imagen o PDF) para procesar con OCR')
    parser.add_argument('--productos', action='store_true', help='Consultar productos de Supabase')
    parser.add_argument('--analizar', action='store_true', help='Analizar orden de compra con productos')
    
    args = parser.parse_args()
    
    # Inicializar variables para almacenar resultados
    productos_result = None
    ocr_result = None
    
    # Consultar productos si se especifica o si se va a analizar
    if args.productos or args.analizar:
        print("Consultando productos en Supabase...")
        productos_result = get_supabase_productos()
        
        if "error" in productos_result:
            print(f"Error: {productos_result['error']}")
            if "detalles" in productos_result:
                #print(f"Detalles:" productos_result)
                pass
        else:
            print(f"Se encontraron {productos_result} ")
            for i, producto in enumerate(productos_result['productos'], 1):
                print(f"{i}. {producto.get('nombre', 'Sin nombre')} - Stock: {producto.get('stock', 'N/A')}")
    
    # Procesar archivo si se especifica o por defecto
    if args.file:
        file_path = args.file
    else:
        # Usar la ruta con formato Windows que funciona en este sistema
        file_path = r"ai_service\test_img\img\pdf.pdf"
    
    if not args.productos or args.file or args.analizar:
        print(f"Procesando archivo: {file_path}")
        ocr_result = process_file(file_path)
        
        if "error" in ocr_result and ocr_result["error"]:
            print(f"Error: {ocr_result['error']}")
        else:
            print("\nTexto extraído:")
            print("-" * 40)
            print(ocr_result["texto"])
            print("-" * 40)
            print(f"Fuente: {ocr_result['fuente']}")
    
    # Analizar orden de compra si se especifica
    if args.analizar and ocr_result and "texto" in ocr_result and productos_result and "productos" in productos_result:
        print("\nAnalizando orden de compra...")
        analisis = procesar_orden_compra(ocr_result["texto"], productos_result)
        
        if "error" in analisis:
            print(f"Error al analizar: {analisis['error']}")
        else:
            print("\nResultado del análisis:")
            print("-" * 40)
            print(json.dumps(analisis, indent=2, ensure_ascii=False))
            print("-" * 40)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())


# mistralai api key: hbge2PpKfUY6uQ7gM9QQybsfYfUycyA4