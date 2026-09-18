-- Projeto Técnico de Eventos — schema inicial (Alpha)
-- Execute em um projeto Supabase NOVO. Não reutilize banco, chaves ou tabelas de outro sistema.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin','producer','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.project_role as enum ('owner','editor','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.project_status as enum ('draft','in_progress','review','approved','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.area_key as enum ('audio','lighting','video','structure');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mount_type as enum ('aerial','floor','mixed');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'producer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null default '',
  venue text not null default '',
  address text not null default '',
  spaces text not null default '',
  commercial_responsible text not null default '',
  coordinator text not null default '',
  assembly_start timestamptz,
  assembly_end timestamptz,
  event_start timestamptz,
  event_end timestamptz,
  status public.project_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_assembly_order check (assembly_start is null or assembly_end is null or assembly_end >= assembly_start),
  constraint projects_event_order check (event_start is null or event_end is null or event_end >= event_start),
  constraint projects_event_after_assembly check (assembly_end is null or event_start is null or event_start >= assembly_end)
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  manufacturer text not null default '',
  model text not null default '',
  weight_kg numeric(12,3) not null default 0 check (weight_kg >= 0),
  power_w numeric(14,3) not null default 0 check (power_w >= 0),
  dmx_channels integer not null default 0 check (dmx_channels >= 0),
  audio_inputs integer not null default 0 check (audio_inputs >= 0),
  case_capacity integer not null default 1 check (case_capacity > 0),
  module_width_m numeric(10,4),
  module_height_m numeric(10,4),
  pixels_w integer,
  pixels_h integer,
  notes text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  area public.area_key not null,
  name text not null,
  mount_type public.mount_type not null default 'floor',
  structure_type text not null default '',
  length_m numeric(10,3) not null default 0 check (length_m >= 0),
  points_count integer not null default 0 check (points_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.project_groups(id) on delete cascade,
  equipment_id uuid not null references public.equipment_catalog(id),
  quantity integer not null default 1 check (quantity > 0),
  override_weight_kg numeric(12,3),
  override_power_w numeric(14,3),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_project_groups_project on public.project_groups(project_id);
create index if not exists idx_project_items_project on public.project_items(project_id);
create index if not exists idx_project_items_group on public.project_items(group_id);
create index if not exists idx_audit_project on public.audit_log(project_id, created_at desc);

-- Utilidades seguras para RLS --------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;


create or replace function public.can_write_global()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','producer'));
$$;

create or replace function public.project_access(p_project_id uuid)
returns public.project_role
language sql
stable
security definer
set search_path = public
as $$
  select pm.role from public.project_members pm
  where pm.project_id = p_project_id and pm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.project_access(p_project_id) is not null;
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (public.can_write_global() and public.project_access(p_project_id) in ('owner','editor'));
$$;

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (public.can_write_global() and public.project_access(p_project_id) = 'owner');
$$;

-- Perfil automático para cada usuário criado no Auth -------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'producer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- O criador entra automaticamente como owner do novo projeto -----------------
create or replace function public.add_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members(project_id, user_id, role)
  values(new.id, new.created_by, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists project_add_owner on public.projects;
create trigger project_add_owner
after insert on public.projects
for each row execute function public.add_project_owner();


-- Campos de propriedade que não podem ser trocados pelo cliente ----------------
create or replace function public.protect_project_identity()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_project_identity on public.projects;
create trigger protect_project_identity
before update on public.projects
for each row execute function public.protect_project_identity();

-- updated_at -----------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create or replace trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
create or replace trigger touch_equipment before update on public.equipment_catalog for each row execute function public.touch_updated_at();
create or replace trigger touch_groups before update on public.project_groups for each row execute function public.touch_updated_at();
create or replace trigger touch_items before update on public.project_items for each row execute function public.touch_updated_at();

-- RLS ------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.equipment_catalog enable row level security;
alter table public.project_groups enable row level security;
alter table public.project_items enable row level security;
alter table public.audit_log enable row level security;

-- Profiles: usuário vê seu perfil; admin vê todos. Alteração de papéis só pelo admin.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
using (public.can_view_project(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
with check (created_by = auth.uid() and public.can_write_global());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
using (public.can_edit_project(id)) with check (public.can_edit_project(id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
using (public.is_project_owner(id));

-- Members
drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members for select to authenticated
using (public.can_view_project(project_id));

drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members for insert to authenticated
with check (public.is_project_owner(project_id));

drop policy if exists members_update on public.project_members;
create policy members_update on public.project_members for update to authenticated
using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));

drop policy if exists members_delete on public.project_members;
create policy members_delete on public.project_members for delete to authenticated
using (public.is_project_owner(project_id) and user_id <> auth.uid());

-- Catálogo: todos autenticados consultam; somente admin altera.
drop policy if exists catalog_select on public.equipment_catalog;
create policy catalog_select on public.equipment_catalog for select to authenticated using (true);

drop policy if exists catalog_insert on public.equipment_catalog;
create policy catalog_insert on public.equipment_catalog for insert to authenticated with check (public.is_admin());

drop policy if exists catalog_update on public.equipment_catalog;
create policy catalog_update on public.equipment_catalog for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists catalog_delete on public.equipment_catalog;
create policy catalog_delete on public.equipment_catalog for delete to authenticated using (public.is_admin());

-- Grupos e itens seguem a permissão do projeto.
drop policy if exists groups_select on public.project_groups;
create policy groups_select on public.project_groups for select to authenticated using (public.can_view_project(project_id));
drop policy if exists groups_insert on public.project_groups;
create policy groups_insert on public.project_groups for insert to authenticated with check (public.can_edit_project(project_id));
drop policy if exists groups_update on public.project_groups;
create policy groups_update on public.project_groups for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists groups_delete on public.project_groups;
create policy groups_delete on public.project_groups for delete to authenticated using (public.can_edit_project(project_id));

drop policy if exists items_select on public.project_items;
create policy items_select on public.project_items for select to authenticated using (public.can_view_project(project_id));
drop policy if exists items_insert on public.project_items;
create policy items_insert on public.project_items for insert to authenticated with check (public.can_edit_project(project_id));
drop policy if exists items_update on public.project_items;
create policy items_update on public.project_items for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists items_delete on public.project_items;
create policy items_delete on public.project_items for delete to authenticated using (public.can_edit_project(project_id));

-- Audit log: leitura para membros; escrita futura por funções/triggers protegidos.
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
using (project_id is not null and public.can_view_project(project_id));

-- IMPORTANTE -----------------------------------------------------------------
-- 1) Em Authentication > Providers, não habilite cadastro público se o sistema for interno.
-- 2) Crie/convide os usuários pelo Dashboard inicialmente.
-- 3) Após criar seu primeiro usuário, promova-o uma única vez pelo SQL Editor:
--    update public.profiles set role = 'admin' where id = 'UUID_DO_SEU_USUARIO';
-- 4) NUNCA coloque a service_role no frontend, GitHub, .env público ou Vite.
