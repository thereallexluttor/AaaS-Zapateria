-- Script para crear la tabla de mantenimientos programados para herramientas
CREATE TABLE IF NOT EXISTS public.herramientas_mantenimientos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    herramienta_id UUID NOT NULL REFERENCES public.herramientas(id) ON DELETE CASCADE,
    fecha_programada DATE NOT NULL,
    tipo_mantenimiento TEXT NOT NULL,
    descripcion TEXT,
    responsable TEXT NOT NULL,
    recordatorio BOOLEAN DEFAULT true,
    estado TEXT NOT NULL DEFAULT 'Programado',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear un índice para mejorar las búsquedas por herramienta
CREATE INDEX IF NOT EXISTS idx_herramientas_mantenimientos_herramienta_id 
ON public.herramientas_mantenimientos(herramienta_id);

-- Crear un índice para buscar mantenimientos por fecha programada
CREATE INDEX IF NOT EXISTS idx_herramientas_mantenimientos_fecha_programada
ON public.herramientas_mantenimientos(fecha_programada);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el timestamp cuando se actualiza un registro
DROP TRIGGER IF EXISTS set_updated_at_herramientas_mantenimientos ON public.herramientas_mantenimientos;
CREATE TRIGGER set_updated_at_herramientas_mantenimientos
BEFORE UPDATE ON public.herramientas_mantenimientos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Permitir que las RLS (Row Level Security) accedan a la tabla
ALTER TABLE public.herramientas_mantenimientos ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla (ajustar según los requerimientos de seguridad)
CREATE POLICY "Permitir SELECT para todos" ON public.herramientas_mantenimientos
    FOR SELECT USING (true);

CREATE POLICY "Permitir INSERT para usuarios autenticados" ON public.herramientas_mantenimientos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir UPDATE para usuarios autenticados" ON public.herramientas_mantenimientos
    FOR UPDATE USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.herramientas_mantenimientos IS 'Tabla para almacenar programaciones de mantenimiento para herramientas'; 