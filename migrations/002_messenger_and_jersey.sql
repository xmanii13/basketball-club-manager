alter table acknowledgements
  add column if not exists messenger text;

alter table acknowledgements
  add column if not exists has_swh_jersey boolean;
