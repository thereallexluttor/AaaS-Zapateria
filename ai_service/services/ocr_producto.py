import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import cv2
import numpy as np
import os
import argparse
import time
import json
# Importar la función de análisis de texto desde gemma_agent_producto
try:
    # Intentar importar como módulo relativo (cuando se importa desde otro módulo)
    from .gemma_agent_producto import extraer_datos_producto
except ImportError:
    # Importar como módulo absoluto (cuando se ejecuta como script)
    from gemma_agent_producto import extraer_datos_producto

# Configure Tesseract path
tesseract_paths = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'C:\Tesseract-OCR\tesseract.exe'
]

for path in tesseract_paths:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        print(f"Usando Tesseract en: {path}")
        break
else:
    raise Exception("Tesseract not found. Please install Tesseract OCR from https://github.com/UB-Mannheim/tesseract/wiki")

def pdf_to_images(pdf_path):
    """Convierte cada página del PDF en una imagen."""
    doc = fitz.open(pdf_path)
    images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=300)  # Mayor dpi = mejor calidad OCR
        img_data = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_data))
        images.append(image)
    return images

def ocr_image(image, lang="eng"):
    """Aplica OCR a una imagen usando pytesseract."""
    # Convertimos PIL a OpenCV
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
    # Aplicar binarización (opcional)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    # OCR
    text = pytesseract.image_to_string(thresh, lang=lang)
    return text

def extract_text_from_pdf(pdf_path, lang="eng"):
    """Extrae texto de un PDF usando OCR."""
    images = pdf_to_images(pdf_path)
    full_text = ""
    total_pages = len(images)
    
    for i, image in enumerate(images):
        print(f"Procesando página {i+1}/{total_pages}...")
        text = ocr_image(image, lang)
        full_text += f"\n--- Página {i+1} ---\n{text}"
    
    return full_text

def process_image_file(image_path, lang="eng"):
    """Procesa un archivo de imagen y extrae texto."""
    try:
        image = Image.open(image_path)
        print(f"Procesando imagen: {image_path}")
        text = ocr_image(image, lang)
        return text
    except Exception as e:
        print(f"Error al procesar imagen: {str(e)}")
        return None

def ensure_format_for_output(data):
    """Asegura que los campos estén en el formato correcto para la salida."""
    # Si data es None, devolver un objeto vacío
    if data is None:
        print("Warning: Datos vacíos recibidos en ensure_format_for_output")
        return {
            "nombre": "Datos no disponibles",
            "precio": "",
            "stock": "",
            "stockMinimo": "",
            "categoria": "",
            "descripcion": "No se pudieron extraer datos del documento",
            "tallas": "",
            "colores": "",
            "tiempoFabricacion": "",
            "destacado": False
        }
    
    # Si no es un diccionario, intentar convertirlo
    if not isinstance(data, dict):
        print(f"Warning: Datos no son un diccionario en ensure_format_for_output: {type(data)}")
        try:
            if isinstance(data, str):
                # Intentar analizar como JSON
                try:
                    data = json.loads(data)
                    print("Datos convertidos de string a diccionario exitosamente")
                except json.JSONDecodeError as e:
                    print(f"Error al analizar JSON: {e}")
                    return {
                        "nombre": "Error de formato",
                        "precio": "",
                        "stock": "",
                        "stockMinimo": "",
                        "categoria": "",
                        "descripcion": f"Error de formato en los datos: {str(data)[:100]}...",
                        "tallas": "",
                        "colores": "",
                        "tiempoFabricacion": "",
                        "destacado": False
                    }
            else:
                # Si no es string ni dict, convertir a string y mostrar una advertencia
                print(f"Datos no son ni diccionario ni string: {type(data)}")
                return {
                    "nombre": "Formato no reconocido",
                    "precio": "",
                    "stock": "",
                    "stockMinimo": "",
                    "categoria": "",
                    "descripcion": f"Tipo de datos no compatible: {type(data)}",
                    "tallas": "",
                    "colores": "",
                    "tiempoFabricacion": "",
                    "destacado": False
                }
        except Exception as e:
            print(f"Error al procesar datos no-diccionario: {e}")
            return {
                "nombre": "Error al procesar datos",
                "descripcion": str(e)
            }
    
    # Si llegamos aquí, tenemos un diccionario
    print("Procesando diccionario en ensure_format_for_output")
    print(f"Campos recibidos del modelo: {', '.join(data.keys())}")
    
    # Crear un nuevo diccionario con los campos esperados para producto
    result = {
        "nombre": data.get("nombre", ""),
        "precio": data.get("precio", ""),
        "stock": data.get("stock", ""),
        "stockMinimo": data.get("stockMinimo", ""),
        "categoria": data.get("categoria", ""),
        "descripcion": data.get("descripcion", ""),
        "tallas": data.get("tallas", ""),
        "colores": data.get("colores", ""),
        "tiempoFabricacion": data.get("tiempoFabricacion", ""),
        "destacado": data.get("destacado", False)
    }
    
    print(f"Formato finalizado para producto, campos: {', '.join(result.keys())}")
    return result

