create table public.materiales (
  id serial not null,
  nombre character varying(255) not null,
  referencia character varying(100) null,
  unidades character varying(50) null,
  stock integer not null,
  stock_minimo integer null,
  precio numeric(10, 2) null,
  categoria character varying(50) null,
  proveedor character varying(100) null,
  descripcion text null,
  fecha_adquisicion date null,
  ubicacion character varying(100) null,
  imagen_url character varying(500) null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  "QR_Code" character varying null,
  constraint materiales_pkey primary key (id)
) TABLESPACE pg_default;