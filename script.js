/**
 * ============================================================
 * CÂMARA FRIA — Monitor de Temperatura
 * script.js — Lógica de consumo da API e atualização da UI
 * ============================================================
 *
 * Fluxo principal:
 *   1. fetchTemperaturas() → GET /temperaturas com header Authorization
 *   2. Processa a resposta JSON
 *   3. Atualiza o painel principal (última leitura)
 *   4. Renderiza a tabela de histórico
 *   5. Trata erros 403 e falhas de rede
 * ============================================================
 */

/* ── Configurações da API ── */
const API_URL   = 'https://epnlg6d8b5.execute-api.us-east-1.amazonaws.com/temperaturas';
const API_TOKEN = 'ERRADO';

/* Limite de temperatura normal (≤ 8°C = normal; > 8°C = atenção) */
const TEMP_LIMIT = 8;

/* ── Referências aos elementos da página ── */
const els = {
  /* Status bar */
  statusDot:    document.getElementById('statusDot'),
  statusText:   document.getElementById('statusText'),
  statusTime:   document.getElementById('statusTime'),

  /* Painel principal */
  tempValue:    document.getElementById('tempValue'),
  statusBadge:  document.getElementById('statusBadge'),
  statusIcon:   document.getElementById('statusIcon'),
  statusLabel:  document.getElementById('statusLabel'),
  tempBarFill:  document.getElementById('tempBarFill'),
  originValue:  document.getElementById('originValue'),
  timeValue:    document.getElementById('timeValue'),
  timeHint:     document.getElementById('timeHint'),

  /* Ações */
  btnRefresh:   document.getElementById('btnRefresh'),
  refreshIcon:  document.getElementById('refreshIcon'),
  totalRecords: document.getElementById('totalRecords'),

  /* Erro */
  errorBox:     document.getElementById('errorBox'),
  errorMsg:     document.getElementById('errorMsg'),

  /* Tabela / estados */
  loadingState: document.getElementById('loadingState'),
  emptyState:   document.getElementById('emptyState'),
  tableWrap:    document.getElementById('tableWrap'),
  tableBody:    document.getElementById('tableBody'),
};

/* ============================================================
   FUNÇÃO PRINCIPAL — Buscar dados da API
   ============================================================ */
