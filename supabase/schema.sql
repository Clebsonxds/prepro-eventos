-- PREPRO EVENTOS — schema Alpha 0.2
-- Projeto NOVO e independente. Execute em um Supabase novo.
create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('admin','management','producer','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.approval_status as enum ('pending','approved','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.project_role as enum ('owner','editor','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.project_status as enum ('draft','in_progress','review','approved','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.area_key as enum ('audio','lighting','video','structure'); exception when duplicate_object then null; end $$;
do $$ begin create type public.mount_type as enum ('aerial','floor','mixed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_status as enum ('pending','verified'); exception when duplicate_object then null; end $$;
do $$ begin create type public.panel_type as enum ('flat','curved','flexible','other'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.user_role not null default 'viewer',
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null default '', venue text not null default '', address text not null default '', spaces text not null default '',
  commercial_responsible text not null default '', coordinator text not null default '',
  assembly_start timestamptz, assembly_end timestamptz, event_start timestamptz, event_end timestamptz, release_end timestamptz,
  status public.project_status not null default 'draft', metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint projects_assembly_order check (assembly_start is null or assembly_end is null or assembly_end >= assembly_start),
  constraint projects_event_order check (event_start is null or event_end is null or event_end >= event_start),
  constraint projects_event_after_assembly check (assembly_end is null or event_start is null or event_start >= assembly_end),
  constraint projects_release_order check (event_end is null or release_end is null or release_end >= event_end)
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'viewer', created_at timestamptz not null default now(), primary key(project_id,user_id)
);

create table if not exists public.equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text not null, manufacturer text not null default '', model text not null default '',
  weight_kg numeric(12,3) not null default 0 check(weight_kg>=0),
  power_w numeric(14,3) not null default 0 check(power_w>=0), max_power_w numeric(14,3) not null default 0 check(max_power_w>=0),
  dmx_channels integer not null default 0 check(dmx_channels>=0), audio_inputs integer not null default 0 check(audio_inputs>=0), case_capacity integer not null default 1 check(case_capacity>0),
  module_width_m numeric(10,4), module_height_m numeric(10,4), pixels_w integer, pixels_h integer, pitch_mm numeric(10,4), panel_type public.panel_type,
  output_ports integer, max_pixels bigint, kg_per_m numeric(10,3),
  stock_total integer not null default 0 check(stock_total>=0), maintenance_qty integer not null default 0 check(maintenance_qty>=0 and maintenance_qty<=stock_total),
  verification_status public.verification_status not null default 'pending', notes text not null default '', active boolean not null default true,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.project_groups (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  area public.area_key not null, name text not null, mount_type public.mount_type not null default 'floor', structure_type text not null default '',
  length_m numeric(10,3) not null default 0 check(length_m>=0), points_count integer not null default 0 check(points_count>=0), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.project_groups(id) on delete set null, area public.area_key not null,
  equipment_id uuid not null references public.equipment_catalog(id), quantity integer not null default 1 check(quantity>0), position_name text not null default '',
  override_weight_kg numeric(12,3), override_power_w numeric(14,3), notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(), equipment_id uuid not null references public.equipment_catalog(id) on delete cascade,
  quantity integer not null check(quantity>0), reason text not null default '', status text not null default 'open' check(status in ('open','closed')),
  opened_by uuid references auth.users(id), closed_by uuid references auth.users(id), opened_at timestamptz not null default now(), closed_at timestamptz
);

create table if not exists public.reservation_overrides (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  equipment_id uuid not null references public.equipment_catalog(id), extra_quantity integer not null check(extra_quantity>0), reason text not null,
  approved_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key, project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id), actor_name text not null default '', action text not null, entity_type text not null, entity_id text not null,
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.project_members(user_id);
create index if not exists idx_items_project on public.project_items(project_id);
create index if not exists idx_items_equipment on public.project_items(equipment_id);
create index if not exists idx_groups_project on public.project_groups(project_id);
create index if not exists idx_audit_project on public.audit_log(project_id,created_at desc);

-- Helpers de autorização ------------------------------------------------------
create or replace function public.current_profile_role() returns public.user_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() and approval_status='approved' limit 1 $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_profile_role()='admin',false) $$;
create or replace function public.is_management() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_profile_role() in ('admin','management'),false) $$;
create or replace function public.can_produce() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_profile_role() in ('admin','management','producer'),false) $$;
create or replace function public.project_access(p uuid) returns public.project_role language sql stable security definer set search_path=public as $$ select role from public.project_members where project_id=p and user_id=auth.uid() limit 1 $$;
create or replace function public.can_view_project(p uuid) returns boolean language sql stable security definer set search_path=public as $$ select coalesce((select approval_status='approved' from public.profiles where id=auth.uid()),false) $$;
create or replace function public.can_edit_project(p uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.can_produce() $$;

-- Cadastro: toda conta nasce bloqueada ----------------------------------------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,email,role,approval_status)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),coalesce(new.email,''),'viewer','pending')
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Gerência não pode promover alguém para Gerência/Admin -----------------------
create or replace function public.protect_profile_roles() returns trigger language plpgsql security definer set search_path=public as $$
declare actor_role public.user_role;
begin
  if auth.uid() is null then return new; end if;
  select role into actor_role from public.profiles where id=auth.uid();

  -- Usuários comuns podem alterar apenas dados próprios não privilegiados (ex.: nome).
  if actor_role not in ('management','admin') then
    if new.id<>auth.uid() then raise exception 'Sem permissão para alterar usuários'; end if;
    if new.role is distinct from old.role or new.approval_status is distinct from old.approval_status then
      raise exception 'Usuário não pode alterar o próprio papel ou aprovação';
    end if;
    return new;
  end if;

  -- Gerência não administra contas privilegiadas nem promove para Gerência/Admin.
  if actor_role='management' then
    if old.role in ('management','admin') and new.id<>auth.uid() then
      raise exception 'Gerência não pode alterar outra conta privilegiada';
    end if;
    if new.role in ('management','admin') and new.role is distinct from old.role then
      raise exception 'Somente Admin pode promover Gerência ou Admin';
    end if;
    if old.role in ('management','admin') and new.approval_status is distinct from old.approval_status and new.id<>auth.uid() then
      raise exception 'Somente Admin pode alterar o status de conta privilegiada';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_roles on public.profiles;
