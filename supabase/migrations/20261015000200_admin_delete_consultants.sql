alter table public.catalog_admin_audit_log
  drop constraint if exists catalog_admin_audit_log_action_check;

alter table public.catalog_admin_audit_log
  add constraint catalog_admin_audit_log_action_check
  check (action in ('create', 'update', 'archive', 'restore', 'login', 'delete'));

-- Remover somente os dois cadastros antigos e seus aliases vinculados.
-- Preserva os aliases "representante" e "ivoney".
delete from public.catalog_consultant_aliases
where alias in ('representante1', 'representante2')
   or consultant_id in (
     select id
     from public.catalog_consultants
     where slug in ('representante1', 'representante2')
   );

delete from public.catalog_consultants
where slug in ('representante1', 'representante2');