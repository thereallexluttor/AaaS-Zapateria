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
import sys
import traceback
import platform
from pathlib import Path
# Importar la función de análisis de texto desde gemma_agent_material
try:
    # Intentar importar como módulo relativo (cuando se importa desde otro módulo)
    from .gemma_agent_material import extraer_datos_material
except ImportError:
    try:
        # Importar como módulo absoluto (cuando se ejecuta como script)
        from gemma_agent_material import extraer_datos_material
    except ImportError:
        print("ERROR: No se pudo importar el módulo gemma_agent_material")
        print("Verificando ruta actual y disponibilidad de módulos...")
        print(f"Ruta actual: {os.getcwd()}")
        print(f"Directorio del script: {os.path.dirname(os.path.abspath(__file__))}")
        print(f"Python path: {sys.path}")
        
        # Definir una función de respaldo simple en caso de que no se pueda importar
        def extraer_datos_material(texto):
            print("ADVERTENCIA: Usando extractor de respaldo (sin IA)")
            # Extraer algunas líneas para el nombre y descripción
            lines = texto.split('\n')
            nombre = "Material sin identificar"
            descripcion = ""
            
            for line in lines:
                line = line.strip()
                if len(line) > 3 and len(line) < 50 and not nombre or nombre == "Material sin identificar":
                    nombre = line
                elif len(descripcion) < 200 and line:
                    descripcion += line + " "
            
            return {
                "nombre": nombre,
                "referencia": "",
                "unidades": "",
                "stock": "0",
                "stockMinimo": "0",
                "precio": "0",
                "categoria": "",
                "proveedor": "",
                "descripcion": descripcion[:200] if descripcion else "Sin descripción",
                "fechaAdquisicion": "",
                "ubicacion": ""
            }

# Verificar dependencias de OCR
def check_tesseract():
    """Verificar la instalación de Tesseract OCR y devolver la ruta si se encuentra"""
    # Posibles rutas según el sistema operativo
    if platform.system() == 'Windows':
        tesseract_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'C:\Tesseract-OCR\tesseract.exe',
            r'tesseract.exe'  # Si está en el PATH
        ]
    else:  # Linux, macOS, etc.
        tesseract_paths = [
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
            'tesseract'  # Si está en el PATH
        ]
    
    # Buscar Tesseract en las rutas
    for path in tesseract_paths:
        try:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"Tesseract encontrado en: {path}")
                # Verificar funcionamiento
                version = pytesseract.get_tesseract_version()
                print(f"Versión de Tesseract: {version}")
                return True
            elif path == 'tesseract' or path == 'tesseract.exe':
                # Intentar ejecutar tesseract si está en el PATH
                try:
                    import subprocess
                    result = subprocess.run(['tesseract', '--version'], 
                                           stdout=subprocess.PIPE, 
                                           stderr=subprocess.PIPE, 
                                           text=True, 
                                           check=True)
                    version = result.stdout.split('\n')[0]
                    print(f"Tesseract encontrado en PATH: {version}")
                    pytesseract.pytesseract.tesseract_cmd = 'tesseract'
                    return True
                except Exception:
                    continue
        except Exception as e:
            print(f"Error al verificar Tesseract en {path}: {str(e)}")
    
    print("ADVERTENCIA: Tesseract OCR no encontrado. La funcionalidad OCR estará limitada.")
    return False

# Verificar instalación de Tesseract
TESSERACT_AVAILABLE = check_tesseract()

def pdf_to_images(pdf_path):
    """Convierte cada página del PDF en una imagen."""
    try:
        doc = fitz.open(pdf_path)
        images = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=300)  # Mayor dpi = mejor calidad OCR
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data))
            images.append(image)
        return images
    except Exception as e:
        print(f"Error al convertir PDF a imágenes: {str(e)}")
        return []

