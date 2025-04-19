-- Tabla para almacenar el detalle de los pedidos (productos, cantidades, tallas, colores, etc.)
CREATE TABLE IF NOT EXISTS public.detalle_pedidos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  tallas TEXT NOT NULL, -- Almacenado como JSON array de tallas seleccionadas
  colores TEXT NOT NULL, -- Almacenado como JSON array de colores seleccionados
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Restricciones de clave foránea
  CONSTRAINT fk_pedido FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_producto FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_pedido_id ON public.detalle_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_producto_id ON public.detalle_pedidos(producto_id);

-- Comentarios en la tabla
COMMENT ON TABLE public.detalle_pedidos IS 'Almacena los detalles de cada pedido, incluyendo productos, cantidades, tallas y colores seleccionados';
COMMENT ON COLUMN public.detalle_pedidos.pedido_id IS 'ID del pedido al que pertenece este detalle';
COMMENT ON COLUMN public.detalle_pedidos.producto_id IS 'ID del producto seleccionado';
COMMENT ON COLUMN public.detalle_pedidos.tallas IS 'Array JSON de tallas seleccionadas para este producto';
COMMENT ON COLUMN public.detalle_pedidos.colores IS 'Array JSON de colores seleccionados para este producto';
COMMENT ON COLUMN public.detalle_pedidos.cantidad IS 'Cantidad de productos solicitados';
COMMENT ON COLUMN public.detalle_pedidos.precio_unitario IS 'Precio unitario del producto al momento de la orden'; 