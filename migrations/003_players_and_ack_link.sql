create table if not exists players (
  id bigserial primary key,
  cursor_sub text not null,
  app_stage text not null check (app_stage in ('production', 'preview')),
  full_name text not null,
  contact text not null,
  contact_type text not null check (contact_type in ('email', 'phone')),
  messenger text not null,
  has_swh_jersey boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cursor_sub, app_stage)
);

create index if not exists players_updated_at_idx
  on players (updated_at desc);

alter table acknowledgements
  add column if not exists player_id bigint references players(id);

alter table acknowledgements
  add column if not exists cursor_sub text;

alter table acknowledgements
  add column if not exists app_stage text;

create index if not exists acknowledgements_player_id_idx
  on acknowledgements (player_id, created_at desc);

create index if not exists acknowledgements_cursor_sub_stage_idx
  on acknowledgements (cursor_sub, app_stage, created_at desc);
