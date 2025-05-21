create table public.herramientas (
  id serial not null,
  nombre character varying(255) not null,
  modelo character varying(100) null,
  numero_serie character varying(50) null,
  estado character varying(50) null,
  fecha_adquisicion date null,
  ultimo_mantenimiento date null,
  proximo_mantenimiento date null,
  ubicacion character varying(100) null,
  responsable character varying(100) null,
  descripcion text null,
  imagen_url character varying(500) null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  "QR_Code" character varying null,
  constraint herramientas_pkey primary key (id),
  constraint herramientas_numero_serie_key unique (numero_serie),
  constraint herramientas_estado_check check (
    (
      (estado)::text = any (
        (
          array[
            'Nuevo'::character varying,
            'Excelente'::character varying,
            'Bueno'::character varying,
            'Regular'::character varying,
            'Necesita reparación'::character varying,
            'Fuera de servicio'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;