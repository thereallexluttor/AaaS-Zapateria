-- Script para crear la tabla de reportes de daños de herramientas
CREATE TABLE IF NOT EXISTS public.herramientas_reportes_daños (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    herramienta_id UUID NOT NULL REFERENCES public.herramientas(id) ON DELETE CASCADE,
    descripcion_daño TEXT NOT NULL,
    fecha_reporte DATE NOT NULL,
    nivel_urgencia TEXT NOT NULL,
    solicitante TEXT NOT NULL,
    imagen_daño_url TEXT,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear un índice para mejorar las búsquedas por herramienta
CREATE INDEX IF NOT EXISTS idx_herramientas_reportes_daños_herramienta_id 
ON public.herramientas_reportes_daños(herramienta_id);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el timestamp cuando se actualiza un registro
DROP TRIGGER IF EXISTS set_updated_at_herramientas_reportes_daños ON public.herramientas_reportes_daños;
CREATE TRIGGER set_updated_at_herramientas_reportes_daños
BEFORE UPDATE ON public.herramientas_reportes_daños
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Permitir que las RLS (Row Level Security) accedan a la tabla
ALTER TABLE public.herramientas_reportes_daños ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla (ajustar según los requerimientos de seguridad)
CREATE POLICY "Permitir SELECT para todos" ON public.herramientas_reportes_daños
    FOR SELECT USING (true);

CREATE POLICY "Permitir INSERT para usuarios autenticados" ON public.herramientas_reportes_daños
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir UPDATE para usuarios autenticados" ON public.herramientas_reportes_daños
    FOR UPDATE USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.herramientas_reportes_daños IS 'Tabla para almacenar reportes de daños o problemas con las herramientas'; 