def ocr_image(image, lang="eng"):
    """Aplica OCR a una imagen usando pytesseract."""
    if not TESSERACT_AVAILABLE:
        print("No se puede realizar OCR: Tesseract no está disponible")
        return "No se puede realizar OCR: Tesseract no está disponible"
    
    try:
        # Convertimos PIL a OpenCV
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
        
        # Aplicar técnicas de mejora de imagen para OCR
        # 1. Binarización adaptativa - mejora el contraste local
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # 2. Reducción de ruido
        denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)
        
        # OCR con imagen mejorada
        text = pytesseract.image_to_string(denoised, lang=lang)
        
        # Si el resultado es muy corto, probar con la imagen original
        if len(text.strip()) < 10:
            print("Resultado OCR muy corto, probando con imagen original...")
            text = pytesseract.image_to_string(image, lang=lang)
        
        return text
    except Exception as e:
        print(f"Error en el procesamiento OCR: {str(e)}")
        traceback.print_exc()
        return f"Error OCR: {str(e)}"

def extract_text_from_pdf(pdf_path, lang="eng"):
    """Extrae texto de un PDF usando OCR."""
    images = pdf_to_images(pdf_path)
    
    if not images:
        print("No se pudieron extraer imágenes del PDF")
        return "No se pudieron extraer imágenes del PDF"
    
    full_text = ""
    total_pages = len(images)
    
    print(f"Procesando {total_pages} páginas de PDF...")
    
    for i, image in enumerate(images):
        print(f"Procesando página {i+1}/{total_pages}...")
        text = ocr_image(image, lang)
        if text:
            full_text += f"\n--- Página {i+1} ---\n{text}"
    
    if not full_text.strip():
        print("No se pudo extraer texto del PDF mediante OCR")
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

def process_image_file(image_path, lang="eng"):
    """Procesa un archivo de imagen y extrae texto."""
    try:
        # Verificar si el archivo existe
        if not os.path.exists(image_path):
            print(f"Error: El archivo {image_path} no existe")
            return f"Error: El archivo no existe: {image_path}"
        
        # Verificar si es un archivo de imagen válido
        try:
            image = Image.open(image_path)
            print(f"Procesando imagen: {image_path} ({image.format}, {image.size})")
        except Exception as e:
            print(f"Error al abrir imagen: {str(e)}")
            return f"Error al abrir imagen: {str(e)}"
        
        # Realizar OCR
        text = ocr_image(image, lang)
        
        # Verificar resultado
        if not text or len(text.strip()) < 5:
            print("OCR produjo resultado muy corto o vacío")
            return "OCR produjo resultado muy corto o vacío"
        
        return text
    except Exception as e:
        print(f"Error al procesar imagen: {str(e)}")
        traceback.print_exc()
        return f"Error al procesar imagen: {str(e)}"

def ensure_format_for_output(data):
    """Asegura que los campos estén en el formato correcto para la salida."""
    # Si data es None, devolver un objeto vacío
    if data is None:
        print("Warning: Datos vacíos recibidos en ensure_format_for_output")
        return {
            "nombre": "Datos no disponibles",
            "referencia": "",
            "unidades": "",
            "stock": "",
            "stockMinimo": "",
            "precio": "",
            "categoria": "",
            "proveedor": "",
            "descripcion": "No se pudieron extraer datos del documento",
            "fechaAdquisicion": "",
            "ubicacion": ""
        }
    
    # Si no es un diccionario, intentar convertirlo
    if not isinstance(data, dict):
        print(f"Warning: Datos no son un diccionario en ensure_format_for_output: {type(data)}")
        try:
            if isinstance(data, str):
                # Intentar analizar como JSON
                try:
                    # Buscar el contenido JSON en la cadena
                    json_start = data.find('{')
                    json_end = data.rfind('}')
                    
                    if json_start >= 0 and json_end > json_start:
                        json_content = data[json_start:json_end+1]
                        data = json.loads(json_content)
                        print("Datos convertidos de string a diccionario exitosamente")
                    else:
                        raise json.JSONDecodeError("No se encontró contenido JSON válido", data, 0)
                except json.JSONDecodeError as e:
                    print(f"Error al analizar JSON: {e}")
                    return {
                        "nombre": "Error de formato",
                        "referencia": "",
                        "unidades": "",
                        "stock": "",
                        "stockMinimo": "",
                        "precio": "",
                        "categoria": "",
                        "proveedor": "",
                        "descripcion": f"Error de formato en los datos: {str(data)[:100]}...",
                        "fechaAdquisicion": "",
                        "ubicacion": ""
                    }
            else:
                # Si no es string ni dict, convertir a string y mostrar una advertencia
                print(f"Datos no son ni diccionario ni string: {type(data)}")
                return {
                    "nombre": "Formato no reconocido",
                    "referencia": "",
                    "unidades": "",
                    "stock": "",
                    "stockMinimo": "",
                    "precio": "",
                    "categoria": "",
                    "proveedor": "",
                    "descripcion": f"Tipo de datos no compatible: {type(data)}",
                    "fechaAdquisicion": "",
                    "ubicacion": ""
                }
        except Exception as e:
            print(f"Error al procesar datos no-diccionario: {e}")
            traceback.print_exc()
            return {
                "nombre": "Error al procesar datos",
                "descripcion": str(e)
            }
    
    # Si llegamos aquí, tenemos un diccionario
    print("Procesando diccionario en ensure_format_for_output")
    print(f"Campos recibidos del modelo: {', '.join(data.keys())}")
    
    # Crear un nuevo diccionario con los campos esperados para material
    result = {
        "nombre": data.get("nombre", ""),
        "referencia": data.get("referencia", ""),
        "unidades": data.get("unidades", ""),
        "stock": data.get("stock", ""),
        "stockMinimo": data.get("stockMinimo", ""),
        "precio": data.get("precio", ""),
        "categoria": data.get("categoria", ""),
        "proveedor": data.get("proveedor", ""),
        "descripcion": data.get("descripcion", ""),
        "fechaAdquisicion": data.get("fechaAdquisicion", ""),
        "ubicacion": data.get("ubicacion", "")
    }
    
    # Asegurarse de que el nombre no esté vacío
    if not result["nombre"] or result["nombre"].strip() == "":
        result["nombre"] = "Material sin identificar"
    
    print(f"Formato finalizado para material, campos: {', '.join(result.keys())}")
    return result

