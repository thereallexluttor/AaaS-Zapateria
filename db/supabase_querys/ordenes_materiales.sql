create table public.ordenes_materiales (
  id serial not null,
  material_id integer null,
  nombre_material character varying(255) null,
  proveedor character varying(100) not null,
  referencia character varying(100) null,
  cantidad_solicitada integer not null,
  unidades character varying(50) null,
  fecha_entrega_estimada date null,
  precio_unitario numeric(10, 2) null,
  notas text null,
  estado character varying(20) not null default 'Pendiente'::character varying,
  fecha_orden date not null,
  numero_orden character varying(100) not null,
  responsable character varying(100) null,
  created_at timestamp without time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone not null default CURRENT_TIMESTAMP,
  constraint ordenes_materiales_pkey primary key (id),
  constraint ordenes_materiales_numero_orden_key unique (numero_orden),
  constraint fk_material foreign KEY (material_id) references materiales (id) on delete set null,
  constraint ordenes_materiales_estado_check check (
    (
      (estado)::text = any (
        (
          array[
            'Pendiente'::character varying,
            'Enviada'::character varying,
            'Recibida'::character varying,
            'Cancelada'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trigger_ordenes_materiales_recibida
after
update on ordenes_materiales for EACH row when (new.estado::text = 'Recibida'::text)
execute FUNCTION actualizar_stock_material ();