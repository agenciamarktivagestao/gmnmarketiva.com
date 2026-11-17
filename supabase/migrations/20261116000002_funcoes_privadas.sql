-- As funções de permissão não precisam ficar expostas na API (/rest/v1/rpc).
-- Elas passam para o schema `private`; as políticas de segurança continuam funcionando.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.eh_equipe()    set schema private;
alter function public.pode_editar()  set schema private;
alter function public.eh_admin()     set schema private;

-- Função auxiliar que o próprio Supabase cria nos projetos: não deve ser chamada pela API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
