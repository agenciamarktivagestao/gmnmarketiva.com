-- Histórico: novo tipo "atributo" (pagamento, estacionamento, acessibilidade e outros atributos do perfil no Google).
-- Só amplia a lista permitida; nenhuma linha existente muda.
alter table public.historico drop constraint historico_tipo_check;
alter table public.historico
  add constraint historico_tipo_check
  check (tipo in ('foto', 'servico', 'categoria', 'resposta', 'post', 'area', 'descricao', 'atributo', 'analise', 'decisao', 'outro'));
