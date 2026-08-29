let currentUser = JSON.parse(localStorage.getItem("cl_recebimento_user") || "null");
let currentView = "dashboard";
let currentCardId = null;
let cardData = null;
let receivingPhotos = [];
let dispatchPhotos = [];
let qualityUsers = [];
let processingUsers = [];
let downstreamUsers = {ETIQUETAGEM:[],ESTOCAGEM:[]};
let selectedProductionCardId = null;

const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Erro inesperado." }));
    throw new Error(error.detail || "Erro inesperado.");
  }
  return response.json();
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtDate(value) {
  if (!value) return "—";
  const parsed = new Date(value.length === 10 ? value + "T00:00:00" : value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

function fmtDateTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR");
}

function fmtSeconds(value) {
  let seconds = Math.max(0, Number(value || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

function statusClass(status) {
  if (["AGUARDANDO_QUALIDADE", "RETORNO_CONCLUIDO", "AGUARDANDO_INSPECAO", "AGUARDANDO_CONCLUSAO_QUALIDADE", "AGUARDANDO_PROCESSAMENTO", "AGUARDANDO_INICIO_PROCESSAMENTO", "AGUARDANDO_CONCLUSAO_PROCESSAMENTO", "AGUARDANDO_TRIAGEM", "AGUARDANDO_ETIQUETAGEM", "AGUARDANDO_ESTOCAGEM"].includes(status)) return "green";
  if (["RECEBIMENTO_FISICO_CONCLUIDO_10_PENDENTE", "SEPARACAO_10_CONCLUIDA_RECEBIMENTO_PENDENTE", "RETORNO_FISICO_CONCLUIDO_10_PENDENTE", "SEPARACAO_RETORNO_10_CONCLUIDA_FISICO_PENDENTE", "AGUARDANDO_DESPACHO_COSTURA", "INSPECAO_PAUSADA", "PROCESSAMENTO_PAUSADO"].includes(status)) return "orange";
  if (status === "DESPACHO_CD02") return "red";
  if (["EM_COSTURA_CD01", "EM_INSPECAO", "EM_PROCESSAMENTO"].includes(status)) return "purple";
  return "";
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 3500);
}

async function doLogin() {
  try {
    currentUser = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: $("loginUsername").value, password: $("loginPassword").value }),
    });
    localStorage.setItem("cl_recebimento_user", JSON.stringify(currentUser));
    $("loginError").textContent = "";
    enterApp();
  } catch (error) {
    $("loginError").textContent = error.message;
  }
}

function enterApp() {
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("currentUser").innerHTML = `<strong>${esc(currentUser.name)}</strong><br>${esc(currentUser.role)}`;
  goTo("dashboard");
}

function logout() {
  localStorage.removeItem("cl_recebimento_user");
  location.reload();
}

function setPage(title, subtitle) {
  $("pageTitle").textContent = title;
  $("pageSubtitle").textContent = subtitle;
}

