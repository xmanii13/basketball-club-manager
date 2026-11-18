-- Email-based player auth (no Cursor account required).
alter table players add column if not exists email text;

-- Allow legacy Cursor-linked rows without email; new profiles use email.
alter table players alter column cursor_sub drop not null;

create unique index if not exists players_email_unique
  on players (lower(email))
  where email is not null;

create table if not exists magic_links (
  id bigserial primary key,
  player_id bigint not null references players(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists magic_links_player_id_idx
  on magic_links (player_id, created_at desc);

create table if not exists player_sessions (
  id bigserial primary key,
  player_id bigint not null references players(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists player_sessions_player_id_idx
  on player_sessions (player_id, created_at desc);