def process_file(file_path, lang="spa"):
    """Procesa un archivo PDF o imagen y analiza el texto extraído."""
    start_time = time.time()
    
    # Verificar si el archivo existe
    if not os.path.exists(file_path):
        print(f"Error: El archivo {file_path} no existe.")
        return {
            "nombre": "Error",
            "descripcion": f"El archivo {file_path} no existe."
        }
    
    # Determinar si es un PDF o una imagen basado en la extensión
    file_ext = os.path.splitext(file_path)[1].lower()
    
    texto = None
    
    try:
        if file_ext == '.pdf':
            print(f"Procesando PDF: {file_path}")
            texto = extract_text_from_pdf(file_path, lang)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']:
            print(f"Procesando imagen: {file_path}")
            texto = process_image_file(file_path, lang)
        else:
            print(f"Formato de archivo no soportado: {file_ext}")
            return {
                "nombre": "Error de formato",
                "descripcion": f"Formato de archivo no soportado: {file_ext}"
            }
    except Exception as e:
        print(f"Error al procesar archivo: {str(e)}")
        traceback.print_exc()
        return {
            "nombre": "Error de procesamiento",
            "descripcion": f"Error al procesar el archivo: {str(e)}"
        }
    
    if not texto or len(texto.strip()) < 10:
        print("No se pudo extraer texto suficiente del archivo.")
        return {
            "nombre": "Sin datos",
            "descripcion": "No se pudo extraer texto suficiente del archivo."
        }
    
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
        agent_result_raw = extraer_datos_material(texto)
        agent_process_time = time.time() - agent_start_time
        print(f"Texto analizado por agente en {agent_process_time:.2f} segundos")
        
        # Formatear el resultado
        result = ensure_format_for_output(agent_result_raw)
        return result
    except Exception as e:
        print(f"Error al procesar texto con agente IA: {str(e)}")
        traceback.print_exc()
        
        # Devolver una estructura de datos predeterminada en caso de error
        return {
            "nombre": "Material sin identificar",
            "referencia": "",
            "unidades": "",
            "stock": "",
            "stockMinimo": "",
            "precio": "",
            "categoria": "",
            "proveedor": "",
            "descripcion": f"No se pudieron extraer datos automáticamente. Error: {str(e)}",
            "fechaAdquisicion": "",
            "ubicacion": ""
        }