function activeNav(view) {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

async function goTo(view) {
  currentView = view;
  activeNav(view);
  if (view === "dashboard") await renderDashboard();
  if (view === "receiving") await renderCards("receiving");
  if (view === "quality") await renderCards("quality");
  if (view === "processing") await renderCards("processing");
  if (view === "labeling") await renderCards("labeling");
  if (view === "storage") await renderCards("storage");
  if (view === "import") await renderImport();
  if (view === "test") await renderTestTools();
  if (view === "history") await renderGlobalHistory();
}

async function refreshCurrentView() {
  if (currentCardId) return openCard(currentCardId);
  return goTo(currentView);
}

async function renderDashboard() {
  setPage("Dashboard", "Visão integrada de Recebimento, Qualidade, Processamento, Etiquetagem e Estocagem");
  const data = await api("/api/dashboard");
  const metrics = [
    ["Cards importados", data.totals.cards, "#2563eb"],
    ["No Recebimento", data.totals.receiving, "#0891b2"],
    ["10% pendente", data.totals.pending_10, "#e98b08"],
    ["Físico pendente", data.totals.pending_physical, "#7c3aed"],
    ["Aguardando despacho", data.totals.awaiting_dispatch, "#d97706"],
    ["Aguardando retorno", data.totals.awaiting_return, "#16803c"],
    ["Na Qualidade", data.totals.quality, "#0f766e"],
    ["Inspeções em andamento", data.totals.quality_in_progress, "#7c3aed"],
    ["No Processamento", data.totals.processing, "#0f766e"],
    ["Processamentos em andamento", data.totals.processing_in_progress, "#7c3aed"],
    ["Na Estocagem", data.totals.storage, "#166534"],
  ];
  const max = Math.max(1, ...data.status_counts.map((row) => row.value));
  $("mainContent").innerHTML = `
    <div class="kpi-grid">
      ${metrics.map(([label, value, color]) => `
        <div class="kpi" style="--accent:${color}">
          <div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-hint">Cards</div>
        </div>`).join("")}
    </div>
    <div class="grid-two">
      <div class="panel">
        <div class="panel-header">Distribuição por situação</div>
        <div class="panel-body">
          ${data.status_counts.length ? data.status_counts.map((row) => `
            <div class="bar-row"><span>${esc(row.label)}</span><div class="bar-track"><i style="width:${(row.value/max)*100}%"></i></div><b>${row.value}</b></div>
          `).join("") : '<div class="notice">Importe o relatório para iniciar.</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">Regra de liberação</div>
        <div class="panel-body">
          <div class="notice"><b>Mercadoria nova</b><br>Recebimento físico e separação dos 10% com triagem inicial podem terminar em qualquer ordem.</div>
          <div class="notice warn"><b>O Card só sai do Recebimento quando as duas partes estiverem concluídas.</b></div>
          <div class="notice success-box"><b>Retorno CD01</b><br>O Recebimento separa uma nova amostra de 10% sobre a quantidade retornada. A Qualidade usa essa amostra na Inspeção 2 obrigatória.</div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-header">Cards atualizados recentemente</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Compra</th><th>Fornecedor</th><th>Marca</th><th>Tipo</th><th>Qtd.</th><th>Casulo</th><th>Setor</th><th>Status</th><th></th></tr></thead>
        <tbody>${data.recent.map((card) => `
          <tr><td><b>${esc(card.purchase_id)}</b></td><td>${esc(card.supplier||"—")}</td><td>${esc(card.brand||"—")}</td>
          <td>${esc(card.purchase_mode === "GRADE" ? "Grade" : card.purchase_mode === "SALDO" ? "Saldo" : "—")}</td><td>${card.expected_total}</td><td>${esc(card.casulo_current||"—")}</td><td>${esc(card.current_sector)}</td>
          <td><span class="badge ${statusClass(card.status)}">${esc(card.status_label)}</span></td>
          <td><button class="primary small-btn" onclick="openCard(${card.id})">Abrir</button></td></tr>
        `).join("") || '<tr><td colspan="9">Nenhum Card.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

async function renderCards(scope) {
  const quality = scope === "quality";
  const processing = scope === "processing";
  const labeling = scope === "labeling", storage = scope === "storage";
  const title = quality ? "Qualidade" : processing ? "Processamento" : labeling ? "Etiquetagem" : storage ? "Estocagem" : "Recebimento";
  const subtitle = quality ? "Inspeção ágil e preenchimento guiado" : processing ? "Seleção compacta de materiais" : labeling ? "Grade por tamanho; Saldo por quantidade" : storage ? "Entrada em estoque por tamanho ou saldo geral" : "Controle geral da produção e posição real de cada item";
  setPage(title, subtitle);
  const cards = await api(`/api/cards?scope=${scope}`);
  if (processing || labeling || storage) {
    $("mainContent").innerHTML = processingQueueHtml(cards);
    filterProductionQueue();
    return;
  }
  $("mainContent").innerHTML = `
    <div class="toolbar">
      <input id="cardSearch" placeholder="Pesquisar compra, fornecedor, marca ou Casulo" onkeydown="if(event.key==='Enter') searchCards('${scope}')">
      <button class="primary" onclick="searchCards('${scope}')">Pesquisar</button>
    </div>
    <div class="panel"><div class="table-wrap"><table>
      <thead><tr><th>Compra</th><th>Fornecedor</th><th>Marca</th><th>Tipo</th><th>Itens</th><th>Qtd. esperada</th><th>Casulo</th><th>Status</th><th></th></tr></thead>
      <tbody id="cardsBody">${cardRows(cards, scope)}</tbody>
    </table></div></div>`;
}

function processingQueueHtml(cards) {
  const tab = currentView === "labeling" ? "labeling" : currentView === "storage" ? "storage" : "processing";
  const brands = [...new Set(cards.map((c)=>c.brand).filter(Boolean))].sort();
  return `<div class="work-queue">
    <div class="queue-toolbar">
      <div class="queue-search"><span>⌕</span><input id="productionMaterialSearch" placeholder="Compra, fornecedor, marca, produto ou Casulo" oninput="filterProductionQueue()"></div>
      <select id="productionTypeFilter" onchange="filterProductionQueue()"><option value="">Todos os tipos</option><option value="GRADE">Grade</option><option value="SALDO">Saldo</option></select>
      <select id="productionStatusFilter" onchange="filterProductionQueue()"><option value="">Todos os status</option><option value="AGUARDANDO">Aguardando</option><option value="ATIVO">Em produção</option><option value="PAUSADO">Pausados</option></select>
      <select id="productionBrandFilter" onchange="filterProductionQueue()"><option value="">Todas as marcas</option>${brands.map((b)=>`<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select>
      <button class="ghost" onclick="clearProductionFilters()">Limpar</button>
    </div>
    <div class="queue-counter"><b id="productionVisibleCount">${cards.length}</b> materiais encontrados <span>• selecione uma linha para continuar</span></div>
    <div class="panel queue-panel"><div class="table-wrap queue-table-wrap"><table class="compact-table production-queue-table">
      <thead><tr><th class="select-col"></th><th>Material / compra</th><th>Fornecedor</th><th>Marca</th><th>Tipo</th><th>Itens</th><th>Qtd.</th><th>Casulo</th><th>Status</th><th></th></tr></thead>
      <tbody id="productionQueueBody">${cards.map((card)=>productionQueueRow(card,tab)).join("") || '<tr><td colspan="10">Nenhum material disponível.</td></tr>'}</tbody>
    </table></div></div>
    <div id="productionSelectionBar" class="selection-bar hidden"><div><span>Material selecionado</span><b id="productionSelectionLabel"></b></div><div class="actions"><button class="ghost" onclick="clearProductionSelection()">Cancelar</button><button class="primary" onclick="openSelectedProduction('${tab}')">Abrir material →</button></div></div>
  </div>`;
}

function productionQueueRow(card,tab="processing") {
  const searchable = [card.purchase_id,card.supplier,card.brand,card.casulo_current,card.original_type,card.material_search].join(" ").toLowerCase();
  const activity = card.status === "EM_PROCESSAMENTO" ? "ATIVO" : card.status === "PROCESSAMENTO_PAUSADO" ? "PAUSADO" : "AGUARDANDO";
  return `<tr class="production-material-row" tabindex="0" data-id="${card.id}" data-label="${esc(card.purchase_id)} — ${esc(card.brand||card.supplier||'Sem marca')}" data-search="${esc(searchable)}" data-type="${esc(card.purchase_mode||'')}" data-status="${activity}" data-brand="${esc(card.brand||'')}" onclick="selectProductionMaterial(${card.id})" ondblclick="openCard(${card.id},'${tab}')" onkeydown="if(event.key==='Enter')openCard(${card.id},'${tab}')">
    <td class="select-col"><span class="row-selector"></span></td><td><b>${esc(card.purchase_id)}</b><small>${esc(card.original_type||'')}</small></td><td>${esc(card.supplier||"—")}</td><td>${esc(card.brand||"—")}</td><td><span class="type-pill">${card.purchase_mode === "GRADE" ? "Grade" : "Saldo"}</span></td><td>${card.item_count}</td><td><b>${card.expected_total}</b></td><td>${esc(card.casulo_current||"—")}</td><td><span class="badge ${statusClass(card.status)}">${esc(card.status_label)}</span></td><td><button class="row-open" onclick="event.stopPropagation();openCard(${card.id},'processing')" aria-label="Abrir material">›</button></td></tr>`;
}

function filterProductionQueue() {
  const search=normalizeSearch($("productionMaterialSearch")?.value||""),type=$("productionTypeFilter")?.value||"",status=$("productionStatusFilter")?.value||"",brand=$("productionBrandFilter")?.value||"";
  let visible=0;
  document.querySelectorAll(".production-material-row").forEach((row)=>{const show=(!search||normalizeSearch(row.dataset.search).includes(search))&&(!type||row.dataset.type===type)&&(!status||row.dataset.status===status)&&(!brand||row.dataset.brand===brand);row.classList.toggle("hidden",!show);if(show)visible++;});
  if (selectedProductionCardId && document.querySelector(`.production-material-row[data-id="${selectedProductionCardId}"]`)?.classList.contains("hidden")) clearProductionSelection();
  if ($("productionVisibleCount")) $("productionVisibleCount").textContent=visible;
}
function normalizeSearch(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
function clearProductionFilters(){["productionMaterialSearch","productionTypeFilter","productionStatusFilter","productionBrandFilter"].forEach((id)=>{if($(id))$(id).value=""});filterProductionQueue();}
function selectProductionMaterial(id){selectedProductionCardId=id;document.querySelectorAll(".production-material-row").forEach((row)=>row.classList.toggle("selected",Number(row.dataset.id)===id));const row=document.querySelector(`.production-material-row[data-id="${id}"]`);$("productionSelectionLabel").textContent=row?.dataset.label||"";$("productionSelectionBar").classList.remove("hidden");}
function clearProductionSelection(){selectedProductionCardId=null;document.querySelectorAll(".production-material-row").forEach((row)=>row.classList.remove("selected"));$("productionSelectionBar")?.classList.add("hidden");}
function openSelectedProduction(tab="processing"){if(selectedProductionCardId)openCard(selectedProductionCardId,tab);}

function cardRows(cards, scope="receiving") {
  const tab = scope === "quality" ? "quality" : scope === "processing" ? "processing" : scope === "labeling" ? "labeling" : scope === "storage" ? "storage" : "receiving";
  return cards.map((card) => `
    <tr><td><b>${esc(card.purchase_id)}</b></td><td>${esc(card.supplier||"—")}</td><td>${esc(card.brand||"—")}</td>
    <td>${esc(card.purchase_mode === "GRADE" ? "Grade" : card.purchase_mode === "SALDO" ? "Saldo" : card.original_type||"—")}</td><td>${card.item_count}</td><td>${card.expected_total}</td><td>${esc(card.casulo_current||"—")}</td>
    <td><span class="badge ${statusClass(card.status)}">${esc(card.status_label)}</span></td>
    <td><button class="primary small-btn" onclick="openCard(${card.id},'${tab}')">Abrir Card</button></td></tr>
  `).join("") || '<tr><td colspan="9">Nenhum Card nesta lista.</td></tr>';
}

async function searchCards(scope) {
  const cards = await api(`/api/cards?scope=${scope}&search=${encodeURIComponent($("cardSearch").value)}`);
  $("cardsBody").innerHTML = cardRows(cards, scope);
}

async function renderImport() {
  setPage("Importar Excel", "Leitura completa das compras operacionais");
  const imports = await api("/api/imports");
  const allowed = currentUser.role === "admin";
  $("mainContent").innerHTML = `
    <div class="panel"><div class="panel-header">Relatório de Compras</div><div class="panel-body">
      <div class="notice">O sistema lê compras em <b>Trânsito</b> ou <b>Operações</b>, identifica a posição real de cada item e mantém o Card no <b>Recebimento</b>. A coluna <b>Tipo</b> classifica: <b>Private Label = Grade</b> e <b>Saldo = Saldo</b>.</div>
      ${allowed ? `<div class="import-zone"><h3>Selecione o arquivo oficial</h3><p>Há um arquivo para teste na pasta <b>arquivo_teste</b>.</p><input id="excelFile" type="file" accept=".xlsx,.xlsm"><br><button class="primary" onclick="uploadExcel()">Importar</button><div id="importResult"></div></div>` : '<div class="notice warn">Somente o Administrador pode importar arquivos.</div>'}
    </div></div>
    <div class="panel" style="margin-top:14px"><div class="panel-header">Últimas importações</div><div class="table-wrap"><table>
      <thead><tr><th>Arquivo</th><th>Linhas</th><th>Operacionais</th><th>Cards criados</th><th>Atualizados</th><th>Itens criados</th><th>Data</th></tr></thead>
      <tbody>${imports.map((row) => `<tr><td>${esc(row.filename)}</td><td>${row.total_rows}</td><td>${row.matched_rows}</td><td>${row.cards_created}</td><td>${row.cards_updated}</td><td>${row.items_created}</td><td>${fmtDateTime(row.created_at)}</td></tr>`).join("") || '<tr><td colspan="7">Nenhuma importação.</td></tr>'}</tbody>
    </table></div></div>`;
}

async function uploadExcel() {
  const file = $("excelFile").files[0];
  if (!file) return toast("Selecione o arquivo Excel.");
  const form = new FormData();
  form.append("file", file);
  $("importResult").innerHTML = '<div class="notice">Importando e agrupando os Cards...</div>';
  try {
    const response = await fetch(`/api/import-excel?user_id=${currentUser.id}`, { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Erro na importação.");
    $("importResult").innerHTML = `<div class="notice success-box"><b>Importação concluída.</b><br>Linhas lidas: ${data.total_rows}<br>Linhas operacionais: ${data.matched_rows}<br>Cards criados: ${data.cards_created}<br>Cards atualizados: ${data.cards_updated}<br>Itens criados: ${data.items_created}<br>Itens atualizados: ${data.items_updated}<br>Cards CD02 removidos: ${data.cards_removed_cd02||0}<br>Erros: ${data.errors.length}</div>`;
    toast("Importação concluída.");
  } catch (error) {
    $("importResult").innerHTML = `<div class="notice error">${esc(error.message)}</div>`;
  }
}

async function renderTestTools() {
  setPage("Ferramentas de teste", "Retorno da Costura CD01 e acesso rápido ao Processamento");
  if (currentUser.role !== "admin") {
    $("mainContent").innerHTML = '<div class="notice warn">Somente o Administrador acessa as simulações.</div>';
    return;
  }
  const [receiving, quality, processing, outside] = await Promise.all([
    api("/api/cards?scope=receiving"), api("/api/cards?scope=quality"), api("/api/cards?scope=processing"), api("/api/cards?scope=outside")
  ]);
  const costuraCards = receiving.filter((card) => card.status === "EM_COSTURA_CD01");
  const allCards = [...receiving, ...quality, ...processing, ...outside];
  const processingCandidates = allCards.filter((card) => card.status !== "DESPACHO_CD02" && card.current_sector !== "PROCESSAMENTO");
  $("mainContent").innerHTML = `
    <div class="notice">As simulações não substituem os fluxos reais. Elas existem somente para permitir o teste isolado dos módulos ainda em construção.</div>
    <div class="panel"><div class="panel-header">Retorno da Costura CD01</div><div class="table-wrap"><table>
      <thead><tr><th>Compra</th><th>Fornecedor</th><th>Status</th><th>Destino</th><th>Ações</th></tr></thead>
      <tbody>${costuraCards.map((card) => `
        <tr><td><b>${esc(card.purchase_id)}</b></td><td>${esc(card.supplier||"—")}</td><td><span class="badge ${statusClass(card.status)}">${esc(card.status_label)}</span></td><td>${esc(card.quality_destination||"—")}</td>
        <td><button class="success small-btn" onclick="simulateReturn(${card.id})">Registrar retorno CD01</button></td></tr>
      `).join("") || '<tr><td colspan="5">Nenhum Card em Costura CD01.</td></tr>'}</tbody>
    </table></div></div>
    <div class="panel" style="margin-top:14px"><div class="panel-header">Enviar diretamente ao Processamento para teste</div><div class="table-wrap"><table>
      <thead><tr><th>Compra</th><th>Fornecedor</th><th>Tipo</th><th>Setor atual</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${processingCandidates.map((card) => `
        <tr><td><b>${esc(card.purchase_id)}</b></td><td>${esc(card.supplier||"—")}</td><td>${esc(card.purchase_mode === "GRADE" ? "Grade" : card.purchase_mode === "SALDO" ? "Saldo" : "Não reconhecido")}</td><td>${esc(card.current_sector)}</td><td><span class="badge ${statusClass(card.status)}">${esc(card.status_label)}</span></td>
        <td><button class="primary small-btn" onclick="simulateSendProcessing(${card.id})">Enviar ao Processamento</button></td></tr>
      `).join("") || '<tr><td colspan="6">Nenhum Card disponível.</td></tr>'}</tbody>
    </table></div></div>`;
}

async function simulateReturn(cardId) {
  try {
    await api(`/api/test/cards/${cardId}/costura-return`, { method: "POST", body: JSON.stringify({ user_id: currentUser.id }) });
    toast("Retorno CD01 enviado ao Recebimento.");
    renderTestTools();
  } catch (error) { toast(error.message); }
}

async function simulateSendProcessing(cardId) {
  if (!confirm("Enviar este Card diretamente ao Processamento somente para teste?")) return;
  try {
    await api(`/api/test/cards/${cardId}/send-processing`, { method: "POST", body: JSON.stringify({ user_id: currentUser.id }) });
    toast("Card enviado ao Processamento para teste.");
    renderTestTools();
  } catch (error) { toast(error.message); }
}

async function renderGlobalHistory() {
  setPage("Histórico", "Todas as movimentações do Card único");
  const rows = await api("/api/history?limit=500");
  $("mainContent").innerHTML = `<div class="panel"><div class="panel-header">Últimos eventos</div><div class="panel-body"><div class="timeline">
    ${rows.map((event) => `<div class="timeline-event"><b>Compra ${esc(event.purchase_id)} — ${esc(event.description)}</b><br><small>${fmtDateTime(event.created_at)} ${event.user_name ? "• "+esc(event.user_name) : ""}</small></div>`).join("") || '<div class="notice">Nenhum evento.</div>'}
  </div></div></div>`;
}

async function openCard(cardId, tab = "receiving") {
  currentCardId = cardId;
  cardData = await api(`/api/cards/${cardId}`);
  receivingPhotos = cardData.receiving?.photo_paths || [];
  dispatchPhotos = cardData.dispatch?.photo_paths || [];
  $("modalBody").innerHTML = `
    <div class="card-title"><div><h2>Card da Compra ${esc(cardData.purchase_id)}</h2><div class="card-subtitle">${esc(cardData.supplier||"—")} • ${esc(cardData.brand||"—")} • ${cardData.expected_total} peças</div></div><span class="badge ${statusClass(cardData.status)}">${esc(cardData.status_label)}</span></div>
    <div class="summary-grid">
      <div class="summary-box"><span>Setor atual</span><strong>${esc(cardData.current_sector)}</strong></div>
      <div class="summary-box"><span>Tipo de entrada</span><strong>${cardData.receiving_type === "RETORNO" ? "Retorno da Costura" : "Mercadoria nova"}</strong></div>
      <div class="summary-box"><span>Tipo da compra</span><strong>${cardData.purchase_mode === "GRADE" ? "Grade" : cardData.purchase_mode === "SALDO" ? "Saldo" : "Não reconhecido"}</strong></div>
      <div class="summary-box"><span>Itens</span><strong>${cardData.items.length}</strong></div>
      <div class="summary-box"><span>Quantidade esperada</span><strong>${cardData.expected_total}</strong></div>
      <div class="summary-box"><span>Casulo atual</span><strong>${esc(cardData.casulo_current||"Não informado")}</strong></div>
    </div>
    <div class="tabs">
      <button id="tabReceivingBtn" onclick="renderReceivingTab()">Recebimento</button>
      <button id="tabQualityBtn" onclick="renderQualityTab()">Qualidade</button>
      <button id="tabProcessingBtn" onclick="renderProcessingTab()">Processamento</button>
      <button id="tabLabelingBtn" onclick="renderDownstreamTab('ETIQUETAGEM')">Etiquetagem</button>
      <button id="tabStorageBtn" onclick="renderDownstreamTab('ESTOCAGEM')">Estocagem</button>
      <button id="tabCasuloBtn" onclick="renderCasuloTab()">Casulo</button>
      <button id="tabProductsBtn" onclick="renderProductsTab()">Produtos</button>
      <button id="tabHistoryBtn" onclick="renderCardHistory()">Histórico</button>
    </div>
    <div id="cardTab"></div>`;
  $("modal").classList.remove("hidden");
  if (tab === "casulo") renderCasuloTab();
  else if (tab === "quality") renderQualityTab();
  else if (tab === "processing") renderProcessingTab();
  else if (tab === "labeling") renderDownstreamTab("ETIQUETAGEM");
  else if (tab === "storage") renderDownstreamTab("ESTOCAGEM");
  else if (tab === "products") renderProductsTab();
  else if (tab === "history") renderCardHistory();
  else renderReceivingTab();
}

function activateTab(id) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
  $(id)?.classList.add("active");
}

function canOperateReceiving() {
  return currentUser.role === "recebimento" && cardData.current_sector === "RECEBIMENTO";
}

function canOperateQuality() {
  return ["qualidade", "supervisor", "admin"].includes(currentUser.role);
}

function canDistributeQuality() {
  return ["supervisor", "admin"].includes(currentUser.role);
}

function canOperateProcessing() {
  return ["processamento", "supervisor", "admin"].includes(currentUser.role);
}

function canDistributeProcessing() {
  return ["supervisor", "admin"].includes(currentUser.role);
}

function renderReceivingTab() {
  activateTab("tabReceivingBtn");
  if (String(cardData.status||"").startsWith("ORIGEM_") || (cardData.source_snapshot_at && !cardData.receiving)) {
    window.sourceAllowedStages=null;
    $("cardTab").innerHTML = sourceLocationHtml();
    return;
  }
  if (cardData.source_snapshot_at && cardData.current_sector !== "RECEBIMENTO") {
    window.sourceAllowedStages=null;
    $("cardTab").innerHTML = `<div class="notice"><b>Andamento local preservado:</b> ${esc(cardData.current_sector)} — ${esc(cardData.status_label)}.</div>${sourceLocationHtml()}`;
    return;
  }
  if (cardData.current_sector !== "RECEBIMENTO") {
    $("cardTab").innerHTML = outsideReceivingHtml();
    return;
  }
  if (cardData.status === "AGUARDANDO_DESPACHO_COSTURA") {
    $("cardTab").innerHTML = dispatchHtml();
    return;
  }
  if (cardData.status === "AGUARDANDO_RECEBIMENTO_RETORNO") {
    $("cardTab").innerHTML = receivingFormHtml(true);
    window.setTimeout(refreshTimerDisplay, 500);
    return;
  }
  if (cardData.status === "EM_COSTURA_CD01") {
    $("cardTab").innerHTML = inCosturaHtml();
    return;
  }
  $("cardTab").innerHTML = receivingFormHtml(false);
  window.setTimeout(refreshTimerDisplay, 500);
}

function sourceLocationHtml() {
  const stages = {};
  cardData.items.forEach((i)=>stages[i.source_stage]=(stages[i.source_stage]||0)+1);
  return `<div class="panel-body"><div class="notice success-box"><b>Card mantido no Recebimento</b><br>Esta é a fotografia do último relatório importado. A posição é controlada por item/tamanho, inclusive quando uma mesma compra está dividida entre etapas.</div>
    <div class="stage-chips">${Object.entries(stages).map(([s,n])=>`<button class="stage-chip" onclick="filterSourceItems('${esc(s)}')"><b>${n}</b> ${esc(sourceStageLabel(s))}</button>`).join("")}<button class="stage-chip" onclick="filterSourceItems('')">Mostrar todos</button></div>
    <div class="queue-search source-search"><span>⌕</span><input id="sourceItemSearch" placeholder="Produto, referência, cor, tamanho ou costureiro" oninput="filterSourceItems()"></div>
    <div class="table-wrap source-items"><table class="compact-table"><thead><tr><th>Produto</th><th>Referência</th><th>Cor</th><th>Tamanho</th><th>Qtd.</th><th>Posição</th><th>Costureiro</th></tr></thead><tbody>
    ${cardData.items.map((i)=>`<tr class="source-item-row" data-stage="${esc(i.source_stage)}" data-search="${esc([i.product,i.reference,i.sku,i.color,i.size,i.source_seamstress].join(' ').toLowerCase())}"><td><b>${esc(i.product||'—')}</b></td><td>${esc(i.reference||i.sku||'—')}</td><td>${esc(i.color||'—')}</td><td><b>${esc(i.size||'—')}</b></td><td>${i.expected_qty}</td><td><span class="type-pill">${esc(sourceStageLabel(i.source_stage))}</span><small>${esc(i.source_status_pcp||i.source_status_logistics||i.source_status_quality||'')}</small></td><td>${esc(i.source_seamstress||'—')}</td></tr>`).join("")}
    </tbody></table></div><div class="notice">Atualizado em ${fmtDateTime(cardData.source_snapshot_at)}. Uma nova importação atualiza a posição sem criar outro Card.</div></div>`;
}
function sourceStageLabel(s){return ({FORNECEDOR:"No fornecedor",TRANSITO:"Em trânsito",QUALIDADE:"Qualidade",QUALIDADE_RETRABALHO:"Retrabalho",QUALIDADE_REJEITADO:"Rejeitado",PCP_CONFIGURAR:"PCP — configurar",AGUARDANDO_COSTURA:"Vai para Costura",EM_COSTURA:"Na Costura",RETORNO_COSTURA:"Retornou da Costura",AGUARDANDO_PROCESSAMENTO:"Aguardando Processamento",PROCESSAMENTO:"Processamento",ESTOCAGEM:"Estocagem",CONCLUIDO:"Concluído"})[s]||s||"Não classificado";}
function filterSourceItems(stage="__KEEP__"){
  if(stage!=="__KEEP__") window.sourceStageFilter=stage;
  const term=normalizeSearch($("sourceItemSearch")?.value||"");
  document.querySelectorAll(".source-item-row").forEach((r)=>r.classList.toggle("hidden",!!((window.sourceAllowedStages&&!window.sourceAllowedStages.includes(r.dataset.stage))||(window.sourceStageFilter&&r.dataset.stage!==window.sourceStageFilter)||(term&&!normalizeSearch(r.dataset.search).includes(term)))));
}

function renderImportedSectorSnapshot(tabId,stages,title){
  activateTab(tabId); window.sourceAllowedStages=stages; window.sourceStageFilter="";
  $("cardTab").innerHTML=`<div class="notice success-box"><b>${esc(title)}</b><br>Este Card possui itens nesta etapa conforme o relatório importado.</div>${sourceLocationHtml()}`;
  filterSourceItems("");
}

function outsideReceivingHtml() {
  const d = cardData.dispatch;
  return `<div class="panel-body">
    <div class="notice">Este Card não está atualmente no Recebimento. Os dados permanecem disponíveis somente para consulta.</div>
    ${cardData.status === "EM_COSTURA_CD01" && d ? `<div class="form-grid"><div class="field"><label>Transportadora</label><input class="readonly" readonly value="${esc(d.carrier)}"></div><div class="field"><label>Costureiro</label><input class="readonly" readonly value="${esc(d.seamstress_name)}"></div><div class="field"><label>Previsão de retorno</label><input class="readonly" readonly value="${fmtDate(d.return_forecast)}"></div></div>` : ""}
    ${cardData.status === "DESPACHO_CD02" ? '<div class="notice error"><b>Despacho CD02:</b> a mercadoria saiu do fluxo operacional interno.</div>' : ""}
  </div>`;
}

function inCosturaHtml() {
  const d = cardData.dispatch;
  return `<div class="panel-body">
    <div class="notice success-box"><b>Mercadoria em Costura — CD01</b><br>O Card permanece na aba Recebimento para acompanhamento até o retorno da mercadoria.</div>
    <div class="form-grid">
      <div class="field"><label>Status</label><input class="readonly" readonly value="${esc(cardData.status_label)}"></div>
      <div class="field"><label>Destino</label><input class="readonly" readonly value="${esc(cardData.quality_destination || "CD01")}"></div>
      <div class="field"><label>Transportadora</label><input class="readonly" readonly value="${esc(d?.carrier || "—")}"></div>
      <div class="field"><label>Costureiro</label><input class="readonly" readonly value="${esc(d?.seamstress_name || "—")}"></div>
      <div class="field"><label>Quantidade despachada</label><input class="readonly" readonly value="${d?.dispatched_qty ?? "—"}"></div>
      <div class="field"><label>Volumes</label><input class="readonly" readonly value="${d?.volumes ?? "—"}"></div>
      <div class="field"><label>Data do despacho</label><input class="readonly" readonly value="${fmtDateTime(d?.completed_at)}"></div>
      <div class="field"><label>Previsão de retorno</label><input class="readonly" readonly value="${fmtDate(d?.return_forecast)}"></div>
      <div class="field full"><label>Observações do despacho</label><textarea class="readonly" readonly>${esc(d?.notes || "")}</textarea></div>
    </div>
    <div class="notice warn">Aguardando o retorno da Costura. Quando a mercadoria retornar, o mesmo Card mudará para <b>Aguardando recebimento do retorno</b>.</div>
    ${currentUser.role === "admin" ? `<div class="actions"><button class="success" onclick="simulateReturn(${cardData.id})">Registrar retorno CD01 — teste</button></div>` : ""}
  </div>`;
}

function receivingFormHtml(isReturn) {
  const r = cardData.receiving;
  if (!r) return '<div class="notice error">Registro de Recebimento não encontrado.</div>';
  const operate = canOperateReceiving();
  const physicalDone = r.physical_status === "CONCLUIDO";
  const sampleDone = r.ten_percent_status === "CONCLUIDA";
  const readOnly = operate && !physicalDone ? "" : "readonly";
  const disabled = operate && !physicalDone ? "" : "disabled";
  return `
    <div class="panel-body">
      <div class="notice ${isReturn ? "success-box" : ""}"><b>${isReturn ? "Recebimento do retorno CD01" : "Recebimento de mercadoria nova"}</b><br>${isReturn ? "Registre o retorno e separe uma nova amostra de 10%. O Card só segue para a Inspeção 2 quando as duas partes terminarem." : "O recebimento físico e a separação dos 10% com triagem inicial podem ser concluídos em qualquer ordem. O Card só segue para a Qualidade quando ambos terminarem."}</div>
      <h3 class="section-heading">Recebimento físico</h3>
      <div class="form-grid">
        <div class="field"><label>Volumes</label><input id="recVolumes" type="number" min="0" ${readOnly} value="${r.volumes ?? ""}"></div>
        <div class="field"><label>${isReturn ? "Quantidade retornada" : "Quantidade recebida"}</label><input id="recQty" type="number" min="0" ${readOnly} value="${r.received_qty ?? ""}"></div>
        <div class="field"><label>Danos ou avarias?</label><select id="recDamage" ${disabled}><option value="">Selecione</option><option value="0" ${r.has_damage===0?"selected":""}>Não</option><option value="1" ${r.has_damage===1?"selected":""}>Sim</option></select></div>
        <div class="field full"><label>Descrição dos danos</label><textarea id="recDamageDesc" ${readOnly}>${esc(r.damage_description||"")}</textarea></div>
        <div class="field full"><label>Observações</label><textarea id="recNotes" ${readOnly}>${esc(r.notes||"")}</textarea></div>
      </div>
      <div class="actions">
        ${operate && !physicalDone ? `<button class="secondary" onclick="saveReceiving()">Salvar dados</button><button class="success" onclick="completePhysical()">Concluir recebimento físico</button><label class="primary small-btn" style="cursor:pointer">Adicionar fotos<input id="receivingFiles" type="file" multiple hidden onchange="uploadReceivingPhotos()"></label>` : ""}
        ${physicalDone ? '<span class="badge green">Recebimento físico concluído</span>' : '<span class="badge gray">Recebimento físico pendente</span>'}
      </div>
      <div class="photos">${receivingPhotos.map((p,i)=>`<a class="photo-link" target="_blank" href="${p}">Arquivo ${i+1}</a>`).join("")}</div>
      ${sampleHtml(r, sampleDone, operate, isReturn)}
    </div>`;
}

function sampleHtml(r, sampleDone, operate, isReturn=false) {
  const timer = r.timer || { state:"NAO_INICIADA",business_seconds:0,paused_seconds:0,permanence_seconds:0 };
  return `
    <h3 class="section-heading">${isReturn ? "Nova tiragem de 10% do retorno" : "Tiragem de 10% + triagem inicial"}</h3>
    <div class="timer-card">
      <div class="form-grid">
        <div class="field"><label>Quantidade esperada da compra</label><input class="readonly" readonly value="${cardData.expected_total}"></div>
        <div class="field"><label>Quantidade mínima (10%)</label><input class="readonly" readonly value="${r.ten_percent_min}"></div>
        <div class="field"><label>Quantidade efetivamente separada</label><input id="sampleActual" type="number" min="0" ${operate && !sampleDone ? "" : "readonly"} value="${r.ten_percent_actual ?? ""}"></div>
      </div>
      <div class="timer-grid" style="margin-top:11px">
        <div class="timer-value"><span>Status</span><strong>${esc(timer.state)}</strong></div>
        <div class="timer-value"><span>Tempo útil</span><strong id="timerUseful">${fmtSeconds(timer.business_seconds)}</strong></div>
        <div class="timer-value"><span>Tempo parado</span><strong id="timerPaused">${fmtSeconds(timer.paused_seconds)}</strong></div>
        <div class="timer-value"><span>Permanência</span><strong id="timerPermanence">${fmtSeconds(timer.permanence_seconds)}</strong></div>
      </div>
      <div class="actions">
        ${operate && !sampleDone && timer.state === "NAO_INICIADA" ? `<button class="primary" onclick="sampleAction('start')">${isReturn ? "Iniciar tiragem" : "Iniciar tiragem e triagem"}</button>` : ""}
        ${operate && !sampleDone && timer.state === "EM_ANDAMENTO" ? `<button class="warning" onclick="sampleAction('pause')">Pausar</button><button class="success" onclick="sampleAction('finish')">${isReturn ? "Concluir tiragem" : "Concluir tiragem e triagem"}</button>` : ""}
        ${operate && !sampleDone && timer.state === "PAUSADA" ? `<button class="primary" onclick="sampleAction('resume')">Retomar</button><button class="success" onclick="sampleAction('finish')">${isReturn ? "Concluir tiragem" : "Concluir tiragem e triagem"}</button>` : ""}
        ${sampleDone ? `<span class="badge green">${isReturn ? "Nova amostra separada" : "Tiragem e triagem concluídas"}</span>` : `<span class="badge orange">${isReturn ? "Nova amostra pendente" : "Tiragem e triagem pendentes"}</span>`}
      </div>
    </div>`;
}

function dispatchHtml() {
  const operate = canOperateReceiving();
  return `<div class="panel-body">
    <div class="notice warn"><b>Inspeção 1 concluída.</b> A Qualidade definiu o destino <b>${esc(cardData.quality_destination)}</b>. O Recebimento é responsável pelo despacho.</div>
    <div class="form-grid">
      <div class="field"><label>Destino definido pela Qualidade</label><input class="readonly" readonly value="${esc(cardData.quality_destination)}"></div>
      <div class="field"><label>Transportadora</label><input id="dispatchCarrier" ${operate?"":"readonly"}></div>
      <div class="field"><label>Nome do costureiro</label><input id="dispatchSeamstress" ${operate?"":"readonly"}></div>
      <div class="field"><label>Quantidade despachada</label><input id="dispatchQty" type="number" min="0" ${operate?"":"readonly"}></div>
      <div class="field"><label>Volumes</label><input id="dispatchVolumes" type="number" min="0" ${operate?"":"readonly"}></div>
      <div class="field full"><label>Observações</label><textarea id="dispatchNotes" ${operate?"":"readonly"}></textarea></div>
    </div>
    <div class="actions">${operate ? `<button class="success" onclick="completeDispatch()">Concluir despacho</button><label class="primary small-btn" style="cursor:pointer">Adicionar fotos<input id="dispatchFiles" type="file" multiple hidden onchange="uploadDispatchPhotos()"></label>` : '<span class="badge gray">Somente operador de Recebimento</span>'}</div>
    <div class="photos">${dispatchPhotos.map((p,i)=>`<a class="photo-link" target="_blank" href="${p}">Arquivo ${i+1}</a>`).join("")}</div>
  </div>`;
}

async function saveReceiving() {
  try {
    const r = cardData.receiving;
    await api(`/api/receivings/${r.id}`, { method:"PATCH", body:JSON.stringify({
      user_id: currentUser.id,
      volumes: $("recVolumes").value === "" ? null : Number($("recVolumes").value),
      received_qty: $("recQty").value === "" ? null : Number($("recQty").value),
      has_damage: $("recDamage").value === "" ? null : $("recDamage").value === "1",
      damage_description: $("recDamageDesc").value,
      notes: $("recNotes").value,
      photo_paths: receivingPhotos,
      ten_percent_actual: $("sampleActual") ? ($("sampleActual").value === "" ? null : Number($("sampleActual").value)) : r.ten_percent_actual,
    })});
    toast("Dados salvos.");
    await openCard(currentCardId);
  } catch (error) { toast(error.message); }
}

async function completePhysical() {
  try {
    await saveReceivingNoReload();
    await api(`/api/receivings/${cardData.receiving.id}/physical-complete`, { method:"POST", body:JSON.stringify({ user_id:currentUser.id }) });
    toast("Recebimento físico concluído.");
    await openCard(currentCardId);
  } catch (error) { toast(error.message); }
}

async function saveReceivingNoReload() {
  const r = cardData.receiving;
  await api(`/api/receivings/${r.id}`, { method:"PATCH", body:JSON.stringify({
    user_id: currentUser.id,
    volumes: $("recVolumes").value === "" ? null : Number($("recVolumes").value),
    received_qty: $("recQty").value === "" ? null : Number($("recQty").value),
    has_damage: $("recDamage").value === "" ? null : $("recDamage").value === "1",
    damage_description: $("recDamageDesc").value,
    notes: $("recNotes").value,
    photo_paths: receivingPhotos,
    ten_percent_actual: $("sampleActual") ? ($("sampleActual").value === "" ? null : Number($("sampleActual").value)) : r.ten_percent_actual,
  })});
}

async function sampleAction(action) {
  try {
    if ($("sampleActual")) {
      await api(`/api/receivings/${cardData.receiving.id}`, { method:"PATCH", body:JSON.stringify({
        user_id:currentUser.id,
        ten_percent_actual: $("sampleActual").value === "" ? null : Number($("sampleActual").value),
      })});
    }
    await api(`/api/receivings/${cardData.receiving.id}/timer/${action}`, { method:"POST", body:JSON.stringify({ user_id:currentUser.id }) });
    toast("Atividade dos 10% atualizada.");
    await openCard(currentCardId);
  } catch (error) { toast(error.message); }
}

async function uploadFiles(inputId) {
  const files = Array.from($(inputId).files || []);
  if (!files.length) return [];
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const result = await api("/api/uploads", { method:"POST", body:form });
  return result.paths;
}

async function uploadReceivingPhotos() {
  try {
    receivingPhotos.push(...await uploadFiles("receivingFiles"));
    toast("Arquivos adicionados. Clique em Salvar dados para registrar.");
    renderReceivingTab();
  } catch (error) { toast(error.message); }
}

async function uploadDispatchPhotos() {
  try {
    dispatchPhotos.push(...await uploadFiles("dispatchFiles"));
    toast("Arquivos adicionados ao despacho.");
    renderReceivingTab();
  } catch (error) { toast(error.message); }
}

async function completeDispatch() {
  try {
    await api(`/api/cards/${currentCardId}/dispatch`, { method:"POST", body:JSON.stringify({
      user_id:currentUser.id,
      carrier:$("dispatchCarrier").value,
      seamstress_name:$("dispatchSeamstress").value,
      dispatched_qty:$("dispatchQty").value,
      volumes:$("dispatchVolumes").value,
      notes:$("dispatchNotes").value,
      photo_paths:dispatchPhotos,
    })});
    toast("Despacho concluído.");
    await openCard(currentCardId);
  } catch (error) { toast(error.message); }
}

function renderCasuloTab() {
  activateTab("tabCasuloBtn");
  const canEdit = canOperateReceiving();
  $("cardTab").innerHTML = `<div class="panel-body">
    <div class="casulo-box"><h3 style="margin-top:0">Localização física da mercadoria</h3><div class="form-grid">
      <div class="field"><label>Casulo atual</label><input class="readonly" readonly value="${esc(cardData.casulo_current||"Não informado")}"></div>
      <div class="field"><label>Novo Casulo</label><input id="newCasulo" ${canEdit?"":"readonly"}></div>
      <div class="field"><label>Observação da movimentação</label><input id="casuloNote" ${canEdit?"":"readonly"}></div>
    </div><div class="actions">${canEdit?'<button class="primary" onclick="updateCasulo()">Atualizar Casulo</button>':'<span class="badge gray">Edição permitida somente ao operador de Recebimento enquanto o Card estiver no Recebimento</span>'}</div></div>
    <h3 class="section-heading">Histórico de Casulos</h3>
    <div class="timeline">${cardData.casulo_history.map((row)=>`<div class="timeline-event"><b>${esc(row.old_casulo||"Não informado")} → ${esc(row.new_casulo)}</b><br><small>${fmtDateTime(row.created_at)} • ${esc(row.user_name)} ${row.note?"• "+esc(row.note):""}</small></div>`).join("") || '<div class="notice">Nenhuma movimentação registrada.</div>'}</div>
  </div>`;
}

async function updateCasulo() {
  try {
    await api(`/api/cards/${currentCardId}/casulo`, { method:"POST", body:JSON.stringify({ user_id:currentUser.id,new_casulo:$("newCasulo").value,note:$("casuloNote").value }) });
    toast("Casulo atualizado.");
    await openCard(currentCardId, "casulo");
  } catch (error) { toast(error.message); }
}

function renderProductsTab() {
  activateTab("tabProductsBtn");
  $("cardTab").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Produto</th><th>Referência</th><th>SKU</th><th>Marca</th><th>Cor</th><th>Tamanho</th><th>Lote</th><th>NF</th><th>Qtd. esperada</th></tr></thead>
    <tbody>${cardData.items.map((i)=>`<tr><td>${esc(i.product||"—")}</td><td>${esc(i.reference||"—")}</td><td>${esc(i.sku||"—")}</td><td>${esc(i.brand||"—")}</td><td>${esc(i.color||"—")}</td><td>${esc(i.size||"—")}</td><td>${esc(i.lot||"—")}</td><td>${esc(i.nf||"—")}</td><td>${i.expected_qty}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

function renderCardHistory() {
  activateTab("tabHistoryBtn");
  $("cardTab").innerHTML = `<div class="panel-body"><div class="timeline">${cardData.history.map((event)=>`<div class="timeline-event"><b>${esc(event.description)}</b><br><small>${fmtDateTime(event.created_at)} ${event.user_name?"• "+esc(event.user_name):""}</small></div>`).join("") || '<div class="notice">Nenhum evento.</div>'}</div></div>`;
}

async function renderQualityTab() {
  activateTab("tabQualityBtn");
  try {
    if (!qualityUsers.length) qualityUsers = await api("/api/quality/users");
  } catch (error) {
    $("cardTab").innerHTML = `<div class="notice error">${esc(error.message)}</div>`;
    return;
  }
  const q = cardData.quality;
  if (cardData.source_snapshot_at && !q && cardData.current_sector !== "QUALIDADE") {
    renderImportedSectorSnapshot("tabQualityBtn",["QUALIDADE","QUALIDADE_RETRABALHO","QUALIDADE_REJEITADO"],"Itens localizados na Qualidade");
    return;
  }
  const needsNewInspection = cardData.current_sector === "QUALIDADE" && (!q || q.status === "CONCLUIDA");
  if (needsNewInspection) {
    if (!canOperateQuality()) {
      $("cardTab").innerHTML = '<div class="panel-body"><div class="notice warn">Aguardando um usuário da Qualidade configurar a nova inspeção.</div></div>';
      return;
    }
    $("cardTab").innerHTML = qualitySetupHtml(q);
    toggleQualitySetupFields();
    return;
  }
  if (!q) {
    $("cardTab").innerHTML = '<div class="panel-body"><div class="notice">Este Card ainda não possui inspeção da Qualidade.</div></div>';
    return;
  }
  $("cardTab").innerHTML = qualityInspectionHtml(q);
}

function qualitySetupHtml(previousInspection=null) {
  const defaultType = cardData.receiving_type === "RETORNO" ? 2 : 1;
  const defaultMode = cardData.purchase_mode || previousInspection?.purchase_mode || "";
  return `<div class="panel-body">
    ${previousInspection ? `<div class="notice success-box">A Inspeção ${previousInspection.inspection_type} anterior foi concluída em ${fmtDateTime(previousInspection.completed_at)}. O Card retornou à Qualidade para uma nova rodada.</div>` : ""}
    <div class="notice"><b>Configuração da inspeção</b><br>O tipo da compra vem automaticamente da coluna <b>Tipo</b> do Excel: Private Label = Grade e Saldo = Saldo.</div>
    ${cardData.receiving_type === "RETORNO"
      ? '<div class="notice warn"><b>Retorno da Costura:</b> a Inspeção 2 é obrigatória e usará a nova amostra de 10% separada pelo Recebimento.</div>'
      : '<div class="notice success-box"><b>Mercadoria nova:</b> escolha Inspeção 1 somente quando a mercadoria precisar ir para Costura. Escolha Inspeção 2 quando ela já puder seguir diretamente para Processamento. Nos dois casos será usada a amostra dos 10% separada pelo Recebimento.</div>'}
    <div class="form-grid">
      <div class="field"><label>Tipo de inspeção</label><select id="qualityType" onchange="toggleQualitySetupFields()" ${cardData.receiving_type === "RETORNO" ? "disabled" : ""}><option value="1" ${defaultType===1?"selected":""}>Inspeção 1</option><option value="2" ${defaultType===2?"selected":""}>Inspeção 2</option></select></div>
      <div class="field"><label>Tipo da compra</label><input id="qualityPurchaseMode" class="readonly" readonly value="${defaultMode === "GRADE" ? "Grade — controle por item" : defaultMode === "SALDO" ? "Saldo — quantidade geral" : "Tipo não reconhecido"}"></div>
      <div class="field" id="qualityDestinationField"><label>Destino da Inspeção 1</label><select id="qualityDestination"><option value="">Selecione</option><option value="CD01">CD01 — retorna ao nosso CD</option><option value="CD02">CD02 — sai do fluxo interno</option></select></div>
      <div class="field"><label>É necessário separar peças para Desenvolvimento?</label><select id="developmentRequired" onchange="toggleDevelopmentSetup()"><option value="">Selecione</option><option value="0">Não</option><option value="1">Sim</option></select></div>
      <div class="field" id="developmentSeparatedField" style="display:none"><label>As peças para Desenvolvimento já foram separadas?</label><select id="developmentSeparated"><option value="">Selecione</option><option value="0">Não</option><option value="1">Sim</option></select></div>
    </div>
    <div class="actions"><button class="primary" onclick="createQualityInspection()">Criar inspeção</button></div>
  </div>`;
}

function toggleQualitySetupFields() {
  const type = Number($("qualityType")?.value || 1);
  if ($("qualityDestinationField")) $("qualityDestinationField").style.display = type === 1 ? "block" : "none";
}

function toggleDevelopmentSetup() {
  const required = $("developmentRequired")?.value === "1";
  if ($("developmentSeparatedField")) $("developmentSeparatedField").style.display = required ? "block" : "none";
}

async function createQualityInspection() {
  try {
    const requiredValue = $("developmentRequired").value;
    const separatedValue = $("developmentSeparated")?.value ?? "";
    await api(`/api/cards/${currentCardId}/quality/inspections`, {
      method: "POST",
      body: JSON.stringify({
        user_id: currentUser.id,
        inspection_type: Number($("qualityType").value),
        destination: $("qualityDestination")?.value || null,
        development_required: requiredValue === "" ? null : requiredValue === "1",
        development_separated: requiredValue !== "1" ? null : (separatedValue === "" ? null : separatedValue === "1"),
      }),
    });
    toast("Inspeção criada.");
    await openCard(currentCardId, "quality");
  } catch (error) { toast(error.message); }
}

function qualityInspectionHtml(q) {
  const isOpen = q.status === "ABERTA";
  const canOperate = canOperateQuality();
  const typeLabel = `Inspeção ${q.inspection_type}`;
  const modeLabel = q.purchase_mode === "SALDO" ? "Saldo — controle por quantidade geral" : "Grade — controle por item";
  const sampleLabel = q.sample_source === "RECEBIMENTO"
    ? `Amostra dos 10% separada e triada pelo Recebimento • ${modeLabel}`
    : `Nova amostra obrigatória de 10% separada pelo Recebimento após o retorno da Costura • ${modeLabel}`;
  return `<div class="panel-body">
    <div class="quality-header">
      <div class="notice ${q.inspection_type===2?"success-box":""}"><b>${typeLabel}</b>${q.inspection_type===1?` — destino <b>${esc(q.destination)}</b>`:""}<br>${sampleLabel}</div>
      ${q.development_warning ? '<div class="notice warn"><b>Atenção:</b> a separação de peças para o setor Desenvolvimento ainda está pendente. Este aviso não bloqueia a conclusão.</div>' : ''}
    </div>
    <div class="summary-grid quality-summary">
      <div class="summary-box"><span>Meta da amostra</span><strong>${q.totals.sample_target}</strong></div>
      <div class="summary-box"><span>Amostra definida</span><strong>${q.totals.sample_defined}</strong></div>
      <div class="summary-box"><span>Atribuída</span><strong>${q.totals.assigned}</strong></div>
      <div class="summary-box"><span>Inspecionada</span><strong>${q.totals.inspected}</strong></div>
      <div class="summary-box"><span>Disponível</span><strong>${q.totals.available}</strong></div>
      <div class="summary-box"><span>Aprovada</span><strong>${q.totals.approved}</strong></div>
      <div class="summary-box"><span>Rejeitada</span><strong>${q.totals.rejected}</strong></div>
      <div class="summary-box"><span>Retrabalho</span><strong>${q.totals.rework}</strong></div>
    </div>
    ${developmentQualityHtml(q, canOperate)}
    ${qualityPreviousInspectionsHtml(q)}
    ${qualitySampleHtml(q, isOpen, canOperate)}
    ${qualityAssignmentAreaHtml(q, isOpen, canOperate)}
    ${qualityWorkersHtml(q, isOpen)}
    <h3 class="section-heading">Conclusão geral da inspeção</h3>
    ${q.validation_errors.length ? `<div class="notice warn"><b>Pendências para concluir:</b><br>${q.validation_errors.slice(0,10).map(esc).join("<br>")}${q.validation_errors.length>10?"<br>…":""}</div>` : '<div class="notice success-box"><b>Todos os itens e quantidades da amostra estão fechados.</b></div>'}
    <div class="actions">
      ${isOpen && canOperate ? `<button class="success" ${q.completion_ready?"":"disabled"} onclick="completeQualityInspection()">Concluir inspeção</button>` : ''}
      ${!isOpen ? '<span class="badge green">Inspeção concluída</span>' : ''}
    </div>
  </div>`;
}

function qualityPreviousInspectionsHtml(q) {
  const rows = q.previous_inspections || [];
  if (!rows.length) return "";
  return `<h3 class="section-heading">Rodadas anteriores da Qualidade</h3><div class="table-wrap"><table>
    <thead><tr><th>Inspeção</th><th>Tipo</th><th>Destino</th><th>Amostra</th><th>Aprovada</th><th>Rejeitada</th><th>Retrabalho</th><th>Conclusão</th><th>Desenvolvimento</th></tr></thead>
    <tbody>${rows.map((row)=>`<tr><td>Inspeção ${row.inspection_type}</td><td>${row.purchase_mode==="SALDO"?"Saldo":"Grade"}</td><td>${esc(row.destination||"—")}</td><td>${row.sample_target_total}</td><td>${row.approved_total}</td><td>${row.rejected_total}</td><td>${row.rework_total}</td><td>${fmtDateTime(row.completed_at)}</td><td>${row.development_pending?'<span class="badge orange">Pendente</span>':'<span class="badge green">Regular</span>'}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

function developmentQualityHtml(q, canOperate) {
  const requiredValue = q.development_required === null || q.development_required === undefined ? "" : String(q.development_required);
  const separatedValue = q.development_separated === null || q.development_separated === undefined ? "" : String(q.development_separated);
  if (!canOperate) {
    return `<h3 class="section-heading">Desenvolvimento</h3><div class="notice">Separação necessária: <b>${requiredValue==="1"?"Sim":requiredValue==="0"?"Não":"Não informado"}</b>${requiredValue==="1"?`<br>Peças separadas: <b>${separatedValue==="1"?"Sim":"Não"}</b>`:""}</div>`;
  }
  return `<h3 class="section-heading">Separação para Desenvolvimento</h3>
    <div class="form-grid">
      <div class="field"><label>É necessário separar peças?</label><select id="qualityDevRequired" onchange="toggleQualityDevelopmentEdit()"><option value="0" ${requiredValue==="0"?"selected":""}>Não</option><option value="1" ${requiredValue==="1"?"selected":""}>Sim</option></select></div>
      <div class="field" id="qualityDevSeparatedField" style="display:${requiredValue==="1"?"block":"none"}"><label>As peças já foram separadas?</label><select id="qualityDevSeparated"><option value="0" ${separatedValue!=="1"?"selected":""}>Não</option><option value="1" ${separatedValue==="1"?"selected":""}>Sim</option></select></div>
    </div><div class="actions"><button class="secondary" onclick="saveQualityDevelopment()">Atualizar Desenvolvimento</button></div>`;
}

function toggleQualityDevelopmentEdit() {
  if ($("qualityDevSeparatedField")) $("qualityDevSeparatedField").style.display = $("qualityDevRequired").value === "1" ? "block" : "none";
}

async function saveQualityDevelopment() {
  try {
    const required = $("qualityDevRequired").value === "1";
    await api(`/api/quality/inspections/${cardData.quality.id}/development`, {
      method: "PATCH",
      body: JSON.stringify({
        user_id: currentUser.id,
        development_required: required,
        development_separated: required ? $("qualityDevSeparated").value === "1" : null,
      }),
    });
    toast("Situação do Desenvolvimento atualizada.");
    await openCard(currentCardId, "quality");
  } catch (error) { toast(error.message); }
}

function qualitySampleHtml(q, isOpen, canOperate) {
  if (q.purchase_mode === "SALDO") {
    const row = q.sample_items[0];
    return `<h3 class="section-heading">Amostra automática — Saldo</h3>
      <div class="notice"><b>Quantidade geral:</b> não é necessário distribuir por produto, cor ou tamanho. A soma dos inspetores deve fechar ${q.totals.sample_target} peças.</div>
      <div class="summary-grid compact-summary">
        <div class="summary-box"><span>Amostra geral</span><strong>${row?.sample_qty ?? q.totals.sample_target}</strong></div>
        <div class="summary-box"><span>Atribuída</span><strong>${row?.assigned_total ?? 0}</strong></div>
        <div class="summary-box"><span>Disponível</span><strong>${row?.available_qty ?? q.totals.sample_target}</strong></div>
      </div>`;
  }
  return `<h3 class="section-heading">Amostra automática — Grade</h3>
    <div class="notice">A quantidade foi dividida automaticamente entre os itens. Quando os 10% eram menores que o número de itens, a amostra foi aumentada para garantir pelo menos uma peça de cada item.</div>
    <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Referência/SKU</th><th>Cor</th><th>Tamanho</th><th>Qtd. compra</th><th>Amostra</th><th>Atribuída</th><th>Inspecionada</th><th>Disponível</th></tr></thead><tbody>
    ${q.sample_items.map((row)=>`<tr><td>${esc(row.product||"—")}</td><td>${esc(row.reference||row.sku||"—")}</td><td>${esc(row.color||"—")}</td><td>${esc(row.size||"—")}</td><td>${row.expected_qty}</td><td><b>${row.sample_qty}</b></td><td>${row.assigned_total}</td><td>${row.inspected_total}</td><td>${row.available_qty}</td></tr>`).join("") || '<tr><td colspan="9">A amostra ainda não foi definida.</td></tr>'}
    </tbody></table></div>`;
}

function qualityInspectorOptions(selectedId="") {
  return qualityUsers.map((u)=>`<option value="${u.id}" ${String(u.id)===String(selectedId)?"selected":""}>${esc(u.name)}</option>`).join("");
}

function qualityAssignmentAreaHtml(q, isOpen, canOperate) {
  if (!isOpen || !canOperate || !q.sample_items.length) return "";
  const availableRows = q.sample_items.filter((row)=>Number(row.available_qty)>0);
  if (!availableRows.length) return '<h3 class="section-heading">Atribuição rápida</h3><div class="notice success-box">Toda a amostra já foi atribuída.</div>';
  const supervisorMode = ["supervisor","admin"].includes(currentUser.role);
  return `<h3 class="section-heading">Atribuição rápida em lote</h3>
    <div class="notice"><b>Preencha várias linhas e confirme uma única vez.</b> O sistema reserva o item e a quantidade no mesmo salvamento.</div>
    <div class="bulk-toolbar">
      ${supervisorMode ? `<div class="field bulk-inspector"><label>Inspetor para todas as linhas</label><select id="qualityBatchInspector"><option value="">Selecione</option>${qualityInspectorOptions()}</select></div>` : `<div class="selected-inspector"><span>Inspetor</span><b>${esc(currentUser.name)}</b><input type="hidden" id="qualityBatchInspector" value="${currentUser.id}"></div>`}
      <div class="field bulk-search"><label>Pesquisar</label><input id="qualityAssignSearch" placeholder="Produto, SKU, cor ou tamanho" oninput="filterQualityAssignmentRows()"></div>
      <div class="actions compact-actions">
        <button class="secondary" onclick="selectAllQualityAvailable()">Selecionar disponíveis</button>
        <button class="secondary" onclick="fillQualityBalances()">Assumir saldos selecionados</button>
        <button class="ghost" onclick="clearQualityBatch()">Limpar</button>
      </div>
    </div>
    <div class="table-wrap"><table id="qualityBatchTable"><thead><tr><th class="check-col"><input type="checkbox" id="qualityBatchAll" onchange="toggleQualityBatchAll(this.checked)"></th><th>Item</th><th>Amostra</th><th>Já atribuída</th><th>Disponível</th><th>Quantidade a assumir</th><th>Ação rápida</th></tr></thead><tbody>
      ${availableRows.map((row)=>{
        const itemLabel = row.sample_scope==="GERAL" ? "Quantidade geral — Saldo" : `${row.product||"—"} • ${row.reference||row.sku||"—"} • ${row.color||"—"} • ${row.size||"—"}`;
        return `<tr class="quality-batch-row" data-search="${esc(itemLabel.toLowerCase())}" data-sample-id="${row.id}" data-available="${row.available_qty}">
          <td><input class="quality-batch-check" type="checkbox" id="qualityBatchCheck_${row.id}" onchange="syncQualityBatchRow(${row.id})"></td>
          <td><b>${esc(row.product||"—")}</b>${row.sample_scope==="GERAL"?"":`<br><small>${esc(row.reference||row.sku||"—")} • ${esc(row.color||"—")} • ${esc(row.size||"—")}</small>`}</td>
          <td>${row.sample_qty}</td><td>${row.assigned_total}</td><td><b>${row.available_qty}</b></td>
          <td><input class="table-input quality-batch-qty" id="qualityBatchQty_${row.id}" type="number" min="1" max="${row.available_qty}" placeholder="0" oninput="syncQualityBatchQty(${row.id})" onkeydown="qualityBatchKeydown(event,${row.id})"></td>
          <td><button class="primary small-btn" onclick="quickClaimQuality(${row.id},${row.available_qty})">Assumir agora</button></td>
        </tr>`;
      }).join("")}
    </tbody></table></div>
    <div class="bulk-footer"><div id="qualityBatchSummary">Nenhuma linha selecionada.</div><button class="primary" onclick="saveQualityAssignmentsBatch()">Confirmar atribuições selecionadas</button></div>`;
}

function visibleQualityBatchRows() {
  return [...document.querySelectorAll(".quality-batch-row")].filter((row)=>row.style.display!=="none");
}

function filterQualityAssignmentRows() {
  const term = ($("qualityAssignSearch")?.value || "").trim().toLowerCase();
  document.querySelectorAll(".quality-batch-row").forEach((row)=>{
    row.style.display = !term || (row.dataset.search||"").includes(term) ? "" : "none";
  });
}

function toggleQualityBatchAll(checked) {
  visibleQualityBatchRows().forEach((row)=>{
    const id=row.dataset.sampleId;
    const box=$(`qualityBatchCheck_${id}`);
    if (box) box.checked=checked;
  });
  updateQualityBatchSummary();
}

function selectAllQualityAvailable() {
  toggleQualityBatchAll(true);
}

function useQualityBalance(id) {
  const row=document.querySelector(`.quality-batch-row[data-sample-id="${id}"]`);
  if (!row) return;
  $(`qualityBatchCheck_${id}`).checked=true;
  $(`qualityBatchQty_${id}`).value=row.dataset.available;
  updateQualityBatchSummary();
}

function fillQualityBalances() {
  visibleQualityBatchRows().forEach((row)=>{
    const id=row.dataset.sampleId;
    if ($(`qualityBatchCheck_${id}`)?.checked) $(`qualityBatchQty_${id}`).value=row.dataset.available;
  });
  updateQualityBatchSummary();
}

function clearQualityBatch() {
  document.querySelectorAll(".quality-batch-check").forEach((box)=>box.checked=false);
  document.querySelectorAll(".quality-batch-qty").forEach((input)=>input.value="");
  if ($("qualityBatchAll")) $("qualityBatchAll").checked=false;
  updateQualityBatchSummary();
}

function syncQualityBatchRow(id) {
  const checked=$(`qualityBatchCheck_${id}`)?.checked;
  const input=$(`qualityBatchQty_${id}`);
  const row=document.querySelector(`.quality-batch-row[data-sample-id="${id}"]`);
  if (checked && input && !input.value) input.value=row?.dataset.available||"";
  updateQualityBatchSummary();
}

function syncQualityBatchQty(id) {
  const input=$(`qualityBatchQty_${id}`);
  if (input && Number(input.value)>0) $(`qualityBatchCheck_${id}`).checked=true;
  updateQualityBatchSummary();
}

function qualityBatchKeydown(event,id) {
  if (event.key!=="Enter") return;
  event.preventDefault();
  const rows=visibleQualityBatchRows();
  const index=rows.findIndex((row)=>String(row.dataset.sampleId)===String(id));
  const next=rows[index+1];
  if (next) $(`qualityBatchQty_${next.dataset.sampleId}`)?.focus();
}

function updateQualityBatchSummary() {
  let lines=0,total=0;
  document.querySelectorAll(".quality-batch-row").forEach((row)=>{
    const id=row.dataset.sampleId;
    if ($(`qualityBatchCheck_${id}`)?.checked) {
      lines+=1;
      total+=Number($(`qualityBatchQty_${id}`)?.value||0);
    }
  });
  if ($("qualityBatchSummary")) $("qualityBatchSummary").innerHTML = lines ? `<b>${lines}</b> linha(s) • <b>${total}</b> peça(s)` : "Nenhuma linha selecionada.";
}

async function saveQualityAssignmentsBatch() {
  try {
    const inspectorId=Number($("qualityBatchInspector")?.value||0);
    if (!inspectorId) throw new Error("Selecione o inspetor.");
    const assignments=[];
    document.querySelectorAll(".quality-batch-row").forEach((row)=>{
      const id=Number(row.dataset.sampleId);
      if ($(`qualityBatchCheck_${id}`)?.checked) {
        const qty=Number($(`qualityBatchQty_${id}`)?.value||0);
        if (qty>0) assignments.push({sample_item_id:id,assigned_qty:qty});
      }
    });
    await api(`/api/quality/inspections/${cardData.quality.id}/assignments/batch`,{
      method:"POST",
      body:JSON.stringify({user_id:currentUser.id,inspector_id:inspectorId,assignments}),
    });
    toast(`${assignments.length} atribuição(ões) salva(s) de uma vez.`);
    await openCard(currentCardId,"quality");
  } catch (error) { toast(error.message); }
}

async function quickClaimQuality(sampleId,qty){
  try{
    const inspectorId=currentUser.role==="qualidade"?currentUser.id:Number($("qualityBatchInspector")?.value||0);
    if(!inspectorId)throw new Error("Selecione o inspetor.");
    await api(`/api/quality/inspections/${cardData.quality.id}/assignments/batch`,{method:"POST",body:JSON.stringify({user_id:currentUser.id,inspector_id:inspectorId,assignments:[{sample_item_id:sampleId,assigned_qty:qty}]})});
    toast("Item assumido. A próxima linha já está disponível."); await openCard(currentCardId,"quality");
  }catch(e){toast(e.message)}
}

function qualityWorkersHtml(q, isOpen) {
  if (!q.workers.length) return '<h3 class="section-heading">Inspetores</h3><div class="notice">Nenhum item foi atribuído.</div>';
  return `<h3 class="section-heading">Inspetores e resultados individuais</h3>${q.workers.map((worker)=>qualityWorkerHtml(worker,isOpen)).join("")}`;
}

function qualityWorkerHtml(worker, isOpen) {
  const timer = worker.timer || {state:"NAO_INICIADA",business_seconds:0,paused_seconds:0,permanence_seconds:0};
  const canControlTimer = isOpen && (worker.inspector_id === currentUser.id || currentUser.role === "admin");
  const canEditResults = isOpen && (worker.inspector_id === currentUser.id || currentUser.role === "admin");
  const canManageAssignment = isOpen && (worker.inspector_id === currentUser.id || ["supervisor","admin"].includes(currentUser.role));
  return `<div class="quality-worker">
    <div class="quality-worker-head"><div><b>${esc(worker.inspector_name)}</b><br><span class="status-note">${worker.assignments.length} atribuição(ões)</span></div><span class="badge ${timer.state==="CONCLUIDA"?"green":timer.state==="PAUSADA"?"orange":timer.state==="EM_ANDAMENTO"?"purple":"gray"}">${esc(timer.state)}</span></div>
    <div class="timer-grid">
      <div class="timer-value"><span>Tempo útil</span><strong>${fmtSeconds(timer.business_seconds)}</strong></div>
      <div class="timer-value"><span>Tempo parado</span><strong>${fmtSeconds(timer.paused_seconds)}</strong></div>
      <div class="timer-value"><span>Permanência</span><strong>${fmtSeconds(timer.permanence_seconds)}</strong></div>
      <div class="timer-value"><span>Produção</span><strong>${worker.assignments.reduce((a,b)=>a+Number(b.inspected_qty||0),0)}</strong></div>
    </div>
    <div class="actions">
      ${canControlTimer && timer.state==="NAO_INICIADA"?`<button class="primary" onclick="qualityTimerAction(${worker.id},'start')">Iniciar inspeção</button>`:""}
      ${canControlTimer && timer.state==="EM_ANDAMENTO"?`<button class="warning" onclick="qualityTimerAction(${worker.id},'pause')">Pausar</button><button class="success" onclick="qualityTimerAction(${worker.id},'finish')">Finalizar minha inspeção</button>`:""}
      ${canControlTimer && timer.state==="PAUSADA"?`<button class="primary" onclick="qualityTimerAction(${worker.id},'resume')">Retomar</button><button class="success" onclick="qualityTimerAction(${worker.id},'finish')">Finalizar minha inspeção</button>`:""}
    </div>
    ${worker.assignments.map((a)=>qualityAssignmentResultHtml(a,worker,canEditResults,canManageAssignment)).join("")}
  </div>`;
}

function qualityAssignmentResultHtml(a, worker, canEdit, canManage) {
  const photos = a.photo_paths || [];
  return `<div class="quality-assignment">
    <div class="quality-assignment-title"><b>${esc(a.product||"—")} • ${esc(a.color||"—")} • ${esc(a.size||"—")}</b><span class="badge ${a.valid?"green":"orange"}">${a.assigned_qty} peças atribuídas</span></div>
    <div class="form-grid">
      <div class="field"><label>Quantidade inspecionada</label><input id="qaInspected_${a.id}" type="number" min="0" max="${a.assigned_qty}" value="${a.inspected_qty}" ${canEdit?"":"readonly"} oninput="recalcQualityAssignment(${a.id})"></div>
      <div class="field"><label>Quantidade rejeitada</label><input id="qaRejected_${a.id}" type="number" min="0" value="${a.rejected_qty}" ${canEdit?"":"readonly"} oninput="recalcQualityAssignment(${a.id})"></div>
      <div class="field"><label>Quantidade para retrabalho</label><input id="qaRework_${a.id}" type="number" min="0" value="${a.rework_qty}" ${canEdit?"":"readonly"} oninput="recalcQualityAssignment(${a.id})"></div>
      <div class="field"><label>Quantidade aprovada</label><input id="qaApproved_${a.id}" class="readonly" readonly value="${a.approved_qty}"></div>
      <div class="field"><label>Motivo da rejeição</label><input id="qaRejectReason_${a.id}" value="${esc(a.reject_reason||"")}" ${canEdit?"":"readonly"}></div>
      <div class="field"><label>Motivo do retrabalho</label><input id="qaReworkReason_${a.id}" value="${esc(a.rework_reason||"")}" ${canEdit?"":"readonly"}></div>
      <div class="field full"><label>Observação obrigatória quando houver rejeição ou retrabalho</label><textarea id="qaObservation_${a.id}" ${canEdit?"":"readonly"}>${esc(a.observation||"")}</textarea></div>
    </div>
    <div class="photos">${photos.map((p,i)=>`<a class="photo-link" target="_blank" href="${p}">Evidência ${i+1}</a>`).join("")}</div>
    ${a.validation_errors?.length?`<div class="notice warn">${a.validation_errors.map(esc).join("<br>")}</div>`:""}
    <div class="actions">
      ${canEdit?`<button class="success" onclick="qualityAllApproved(${a.id},${a.assigned_qty})">Tudo aprovado</button><button class="secondary" onclick="saveQualityResult(${a.id})">Salvar resultado</button><label class="primary small-btn" style="cursor:pointer">Adicionar evidências<input id="qaFiles_${a.id}" type="file" multiple hidden onchange="uploadQualityAssignmentPhotos(${a.id})"></label>`:""}
      ${canManage && worker.status==="NAO_INICIADA"?`<button class="danger small-btn" onclick="releaseQualityAssignment(${a.id})">Devolver atribuição</button>`:""}
      ${canManage && Number(a.inspected_qty||0)===0?`<select id="qaTransferTo_${a.id}"><option value="">Transferir para...</option>${qualityInspectorOptions()}</select><input id="qaTransferReason_${a.id}" placeholder="Motivo da transferência"><button class="warning small-btn" onclick="transferQualityAssignment(${a.id})">Transferir</button>`:""}
    </div>
  </div>`;
}

async function qualityAllApproved(id,qty){
  $(`qaInspected_${id}`).value=qty;$(`qaRejected_${id}`).value=0;$(`qaRework_${id}`).value=0;recalcQualityAssignment(id);
  await saveQualityResult(id);
}

function recalcQualityAssignment(id) {
  const inspected=Number($(`qaInspected_${id}`)?.value||0), rejected=Number($(`qaRejected_${id}`)?.value||0), rework=Number($(`qaRework_${id}`)?.value||0);
  if ($(`qaApproved_${id}`)) $(`qaApproved_${id}`).value = Math.max(0, inspected-rejected-rework);
}

function qualityAssignmentPayload(id, photosOverride=null) {
  const worker = cardData.quality.workers.find((w)=>w.assignments.some((a)=>a.id===id));
  const assignment = worker?.assignments.find((a)=>a.id===id);
  return {
    user_id: currentUser.id,
    inspected_qty: Number($(`qaInspected_${id}`).value||0),
    rejected_qty: Number($(`qaRejected_${id}`).value||0),
    rework_qty: Number($(`qaRework_${id}`).value||0),
    reject_reason: $(`qaRejectReason_${id}`).value,
    rework_reason: $(`qaReworkReason_${id}`).value,
    observation: $(`qaObservation_${id}`).value,
    photo_paths: photosOverride || assignment?.photo_paths || [],
  };
}

async function saveQualityResult(id, photosOverride=null) {
  try {
    await api(`/api/quality/assignments/${id}/result`, { method:"PATCH", body:JSON.stringify(qualityAssignmentPayload(id,photosOverride)) });
    toast("Resultado salvo.");
    await openCard(currentCardId,"quality");
  } catch (error) { toast(error.message); }
}

async function uploadQualityAssignmentPhotos(id) {
  try {
    const files = Array.from($(`qaFiles_${id}`).files||[]);
    if (!files.length) return;
    const form=new FormData(); files.forEach((f)=>form.append("files",f));
    const uploaded=await api("/api/uploads",{method:"POST",body:form});
    const worker=cardData.quality.workers.find((w)=>w.assignments.some((a)=>a.id===id));
    const assignment=worker.assignments.find((a)=>a.id===id);
    await saveQualityResult(id,[...(assignment.photo_paths||[]),...uploaded.paths]);
  } catch (error) { toast(error.message); }
}

async function qualityTimerAction(workerId, action) {
  try {
    await api(`/api/quality/workers/${workerId}/timer/${action}`, {method:"POST",body:JSON.stringify({user_id:currentUser.id})});
    toast("Tempo da inspeção atualizado.");
    await openCard(currentCardId,"quality");
  } catch (error) { toast(error.message); }
}

async function releaseQualityAssignment(id) {
  if (!confirm("Devolver este item e quantidade para a disponibilidade?")) return;
  try {
    await api(`/api/quality/assignments/${id}/release`,{method:"POST",body:JSON.stringify({user_id:currentUser.id})});
    toast("Atribuição devolvida.");
    await openCard(currentCardId,"quality");
  } catch (error) { toast(error.message); }
}

async function transferQualityAssignment(id) {
  try {
    await api(`/api/quality/assignments/${id}/transfer`,{method:"POST",body:JSON.stringify({user_id:currentUser.id,to_user_id:Number($(`qaTransferTo_${id}`).value||0),reason:$(`qaTransferReason_${id}`).value})});
    toast("Atribuição transferida.");
    await openCard(currentCardId,"quality");
  } catch (error) { toast(error.message); }
}

async function completeQualityInspection() {
  const q=cardData.quality;
  let confirmPending=false;
  if (q.development_warning) {
    confirmPending=confirm("Existem peças pendentes de separação para o setor Desenvolvimento. Deseja concluir a inspeção mesmo assim?");
    if (!confirmPending) return;
  } else if (!confirm("Concluir definitivamente esta inspeção e movimentar o Card?")) return;
  try {
    await api(`/api/quality/inspections/${q.id}/complete`,{method:"POST",body:JSON.stringify({user_id:currentUser.id,confirm_development_pending:confirmPending})});
    toast("Inspeção concluída e Card movimentado.");
    await openCard(currentCardId,"quality");
  } catch (error) { toast(error.message); }
}


async function renderProcessingTab() {
  activateTab("tabProcessingBtn");
  try {
    if (!processingUsers.length) processingUsers = await api("/api/processing/users");
  } catch (error) {
    $("cardTab").innerHTML = `<div class="notice error">${esc(error.message)}</div>`;
    return;
  }
  const p = cardData.processing;
  if (cardData.source_snapshot_at && !p && cardData.current_sector !== "PROCESSAMENTO") {
    renderImportedSectorSnapshot("tabProcessingBtn",["AGUARDANDO_PROCESSAMENTO","PROCESSAMENTO"],"Itens localizados no Processamento");
    return;
  }
  if (cardData.current_sector === "PROCESSAMENTO" && !p) {
    if (!canOperateProcessing()) {
      $("cardTab").innerHTML = '<div class="panel-body"><div class="notice warn">Aguardando um operador do Processamento configurar o Card.</div></div>';
      return;
    }
    $("cardTab").innerHTML = processingSetupHtml();
    toggleProcessingLabelField();
    return;
  }
  if (!p) {
    $("cardTab").innerHTML = '<div class="panel-body"><div class="notice">Este Card ainda não possui dados do Processamento.</div></div>';
    return;
  }
  $("cardTab").innerHTML = processingDetailHtml(p);
  toggleProcessingLabelField();
}

function processingSetupHtml() {
  const modeLabel = cardData.purchase_mode === "GRADE" ? "Grade — importado como Private Label" : cardData.purchase_mode === "SALDO" ? "Saldo" : "Tipo não reconhecido";
  return `<div class="panel-body">
    <div class="notice"><b>Configuração inicial do Processamento</b><br>O tipo da compra vem automaticamente do Excel e não pode ser alterado neste setor.</div>
    <div class="form-grid">
      <div class="field"><label>Tipo da compra</label><input class="readonly" readonly value="${esc(modeLabel)}"></div>
      <div class="field"><label>Marca</label><input id="processingBrand" value="${esc(cardData.brand||"")}" placeholder="Informe a marca"></div>
      <div class="field"><label>Perfil da compra</label><select id="processingProfile"><option value="">Selecione</option><option value="CADASTRO_ENTRADA">Cadastro + Entrada</option><option value="SOMENTE_ENTRADA">Somente Entrada</option></select></div>
      <div class="field"><label>Necessita Triagem?</label><select id="processingNeedsTriage"><option value="">Selecione</option><option value="1">Sim</option><option value="0">Não</option></select></div>
      <div class="field"><label>Necessita Etiquetagem?</label><select id="processingNeedsLabeling" onchange="toggleProcessingLabelField()"><option value="">Selecione</option><option value="1">Sim</option><option value="0">Não</option></select></div>
      <div class="field" id="processingLabelTypeField" style="display:none"><label>Tipo de etiqueta</label><select id="processingLabelType"><option value="">Selecione</option><option value="BRANCA">Branca — descrição, EAN e valor</option><option value="VERMELHA">Vermelha — valor</option><option value="PERSONALIZADA">Personalizada</option></select></div>
      ${cardData.purchase_mode === "GRADE" ? `<div class="field full"><label class="check-line"><input id="processingDeferQty" type="checkbox"> A quantidade final da Grade será confirmada somente na Estocagem</label></div>` : ""}
      <div class="field full"><label>Observações</label><textarea id="processingNotes"></textarea></div>
    </div>
    <div class="actions"><button class="primary" onclick="createProcessing()">Configurar Processamento</button></div>
  </div>`;
}

function toggleProcessingLabelField() {
  const visible = $("processingNeedsLabeling")?.value === "1";
  if ($("processingLabelTypeField")) $("processingLabelTypeField").style.display = visible ? "block" : "none";
}

async function createProcessing() {
  try {
    const triage = $("processingNeedsTriage").value;
    const labeling = $("processingNeedsLabeling").value;
    await api(`/api/cards/${currentCardId}/processing`, {
      method: "POST",
      body: JSON.stringify({
        user_id: currentUser.id,
        brand: $("processingBrand").value,
        operation_profile: $("processingProfile").value,
        needs_triage: triage === "" ? null : triage === "1",
        needs_labeling: labeling === "" ? null : labeling === "1",
        label_type: $("processingLabelType")?.value || null,
        quantity_deferred_to_storage: Boolean($("processingDeferQty")?.checked),
        notes: $("processingNotes").value,
      }),
    });
    toast("Processamento configurado.");
    await openCard(currentCardId, "processing");
  } catch (error) { toast(error.message); }
}

function processingDetailHtml(p) {
  const isOpen = p.status === "ABERTO";
  const canOperate = canOperateProcessing();
  const modeLabel = p.purchase_mode === "GRADE" ? "Grade" : "Saldo";
  const routeLabel = p.needs_triage ? "Triagem" : p.needs_labeling ? "Etiquetagem" : "Estocagem";
  return `<div class="panel-body">
    <div class="notice ${p.status === "CONCLUIDO" ? "success-box" : ""}"><b>Processamento ${p.status === "CONCLUIDO" ? "concluído" : "aberto"}</b><br>Tipo: <b>${modeLabel}</b> • Próximo destino configurado: <b>${routeLabel}</b></div>
    <div class="summary-grid processing-summary">
      <div class="summary-box"><span>Quantidade prevista</span><strong>${p.totals.expected}</strong></div>
      <div class="summary-box"><span>Quantidade processada</span><strong>${p.totals.processed}</strong></div>
      <div class="summary-box"><span>Quantidade estocada</span><strong>${p.totals.stored}</strong></div>
      <div class="summary-box"><span>Produção apontada</span><strong>${p.totals.worker_production}</strong></div>
      <div class="summary-box"><span>Tipo</span><strong>${modeLabel}</strong></div>
      <div class="summary-box"><span>Marca</span><strong>${esc(p.brand)}</strong></div>
    </div>
    ${processingConfigurationHtml(p, isOpen && canOperate)}
    ${processingWorkersHtml(p, isOpen)}
    ${processingQuantitiesHtml(p, isOpen && canOperate)}
    <h3 class="section-heading">Conclusão do Processamento</h3>
    ${p.validation_errors?.length ? `<div class="notice warn"><b>Pendências:</b><br>${p.validation_errors.map(esc).join("<br>")}</div>` : '<div class="notice success-box"><b>Processamento pronto para conclusão.</b></div>'}
    <div class="actions">
      ${isOpen && canOperate ? `<button class="success" ${p.validation_errors?.length ? "disabled" : ""} onclick="completeProcessing()">Concluir Processamento</button>` : ""}
      ${!isOpen ? '<span class="badge green">Processamento concluído</span>' : ""}
    </div>
  </div>`;
}

function processingConfigurationHtml(p, editable) {
  const profileLabel = p.operation_profile === "CADASTRO_ENTRADA" ? "Cadastro + Entrada" : "Somente Entrada";
  if (!editable) {
    return `<h3 class="section-heading">Configuração</h3><div class="form-grid">
      <div class="field"><label>Marca</label><input class="readonly" readonly value="${esc(p.brand)}"></div>
      <div class="field"><label>Perfil</label><input class="readonly" readonly value="${esc(profileLabel)}"></div>
      <div class="field"><label>Triagem</label><input class="readonly" readonly value="${p.needs_triage ? "Sim" : "Não"}"></div>
      <div class="field"><label>Etiquetagem</label><input class="readonly" readonly value="${p.needs_labeling ? "Sim" : "Não"}"></div>
      <div class="field"><label>Tipo de etiqueta</label><input class="readonly" readonly value="${esc(p.label_type||"Não se aplica")}"></div>
      <div class="field"><label>Quantidade da Grade</label><input class="readonly" readonly value="${p.quantity_deferred_to_storage ? "Confirmar na Estocagem" : "Informada no Processamento"}"></div>
    </div>`;
  }
  return `<h3 class="section-heading">Configuração</h3><div class="form-grid">
    <div class="field"><label>Tipo da compra</label><input class="readonly" readonly value="${p.purchase_mode === "GRADE" ? "Grade" : "Saldo"}"></div>
    <div class="field"><label>Marca</label><input id="processingBrand" value="${esc(p.brand)}"></div>
    <div class="field"><label>Perfil da compra</label><select id="processingProfile"><option value="CADASTRO_ENTRADA" ${p.operation_profile === "CADASTRO_ENTRADA" ? "selected" : ""}>Cadastro + Entrada</option><option value="SOMENTE_ENTRADA" ${p.operation_profile === "SOMENTE_ENTRADA" ? "selected" : ""}>Somente Entrada</option></select></div>
    <div class="field"><label>Necessita Triagem?</label><select id="processingNeedsTriage"><option value="1" ${p.needs_triage ? "selected" : ""}>Sim</option><option value="0" ${!p.needs_triage ? "selected" : ""}>Não</option></select></div>
    <div class="field"><label>Necessita Etiquetagem?</label><select id="processingNeedsLabeling" onchange="toggleProcessingLabelField()"><option value="1" ${p.needs_labeling ? "selected" : ""}>Sim</option><option value="0" ${!p.needs_labeling ? "selected" : ""}>Não</option></select></div>
    <div class="field" id="processingLabelTypeField" style="display:${p.needs_labeling ? "block" : "none"}"><label>Tipo de etiqueta</label><select id="processingLabelType"><option value="BRANCA" ${p.label_type === "BRANCA" ? "selected" : ""}>Branca</option><option value="VERMELHA" ${p.label_type === "VERMELHA" ? "selected" : ""}>Vermelha</option><option value="PERSONALIZADA" ${p.label_type === "PERSONALIZADA" ? "selected" : ""}>Personalizada</option></select></div>
    ${p.purchase_mode === "GRADE" ? `<div class="field full"><label class="check-line"><input id="processingDeferQty" type="checkbox" ${p.quantity_deferred_to_storage ? "checked" : ""}> A quantidade final da Grade será confirmada somente na Estocagem</label></div>` : ""}
    <div class="field full"><label>Observações</label><textarea id="processingNotes">${esc(p.notes||"")}</textarea></div>
  </div><div class="actions"><button class="secondary" onclick="saveProcessingConfiguration()">Salvar configuração</button></div>`;
}

async function saveProcessingConfiguration() {
  try {
    const p = cardData.processing;
    await api(`/api/processing/${p.id}/configuration`, {
      method: "PATCH",
      body: JSON.stringify({
        user_id: currentUser.id,
        brand: $("processingBrand").value,
        operation_profile: $("processingProfile").value,
        needs_triage: $("processingNeedsTriage").value === "1",
        needs_labeling: $("processingNeedsLabeling").value === "1",
        label_type: $("processingLabelType")?.value || null,
        quantity_deferred_to_storage: Boolean($("processingDeferQty")?.checked),
        notes: $("processingNotes").value,
      }),
    });
    toast("Configuração atualizada.");
    await openCard(currentCardId, "processing");
  } catch (error) { toast(error.message); }
}

function processingUserOptions(selected="") {
  return processingUsers.map((u) => `<option value="${u.id}" ${String(u.id)===String(selected)?"selected":""}>${esc(u.name)}</option>`).join("");
}

function processingWorkersHtml(p, isOpen) {
  const currentAlready = p.workers.some((w) => w.user_id === currentUser.id);
  const addArea = isOpen && canOperateProcessing() ? `<div class="bulk-toolbar processing-worker-add">
    ${currentUser.role === "processamento" ? `<div class="selected-inspector"><span>Operador</span><b>${esc(currentUser.name)}</b></div><button class="primary" ${currentAlready ? "disabled" : ""} onclick="addProcessingWorker(${currentUser.id})">Assumir Card</button>` : `<div class="field"><label>Adicionar colaborador</label><select id="processingWorkerSelect"><option value="">Selecione</option>${processingUserOptions()}</select></div><button class="primary" onclick="addProcessingWorker(Number($(\"processingWorkerSelect\").value||0))">Adicionar</button>`}
  </div>` : "";
  return `<h3 class="section-heading">Colaboradores e produção</h3>${addArea}${p.workers.length ? p.workers.map((w)=>processingWorkerHtml(w,isOpen)).join("") : '<div class="notice">Nenhum colaborador assumiu o Card.</div>'}`;
}

function processingWorkerHtml(w, isOpen) {
  const timer = w.timer || {state:"NAO_INICIADA",business_seconds:0,paused_seconds:0,permanence_seconds:0};
  const canControl = isOpen && (w.user_id === currentUser.id || currentUser.role === "admin");
  const canEdit = isOpen && (w.user_id === currentUser.id || ["supervisor","admin"].includes(currentUser.role));
  return `<div class="processing-worker">
    <div class="quality-worker-head"><div><b>${esc(w.user_name)}</b><br><span class="status-note">Produção individual</span></div><span class="badge ${timer.state === "CONCLUIDA" ? "green" : timer.state === "PAUSADA" ? "orange" : timer.state === "EM_ANDAMENTO" ? "purple" : "gray"}">${esc(timer.state)}</span></div>
    <div class="timer-grid">
      <div class="timer-value"><span>Tempo útil</span><strong>${fmtSeconds(timer.business_seconds)}</strong></div>
      <div class="timer-value"><span>Tempo parado</span><strong>${fmtSeconds(timer.paused_seconds)}</strong></div>
      <div class="timer-value"><span>Permanência</span><strong>${fmtSeconds(timer.permanence_seconds)}</strong></div>
      <div class="timer-value"><span>Produção</span><strong>${w.produced_qty}</strong></div>
    </div>
    <div class="form-grid" style="margin-top:10px"><div class="field"><label>Quantidade produzida por este colaborador</label><input id="processingWorkerQty_${w.id}" type="number" min="0" value="${w.produced_qty}" ${canEdit ? "" : "readonly"}></div></div>
    <div class="actions">
      ${canEdit ? `<button class="secondary" onclick="saveProcessingWorkerProduction(${w.id})">Salvar produção</button>` : ""}
      ${canControl && timer.state === "NAO_INICIADA" ? `<button class="primary" onclick="processingTimerAction(${w.id},'start')">Iniciar</button>` : ""}
      ${canControl && timer.state === "EM_ANDAMENTO" ? `<button class="warning" onclick="processingTimerAction(${w.id},'pause')">Pausar</button><button class="success" onclick="processingTimerAction(${w.id},'finish')">Finalizar</button>` : ""}
      ${canControl && timer.state === "PAUSADA" ? `<button class="primary" onclick="processingTimerAction(${w.id},'resume')">Retomar</button><button class="success" onclick="processingTimerAction(${w.id},'finish')">Finalizar</button>` : ""}
    </div>
  </div>`;
}

async function addProcessingWorker(userId) {
  if (!userId) return toast("Selecione o colaborador.");
  try {
    await api(`/api/processing/${cardData.processing.id}/workers`, {method:"POST",body:JSON.stringify({user_id:currentUser.id,worker_user_id:userId})});
    toast("Colaborador incluído.");
    await openCard(currentCardId,"processing");
  } catch (error) { toast(error.message); }
}

async function saveProcessingWorkerProduction(workerId) {
  try {
    await api(`/api/processing/workers/${workerId}/production`, {method:"PATCH",body:JSON.stringify({user_id:currentUser.id,produced_qty:Number($(`processingWorkerQty_${workerId}`).value||0)})});
    toast("Produção salva.");
    await openCard(currentCardId,"processing");
  } catch (error) { toast(error.message); }
}

async function processingTimerAction(workerId, action) {
  try {
    await api(`/api/processing/workers/${workerId}/timer/${action}`, {method:"POST",body:JSON.stringify({user_id:currentUser.id})});
    toast("Cronômetro atualizado.");
    await openCard(currentCardId,"processing");
  } catch (error) { toast(error.message); }
}

function processingQuantitiesHtml(p, editable) {
  const copyButton = `<button class="ghost" ${p.totals.stored > 0 && editable ? "" : "disabled"} onclick="copyStoredToProcessed()">Copiar Estocada → Processada</button>`;
  if (p.purchase_mode === "SALDO") {
    return `<h3 class="section-heading">Quantidades — Saldo</h3><div class="notice">Para compras Saldo, o controle é feito somente pela quantidade geral.</div>
      <div class="form-grid"><div class="field"><label>Quantidade prevista</label><input class="readonly" readonly value="${p.totals.expected}"></div><div class="field"><label>Quantidade processada</label><input id="processingGeneralQty" type="number" min="0" value="${p.processed_qty_general}" ${editable ? "" : "readonly"}></div><div class="field"><label>Quantidade estocada</label><input class="readonly" readonly value="${p.stored_qty_general}"></div></div>
      <div class="actions">${editable ? '<button class="primary" onclick="saveProcessingQuantities()">Salvar quantidade</button>' : ""}${copyButton}</div>`;
  }
  const deferredNotice = p.quantity_deferred_to_storage ? '<div class="notice warn">A quantidade final desta Grade será confirmada na Estocagem. É permitido concluir o Processamento sem preencher todos os itens.</div>' : '<div class="notice">Informe a quantidade processada por item da Grade.</div>';
  return `<h3 class="section-heading">Quantidades — Grade</h3>${deferredNotice}<div class="table-wrap"><table>
    <thead><tr><th>Produto</th><th>Referência / SKU</th><th>Cor</th><th>Tamanho</th><th>Prevista</th><th>Processada</th><th>Estocada</th></tr></thead>
    <tbody>${p.items.map((item)=>`<tr><td>${esc(item.product||"—")}</td><td>${esc(item.reference||item.sku||"—")}</td><td>${esc(item.color||"—")}</td><td>${esc(item.size||"—")}</td><td>${item.expected_qty}</td><td><input class="table-input processing-item-qty" data-item-id="${item.item_id}" type="number" min="0" value="${item.processed_qty}" ${editable ? "" : "readonly"}></td><td>${item.stored_qty}</td></tr>`).join("")}</tbody>
  </table></div><div class="actions">${editable ? '<button class="primary" onclick="saveProcessingQuantities()">Salvar quantidades da Grade</button>' : ""}${copyButton}</div>`;
}

async function saveProcessingQuantities() {
  try {
    const p = cardData.processing;
    const payload = {user_id:currentUser.id};
    if (p.purchase_mode === "SALDO") payload.processed_qty_general = Number($("processingGeneralQty").value||0);
    else payload.items = [...document.querySelectorAll(".processing-item-qty")].map((input)=>({item_id:Number(input.dataset.itemId),processed_qty:Number(input.value||0)}));
    await api(`/api/processing/${p.id}/quantities`, {method:"PATCH",body:JSON.stringify(payload)});
    toast("Quantidades salvas.");
    await openCard(currentCardId,"processing");
  } catch (error) { toast(error.message); }
}

async function copyStoredToProcessed() {
  try {
    await api(`/api/processing/${cardData.processing.id}/copy-stored`, {method:"POST",body:JSON.stringify({user_id:currentUser.id})});
    toast("Quantidade estocada copiada para processada.");
    await openCard(currentCardId,"processing");
  } catch (error) { toast(error.message); }
}

async function completeProcessing() {
  if (!confirm("Concluir o Processamento e movimentar o Card para o próximo setor configurado?")) return;
  try {
    await api(`/api/processing/${cardData.processing.id}/complete`, {method:"POST",body:JSON.stringify({user_id:currentUser.id})});
    toast("Processamento concluído.");
    await openCard(currentCardId,"processing");
  } catch (error) { toast(error.message); }
}

async function renderDownstreamTab(sector) {
  const key=sector==="ETIQUETAGEM"?"labeling":"storage", tabId=sector==="ETIQUETAGEM"?"tabLabelingBtn":"tabStorageBtn";
  activateTab(tabId);
  try { if(!downstreamUsers[sector].length) downstreamUsers[sector]=await api(`/api/downstream/users?sector=${sector}`); } catch(e){$("cardTab").innerHTML=`<div class="notice error">${esc(e.message)}</div>`;return;}
  let op=cardData[key];
  if(sector==="ESTOCAGEM"&&cardData.source_snapshot_at&&!op?.id&&cardData.current_sector!=="ESTOCAGEM"){
    renderImportedSectorSnapshot(tabId,["ESTOCAGEM"],"Itens localizados na Estocagem"); return;
  }
  const allowed=[sector.toLowerCase(),"supervisor","admin"].includes(currentUser.role);
  if(!op?.id){
    $("cardTab").innerHTML=`<div class="panel-body"><div class="notice"><b>${sector==="ETIQUETAGEM"?"Etiquetagem":"Estocagem"}</b><br>${cardData.purchase_mode==="GRADE"?"Cada colaborador assume um tamanho completo por vez.":"Saldo é dividido por quantidade geral, sem separar tamanhos."}</div>${allowed?`<div class="actions"><button class="primary" onclick="startDownstream('${sector}')">Iniciar controle</button></div>`:'<div class="notice warn">Aguardando um operador do setor.</div>'}</div>`; return;
  }
  const grade=op.purchase_mode==="GRADE", open=op.status==="ABERTO";
  $("cardTab").innerHTML=`<div class="panel-body downstream-panel">
    <div class="notice success-box"><b>${sector==="ETIQUETAGEM"?"Etiquetagem":"Estocagem"} • ${grade?"Grade":"Saldo"}</b><br>${grade?"Escolha e assuma somente um tamanho por vez. Tamanhos já assumidos ficam indisponíveis.":"Informe quantas peças deseja assumir do saldo geral disponível."}</div>
    <div class="summary-grid compact-summary"><div class="summary-box"><span>Prevista</span><strong>${op.totals.expected}</strong></div><div class="summary-box"><span>Assumida</span><strong>${op.totals.assigned}</strong></div><div class="summary-box"><span>Concluída</span><strong>${op.totals.completed}</strong></div><div class="summary-box"><span>Disponível</span><strong>${op.totals.available}</strong></div></div>
    ${open&&allowed?(grade?downstreamGradePicker(op,sector):downstreamSaldoPicker(op,sector)):""}
    <h3 class="section-heading">Em execução</h3>${op.assignments.length?op.assignments.map(a=>downstreamAssignmentHtml(a,sector,allowed&&open)).join(""):'<div class="notice">Nenhum material assumido.</div>'}
    <div class="actions"><button class="success" ${op.totals.completed===op.totals.expected&&open&&allowed?"":"disabled"} onclick="completeDownstream(${op.id},'${sector}')">Concluir ${sector==="ETIQUETAGEM"?"Etiquetagem":"Estocagem"}</button></div></div>`;
}

function downstreamWorkerSelect(sector){
  if([sector.toLowerCase()].includes(currentUser.role)) return `<input type="hidden" id="downstreamWorker" value="${currentUser.id}"><div class="selected-inspector"><span>Colaborador</span><b>${esc(currentUser.name)}</b></div>`;
  return `<div class="field"><label>Colaborador</label><select id="downstreamWorker"><option value="">Selecione</option>${downstreamUsers[sector].map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select></div>`;
}
function downstreamGradePicker(op,sector){
  const free=op.items.filter(i=>Number(i.assigned_qty)===0&&Number(i.expected_qty)>0);
  return `<h3 class="section-heading">Assumir próximo tamanho</h3><div class="downstream-picker">${downstreamWorkerSelect(sector)}<div class="queue-search"><span>⌕</span><input id="downstreamSizeSearch" placeholder="Produto, cor ou tamanho" oninput="filterDownstreamSizes()"></div></div>
    <div class="table-wrap compact-picker"><table class="compact-table"><thead><tr><th>Produto</th><th>Cor</th><th>Tamanho</th><th>Quantidade</th><th></th></tr></thead><tbody>${free.map(i=>`<tr class="downstream-size-row" data-search="${esc([i.product,i.reference,i.color,i.size].join(' ').toLowerCase())}"><td><b>${esc(i.product||'—')}</b><small>${esc(i.reference||i.sku||'—')}</small></td><td>${esc(i.color||'—')}</td><td><span class="size-token">${esc(i.size||'—')}</span></td><td><b>${i.expected_qty}</b></td><td><button class="primary small-btn" onclick="claimDownstream(${op.id},'${sector}',${i.item_id},${i.expected_qty})">Assumir tamanho</button></td></tr>`).join("")||'<tr><td colspan="5">Todos os tamanhos foram assumidos.</td></tr>'}</tbody></table></div>`;
}
function downstreamSaldoPicker(op,sector){return `<h3 class="section-heading">Assumir quantidade do Saldo</h3><div class="downstream-picker saldo-picker">${downstreamWorkerSelect(sector)}<div class="field"><label>Quantidade disponível: ${op.totals.available}</label><input id="downstreamSaldoQty" type="number" min="1" max="${op.totals.available}" placeholder="Quantidade"></div><button class="primary" onclick="claimDownstream(${op.id},'${sector}',null,Number($(\"downstreamSaldoQty\").value||0))">Assumir quantidade</button></div>`;}
function filterDownstreamSizes(){const t=normalizeSearch($("downstreamSizeSearch")?.value||"");document.querySelectorAll(".downstream-size-row").forEach(r=>r.classList.toggle("hidden",t&&!normalizeSearch(r.dataset.search).includes(t)));}
function downstreamAssignmentHtml(a,sector,allowed){const own=a.worker_user_id===currentUser.id||["supervisor","admin"].includes(currentUser.role);return `<div class="assignment-strip"><div><b>${esc(a.product||"Saldo geral")}</b><small>${a.item_id?`${esc(a.color||'—')} • Tam. ${esc(a.size||'—')}`:"Controle por quantidade"}</small></div><div><span>Colaborador</span><b>${esc(a.worker_name)}</b></div><div><span>Assumida</span><b>${a.assigned_qty}</b></div><div class="assignment-result"><span>Concluída</span><input id="downstreamDone_${a.id}" type="number" min="0" max="${a.assigned_qty}" value="${a.completed_qty}" ${allowed&&own?"":"readonly"}></div><div><span>Tempo</span><b>${fmtSeconds(a.elapsed_seconds)}</b><small>${esc(a.timer_state)}</small></div><div class="actions">${allowed&&own?`<button class="secondary small-btn" onclick="saveDownstreamResult(${a.id},'${sector}')">Salvar</button>${a.timer_state==="NAO_INICIADA"?`<button class="primary small-btn" onclick="downstreamTimer(${a.id},'start','${sector}')">Iniciar</button>`:""}${a.timer_state==="EM_ANDAMENTO"?`<button class="warning small-btn" onclick="downstreamTimer(${a.id},'pause','${sector}')">Pausar</button><button class="success small-btn" onclick="downstreamTimer(${a.id},'finish','${sector}')">Finalizar</button>`:""}${a.timer_state==="PAUSADA"?`<button class="primary small-btn" onclick="downstreamTimer(${a.id},'resume','${sector}')">Retomar</button><button class="success small-btn" onclick="downstreamTimer(${a.id},'finish','${sector}')">Finalizar</button>`:""}`:""}</div></div>`;}
async function startDownstream(sector){try{await api(`/api/cards/${currentCardId}/downstream/${sector}`,{method:"POST",body:JSON.stringify({user_id:currentUser.id})});await openCard(currentCardId,sector==="ETIQUETAGEM"?"labeling":"storage");}catch(e){toast(e.message)}}
async function claimDownstream(opId,sector,itemId,qty){try{const worker=Number($("downstreamWorker")?.value||0);if(!worker)throw new Error("Selecione o colaborador.");await api(`/api/downstream/${opId}/claim`,{method:"POST",body:JSON.stringify({user_id:currentUser.id,worker_user_id:worker,item_id:itemId,qty})});toast("Material assumido.");await openCard(currentCardId,sector==="ETIQUETAGEM"?"labeling":"storage");}catch(e){toast(e.message)}}
async function saveDownstreamResult(id,sector){try{await api(`/api/downstream/assignments/${id}`,{method:"PATCH",body:JSON.stringify({user_id:currentUser.id,completed_qty:Number($(`downstreamDone_${id}`).value||0)})});toast("Quantidade salva.");await openCard(currentCardId,sector==="ETIQUETAGEM"?"labeling":"storage");}catch(e){toast(e.message)}}
async function downstreamTimer(id,action,sector){try{await api(`/api/downstream/assignments/${id}/timer/${action}`,{method:"POST",body:JSON.stringify({user_id:currentUser.id})});await openCard(currentCardId,sector==="ETIQUETAGEM"?"labeling":"storage");}catch(e){toast(e.message)}}
async function completeDownstream(id,sector){try{await api(`/api/downstream/${id}/complete`,{method:"POST",body:JSON.stringify({user_id:currentUser.id})});toast("Etapa concluída.");closeModal();goTo(sector==="ETIQUETAGEM"?"labeling":"storage");}catch(e){toast(e.message)}}


function refreshTimerDisplay() {
  if (!cardData?.receiving?.timer) return;
  const timer = cardData.receiving.timer;
  if (timer.state !== "EM_ANDAMENTO" && timer.state !== "PAUSADA") return;
  let baseUseful = Number(timer.business_seconds || 0);
  let basePaused = Number(timer.paused_seconds || 0);
  let basePermanence = Number(timer.permanence_seconds || 0);
  const started = Date.now();
  clearInterval(window.receivingTimerInterval);
  window.receivingTimerInterval = setInterval(() => {
    if (!$("timerPermanence")) return clearInterval(window.receivingTimerInterval);
    const elapsed = Math.floor((Date.now()-started)/1000);
    $("timerPermanence").textContent = fmtSeconds(basePermanence + elapsed);
    if (timer.state === "PAUSADA") $("timerPaused").textContent = fmtSeconds(basePaused + elapsed);
  },1000);
}

function closeModal() {
  clearInterval(window.receivingTimerInterval);
  $("modal").classList.add("hidden");
  currentCardId = null;
  cardData = null;
  goTo(currentView);
}

setInterval(() => { if ($("clock")) $("clock").textContent = new Date().toLocaleString("pt-BR"); }, 1000);
if (currentUser) enterApp();
