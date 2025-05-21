create table public.pasos_produccion (
  id serial not null,
  producto_id integer not null,
  nombre_paso text not null,
  descripcion text null,
  duracion_estimada interval null default '1 day'::interval,
  rol_requerido text not null,
  orden_ejecucion integer not null,
  constraint pasos_produccion_pkey primary key (id),
  constraint pasos_unicos_por_producto unique (producto_id, orden_ejecucion),
  constraint pasos_produccion_producto_id_fkey foreign KEY (producto_id) references productos_table (id) on delete CASCADE,
  constraint pasos_produccion_rol_requerido_check check (
    (
      rol_requerido = any (
        array[
          'Corte de cuero'::text,
          'Montaje de suelas'::text,
          'Fabricación de suelas'::text,
          'Aparado de materiales'::text,
          'Acabados finales'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;