-- Aggiunge l'email reale del progetto alla whitelist YOLO (idempotente).

insert into public.allowed_emails (email, name) values
  ('martabisisi@gmail.com', 'Marta')
on conflict (email) do update
  set name = excluded.name;
