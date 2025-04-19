-- Tabla para almacenar los pedidos de producción
CREATE TABLE IF NOT EXISTS public.pedidos (
  id SERIAL PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega DATE NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completado')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entrega ON public.pedidos(fecha_entrega);

-- Comentarios en la tabla
COMMENT ON TABLE public.pedidos IS 'Almacena los pedidos de producción';
COMMENT ON COLUMN public.pedidos.cliente IS 'Nombre del cliente que realiza el pedido';
COMMENT ON COLUMN public.pedidos.fecha_inicio IS 'Fecha de inicio del pedido';
COMMENT ON COLUMN public.pedidos.fecha_entrega IS 'Fecha estimada de entrega del pedido';
COMMENT ON COLUMN public.pedidos.estado IS 'Estado actual del pedido: pendiente, en_proceso, o completado';
COMMENT ON COLUMN public.pedidos.observaciones IS 'Notas o comentarios adicionales sobre el pedido'; 