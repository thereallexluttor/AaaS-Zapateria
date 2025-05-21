create table public.herramientas_mantenimientos (
  id uuid not null default extensions.uuid_generate_v4 (),
  herramienta_id integer not null,
  fecha_programada date not null,
  tipo_mantenimiento text not null,
  descripcion text null,
  responsable text not null,
  recordatorio boolean null default true,
  estado text not null default 'Programado'::text,
  fecha_creacion timestamp with time zone null default now(),
  fecha_completado timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint herramientas_mantenimientos_pkey primary key (id),
  constraint herramientas_mantenimientos_herramienta_id_fkey foreign KEY (herramienta_id) references herramientas (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_herramientas_mantenimientos_herramienta_id on public.herramientas_mantenimientos using btree (herramienta_id) TABLESPACE pg_default;

create index IF not exists idx_herramientas_mantenimientos_fecha_programada on public.herramientas_mantenimientos using btree (fecha_programada) TABLESPACE pg_default;

create trigger set_updated_at_herramientas_mantenimientos BEFORE
update on herramientas_mantenimientos for EACH row
execute FUNCTION update_updated_at_column ();