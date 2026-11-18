# Marktiva · Perfis

Painel da Agência Marktiva para gerir os perfis do Google Meu Negócio dos clientes.

- **Painel**: situação de cada campo do perfil por cliente (cheio = em ordem, meio = a rever, vazio = falta) e a fila do que espera decisão.
- **Pendências**: aprovar, recusar, marcar como feito e comentar. A rotina da madrugada lê essas decisões.
- **Conteúdo**: postagens e respostas a avaliações com prévia no estilo do Google. Aprovar, recusar, editar o texto ou escrever o seu.
- **Diretrizes**: a ideia principal do sistema e o tom de cada cliente (tratamento, emojis, assinatura, o que usar e o que evitar, exemplos). A rotina lê antes de escrever qualquer texto.
- **Clientes**: abas Visão geral, Serviços (aprovar, editar e incluir), Imagens (envio com prévia) e Tom e diretrizes.
- **Histórico**: tudo o que a rotina e a equipe fizeram, por dia.
- **Equipe**: quais e-mails podem entrar.

Feito com Next.js 16 (App Router), Supabase (banco e login) e Vercel (publicação). No ar em https://gmnmarketiva.vercel.app.

## Como o sistema se encaixa na rotina

A leitura e a escrita nos perfis do Google acontecem no Claude (conector Windsor), não neste site. O site é o centro de controle:

1. A rotina grava no Supabase o diagnóstico dos perfis, as pendências e cada ação que executou (tabelas `diagnosticos`, `pendencias`, `historico`).
2. Você decide aqui: aprova, recusa, comenta.
3. Na rodada seguinte, a rotina lê `pendencias` com `status = 'aprovada'` e os `comentarios` novos, executa o que for possível e marca como `concluida`, registrando em `historico`.

### Tom, serviços, imagens e conteúdo

- **Ideia principal e tom** (`diretrizes`): a linha com `cliente_id` nulo vale para todos; a de cada cliente refina. `revisado = false` significa proposta inicial ainda não conferida pela equipe. `aprovacao = 'manual'` faz a rotina deixar `conteudos` em `rascunho` em vez de publicar.
- **Serviços** (`servicos`): `no_perfil` já está no Google; `sugerido` espera decisão; `aprovado` a rotina coloca no perfil e depois marca `no_perfil`; `recusado` fica registrado. Editar um serviço que já está no Google vira `aprovado`, para a rotina aplicar a alteração. O Google troca a lista inteira de uma vez, então a rotina sempre reenvia os serviços existentes junto com os novos.
- **Imagens** (`midias`): o arquivo sobe do navegador para o armazenamento do Supabase (bucket público `midias`, até 10 MB, JPG, PNG ou WebP; fotos de celular e HEIC são convertidas e reduzidas no navegador). A rotina envia ao Google pelo endereço público da imagem e marca `enviada`. Capa só com foto horizontal.
- **Conteúdo** (`conteudos`): `rascunho` espera decisão; `aprovado` a rotina publica e marca `publicado`; `recusado` fica registrado. Cada decisão entra sozinha em `historico`.

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a chave do Supabase
npm run dev
```

Sem as duas variáveis o sistema abre em **modo demonstração**: dados de 16/11/2026, sem login, sem gravar.

## Banco (Supabase)

As tabelas e as regras de acesso estão em `supabase/migrations`, para rodar em ordem. Os dados iniciais estão em `supabase/seed.sql` (clientes e pendências), `supabase/seed_servicos.sql` (serviços que já estão nos perfis) e `supabase/seed_diretrizes.sql` (primeira proposta de ideia principal e tom).

| Tabela | Para que serve |
| --- | --- |
| `equipe` | E-mails autorizados e o papel de cada um (`admin`, `editor`, `leitura`) |
| `clientes` | Um registro por perfil do Google (`gbp_location`, pasta do Drive) |
| `diagnosticos` | Retrato do perfil numa data, com cada campo em `ok`, `rever` ou `falta` |
| `pendencias` | O que falta fazer. `quem`: `eu` (rotina), `voce` (equipe/cliente), `bloq` (só pelo Chrome ou plano pago). `status`: `aberta`, `aprovada`, `recusada`, `concluida` |
| `comentarios` | Conversa em cada pendência |
| `execucoes` | Uma linha por rodada da rotina |
| `historico` | Cada ação feita, com tipo, cliente e resultado |
| `diretrizes` | Ideia principal e tom de voz, geral e por cliente |
| `servicos` | Serviços de cada perfil e a decisão sobre cada um |
| `midias` | Imagens na fila para subir no Google e as já enviadas (arquivos no bucket `midias`) |
| `conteudos` | Postagens e respostas a avaliações, do rascunho à publicação |

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
app/                 páginas (painel, pendências, conteúdo, diretrizes, clientes, últimos 7 dias, histórico, novidades, equipe, login)
app/actions.ts       ações do servidor: pendências, diretrizes, serviços, imagens, conteúdo, equipe, entrar/sair
components/          matriz, prévia do Google, galeria de imagens, serviços, formulários, mapa e dia a dia da semana
public/              logo da Marktiva (branca: usar sobre o fundo preto)
lib/dados.ts         leitura do Supabase (ou dos dados de demonstração)
lib/semana.ts        lógica dos últimos 7 dias (dia no horário de Brasília, grupos de ação, contagens); testada em lib/semana.test.ts
lib/alertas.ts       o que pede atenção no Painel (rotina sem registro, falhas, clientes sem ação); testada em lib/alertas.test.ts
data/seed.json       dados de demonstração
docs/                documentos de apoio (texto da seção SISTEMA das rotinas; como registrar mudanças em Novidades)
proxy.ts             renova a sessão e manda quem não entrou para /login
supabase/            migrações e dados iniciais
```
