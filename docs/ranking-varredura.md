# Posição no Google Maps (varredura a cada 15 dias)

Este documento explica como a medição de posição entra no painel. A varredura roda no computador da agência, duas vezes por mês. O painel só guarda e mostra os resultados.

## O que é medido

Para cada cliente e cada palavra-chave (por exemplo, "dentista londrina"), a ferramenta consulta o Google Maps em uma grade de pontos ao redor do negócio, como se uma pessoa estivesse em cada ponto. Em cada ponto anota em que posição o perfil apareceu.

| Número no painel | O que significa |
| --- | --- |
| No top 3 | Percentual dos pontos lidos em que o perfil aparece entre os 3 primeiros |
| Entre os 20 primeiros | Percentual dos pontos lidos em que o perfil aparece em alguma das 20 primeiras posições |
| Posição média onde aparece | Média das posições, contando só os pontos em que o perfil aparece (quanto menor, melhor) |

"Subiu" quer dizer melhor colocado. A mudança é decidida nesta ordem: presença no top 3 (variação de 1 ponto percentual ou mais), depois posição média (0,5 ou mais), depois presença nos 20 primeiros (5 pontos percentuais ou mais). Se nada passa desses limites, o painel mostra "ficou igual".

## Regras que mantêm a comparação justa

1. A grade e o espaçamento não podem mudar entre uma medição e a seguinte, para a mesma palavra. Se mudarem, o painel avisa "não dá para comparar".
2. Uma medição só é comparada se pelo menos 80% dos pontos foram lidos. Pontos que a ferramenta não conseguiu ler ficam como "sem leitura".
3. Use sempre as mesmas palavras-chave por cliente (3 por cliente é um bom começo, tiradas dos termos que as pessoas já usam para achar o perfil).
4. Londrina, Cambé e Ibiporã ficam perto uma da outra. Uma grade de 5×5 com 4 a 5 km entre os pontos cobre as três cidades.

## Como rodar a varredura (no computador da agência)

A ferramenta de referência é o GeoGrid, de código aberto (`orenagassy/geogrid`). Ela roda só no seu computador e guarda tudo num banco local.

```
python -m app.cli scan --business "Nome do negócio, Londrina" --keyword "dentista londrina" --grid 5 --spacing 4km
```

Ela imprime a grade e os números (ARP, ATRP e SoLV). Envie esse resultado para o Claude, com o nome do cliente, a palavra-chave e a data.

Cuidados:

- O Google pode pedir CAPTCHA ou bloquear consultas automáticas, e o uso automatizado do Maps conflita com os termos do Google. Por isso a varredura é feita pouco (2 vezes por mês) e por quem tem a conta. Não rode em servidor.
- Se o Google mudar a página, a ferramenta pode parar de ler os pontos. Nesse caso, avise em vez de repetir várias vezes.

## Como os resultados entram no painel

Cada medição vira uma linha em `public.desempenho_ranking`:

| Coluna | Conteúdo |
| --- | --- |
| `cliente_id` | O cliente |
| `dia` | Data da medição |
| `palavra` | A palavra-chave, sempre escrita igual |
| `grade` | Lado da grade (5 para 5×5). Número ímpar de 3 a 13 |
| `espacamento_km` | Distância entre os pontos, em km |
| `posicoes` | Lista com `grade × grade` valores, lida da esquerda para a direita, começando pela linha do norte |
| `fonte` | De onde veio (por exemplo, `geogrid`) |

Como converter o que a ferramenta imprime:

- Posição 1 a 20: o próprio número.
- "20+" (fora dos 20 primeiros): `21`.
- "?" ou ponto não lido: `null`.

Exemplo de `posicoes` para uma grade 3×3:

```
[1, 2, 4, 3, 1, 6, 8, 12, 21]
```

O banco recusa listas com tamanho errado e números fora de 1 a 21. A inserção é feita pelo Claude por SQL, depois que você enviar o resultado. Nenhuma chave de acesso fica no projeto.

## Onde aparece

- Desempenho do cliente: card "Posição no Google Maps", um mapa por palavra, com o histórico.
- Desempenho geral: quadro com todos os clientes lado a lado.
- Sem medição, as telas mostram um aviso explicando que a medição é feita a cada 15 dias.
