create table if not exists acknowledgements (
  id bigserial primary key,
  full_name text not null,
  contact text not null,
  contact_type text not null check (contact_type in ('email', 'phone')),
  role text not null check (role in ('player', 'parent-guardian')),
  jersey_or_age_group text,
  agreement_version text not null,
  agreement_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists acknowledgements_created_at_idx
  on acknowledgements (created_at desc);
