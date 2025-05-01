# Zapateria SaaS - Documentación General

## Descripción General

Zapateria SaaS es una aplicación de escritorio desarrollada con Electron, React y TypeScript, que proporciona una solución integral para la gestión de una fábrica o negocio de zapatería. La aplicación utiliza Supabase como base de datos y ofrece funcionalidades avanzadas de inteligencia artificial para automatizar procesos como OCR (reconocimiento óptico de caracteres) y análisis de documentos.

## Tecnologías Principales

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend/Desktop**: Electron
- **Base de Datos**: Supabase
- **IA y Procesamiento**: Python, Tesseract OCR, LangChain, OpenAI
- **Almacenamiento**: Supabase Storage
- **Generación de Documentos**: jsPDF, html2canvas
- **Seguridad**: CryptoJS

## Módulos Principales

La aplicación está organizada en cuatro módulos principales:

### 1. Inventario

**Características principales:**
- Gestión completa de inventario con tres categorías principales:
  - **Materiales**: Materia prima utilizada en la fabricación
  - **Productos**: Calzado terminado listo para venta
  - **Herramientas**: Equipamiento utilizado en el proceso de fabricación
- Funcionalidades:
  - Búsqueda avanzada con filtros por categoría
  - Adición de nuevos elementos con formularios especializados
  - Visualización detallada de cada elemento
  - Seguimiento de stock con alertas de niveles mínimos
  - Registro de ubicaciones, adquisiciones y mantenimiento
  - Generación automática de códigos QR
  - Subida de imágenes al almacenamiento en la nube
  - OCR para reconocimiento de documentos relacionados con inventario

### 2. Producción

**Características principales:**
- Gestión del ciclo completo de pedidos de producción:
  - Creación y seguimiento de pedidos
  - Asignación de productos a pedidos
  - Seguimiento de progreso por estados (pendiente, en proceso, completado)
- Funcionalidades:
  - Visualización de pedidos filtrados por estado
  - Detalles completos de pedidos con información del cliente
  - Sistema de seguimiento de producción por etapas
  - Escaneo y procesamiento de órdenes de compra mediante OCR
  - Integración con el módulo de clientes
  - Notificaciones de cambio de estado
  - Generación de documentos PDF de pedidos

### 3. Clientes

**Características principales:**
- Gestión completa de información de clientes:
  - Clientes particulares (personas)
  - Clientes corporativos (empresas)
- Funcionalidades:
  - Búsqueda y filtrado de clientes
  - Formularios especializados según tipo de cliente
  - Almacenamiento de información de contacto completa
  - Historial de pedidos por cliente
  - Registro de notas y observaciones
  - Gestión de contactos corporativos

### 4. Trabajadores

**Características principales:**
- Gestión del personal de la fábrica o negocio:
  - Organización por departamentos: producción, administrativo, diseño
  - Seguimiento de especialidades y áreas de trabajo
- Funcionalidades:
  - Búsqueda y filtrado por departamento
  - Registro completo de datos personales y laborales
  - Seguimiento de contratos y salarios
  - Asignación a diferentes áreas de producción
  - Gestión de horarios y tipo de contrato

## Características Técnicas

### Interfaz de Usuario
- Diseño moderno y responsive con Tailwind CSS
- Animaciones fluidas con React Transition Group
- Interfaz personalizada sin bordes nativos de ventana (frameless)
- Controles de ventana personalizados (minimizar, maximizar, cerrar)
- Navegación intuitiva entre módulos

### Procesamiento de Documentos con IA
- Reconocimiento óptico de caracteres (OCR) para:
  - Digitalización de facturas de compra
  - Identificación de herramientas y materiales
  - Lectura automatizada de documentos
- Procesamiento de imágenes y PDFs
- Análisis de texto mediante modelos de lenguaje
- Extracción automática de datos estructurados

### Base de Datos y Almacenamiento
- Tablas en Supabase para cada entidad principal:
  - Materiales, Productos, Herramientas
  - Clientes, Trabajadores, Pedidos
- Relaciones entre entidades
- Almacenamiento de imágenes en buckets de Supabase Storage
- Generación y almacenamiento de códigos QR

### Seguridad
- Autenticación mediante Supabase Auth
- Encriptación de datos sensibles con CryptoJS
- Control de acceso basado en roles (en desarrollo)

### Integración Electron-Python
- Comunicación entre la interfaz Electron y servicios Python
- Procesamiento backend para tareas intensivas de IA
- Gestión eficiente de recursos del sistema

## Requisitos del Sistema

- Sistema operativo: Windows 10 o superior
- Python 3.7+ con las siguientes librerías:
  - PyMuPDF (fitz)
  - pytesseract
  - Pillow
  - OpenCV
  - LangChain
- Tesseract OCR instalado en el sistema
- Conexión a internet para funcionalidades en la nube
- Espacio en disco: mínimo 500MB
- Memoria RAM: mínimo 4GB recomendado

## Funcionalidades en Desarrollo

- Módulo de informes y analíticas
- Integración con sistemas de punto de venta
- Sistema de notificaciones avanzado
- Aplicación móvil complementaria
- Panel de control administrativo
- Sistema de respaldo y recuperación de datos
- Integración con sistemas contables

---

*Esta documentación proporciona una visión general de las características y funcionalidades de Zapateria SaaS. Para detalles específicos sobre cada función, consulte la documentación técnica correspondiente.* 