def process_text(texto):
    """Procesa texto directamente sin OCR."""
    if not texto or len(texto.strip()) < 10:
        print("Texto demasiado corto para procesar")
        return {
            "nombre": "Sin datos suficientes",
            "descripcion": "El texto proporcionado es demasiado corto para extraer información útil."
        }
    
    print("Procesando texto directo con agente IA...")
    start_time = time.time()
    
    try:
        result_raw = extraer_datos_material(texto)
        process_time = time.time() - start_time
        print(f"Texto analizado en {process_time:.2f} segundos")
        
        # Formatear el resultado
        result = ensure_format_for_output(result_raw)
        return result
    except Exception as e:
        print(f"Error al procesar texto: {str(e)}")
        traceback.print_exc()
        
        # Crear respuesta con datos mínimos
        return {
            "nombre": "Error en procesamiento",
            "descripcion": f"Error al procesar texto: {str(e)}"
        }

def main():
    parser = argparse.ArgumentParser(description='Extracción de texto de PDFs o imágenes con análisis IA para materiales')
    parser.add_argument('file_path', help='Ruta al archivo PDF o imagen a procesar, o "texto" para procesar texto directo')
    parser.add_argument('--lang', default='spa', help='Idioma para OCR (eng, spa, fra, deu, por)')
    parser.add_argument('--output', help='Ruta para guardar el resultado en formato JSON')
    parser.add_argument('--raw', action='store_true', help='Mostrar respuesta directa del agente sin procesar')
    parser.add_argument('--text', help='Procesar texto directo en lugar de un archivo')
    
    args = parser.parse_args()
    
    # Procesar texto directo si se proporciona
    if args.text:
        print("Procesando texto directo...")
        result = process_text(args.text)
    else:
        # Procesar archivo
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
        
        print("Procesando texto con agente IA para materiales...")
        
        try:
            # Obtener la respuesta directa del agente sin procesar
            agent_result_raw = extraer_datos_material(texto)
            
            if args.raw:
                # Mostrar la respuesta directa del agente
                print("\n===JSON_RESULT_START===")
                if isinstance(agent_result_raw, str):
                    print(agent_result_raw)
                else:
                    print(json.dumps(agent_result_raw, indent=2, ensure_ascii=False))
                print("===JSON_RESULT_END===")
                
                # Si se solicitó salida a archivo
                if args.output:
                    with open(args.output, 'w', encoding='utf-8') as f:
                        if isinstance(agent_result_raw, str):
                            f.write(agent_result_raw)
                        else:
                            json.dump(agent_result_raw, f, indent=2, ensure_ascii=False)
                    print(f"\nResultado guardado en: {args.output}")
                
                return
            
            # Procesar y formatear la respuesta
            result = ensure_format_for_output(agent_result_raw)
        except Exception as e:
            print(f"Error al procesar texto con agente IA: {str(e)}")
            traceback.print_exc()
            
            # Crear un objeto de error
            result = {
                "error": True,
                "nombre": "Error de procesamiento",
                "descripcion": f"Error al procesar el texto: {str(e)}"
            }
    
    # Mostrar el resultado formateado
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
        expected_fields = ["nombre", "referencia", "unidades", "stock", "stockMinimo", 
                         "precio", "categoria", "proveedor", "descripcion", 
                         "fechaAdquisicion", "ubicacion"]
        
        for field in expected_fields:
            if field not in result:
                result[field] = ""
        
        # Imprimir el resultado en formato JSON con delimitadores claros
        print("\n===JSON_RESULT_START===")
        json_output = json.dumps(result, indent=2, ensure_ascii=False)
        print(json_output)
        print("===JSON_RESULT_END===")
    
        # Guardar resultado en archivo si se especificó --output
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"\nResultado guardado en: {args.output}")

if __name__ == "__main__":
    print("Herramienta de extracción de texto y análisis IA para materiales")
    print("-------------------------------------------------------------")
    try:
        main()
    except Exception as e:
        print(f"Error general en la aplicación: {str(e)}")
        traceback.print_exc()
        
        # Imprimir un resultado de error JSON para garantizar una salida consistente
        print("\n===JSON_RESULT_START===")
        error_result = {
            "error": True,
            "nombre": "Error crítico",
            "descripcion": f"Error general en la aplicación: {str(e)}"
        }
        print(json.dumps(error_result, indent=2, ensure_ascii=False))
        print("===JSON_RESULT_END===") 