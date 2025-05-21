create table public.productos_table (
  id serial not null,
  nombre text not null,
  precio numeric(10, 2) not null,
  categoria text null,
  descripcion text null,
  materiales jsonb not null default '[]'::jsonb,
  herramientas jsonb not null default '[]'::jsonb,
  tallas jsonb not null default '[]'::jsonb,
  colores text null,
  tiempo_fabricacion integer null,
  destacado boolean not null default false,
  imagen_url text null,
  qr_code text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  pasos_produccion bigint null default '8'::bigint,
  constraint productos_table_pkey primary key (id)
) TABLESPACE pg_default;