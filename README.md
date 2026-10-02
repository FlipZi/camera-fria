# Monitoramento de Câmara Fria.

Dashboard web para visualização em tempo quase real das temperaturas de uma câmara fria. A página consome uma API REST hospedada na AWS e exibe a última leitura, o status (normal ou atenção) e o histórico de registros.

> Projeto acadêmico — Computação em Nuvem.

## Visão geral da arquitetura

```
ESP32 (coleta) ──▶ API Gateway ──▶ AWS Lambda ──▶ Aurora PostgreSQL
                        ▲
                        │  GET /temperaturas  (header Authorization)
                        │
                Dashboard (este repositório)
```

Este repositório contém **apenas o front-end** (HTML, CSS e JavaScript puros, sem build e sem dependências). O código do ESP32, das funções Lambda e do banco de dados não faz parte deste repositório.

## Funcionalidades

- **Última temperatura** com indicador visual (Normal / Atenção) e barra de escala de -30 °C a 40 °C.
- **Origem do dado** (dispositivo de coleta) e **data/hora** do último registro, com tempo relativo ("Há 3min").
- **Histórico** de registros em tabela, ordenado do mais recente para o mais antigo.
- **Barra de status** da conexão com a API e horário da última atualização.
- **Botão "Atualizar Dados"** para nova consulta manual (a primeira consulta é automática ao abrir a página).
- Tratamento de erros: acesso negado (403), falhas de rede/CORS, outros erros HTTP e estado vazio.
- Escape de HTML nos dados exibidos na tabela (prevenção de XSS).

## Estrutura do projeto

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Estrutura da página: cabeçalho, cards do painel, barra de ações, tabela de histórico e rodapé. |
| `script.js` | Consumo da API, regras de status, renderização do painel e da tabela, tratamento de erros e efeito de partículas. |
| `style.css` | Tema escuro "gelo", variáveis CSS, layout responsivo e animações. |
| `docs/projeto-antigo-carregador-usb.md` | README antigo, de um projeto diferente (carregador USB). Mantido só como histórico. |

## Como executar

Não há instalação nem build. Basta servir os arquivos estáticos.

**Opção 1 — abrir direto:** abra o `index.html` no navegador.

**Opção 2 — servidor local** (recomendado, evita restrições de `file://`):

```bash
# Python
python3 -m http.server 8000

# ou Node.js
npx serve .
```

Depois acesse `http://localhost:8000`.

> A página carrega as fontes (Orbitron, IBM Plex Mono e IBM Plex Sans) do Google Fonts, então requer internet. Sem elas, o navegador usa as fontes de fallback.

## Configuração

As configurações ficam no topo do `script.js`:

```js
const API_URL    = 'https://epnlg6d8b5.execute-api.us-east-1.amazonaws.com/temperaturas';
const API_TOKEN  = 'ERRADO';   // valor de exemplo — substitua pelo token válido
const TEMP_LIMIT = 8;          // °C; acima disso o status vira "Atenção"
```

| Constante | Descrição |
|-----------|-----------|
| `API_URL` | Endpoint `GET /temperaturas` no API Gateway. |
| `API_TOKEN` | Valor enviado no header `Authorization`. O valor atual (`ERRADO`) é um placeholder e resulta em erro 403. |
| `TEMP_LIMIT` | Limite de temperatura normal: `≤ 8 °C` é normal, `> 8 °C` é atenção. |

O limite de 8 °C também aparece em texto no `index.html` (tooltip do marcador e rótulo da barra). Se alterar `TEMP_LIMIT`, atualize esses pontos e a posição do marcador no CSS (`.temp-threshold-marker`).

## Contrato da API

**Requisição**

```http
GET /temperaturas
Authorization: <API_TOKEN>
Content-Type: application/json
```

**Resposta esperada:** um array JSON, ou um objeto contendo o array em `data`, `items` ou `temperaturas`.

```json
[
  {
    "id": 42,
    "temperatura": 4.5,
    "origem": "ESP32-01",
    "criado_em": "2026-06-05T18:02:00Z"
  }
]
```

O front-end aceita nomes de campo alternativos:

| Dado | Campos aceitos (em ordem de prioridade) |
|------|------------------------------------------|
| Temperatura | `temperatura`, `temp`, `value` |
| Origem | `origem`, `source`, `device` |
| Data/hora (exibição) | `criado_em`, `data_hora`, `timestamp`, `created_at` |
| ID | `id`, `_id` (se ausente, usa a posição na lista) |

**Situações tratadas**

| Situação | Mensagem exibida |
|----------|------------------|
| HTTP 403 | "Acesso negado. Token inválido." |
| Outros HTTP não-2xx, falha de rede ou CORS | "Não foi possível conectar à API." |
| Lista vazia | "Nenhum dado disponível." |
| Erro inesperado | "Erro inesperado: ..." |

## Regras de negócio

- **Status:** temperatura `≤ 8 °C` → *Normal* (ciano, ícone ❄); `> 8 °C` → *Atenção* (âmbar, ícone ⚠).
- **Barra de temperatura:** escala linear de -30 °C a 40 °C, limitada a 0%–100%.
- **Último registro:** o primeiro da lista após a ordenação por data decrescente.
- **Tempo relativo:** exibido em segundos (`s`), minutos (`min`), horas (`h`) ou dias (`d`).

## Personalização visual

As cores, fontes e raios ficam como variáveis CSS em `:root` no início do `style.css` (`--accent`, `--ok`, `--warn`, `--bg-*`, `--font-*`, entre outras). O layout passa para uma coluna em telas de até 768 px.

## Limitações e pontos de atenção

1. **Token exposto no cliente.** O `API_TOKEN` fica no JavaScript, visível a qualquer visitante. Não coloque credenciais reais de longa duração neste arquivo. Para uso além da demonstração, considere restringir a API por origem (CORS), usar chaves com permissão somente leitura ou colocar um backend/proxy na frente.
2. **Sem atualização automática.** A consulta ocorre ao abrir a página e ao clicar no botão; não há polling.
3. **Inconsistência na ordenação.** A ordenação usa `data_hora`, `timestamp` e `created_at`, mas **não** `criado_em`, enquanto a exibição prioriza `criado_em`. Se a API retornar apenas `criado_em`, a ordenação não funcionará como esperado.
4. **Temperatura ausente vira 0,0 °C.** Quando o registro não traz nenhum dos campos de temperatura, o valor assumido é `0` e o status aparece como *Normal*.
5. **Sem gráficos nem alertas ativos.** O histórico é apenas tabular, e não há notificação quando a temperatura passa do limite.

## Melhorias futuras

- Atualização automática (polling ou WebSocket).
- Gráfico de temperatura ao longo do tempo.
- Filtros por período e por dispositivo, e paginação do histórico.
- Alertas (e-mail, SMS ou push) quando `TEMP_LIMIT` for excedido.
- Mover token e URL para configuração externa em vez de constantes no código.
- Testes automatizados para as funções de formatação e de normalização dos registros.
