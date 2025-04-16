# Paquete de servicios de IA para la aplicación
# Este archivo permite importar los módulos de este directorio como paquete

from .ocr_material import process_file as process_material_file
from .ocr_material import process_text as process_material_text

__all__ = [
    'process_material_file',
    'process_material_text'
] 