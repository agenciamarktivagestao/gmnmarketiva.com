-- Conferência no Google: cada ação gravada no histórico só conta como feita de verdade
-- depois que alguém (a rotina ou a equipe) releu o perfil no Google e confirmou.
-- conferido_em fica vazio enquanto ninguém conferiu; o painel mostra "Conferido no Google" quando preenchido.
alter table public.historico
  add column if not exists conferido_em timestamptz;

comment on column public.historico.conferido_em is
  'Quando a ação foi relida no Google e confirmada. Vazio = ainda não conferida.';

-- Consulta rápida do que ainda falta conferir (só ações que deram certo e mexeram no Google)
create index if not exists historico_sem_conferencia_idx
  on public.historico (ocorreu_em desc)
  where conferido_em is null and ok;
