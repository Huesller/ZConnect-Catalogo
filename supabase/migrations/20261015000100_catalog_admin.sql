create table if not exists public.catalog_consultants (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique
        check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]*$'),
    display_name text not null check (length(trim(display_name)) > 0),
    whatsapp_phone text
        check (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{10,15}$'),
    catalog_discount_policy numeric(5,2) not null default 45
        check (catalog_discount_policy >= 0 and catalog_discount_policy < 100),
    offer_base_discount numeric(5,2) not null default 45
        check (offer_base_discount >= 0 and offer_base_discount < 100),
    target_discount numeric(5,2) not null default 45
        check (target_discount >= 0 and target_discount < 100),
    active boolean not null default true,
    sort_order integer not null default 100,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.catalog_consultant_aliases (
    alias text primary key
        check (alias = lower(alias) and alias ~ '^[a-z0-9][a-z0-9-]*$'),
    consultant_id uuid not null
        references public.catalog_consultants(id) on delete restrict,
    created_at timestamptz not null default now()
);

create table if not exists public.catalog_admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    role text not null default 'admin'
        check (role in ('owner', 'admin')),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists catalog_admin_users_email_lower_idx
    on public.catalog_admin_users (lower(email));

create table if not exists public.catalog_admin_audit_log (
    id bigint generated always as identity primary key,
    actor_user_id uuid references auth.users(id) on delete set null,
    actor_email text,
    action text not null
        check (action in ('create', 'update', 'archive', 'restore', 'login')),
    entity_type text not null,
    entity_id text not null,
    before_data jsonb,
    after_data jsonb,
    request_id text,
    created_at timestamptz not null default now()
);

create index if not exists catalog_consultants_active_order_idx
    on public.catalog_consultants (active, sort_order, display_name);

create index if not exists catalog_consultant_aliases_consultant_idx
    on public.catalog_consultant_aliases (consultant_id);

create index if not exists catalog_admin_audit_log_created_idx
    on public.catalog_admin_audit_log (created_at desc);

create or replace function public.catalog_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists catalog_consultants_updated_at
    on public.catalog_consultants;
create trigger catalog_consultants_updated_at
before update on public.catalog_consultants
for each row execute function public.catalog_set_updated_at();

drop trigger if exists catalog_admin_users_updated_at
    on public.catalog_admin_users;
create trigger catalog_admin_users_updated_at
before update on public.catalog_admin_users
for each row execute function public.catalog_set_updated_at();

alter table public.catalog_consultants enable row level security;
alter table public.catalog_consultant_aliases enable row level security;
alter table public.catalog_admin_users enable row level security;
alter table public.catalog_admin_audit_log enable row level security;

revoke all on table public.catalog_consultants from anon, authenticated;
revoke all on table public.catalog_consultant_aliases from anon, authenticated;
revoke all on table public.catalog_admin_users from anon, authenticated;
revoke all on table public.catalog_admin_audit_log from anon, authenticated;

grant all on table public.catalog_consultants to service_role;
grant all on table public.catalog_consultant_aliases to service_role;
grant all on table public.catalog_admin_users to service_role;
grant all on table public.catalog_admin_audit_log to service_role;
grant usage, select on sequence public.catalog_admin_audit_log_id_seq to service_role;

comment on table public.catalog_consultants is
    'Cadastro central de consultores. Alteracoes via API administrativa autenticada.';
comment on table public.catalog_consultant_aliases is
    'Aliases historicos para preservar compatibilidade com links e nomes antigos.';
comment on table public.catalog_admin_users is
    'Lista de usuarios autorizados no painel administrativo do catalogo.';
comment on table public.catalog_admin_audit_log is
    'Historico de auditoria das operacoes administrativas.';
