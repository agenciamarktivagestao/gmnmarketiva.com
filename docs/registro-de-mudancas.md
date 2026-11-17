# Registro de mudanças (página Novidades)

A página **Novidades**, no menu do painel, mostra o que foi alterado no sistema, do mais recente para o mais antigo. Um selo azul no menu conta quantas novidades a pessoa ainda não viu e some quando ela abre a página.

O registro serve para controle: cada ajuste que entra no ar vira uma linha em `public.mudancas_sistema`, com data, o que mudou, como conferir e o que ainda falta.

## Como registrar uma mudança

Depois que a mudança estiver no ar, insira uma linha. Pelo editor SQL do Supabase ou pelo conector do Supabase:

```sql
insert into public.mudancas_sistema
  (feito_em, titulo, resumo, itens, como_testar, pendente, tipo, commit_sha, autor)
values (
  now(),
  'Título curto, em português',
  'Uma frase dizendo o que mudou para quem usa o painel.',
  array['Primeira alteração', 'Segunda alteração'],
  'O que abrir e clicar para conferir.',
  null,            -- ou um texto com o que ainda falta
  'painel',        -- 'painel', 'dados' ou 'rotina'
  null,            -- ou o início do commit, por exemplo '7e506d2'
  'Claude'
);
```

Campos:

| Campo | Para que serve |
| --- | --- |
| `feito_em` | Quando foi feito. A lista é ordenada por ele. |
| `titulo` | Nome curto da mudança. |
| `resumo` | Uma frase para quem não é técnico. |
| `itens` | Lista do que mudou, um item por alteração. |
| `como_testar` | Passo a passo curto para conferir. |
| `pendente` | O que ficou faltando. Deixe `null` se nada falta. |
| `tipo` | `painel` (telas), `dados` (leitura ou carga de dados) ou `rotina` (rotinas agendadas). |
| `commit_sha` | Início do commit (7 a 40 caracteres, só 0-9 e a-f). Vira um link para o GitHub. Deixe `null` quando não há commit. |
| `autor` | Quem fez. O padrão é `Claude`. |

Escreva em português do Brasil, em frases curtas, sem termos de programação. Não coloque texto real de avaliações de clientes: o registro é visto por toda a equipe.

## Quem pode ler e escrever

- **Ler:** qualquer pessoa da equipe (tabela `equipe`).
- **Criar, mudar e apagar:** só quem tem papel `admin`.
- **Controle do que cada pessoa já viu:** tabela `mudancas_vistas`, uma linha por e-mail. Cada pessoa só grava a própria linha.

## Como o selo funciona

1. Ao abrir Novidades, o painel grava a data e a hora em `mudancas_vistas` para o e-mail da pessoa.
2. O selo no menu conta as entradas com `feito_em` depois dessa data.
3. Quem nunca abriu a página vê todas as entradas como novas.
4. Se o banco não responder, o selo não aparece. Ele nunca derruba o painel.

## Modo de demonstração

Sem as variáveis do Supabase, o painel lê `data/mudancas.json` e não mostra o selo. O arquivo tem as mesmas entradas do banco e serve só para ver a página funcionando.

## Corrigir um registro

Para mudar um texto já registrado, use `update` na linha, por exemplo:

```sql
update public.mudancas_sistema
   set pendente = null
 where titulo = 'Prévia do perfil de cada cliente';
```

Não é preciso mexer no código: a página lê o banco a cada acesso.
