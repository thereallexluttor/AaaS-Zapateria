#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script de prueba para el sistema de OCR y procesamiento de texto de materiales.
Este script permite probar las funciones de OCR y procesamiento de IA sin depender
de la aplicación principal.
"""

import os
import sys
import time
import json
import argparse

# Agregar el directorio de servicios al path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "services"))

# Importar las funciones necesarias
try:
    from services.ocr_material import process_file, process_text, check_tesseract
    from services.gemma_agent_material import extraer_datos_material
except ImportError as e:
    print(f"Error al importar módulos: {str(e)}")
    print("Asegúrate de que estás ejecutando este script desde el directorio correcto.")
    print(f"Directorio actual: {os.getcwd()}")
    sys.exit(1)

def test_tesseract():
    """Prueba la instalación de Tesseract OCR"""
    print("\n--- Prueba de Tesseract OCR ---")
    tesseract_ok = check_tesseract()
    if tesseract_ok:
        print("✅ Tesseract OCR está correctamente instalado y configurado.")
    else:
        print("❌ Tesseract OCR no está disponible. La funcionalidad OCR estará limitada.")
    return tesseract_ok

def test_image_processing(image_path=None):
    """Prueba el procesamiento de imágenes"""
    if not image_path:
        print("\n--- Prueba de procesamiento de imágenes ---")
        print("No se proporcionó una imagen de prueba.")
        return False
    
    print(f"\n--- Procesando imagen: {image_path} ---")
    start_time = time.time()
    result = process_file(image_path, lang="spa")
    process_time = time.time() - start_time
    
    print(f"Tiempo total de procesamiento: {process_time:.2f} segundos")
    print("\nResultado:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if result and "nombre" in result and result["nombre"] != "Error" and result["nombre"] != "Sin datos":
        print("\n✅ Procesamiento de imagen exitoso.")
        return True
    else:
        print("\n❌ Problema en el procesamiento de imagen.")
        return False

def test_pdf_processing(pdf_path=None):
    """Prueba el procesamiento de PDFs"""
    if not pdf_path:
        print("\n--- Prueba de procesamiento de PDFs ---")
        print("No se proporcionó un PDF de prueba.")
        return False
    
    print(f"\n--- Procesando PDF: {pdf_path} ---")
    start_time = time.time()
    result = process_file(pdf_path, lang="spa")
    process_time = time.time() - start_time
    
    print(f"Tiempo total de procesamiento: {process_time:.2f} segundos")
    print("\nResultado:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if result and "nombre" in result and result["nombre"] != "Error" and result["nombre"] != "Sin datos":
        print("\n✅ Procesamiento de PDF exitoso.")
        return True
    else:
        print("\n❌ Problema en el procesamiento de PDF.")
        return False

def test_text_processing(texto=None):
    """Prueba el procesamiento de texto directo"""
    if not texto:
        texto = """
        50 metros de Cuero Vacuno Premium color marrón oscuro. 
        Referencia CV-2023-456. 
        Stock actual: 120 unidades.
        Stock mínimo recomendado: 30 unidades.
        Precio por metro: 45.50€
        Categoría: Cuero
        Proveedor: Curtidos Superiores S.A.
        Descripción: Cuero vacuno de alta calidad, curtido al vegetal. Ideal para la fabricación de calzado de gama alta. Resistente al desgaste y con un acabado premium. Grosor de 2mm.
        Fecha de adquisición: 15/10/2023
        Ubicación: Almacén A, Estante 3
        """
    
    print("\n--- Prueba de procesamiento de texto ---")
    print("Texto de prueba:")
    print(texto[:200] + "..." if len(texto) > 200 else texto)
    
    start_time = time.time()
    result = process_text(texto)
    process_time = time.time() - start_time
    
    print(f"Tiempo total de procesamiento: {process_time:.2f} segundos")
    print("\nResultado:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if result and "nombre" in result and result["nombre"] != "Error" and result["nombre"] != "Sin datos":
        print("\n✅ Procesamiento de texto exitoso.")
        return True
    else:
        print("\n❌ Problema en el procesamiento de texto.")
        return False

def test_agent_direct():
    """Prueba directamente el agente de IA"""
    texto = """
    Cuero Vacuno Premium color marrón oscuro. 
    Referencia CV-2023-456. 
    Stock actual: 120 unidades.
    Stock mínimo recomendado: 30 unidades.
    Precio por metro: 45.50€
    Categoría: Cuero
    Proveedor: Curtidos Superiores S.A.
    Descripción: Cuero vacuno de alta calidad, curtido al vegetal. Ideal para la fabricación de calzado de gama alta.
    Fecha de adquisición: 15/10/2023
    Ubicación: Almacén A, Estante 3
    """
    
    print("\n--- Prueba directa del agente de IA ---")
    
    try:
        start_time = time.time()
        result = extraer_datos_material(texto)
        process_time = time.time() - start_time
        
        print(f"Tiempo de procesamiento del agente: {process_time:.2f} segundos")
        print("\nResultado del agente:")
        if isinstance(result, str):
            print(result)
            try:
                json_obj = json.loads(result)
                print("\nConvertido a objeto JSON:")
                print(json.dumps(json_obj, indent=2, ensure_ascii=False))
                result = json_obj
            except:
                print("No se pudo convertir a objeto JSON")
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if result and (isinstance(result, dict) and "nombre" in result):
            print("\n✅ Agente de IA funcionando correctamente.")
            return True
        else:
            print("\n❌ Problema con el agente de IA.")
            return False
    except Exception as e:
        print(f"\n❌ Error al probar el agente de IA: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description="Prueba del sistema de OCR y procesamiento de materiales")
    parser.add_argument('--image', help='Ruta a una imagen para prueba')
    parser.add_argument('--pdf', help='Ruta a un PDF para prueba')
    parser.add_argument('--text', help='Texto para probar el procesamiento directo')
    parser.add_argument('--all', action='store_true', help='Ejecutar todas las pruebas')
    
    args = parser.parse_args()
    
    print("=== Pruebas del Sistema de OCR y Procesamiento de Materiales ===")
    print(f"Ejecutando desde: {os.path.abspath(__file__)}")
    
    results = {}
    
    # Siempre probar Tesseract
    results["tesseract"] = test_tesseract()
    
    # Probar el agente de IA
    results["agent"] = test_agent_direct()
    
    # Ejecutar pruebas específicas según argumentos
    if args.image or args.all:
        results["image"] = test_image_processing(args.image)
    
    if args.pdf or args.all:
        results["pdf"] = test_pdf_processing(args.pdf)
    
    if args.text or args.all:
        results["text"] = test_text_processing(args.text)
    
    # Si no se especificó ninguna prueba específica y no se eligió 'all', probar el texto
    if not (args.image or args.pdf or args.text or args.all):
        results["text"] = test_text_processing()
    
    # Resumen de resultados
    print("\n=== Resumen de Pruebas ===")
    for test, result in results.items():
        status = "✅ OK" if result else "❌ Fallo"
        print(f"{test.capitalize()}: {status}")
    
    # Determinar si todas las pruebas fueron exitosas
    all_success = all(results.values())
    
    if all_success:
        print("\n✅ Todas las pruebas fueron exitosas.")
        return 0
    else:
        print("\n❌ Algunas pruebas fallaron. Revisa los resultados arriba.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 