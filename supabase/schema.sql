-- GITEX Tracker Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'sales' check (role in ('admin', 'sales')),
  created_at timestamptz default now()
);

-- Accounts table
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sector text,
  assigned_to uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Contacts table
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references accounts(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  job_title text,
  email text,
  phone text,
  linkedin text,
  photo_url text,
  tag text not null default 'prospect' check (tag in ('prospect', 'client', 'partenaire', 'autre')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Interactions table
create table if not exists interactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references accounts(id) on delete cascade,
  type text not null check (type in ('visite_stand', 'meeting', 'rencontre', 'dinner', 'soiree')),
  date timestamptz default now(),
  location text,
  notes text,
  photos text[] default '{}',
  status text not null default 'a_suivre' check (status in ('a_suivre', 'en_cours', 'termine')),
  heat_score int not null default 1 check (heat_score between 1 and 3),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Dinners table
create table if not exists dinners (
  id uuid primary key default uuid_generate_v4(),
  day text not null,
  date date not null,
  restaurant text not null,
  menu_type text,
  notes text
);

-- Dinner guests table
create table if not exists dinner_guests (
  id uuid primary key default uuid_generate_v4(),
  dinner_id uuid references dinners(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  invited_by uuid references profiles(id) on delete set null,
  confirmation text not null default 'peut_etre' check (confirmation in ('oui', 'non', 'peut_etre')),
  created_at timestamptz default now(),
  unique(dinner_id, contact_id)
);

-- Indexes
create index if not exists idx_accounts_assigned on accounts(assigned_to);
create index if not exists idx_accounts_name on accounts(name);
create index if not exists idx_contacts_account on contacts(account_id);
create index if not exists idx_contacts_created_by on contacts(created_by);
create index if not exists idx_interactions_account on interactions(account_id);
create index if not exists idx_interactions_created_by on interactions(created_by);
create index if not exists idx_interactions_date on interactions(date);
create index if not exists idx_dinner_guests_dinner on dinner_guests(dinner_id);

-- RLS Policies
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table contacts enable row level security;
alter table interactions enable row level security;
alter table dinners enable row level security;
alter table dinner_guests enable row level security;

-- Profiles: users can read all, update own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Accounts: admin reads all, sales reads own; anyone can insert
create policy "accounts_read" on accounts for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or assigned_to = auth.uid()
);
create policy "accounts_insert" on accounts for insert with check (true);
create policy "accounts_update" on accounts for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or assigned_to = auth.uid()
);

-- Contacts: admin reads all, sales reads own
create policy "contacts_read" on contacts for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or created_by = auth.uid()
);
create policy "contacts_insert" on contacts for insert with check (true);
create policy "contacts_update" on contacts for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or created_by = auth.uid()
);

-- Interactions: admin reads all, sales reads own
create policy "interactions_read" on interactions for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or created_by = auth.uid()
);
create policy "interactions_insert" on interactions for insert with check (true);
create policy "interactions_update" on interactions for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or created_by = auth.uid()
);

-- Dinners: everyone can read
create policy "dinners_read" on dinners for select using (true);
create policy "dinners_insert" on dinners for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Dinner guests: admin reads all, sales reads own invites
create policy "dinner_guests_read" on dinner_guests for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or invited_by = auth.uid()
);
create policy "dinner_guests_insert" on dinner_guests for insert with check (true);
create policy "dinner_guests_update" on dinner_guests for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or invited_by = auth.uid()
);
create policy "dinner_guests_delete" on dinner_guests for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or invited_by = auth.uid()
);

-- Seed dinner events
insert into dinners (day, date, restaurant, menu_type, notes) values
  ('Lundi', '2026-04-07', 'Libre', 'Libre', 'Chaque Sales invite qui il veut'),
  ('Mardi', '2026-04-08', 'Brahim Pacha', 'Menu fixe', 'Pas à la carte'),
  ('Mercredi', '2026-04-09', 'Malak Emrode', 'Menu fixe', 'Pas à la carte'),
  ('Jeudi', '2026-04-10', 'À définir', 'À définir', 'Dernier jour')
on conflict do nothing;

-- Storage bucket for photos
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict do nothing;

-- Storage policies
create policy "photos_upload" on storage.objects for insert with check (bucket_id = 'photos');
create policy "photos_read" on storage.objects for select using (bucket_id = 'photos');
