# Configuración para los servicios de IA
import os

# Claves API
API_KEYS = {
    # DeepSeek API (puedes cambiarla o configurarla en variables de entorno)
    'DEEPSEEK_API_KEY': os.environ.get('DEEPSEEK_API_KEY', 'sk-836e4f1623514c2298ada6bbd6bc562f'),
    
    # Otras claves API que puedas necesitar
    'OPENAI_API_KEY': os.environ.get('OPENAI_API_KEY', ''),
}

# Configuración OCR
OCR_CONFIG = {
    # Idioma predeterminado para OCR
    'DEFAULT_LANGUAGE': 'spa',
    
    # DPI para conversión de PDF a imagen
    'PDF_DPI': 300,
    
    # Umbral de binarización para preprocesamiento de imagen
    'BINARY_THRESHOLD': 150,
}

# Configuración de rutas
PATHS = {
    # Carpeta para archivos temporales
    'TEMP_DIR': os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'temp'),
    
    # Rutas alternativas para Tesseract según plataforma
    'TESSERACT_PATHS': {
        'windows': [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'C:\Tesseract-OCR\tesseract.exe'
        ],
        'linux': [
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract'
        ],
        'darwin': [  # macOS
            '/usr/local/bin/tesseract',
            '/opt/homebrew/bin/tesseract'
        ]
    }
}

# Asegurar que exista el directorio temporal
try:
    os.makedirs(PATHS['TEMP_DIR'], exist_ok=True)
except Exception as e:
    print(f"Error al crear directorio temporal: {str(e)}") 