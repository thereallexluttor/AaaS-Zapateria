create table public.herramientas_reportes_daños (
  id uuid not null default extensions.uuid_generate_v4 (),
  herramienta_id integer not null,
  descripcion_daño text not null,
  fecha_reporte date not null,
  nivel_urgencia text not null,
  solicitante text not null,
  imagen_daño_url text null,
  estado text not null default 'Pendiente'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  reparacion_fecha timestamp with time zone null,
  reparacion_descripcion text null,
  reparacion_responsable text null,
  reparacion_costo numeric(10, 2) null,
  constraint herramientas_reportes_daños_pkey primary key (id),
  constraint herramientas_reportes_daños_herramienta_id_fkey foreign KEY (herramienta_id) references herramientas (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_herramientas_reportes_danos_estado on public."herramientas_reportes_daños" using btree (estado) TABLESPACE pg_default;

create index IF not exists "idx_herramientas_reportes_daños_herramienta_id" on public."herramientas_reportes_daños" using btree (herramienta_id) TABLESPACE pg_default;

create trigger "set_updated_at_herramientas_reportes_daños" BEFORE
update on "herramientas_reportes_daños" for EACH row
execute FUNCTION update_updated_at_column ();