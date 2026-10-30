-- Already applied to the Supabase project 'okba'. Kept here as the record of the database structure.
-- Roles: 'sourcer' brings goods from China, 'seller' gets orders from clients.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  role text not null unique check (role in ('sourcer', 'seller')) -- one account per role
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  owner text not null default 'seller' check (owner in ('sourcer', 'seller')),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete restrict,
  title text not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'purchased', 'shipped', 'arrived', 'delivered')),
  order_date date not null default current_date,
  delivered_date date,
  deposit numeric not null default 0,          -- set by the seller
  shipping_cost numeric not null default 0,
  other_cost numeric not null default 0,
  sourcer_share_pct numeric not null default 50 -- only used for the sourcer's own clients
    check (sourcer_share_pct between 0 and 100),
  delivered_by text check (delivered_by in ('sourcer', 'seller')),
  notes text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  name text not null,
  qty_ordered integer not null check (qty_ordered >= 0),
  qty_received integer check (qty_received >= 0), -- null until the goods arrive
  unit_cost numeric not null default 0,           -- what one piece costs us, in DZD
  unit_price numeric not null default 0           -- what the client pays per piece, in DZD
);

-- Monthly extra charges, deducted from that month's total profit and split 50/50.
create table charges (
  id uuid primary key default gen_random_uuid(),
  month date not null,  -- first day of the month
  label text not null,
  amount numeric not null,
  paid_by text not null check (paid_by in ('sourcer', 'seller')),
  created_at timestamptz not null default now()
);

-- Money handed from one partner to the other to settle up.
create table transfers (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  from_role text not null check (from_role in ('sourcer', 'seller')),
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);

-- Only the two partners can see or change data.
create schema private;
grant usage on schema private to authenticated;

create function private.is_partner() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid()) $$;

alter table profiles enable row level security;
create policy "partners read profiles" on profiles for select to authenticated using (private.is_partner() or id = auth.uid());
create policy "create own profile" on profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['clients', 'orders', 'order_items', 'charges', 'transfers'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "partners only" on %I for all to authenticated using (private.is_partner()) with check (private.is_partner())', t);
  end loop;
end $$;

revoke execute on function private.is_partner() from anon, public;
grant execute on function private.is_partner() to authenticated;
