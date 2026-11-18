# Link de acompanhamento do cliente

Cada cliente pode ter um link secreto, só de leitura, para ver a própria semana sem precisar de login:
`https://<endereço do painel>/p/<token>`.

## O que o cliente vê

O mesmo documento do relatório semanal (`components/Relatorio.tsx`):

- nome, categoria e cidade do cliente;
- as ações dos últimos 7 dias que **deram certo**, com o texto do `resumo` e o horário;
- os números do perfil no Google (aparições, ligações, rotas, cliques no site) do último diagnóstico.

Não aparecem: decisões internas, análises e anotações (tipos `decisao`, `analise`, `outro`), ações que falharam, o campo
`detalhe`, quem fez a ação (rotina ou equipe) e nada de outros clientes.

## Como funciona

1. **Nada fica público até um administrador criar o link**, em Clientes › (cliente) › Últimos 7 dias › "Link para o cliente
   acompanhar". O botão sorteia um token de 256 bits (base64url, 43 caracteres) no servidor.
2. A tabela `acessos_cliente` guarda os links. Só administrador lê, cria ou desativa (RLS). Cada cliente tem no máximo um
   link ativo (índice único parcial); "Gerar um novo link" desativa o anterior e cria o novo numa operação só
   (`public.criar_link_cliente`, SECURITY INVOKER: se algo falha, o link antigo continua valendo).
3. A página pública **não lê tabelas**. Ela chama `public.acompanhamento_cliente(token, contar)`, uma função SECURITY DEFINER
   que só o papel `anon` executa e que devolve apenas os campos acima. Token inexistente, desativado, de cliente inativo ou fora
   do formato devolve `null`, e a página mostra "Este link não está ativo" (404) sem dizer qual foi o motivo.
4. O banco conta quantas vezes o link foi aberto e quando foi a última vez. A pré-visualização da equipe
   (`?equipe=1`, o link "Abrir como o cliente vê") não conta.
5. `proxy.ts` deixa `/p/` abrir sem login. A página manda `noindex` e `referrer: no-referrer`.

## O aviso do Supabase

O verificador de segurança do Supabase avisa que `acompanhamento_cliente` é uma função SECURITY DEFINER que o papel `anon`
pode executar. É intencional: é a única porta aberta ao público, e ela só entrega o que está descrito acima.
O papel `authenticated` não tem permissão nela.

## Desativar

Em Últimos 7 dias do cliente: "Desativar o link". O cliente perde o acesso na hora; o registro fica guardado
(`revogado_em`, `revogado_por`). Para desativar tudo de uma vez, em caso de vazamento:

```sql
update public.acessos_cliente set revogado_em = now() where revogado_em is null;
```