create trigger protect_profile_roles before update on public.profiles for each row execute function public.protect_profile_roles();

create or replace function public.add_project_owner() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.project_members(project_id,user_id,role) values(new.id,new.created_by,'owner') on conflict(project_id,user_id) do update set role='owner'; return new; end $$;
drop trigger if exists project_add_owner on public.projects;
create trigger project_add_owner after insert on public.projects for each row execute function public.add_project_owner();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create or replace trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create or replace trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
create or replace trigger touch_equipment before update on public.equipment_catalog for each row execute function public.touch_updated_at();
create or replace trigger touch_groups before update on public.project_groups for each row execute function public.touch_updated_at();
create or replace trigger touch_items before update on public.project_items for each row execute function public.touch_updated_at();

-- Disponibilidade de estoque no intervalo do projeto --------------------------
create or replace function public.equipment_availability(p_equipment_id uuid,p_project_id uuid)
returns table(equipment_id uuid,stock_total integer,maintenance_qty integer,reserved_qty bigint,available_qty bigint,window_start timestamptz,window_end timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare s timestamptz; e timestamptz; total integer; maint integer; reserved bigint; own_reserved bigint; override_qty bigint;
begin
  select assembly_start,coalesce(release_end,event_end) into s,e from public.projects where id=p_project_id;
  select ec.stock_total,ec.maintenance_qty into total,maint from public.equipment_catalog ec where ec.id=p_equipment_id;
  reserved:=0; own_reserved:=0; override_qty:=0;
  if s is not null and e is not null then
    select coalesce(sum(pi.quantity),0) into reserved from public.project_items pi join public.projects p on p.id=pi.project_id
    where pi.equipment_id=p_equipment_id and p.id<>p_project_id and p.assembly_start is not null and coalesce(p.release_end,p.event_end) is not null
      and tstzrange(p.assembly_start,coalesce(p.release_end,p.event_end),'[)') && tstzrange(s,e,'[)');
  end if;
  select coalesce(sum(pi.quantity),0) into own_reserved from public.project_items pi where pi.project_id=p_project_id and pi.equipment_id=p_equipment_id;
  select coalesce(sum(extra_quantity),0) into override_qty from public.reservation_overrides where project_id=p_project_id and equipment_id=p_equipment_id;
  return query select p_equipment_id,total,maint,reserved,greatest(total-maint-reserved-own_reserved+override_qty,0),s,e;
end $$;

create or replace function public.check_inventory_before_item() returns trigger language plpgsql security definer set search_path=public as $$
declare total integer; maint integer; reserved bigint; same_project bigint; override_qty bigint; s timestamptz; e timestamptz;
begin
  select stock_total,maintenance_qty into total,maint from public.equipment_catalog where id=new.equipment_id;
  if total=0 then return new; end if; -- estoque zero = item ainda não controlado/homologado
  select assembly_start,coalesce(release_end,event_end) into s,e from public.projects where id=new.project_id;
  if s is null or e is null then return new; end if;
  select coalesce(sum(pi.quantity),0) into same_project from public.project_items pi where pi.project_id=new.project_id and pi.equipment_id=new.equipment_id and (tg_op='INSERT' or pi.id<>new.id);
  select coalesce(sum(pi.quantity),0) into reserved from public.project_items pi join public.projects p on p.id=pi.project_id
    where pi.equipment_id=new.equipment_id and p.id<>new.project_id and p.assembly_start is not null and coalesce(p.release_end,p.event_end) is not null
      and tstzrange(p.assembly_start,coalesce(p.release_end,p.event_end),'[)') && tstzrange(s,e,'[)');
  select coalesce(sum(extra_quantity),0) into override_qty from public.reservation_overrides where project_id=new.project_id and equipment_id=new.equipment_id;
  if same_project+reserved+new.quantity > total-maint+override_qty then raise exception 'Estoque insuficiente para o período selecionado'; end if;
  return new;
end $$;
drop trigger if exists item_inventory_check on public.project_items;
create trigger item_inventory_check before insert or update of quantity,equipment_id,project_id on public.project_items for each row execute function public.check_inventory_before_item();

-- Auditoria ------------------------------------------------------------------
create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$
declare pid uuid; entity text; actor text;
begin
  pid:=case when tg_table_name='projects' then coalesce(new.id,old.id) else coalesce(new.project_id,old.project_id) end;
  entity:=coalesce(new.id::text,old.id::text);
  select full_name into actor from public.profiles where id=auth.uid();
  insert into public.audit_log(project_id,actor_id,actor_name,action,entity_type,entity_id,payload)
  values(pid,auth.uid(),coalesce(actor,''),lower(tg_op),tg_table_name,entity,case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new,old);
end $$;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='audit_projects') then create trigger audit_projects after insert or update or delete on public.projects for each row execute function public.audit_change(); end if;
  if not exists(select 1 from pg_trigger where tgname='audit_groups') then create trigger audit_groups after insert or update or delete on public.project_groups for each row execute function public.audit_change(); end if;
  if not exists(select 1 from pg_trigger where tgname='audit_items') then create trigger audit_items after insert or update or delete on public.project_items for each row execute function public.audit_change(); end if;