def process_file(file_path, lang="spa"):
    """Procesa un archivo PDF o imagen y analiza el texto extraído."""
    start_time = time.time()
    
    # Determinar si es un PDF o una imagen basado en la extensión
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == '.pdf':
        print(f"Procesando PDF: {file_path}")
        texto = extract_text_from_pdf(file_path, lang)
    elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']:
        print(f"Procesando imagen: {file_path}")
        texto = process_image_file(file_path, lang)
    else:
        print(f"Formato de archivo no soportado: {file_ext}")
        return None
    
    if not texto:
        print("No se pudo extraer texto del archivo.")
        return None
    
    process_time = time.time() - start_time
    print(f"Archivo procesado en {process_time:.2f} segundos")
    print("Texto extraído:")
    print("-" * 40)
    print(texto[:500] + "..." if len(texto) > 500 else texto)  # Mostrar una vista previa del texto
    print("-" * 40)
    
    # Procesar el texto con el agente
    print("Procesando texto con agente IA...")
    agent_start_time = time.time()
    
    try:
        agent_result_raw = extraer_datos_producto(texto)
        agent_process_time = time.time() - agent_start_time
        print(f"Texto analizado por agente en {agent_process_time:.2f} segundos")
        
        # Formatear el resultado
        result = ensure_format_for_output(agent_result_raw)
        return result
    except Exception as e:
        print(f"Error al procesar texto con agente IA: {str(e)}")
        
        # Devolver una estructura de datos predeterminada en caso de error
        return {
            "nombre": "Producto sin identificar",
            "precio": "",
            "stock": "",
            "stockMinimo": "",
            "categoria": "",
            "descripcion": f"No se pudieron extraer datos automáticamente. Error: {str(e)}",
            "tallas": "",
            "colores": "",
            "tiempoFabricacion": "",
            "destacado": False
        }

def main():
    parser = argparse.ArgumentParser(description='Extracción de texto de PDFs o imágenes con análisis IA para productos')
    parser.add_argument('file_path', help='Ruta al archivo PDF o imagen a procesar')
    parser.add_argument('--lang', default='spa', help='Idioma para OCR (eng, spa, fra, deu, por)')
    parser.add_argument('--output', help='Ruta para guardar el resultado en formato JSON')
    parser.add_argument('--raw', action='store_true', help='Mostrar respuesta directa del agente sin procesar')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file_path):
        print(f"Error: El archivo {args.file_path} no existe.")
        return
    
    print(f"Iniciando procesamiento con idioma: {args.lang}")
    
    # Determinar si es un PDF o una imagen basado en la extensión
    file_ext = os.path.splitext(args.file_path)[1].lower()
    
    if file_ext == '.pdf':
        print(f"Procesando PDF: {args.file_path}")
        texto = extract_text_from_pdf(args.file_path, args.lang)
    elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']:
        print(f"Procesando imagen: {args.file_path}")
        texto = process_image_file(args.file_path, args.lang)
    else:
        print(f"Formato de archivo no soportado: {file_ext}")
        return
    
    if not texto:
        print("No se pudo extraer texto del archivo.")
        return
    
    print("Procesando texto con agente IA para productos...")
    
    try:
        # Obtener la respuesta directa del agente sin procesar
        agent_result_raw = extraer_datos_producto(texto)
        
        if args.raw:
            # Mostrar la respuesta directa del agente
            print("\n===JSON_RESULT_START===")
            if isinstance(agent_result_raw, str):
                print(agent_result_raw)
            else:
                print(json.dumps(agent_result_raw, indent=2, ensure_ascii=False))
            print("===JSON_RESULT_END===")
        else:
            # Procesar y formatear la respuesta
            result = ensure_format_for_output(agent_result_raw)
            
            if result:
                # Verificar que tenemos un diccionario válido
                if not isinstance(result, dict):
                    print(f"Advertencia: El resultado no es un diccionario válido: {type(result)}")
                    # Intentar convertir a diccionario si es una cadena JSON
                    if isinstance(result, str):
                        try:
                            result = json.loads(result)
                        except json.JSONDecodeError:
                            print("Error: No se pudo convertir la cadena a JSON")
                            result = {
                                "nombre": "Error de formato",
                                "descripcion": "El resultado no es un formato JSON válido"
                            }
                    else:
                        # Si no es ni diccionario ni cadena, crear uno predeterminado
                        result = {
                            "nombre": "Error de formato",
                            "descripcion": f"Resultado de tipo no compatible: {type(result)}"
                        }
                
                # Asegurarse de que todos los campos esperados existan
                expected_fields = ["nombre", "precio", "stock", "stockMinimo", 
                                "categoria", "descripcion", "tallas", "colores", 
                                "tiempoFabricacion", "destacado"]
                
                for field in expected_fields:
                    if field not in result:
                        if field == "destacado":
                            result[field] = False
                        else:
                            result[field] = ""
                
                # Imprimir el resultado en formato JSON con delimitadores claros
                print("\n===JSON_RESULT_START===")
                json_output = json.dumps(result, indent=2, ensure_ascii=False)
                print(json_output)
                print("===JSON_RESULT_END===")
        
        # Guardar resultado en archivo si se especificó --output
        if args.output:
            output_data = agent_result_raw if args.raw else result
            with open(args.output, 'w', encoding='utf-8') as f:
                if isinstance(output_data, str):
                    f.write(output_data)
                else:
                    json.dump(output_data, f, indent=2, ensure_ascii=False)
            print(f"\nResultado guardado en: {args.output}")
    except Exception as e:
        print(f"Error al procesar texto con agente IA: {str(e)}")
        print("\n===JSON_RESULT_START===")
        error_result = {
            "error": True,
            "message": f"Error al procesar el texto: {str(e)}"
        }
        print(json.dumps(error_result, indent=2, ensure_ascii=False))
        print("===JSON_RESULT_END===")

if __name__ == "__main__":
    print("Herramienta de extracción de texto y análisis IA para productos")
    print("-------------------------------------------------------------")
    main() 