-- Marktiva · Rotina única da madrugada.
-- A rotina passou a rodar todos os dias, das 02:30 às 04:30, e registra cada rodada como 'madrugada'.
-- O tipo antigo 'diaria' vira 'madrugada'; 'quarta_sexta' continua aceito para o histórico das rodadas antigas.
-- Esta migration já foi aplicada no projeto pelo conector do Supabase; o arquivo existe para o repositório ficar igual ao banco.
-- Pode ser rodada de novo sem efeito colateral.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.execucoes'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%tipo%'
  loop
    execute format('alter table public.execucoes drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.execucoes
  add constraint execucoes_tipo_check check (tipo in ('madrugada', 'diaria', 'quarta_sexta', 'manual'));

alter table public.execucoes alter column tipo set default 'madrugada';

update public.execucoes set tipo = 'madrugada' where tipo = 'diaria';