exception when others then null; end $$;


-- Auditoria global e exceções -------------------------------------------------
create or replace function public.audit_global_change() returns trigger language plpgsql security definer set search_path=public as $$
declare entity text; actor text;
begin
  entity:=coalesce(new.id::text,old.id::text);
  select full_name into actor from public.profiles where id=auth.uid();
  insert into public.audit_log(project_id,actor_id,actor_name,action,entity_type,entity_id,payload)
  values(null,auth.uid(),coalesce(actor,''),lower(tg_op),tg_table_name,entity,case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new,old);
end $$;

create or replace function public.audit_project_child_change() returns trigger language plpgsql security definer set search_path=public as $$
declare pid uuid; entity text; actor text;
begin
  pid:=coalesce(new.project_id,old.project_id);
  entity:=coalesce(new.id::text,old.id::text);
  select full_name into actor from public.profiles where id=auth.uid();
  insert into public.audit_log(project_id,actor_id,actor_name,action,entity_type,entity_id,payload)
  values(pid,auth.uid(),coalesce(actor,''),lower(tg_op),tg_table_name,entity,case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new,old);
end $$;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='audit_catalog') then create trigger audit_catalog after insert or update or delete on public.equipment_catalog for each row execute function public.audit_global_change(); end if;
  if not exists(select 1 from pg_trigger where tgname='audit_profiles') then create trigger audit_profiles after update on public.profiles for each row execute function public.audit_global_change(); end if;
  if not exists(select 1 from pg_trigger where tgname='audit_overrides') then create trigger audit_overrides after insert or update or delete on public.reservation_overrides for each row execute function public.audit_project_child_change(); end if;
