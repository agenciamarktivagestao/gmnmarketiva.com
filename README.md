# Marktiva · Perfis

Painel da Agência Marktiva para gerir os perfis do Google Meu Negócio dos clientes.

- **Painel**: situação de cada campo do perfil por cliente (cheio = em ordem, meio = a rever, vazio = falta) e a fila do que espera decisão.
- **Pendências**: aprovar, recusar, marcar como feito e comentar. A rotina da madrugada lê essas decisões.
- **Clientes**: perfil, desempenho dos últimos 30 dias, pendências e o que já foi feito.
- **Histórico**: tudo o que a rotina e a equipe fizeram, por dia.
- **Equipe**: quais e-mails podem entrar.

Feito com Next.js 16 (App Router), Supabase (banco e login) e Vercel (publicação). No ar em https://gmnmarketiva.vercel.app.

## Como o sistema se encaixa na rotina

A leitura e a escrita nos perfis do Google acontecem no Claude (conector Windsor), não neste site. O site é o centro de controle:

1. A rotina grava no Supabase o diagnóstico dos perfis, as pendências e cada ação que executou (tabelas `diagnosticos`, `pendencias`, `historico`).
2. Você decide aqui: aprova, recusa, comenta.
3. Na rodada seguinte, a rotina lê `pendencias` com `status = 'aprovada'` e os `comentarios` novos, executa o que for possível e marca como `concluida`, registrando em `historico`.

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a chave do Supabase
npm run dev
```

Sem as duas variáveis o sistema abre em **modo demonstração**: dados de 16/11/2026, sem login, sem gravar.

## Banco (Supabase)

As tabelas e as regras de acesso estão em `supabase/migrations`, para rodar em ordem. Os dados iniciais estão em `supabase/seed.sql`.

| Tabela | Para que serve |
| --- | --- |
| `equipe` | E-mails autorizados e o papel de cada um (`admin`, `editor`, `leitura`) |
| `clientes` | Um registro por perfil do Google (`gbp_location`, pasta do Drive) |
| `diagnosticos` | Retrato do perfil numa data, com cada campo em `ok`, `rever` ou `falta` |
| `pendencias` | O que falta fazer. `quem`: `eu` (rotina), `voce` (equipe/cliente), `bloq` (só pelo Chrome ou plano pago). `status`: `aberta`, `aprovada`, `recusada`, `concluida` |
| `comentarios` | Conversa em cada pendência |
| `execucoes` | Uma linha por rodada da rotina |
| `historico` | Cada ação feita, com tipo, cliente e resultado |

**Acesso:** todas as tabelas têm segurança por linha. Só e-mails da tabela `equipe` leem; `admin` e `editor` gravam; só `admin` apaga e libera acessos. Quem criar uma conta com outro e-mail não vê nada.

### Configurar o login no Supabase

Em **Authentication**:

1. **URL Configuration > Site URL**: o endereço do site na Vercel. Em **Redirect URLs**, inclua `https://SEU-SITE.vercel.app/auth/confirm`.
2. O padrão exige confirmar o e-mail, e o envio embutido do Supabase tem limite baixo de mensagens por hora. Para uma equipe pequena, o mais simples é desligar **Providers > Email > Confirm email** e deixar a lista `equipe` como controle de acesso.

## Publicar na Vercel

1. Em vercel.com, **Add New > Project** e escolha este repositório.
2. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. **Deploy**. Cada envio ao GitHub publica de novo.

A chave `publishable` é feita para ficar no navegador. A proteção dos dados está na segurança por linha, não na chave. Nunca coloque a `service_role` neste projeto.

## Estrutura

```
app/                 páginas (painel, pendências, clientes, histórico, equipe, login)
app/actions.ts       ações do servidor: decidir, comentar, nova pendência, equipe, entrar/sair
components/          matriz, itens de pendência, formulários
lib/dados.ts         leitura do Supabase (ou dos dados de demonstração)
data/seed.json       dados de demonstração
proxy.ts             renova a sessão e manda quem não entrou para /login
supabase/            migrações e dados iniciais
```