async function fetchTemperaturas() {
  // Inicia estado de carregamento
  setLoading(true);
  esconderErro();

  try {
    /* ── Requisição GET com header de autorização ── */
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': API_TOKEN,
        'Content-Type':  'application/json',
      },
    });

    /* ── Tratamento de erros HTTP ── */
    if (response.status === 403) {
      throw new Error('403');
    }

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    /* ── Parsear o JSON retornado ── */
    const data = await response.json();

    /* A API pode retornar diretamente um array ou { data: [...] } */
    const registros = Array.isArray(data) ? data : (data.data || data.items || data.temperaturas || []);

    if (registros.length === 0) {
      mostrarEstadoVazio();
      atualizarStatusBar('online', 'API conectada — Nenhum registro encontrado');
      return;
    }

    /* ── Ordenar do mais recente para o mais antigo ── */
    const ordenados = [...registros].sort((a, b) => {
      return new Date(b.data_hora || b.timestamp || b.created_at || 0)
           - new Date(a.data_hora || a.timestamp || a.created_at || 0);
    });

    /* ── Atualizar painel principal com o registro mais recente ── */
    atualizarPainelPrincipal(ordenados[0]);

    /* ── Renderizar tabela de histórico ── */
    renderizarTabela(ordenados);

    /* ── Atualizar status bar ── */
    atualizarStatusBar('online', `API conectada — ${registros.length} registro(s) carregado(s)`);
    els.totalRecords.textContent = `${registros.length} registro(s) no histórico`;

  } catch (erro) {
    console.error('[CâmaraFria] Erro ao buscar dados:', erro);
    tratarErro(erro);
    mostrarEstadoVazio(true); // mantém tabela oculta
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   ATUALIZAR PAINEL PRINCIPAL
   ============================================================ */
function atualizarPainelPrincipal(registro) {
  // Extrai os campos (compatível com diferentes nomes de chave)
  const temp    = parseFloat(registro.temperatura ?? registro.temp ?? registro.value ?? 0);
  const origem  = registro.origem ?? registro.source ?? registro.device ?? '—';
  const dataHora = registro.criado_em ?? registro.data_hora ?? registro.timestamp ?? registro.created_at ?? null;

  /* ── Temperatura ── */
  els.tempValue.textContent = temp.toFixed(1);

  /* ── Status de temperatura (normal × atenção) ── */
  const normal = temp <= TEMP_LIMIT;

  if (normal) {
    els.statusBadge.classList.remove('warn');
    els.statusIcon.textContent  = '❄';
    els.statusLabel.textContent = 'Temperatura Normal';
    els.tempValue.style.color   = 'var(--ok)';
    els.tempBarFill.classList.remove('warn-fill');
  } else {
    els.statusBadge.classList.add('warn');
    els.statusIcon.textContent  = '⚠';
    els.statusLabel.textContent = 'Temperatura de Atenção';
    els.tempValue.style.color   = 'var(--warn)';
    els.tempBarFill.classList.add('warn-fill');
  }

  /* ── Barra de temperatura (escala -30°C a 40°C) ── */
  const MIN = -30, MAX = 40;
  const pct = Math.min(100, Math.max(0, ((temp - MIN) / (MAX - MIN)) * 100));
  els.tempBarFill.style.width = `${pct}%`;

  /* ── Origem ── */
  els.originValue.textContent = origem;

  /* ── Data e hora ── */
  if (dataHora) {
    const dt = new Date(dataHora);
    els.timeValue.textContent = formatarDataHora(dt);
    els.timeHint.textContent  = `Há ${tempoRelativo(dt)}`;
  } else {
    els.timeValue.textContent = '—';
    els.timeHint.textContent  = 'Último registro';
  }
}

/* ============================================================
   RENDERIZAR TABELA DE HISTÓRICO
   ============================================================ */
function renderizarTabela(registros) {
  // Limpa o tbody
  els.tableBody.innerHTML = '';

  registros.forEach((reg, idx) => {
    const temp    = parseFloat(reg.temperatura ?? reg.temp ?? reg.value ?? 0);
    const id      = reg.id ?? reg._id ?? (registros.length - idx);
    const origem  = reg.origem ?? reg.source ?? reg.device ?? '—';
    const dataHora = reg.criado_em ?? reg.data_hora ?? reg.timestamp ?? reg.created_at ?? null;
    const normal  = temp <= TEMP_LIMIT;

    const tr = document.createElement('tr');
    // Delay progressivo para animação staggered
    tr.style.animationDelay = `${idx * 40}ms`;

    tr.innerHTML = `
      <td class="td-id">#${id}</td>
      <td class="td-temp ${normal ? 'ok' : 'warn'}">${temp.toFixed(1)} °C</td>
      <td>${escapeHtml(origem)}</td>
      <td>${dataHora ? formatarDataHora(new Date(dataHora)) : '—'}</td>
      <td>
        <span class="table-badge ${normal ? 'ok' : 'warn'}">
          ${normal ? '❄ Normal' : '⚠ Atenção'}
        </span>
      </td>
    `;

    els.tableBody.appendChild(tr);
  });

  /* Mostrar tabela, esconder estados de loading/vazio */
  els.loadingState.style.display = 'none';
  els.emptyState.style.display   = 'none';
  els.tableWrap.style.display    = 'block';
}

/* ============================================================
   TRATAMENTO DE ERROS
   ============================================================ */
function tratarErro(erro) {
  atualizarStatusBar('error', 'Erro ao conectar à API');

  if (erro.message === '403') {
    mostrarErro('Acesso negado. Token inválido.');
  } else if (
    erro instanceof TypeError ||        // Falha de rede / CORS
    erro.message.startsWith('HTTP_')    // Outros erros HTTP
  ) {
    mostrarErro('Não foi possível conectar à API.');
  } else {
    mostrarErro(`Erro inesperado: ${erro.message}`);
  }
}

/* ============================================================
   HELPERS DE UI
   ============================================================ */

/** Ativa/desativa o estado de carregamento do botão */
function setLoading(carregando) {
  els.btnRefresh.disabled = carregando;

  if (carregando) {
    els.refreshIcon.classList.add('spinning');
    // Mostrar loading state na tabela apenas na primeira carga
    if (els.tableWrap.style.display === 'none') {
      els.loadingState.style.display = 'flex';
      els.emptyState.style.display   = 'none';
    }
  } else {
    els.refreshIcon.classList.remove('spinning');
    els.loadingState.style.display = 'none';
  }
}

/** Atualiza a barra de status de conexão */
function atualizarStatusBar(estado, mensagem) {
  els.statusDot.className = `status-dot ${estado}`;
  els.statusText.textContent = mensagem;
  els.statusTime.textContent = `Atualizado: ${new Date().toLocaleTimeString('pt-BR')}`;
}

/** Exibe mensagem de erro */
function mostrarErro(mensagem) {
  els.errorMsg.textContent = mensagem;
  els.errorBox.style.display = 'flex';
}

/** Esconde a mensagem de erro */
function esconderErro() {
  els.errorBox.style.display = 'none';
}

/** Exibe estado vazio (sem dados) */
function mostrarEstadoVazio(manterTabela = false) {
  els.loadingState.style.display = 'none';
  if (!manterTabela) {
    els.tableWrap.style.display  = 'none';
    els.emptyState.style.display = 'flex';
  }
  els.totalRecords.textContent = '';
}

/* ============================================================
   FORMATAÇÃO DE DATAS
   ============================================================ */

/** Formata um objeto Date para exibição dd/mm/aaaa hh:mm:ss */
function formatarDataHora(date) {
  if (!(date instanceof Date) || isNaN(date)) return '—';
  return date.toLocaleString('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Retorna tempo relativo legível (ex: "3 minutos atrás") */
function tempoRelativo(date) {
  if (!(date instanceof Date) || isNaN(date)) return '—';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/* ============================================================
   SEGURANÇA — Escapar HTML para evitar XSS
   ============================================================ */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/* ============================================================
   EFEITO DE PARTÍCULAS — Flocos de gelo no fundo
   ============================================================ */
function criarParticulas() {
  const container = document.getElementById('bgParticles');
  const total = 18;

  for (let i = 0; i < total; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    // Tamanho aleatório (1–4px)
    const size = Math.random() * 3 + 1;
    p.style.width  = `${size}px`;
    p.style.height = `${size}px`;

    // Posição horizontal aleatória
    p.style.left = `${Math.random() * 100}%`;

    // Duração e delay aleatórios para naturalidade
    const duration = Math.random() * 15 + 10;
    const delay    = Math.random() * 15;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay   = `${delay}s`;

    container.appendChild(p);
  }
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Cria as partículas de fundo
  criarParticulas();

  // Faz a primeira requisição automaticamente ao carregar a página
  fetchTemperaturas();
});
