create table public.trabajadores (
  id serial not null,
  nombre character varying(255) not null,
  apellido character varying(255) not null,
  cedula character varying(20) not null,
  fecha_contratacion date not null,
  correo character varying(255) not null,
  telefono character varying(20) null,
  direccion character varying(255) null,
  salario numeric(10, 2) null,
  tipo character varying(50) not null,
  area character varying(50) not null,
  especialidad character varying(255) null,
  tipo_contrato character varying(50) not null,
  horas_trabajo integer null,
  fecha_nacimiento date null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint trabajadores_pkey primary key (id),
  constraint trabajadores_correo_key unique (correo),
  constraint trabajadores_cedula_key unique (cedula),
  constraint trabajadores_tipo_check check (
    (
      (tipo)::text = any (
        (
          array[
            'produccion'::character varying,
            'administrativo'::character varying,
            'diseno'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint trabajadores_area_check check (
    (
      (area)::text = any (
        (
          array[
            'corte'::character varying,
            'aparado'::character varying,
            'montaje'::character varying,
            'suela'::character varying,
            'acabado'::character varying,
            'ventas'::character varying,
            'administracion'::character varying,
            'diseno'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint trabajadores_tipo_contrato_check check (
    (
      (tipo_contrato)::text = any (
        (
          array[
            'completo'::character varying,
            'parcial'::character varying,
            'temporal'::character varying,
            'practica'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint trabajadores_horas_trabajo_check check (
    (
      (horas_trabajo >= 0)
      and (horas_trabajo <= 168)
    )
  ),
  constraint trabajadores_salario_check check ((salario >= (0)::numeric))
) TABLESPACE pg_default;