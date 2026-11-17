# Seção SISTEMA para as rotinas

Texto para acrescentar ao prompt das duas rotinas (madrugada e quarta e sexta), logo antes dos LIMITES. Ele faz a rotina ler do painel o que a equipe decidiu e gravar de volta o que fez. Exige o conector **Supabase** ligado à rotina (projeto `zfvutyhrehmwhzyfbfbv`). Sem o conector, a rotina segue o comportamento antigo e avisa no relatório.

Os LIMITES de cada rotina continuam valendo acima de qualquer diretriz do painel.

```
SISTEMA (painel Marktiva Perfis, conector Supabase, projeto zfvutyhrehmwhzyfbfbv)
Carregue as ferramentas do Supabase com ToolSearch. Se não houver conector Supabase ou as consultas falharem, siga só com o log do Drive, como antes, e diga isso no relatório. Nunca grave segredo, senha ou chave em nenhuma tabela.

LEITURA no começo (execute_sql, somente select):
1. Perfis: select id, slug, nome, gbp_location from clientes where ativo. Use gbp_location (locations/ID) para ligar cada cliente ao perfil do Windsor.
2. Diretrizes: select * from diretrizes. A linha com cliente_id nulo vale para todos; a de cada cliente refina. Campos: ideia_principal, tom, tratamento (voce, senhor, neutro), emojis (nenhum, poucos, livre), assinatura, usar, evitar, exemplo_resposta, exemplo_postagem, aprovacao.
3. Decisões da equipe: pendencias com status = 'aprovada'; comentarios criados depois da última execução (select * from execucoes order by iniciada_em desc limit 1); servicos com status = 'aprovado'; midias com status = 'na_fila'; conteudos com status = 'aprovado'.
4. Respostas por tipo: a pendência aprovada pode trazer kind (approve, choose, input, upload, external) e resposta (jsonb). Sem kind, é uma aprovação simples. Com resposta, use resposta.valor como o dado que a equipe confirmou: choose = a opção escolhida (ou "outro" com o texto); input = cidades (lista), horario (por dia: fechado, 24h ou abre e fecha), checklist (marcados e outro) ou texto; upload = ids de midias que já estão na fila. O resumo em texto também chega como comentário que começa com "Resposta pelo painel:". external nunca é aprovada: só a equipe resolve e marca como feita. avaliacoes (pendência com payload.avaliacoes): cada avaliação é tratada à parte. resposta.valor traz, por review_id, a ação: "publicar" (já existe uma linha em conteudos, tipo resposta, status aprovado, com o texto final editado pela equipe e o review_id: é essa que a rotina publica, como descrito em conteudos aprovados) ou "revisao" (a equipe pediu revisão ao Google; a rotina não consegue pedir isso, é manual no perfil pelo Chrome, então só registre em historico e não tente responder). A pendência fica aberta até todas as avaliações terem ação.

COMO ESCREVER (respostas a avaliações, postagens e descrições de serviço)
- Siga a ideia_principal (geral e do cliente), o tom, o tratamento, os emojis e a assinatura. Use os termos de "usar" quando couberem e nunca use o que está em "evitar".
- Os exemplos mostram o jeito, não o texto: não copie frases deles. Em exemplo_resposta, {nome} é o nome de quem avaliou.
- Se uma diretriz pedir algo proibido pelos LIMITES (preço, prazo, garantia, promessa, dado pessoal, dado de saúde, admitir culpa), ignore essa parte e registre no relatório.
- aprovacao = 'manual': não publique nada desse cliente. Grave o texto em conteudos com status = 'rascunho' e origem = 'rotina' (postagem: tipo 'postagem'; resposta: tipo 'resposta', com avaliador, estrelas, avaliacao e review_id) e a equipe aprova no painel. aprovacao = 'automatica': publique como antes.

EXECUÇÃO do que a equipe aprovou (conta como ajuste, respeitando a meta e os LIMITES)
- pendencias aprovadas: faça o que pedem, se couber nos LIMITES; depois update pendencias set status = 'concluida'. O que não couber, deixe como está e explique no relatório.
- servicos aprovados: monte a lista inteira (regra de ouro dos serviços: reenvie todos os itens existentes com ids e descrições, mais os aprovados), envie com update_service_items, releia e confira. Depois update servicos set status = 'no_perfil' where id in (...). Serviço novo que você achar com respaldo: em cliente 'automatica', aplique e registre em servicos com origem = 'rotina' e status = 'no_perfil'; em cliente 'manual', registre com status = 'sugerido'. Nome até 120 caracteres e descrição até 150, sem preço, prazo ou promessa.
- midias na fila: para cada uma, upload_media com a coluna url (já é pública) e a categoria da coluna categoria. COVER só se largura > altura; depois do upload, confira como no PASSO FOTOS e, se saiu vertical, avise. Depois update midias set status = 'enviada', enviada_em = now(). Se o envio falhar, deixe na fila e anote em historico com ok = false.
- conteudos aprovados: postagem → create_local_post com o texto (e a imagem da midia_id, se houver e o schema aceitar); resposta → reply_to_review com o review_id; se review_id for nulo, ache a avaliação por nome, estrelas e texto em get_data e só responda se achar uma única e ainda sem resposta. Depois update conteudos set status = 'publicado', publicado_em = now(). Se não conseguir, deixe 'aprovado' e anote em historico.
- Aprovar no painel não dispensa os LIMITES: avaliações seguradas pelo dono continuam seguradas.

REGISTRO no fim:
- insert into execucoes (tipo, resumo) values ('madrugada' ou 'quarta_sexta', '<resumo curto>') returning id.
- Para cada ação, insert into historico (cliente_id, execucao_id, tipo, resumo, detalhe, origem, ok) com tipo em foto, servico, categoria, resposta, post, area, descricao, analise ou outro; origem = 'rotina'; ok = false quando falhou.
- Continue gravando o log do Drive como antes: o painel é o centro de controle, o log do Drive segue como cópia.
```

## Como ligar

1. No Claude, abra cada rotina e, em conectores, ligue o **Supabase**. As duas rotinas hoje foram criadas sem ele.
2. Peça para atualizar as rotinas com este texto.
3. Confira na rodada seguinte: o painel mostra as linhas novas em **Histórico**, e imagens, serviços e conteúdo aprovados mudam de situação.
