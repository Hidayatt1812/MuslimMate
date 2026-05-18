create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  name text not null,
  message text not null,
  donation_method text not null check (donation_method in ('none', 'bri', 'mandiri', 'ewallet', 'other')),
  donation_method_label text not null,
  donation_account_name text,
  donation_account_number text,
  app_language text not null default 'id',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table support_messages enable row level security;

drop policy if exists "allow anonymous support inserts" on support_messages;
create policy "allow anonymous support inserts"
  on support_messages
  for insert
  to anon
  with check (true);

-- Pantau data dari Supabase Dashboard -> Table Editor -> support_messages.
-- Select/update/delete tetap tertutup untuk anon agar user app tidak bisa membaca data support.
