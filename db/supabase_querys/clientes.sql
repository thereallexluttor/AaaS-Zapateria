create table public.clientes (
  id serial not null,
  tipo_cliente character varying(20) not null,
  nombre character varying(255) null,
  apellidos character varying(255) null,
  nombre_compania character varying(255) null,
  email character varying(255) null,
  telefono character varying(20) null,
  direccion character varying(255) null,
  ciudad character varying(100) null,
  codigo_postal character varying(20) null,
  notas text null,
  fecha_registro date null default CURRENT_DATE,
  contacto_nombre character varying(255) null,
  contacto_email character varying(255) null,
  contacto_telefono character varying(20) null,
  contacto_cargo character varying(100) null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint clientes_pkey primary key (id),
  constraint clientes_tipo_cliente_check check (
    (
      (tipo_cliente)::text = any (
        (
          array[
            'persona'::character varying,
            'compania'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;