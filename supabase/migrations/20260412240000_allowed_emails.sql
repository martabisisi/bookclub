-- Whitelist email for YOLO instant login (checked by Edge Function with service role).

create table public.allowed_emails (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

comment on table public.allowed_emails is 'Whitelist for passwordless instant login via yolo-login Edge Function.';

alter table public.allowed_emails enable row level security;

create policy "allowed_emails_select_anon_authenticated"
on public.allowed_emails
for select
to anon, authenticated
using (true);

-- Sostituisci la prima riga con la tua email reale se serve.
insert into public.allowed_emails (email, name) values
  ('marta@bookclub.test', 'Marta'),
  ('giulia.bianchi@esempio.it', 'Giulia Bianchi'),
  ('marco.ferrari@esempio.it', 'Marco Ferrari');
