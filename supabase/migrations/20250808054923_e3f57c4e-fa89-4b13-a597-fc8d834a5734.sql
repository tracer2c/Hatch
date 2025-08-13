
-- 1) Create a units table
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '00000000-0000-0000-0000-000000000001',
  name text not null,
  code text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_company_name_unique unique (company_id, name)
);

-- RLS
alter table public.units enable row level security;

-- Company-scoped access similar to other tables
drop policy if exists "Company users can access their units" on public.units;
create policy "Company users can access their units"
  on public.units
  for all
  using (company_id = get_user_company(auth.uid()));

-- 2) Add unit_id to flocks and batches
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'flocks' and column_name = 'unit_id'
  ) then
    alter table public.flocks add column unit_id uuid;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'batches' and column_name = 'unit_id'
  ) then
    alter table public.batches add column unit_id uuid;
  end if;
end$$;

-- 3) FKs
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'flocks_unit_fk'
  ) then
    alter table public.flocks
      add constraint flocks_unit_fk
      foreign key (unit_id) references public.units(id) on delete set null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'batches_unit_fk'
  ) then
    alter table public.batches
      add constraint batches_unit_fk
      foreign key (unit_id) references public.units(id) on delete set null;
  end if;
end$$;

-- 4) Indexes for performance
create index if not exists idx_flocks_unit_id on public.flocks(unit_id);
create index if not exists idx_batches_unit_id on public.batches(unit_id);

-- 5) Backfill: create a Default unit for each existing company
insert into public.units (company_id, name, code, description, status)
select c.id, 'Default', 'DEFAULT', 'Default unit', 'active'
from public.companies c
where not exists (
  select 1 from public.units u where u.company_id = c.id and u.name = 'Default'
);

-- 6) Backfill existing rows to link to the company’s Default unit
update public.flocks f
set unit_id = u.id
from public.units u
where u.company_id = f.company_id
  and u.name = 'Default'
  and (f.unit_id is null);

update public.batches b
set unit_id = u.id
from public.units u
where u.company_id = b.company_id
  and u.name = 'Default'
  and (b.unit_id is null);
