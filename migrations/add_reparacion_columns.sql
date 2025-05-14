-- Script para añadir columnas para datos de reparación a la tabla herramientas_reportes_daños

-- Añadir columna para la fecha de reparación
ALTER TABLE public.herramientas_reportes_daños
ADD COLUMN IF NOT EXISTS reparacion_fecha TIMESTAMP WITH TIME ZONE;

-- Añadir columna para la descripción de la reparación
ALTER TABLE public.herramientas_reportes_daños
ADD COLUMN IF NOT EXISTS reparacion_descripcion TEXT;

-- Añadir columna para el responsable de la reparación
ALTER TABLE public.herramientas_reportes_daños
ADD COLUMN IF NOT EXISTS reparacion_responsable TEXT;

-- Añadir columna para el costo de la reparación
ALTER TABLE public.herramientas_reportes_daños
ADD COLUMN IF NOT EXISTS reparacion_costo DECIMAL(10, 2);

-- Añadir un índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_herramientas_reportes_danos_estado
ON public.herramientas_reportes_daños(estado);

-- Añadir comentarios a las columnas
COMMENT ON COLUMN public.herramientas_reportes_daños.reparacion_fecha IS 'Fecha en que se completó la reparación';
COMMENT ON COLUMN public.herramientas_reportes_daños.reparacion_descripcion IS 'Descripción detallada de la reparación realizada';
COMMENT ON COLUMN public.herramientas_reportes_daños.reparacion_responsable IS 'Persona o equipo responsable de realizar la reparación';
COMMENT ON COLUMN public.herramientas_reportes_daños.reparacion_costo IS 'Costo asociado a la reparación'; 