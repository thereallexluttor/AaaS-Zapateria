create table public.ventas (
  id serial not null,
  cliente_id integer not null,
  producto_id integer not null,
  trabajador_id integer not null,
  cantidad integer not null,
  precio_venta numeric(10, 2) not null,
  descuento numeric(10, 2) null default 0,
  forma_pago text not null,
  estado text null default 'Completada'::text,
  fecha_entrega date not null default CURRENT_DATE,
  fecha_inicio date not null default CURRENT_DATE,
  observaciones text not null,
  tallas text null,
  colores text null,
  constraint ventas_pkey primary key (id),
  constraint ventas_cliente_id_fkey foreign KEY (cliente_id) references clientes (id) on update CASCADE on delete RESTRICT,
  constraint ventas_producto_id_fkey foreign KEY (producto_id) references productos_table (id) on update CASCADE on delete RESTRICT,
  constraint ventas_trabajador_id_fkey foreign KEY (trabajador_id) references trabajadores (id) on update CASCADE on delete RESTRICT,
  constraint ventas_estado_check check (
    (
      estado = any (
        array[
          'Pendiente'::text,
          'Completada'::text,
          'Cancelada'::text
        ]
      )
    )
  ),
  constraint ventas_forma_pago_check check (
    (
      forma_pago = any (
        array[
          'Efectivo'::text,
          'Tarjeta crédito'::text,
          'Tarjeta débito'::text,
          'Transferencia'::text,
          'Crédito'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trg_generar_tareas_desde_venta
after INSERT
or
update OF estado,
cantidad,
producto_id on ventas for EACH row
execute FUNCTION generar_tareas_desde_venta ();