exception when others then null; end $$;

-- RLS ------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.equipment_catalog enable row level security;
alter table public.project_groups enable row level security;
alter table public.project_items enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.reservation_overrides enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists profiles_read on public.profiles; create policy profiles_read on public.profiles for select using(id=auth.uid() or public.is_management());
drop policy if exists profiles_update on public.profiles; create policy profiles_update on public.profiles for update using(id=auth.uid() or public.is_management()) with check(id=auth.uid() or public.is_management());
drop policy if exists projects_read on public.projects; create policy projects_read on public.projects for select using(public.can_view_project(id));
drop policy if exists projects_insert on public.projects; create policy projects_insert on public.projects for insert with check(public.can_produce() and created_by=auth.uid());
drop policy if exists projects_update on public.projects; create policy projects_update on public.projects for update using(public.can_edit_project(id));
drop policy if exists projects_delete on public.projects; create policy projects_delete on public.projects for delete using(public.is_management() or public.project_access(id)='owner');
drop policy if exists members_read on public.project_members; create policy members_read on public.project_members for select using(public.can_view_project(project_id));
drop policy if exists members_write on public.project_members; create policy members_write on public.project_members for all using(public.is_management() or public.project_access(project_id)='owner') with check(public.is_management() or public.project_access(project_id)='owner');
drop policy if exists catalog_read on public.equipment_catalog; create policy catalog_read on public.equipment_catalog for select using((select approval_status='approved' from public.profiles where id=auth.uid()));
drop policy if exists catalog_write on public.equipment_catalog; create policy catalog_write on public.equipment_catalog for all using(public.is_management()) with check(public.is_management());
drop policy if exists groups_read on public.project_groups; create policy groups_read on public.project_groups for select using(public.can_view_project(project_id));
drop policy if exists groups_write on public.project_groups; create policy groups_write on public.project_groups for all using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
drop policy if exists items_read on public.project_items; create policy items_read on public.project_items for select using(public.can_view_project(project_id));
drop policy if exists items_write on public.project_items; create policy items_write on public.project_items for all using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
drop policy if exists maintenance_read on public.maintenance_records; create policy maintenance_read on public.maintenance_records for select using((select approval_status='approved' from public.profiles where id=auth.uid()));
drop policy if exists maintenance_write on public.maintenance_records; create policy maintenance_write on public.maintenance_records for all using(public.is_management()) with check(public.is_management());
drop policy if exists override_read on public.reservation_overrides; create policy override_read on public.reservation_overrides for select using(public.can_view_project(project_id));
drop policy if exists override_write on public.reservation_overrides; create policy override_write on public.reservation_overrides for all using(public.is_management()) with check(public.is_management());
drop policy if exists audit_read on public.audit_log; create policy audit_read on public.audit_log for select using(project_id is null and public.is_management() or project_id is not null and public.can_view_project(project_id));

-- Primeiro Admin: depois de criar sua conta, execute manualmente substituindo o e-mail:
-- update public.profiles set role='admin', approval_status='approved' where email='SEU_EMAIL@EMPRESA.COM';
