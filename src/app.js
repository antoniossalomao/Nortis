"use strict";

let CATEGORIES = {
  receita: ["Salário", "Estágio", "Freelance", "Outros"],
  gasto: ["Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Assinaturas", "Outros"],
};

const DONUT_COLORS = ["#cda45e", "#a3814a", "#7a5f3a", "#544433", "#332a20", "#241d16"];
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

let transactions = [];
let goals = [];
let currentTxType = "gasto";
let currentMonth = todayISO().slice(0, 7);
let trendChart;
let categoryChart;
let lastFocusedElement;
let toastTimer;
let editingTransactionId = null;
let editingGoalId = null;
let resolveConfirm = null;
let resolvePrompt = null;

const elements = {
  appRoot: document.querySelector(".app"),
  monthLabel: document.querySelector("#monthLabel"),
  kpiIncome: document.querySelector("#kpiIncome"),
  kpiIncomeSub: document.querySelector("#kpiIncomeSub"),
  kpiExpense: document.querySelector("#kpiExpense"),
  kpiExpenseSub: document.querySelector("#kpiExpenseSub"),
  kpiBalance: document.querySelector("#kpiBalance"),
  kpiBalanceSub: document.querySelector("#kpiBalanceSub"),
  kpiRate: document.querySelector("#kpiRate"),
  txBody: document.querySelector("#txBody"),
  txCount: document.querySelector("#txCount"),
  txEmpty: document.querySelector("#txEmpty"),
  txSearch: document.querySelector("#txSearch"),
  txTypeFilter: document.querySelector("#txTypeFilter"),
  goalsList: document.querySelector("#goalsList"),
  goalsEmpty: document.querySelector("#goalsEmpty"),
  catTotal: document.querySelector("#catTotal"),
  catEmpty: document.querySelector("#catEmpty"),
  catLegend: document.querySelector("#catLegend"),
  categoryCanvas: document.querySelector("#chartCategory"),
  trendCanvas: document.querySelector("#chartTrend"),
  typeIn: document.querySelector("#typeIn"),
  typeOut: document.querySelector("#typeOut"),
  txForm: document.querySelector("#txForm"),
  goalForm: document.querySelector("#goalForm"),
  fDesc: document.querySelector("#fDesc"),
  fAmount: document.querySelector("#fAmount"),
  fCategory: document.querySelector("#fCategory"),
  fDate: document.querySelector("#fDate"),
  gName: document.querySelector("#gName"),
  gTarget: document.querySelector("#gTarget"),
  gCurrent: document.querySelector("#gCurrent"),
  gTargetDate: document.querySelector("#gTargetDate"),
  toast: document.querySelector("#toast"),
  txModalTitle: document.querySelector("#modalTxTitle"),
  txSubmit: document.querySelector("#txSubmit"),
  goalModalTitle: document.querySelector("#modalGoalTitle"),
  goalSubmit: document.querySelector("#goalSubmit"),
  importFile: document.querySelector("#importFile"),
  storageLabel: document.querySelector("#storageLabel"),
  btnLogout: document.querySelector("#btnLogout"),
  kpiIncomeDelta: document.querySelector("#kpiIncomeDelta"),
  kpiExpenseDelta: document.querySelector("#kpiExpenseDelta"),
  kpiBalanceDelta: document.querySelector("#kpiBalanceDelta"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmOkBtn: document.querySelector("#confirmOkBtn"),
  confirmCancelBtn: document.querySelector("#confirmCancelBtn"),
  promptTitle: document.querySelector("#promptTitle"),
  promptForm: document.querySelector("#promptForm"),
  promptInput: document.querySelector("#promptInput"),
  promptCancelBtn: document.querySelector("#promptCancelBtn"),
};

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthKey(date) {
  return typeof date === "string" ? date.slice(0, 7) : "";
}

function escapeHTML(value) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value).replace(/[&<>"']/g, (character) => replacements[character]);
}

function applyBootstrap(data) {
  transactions = Array.isArray(data.transactions) ? data.transactions : [];
  goals = Array.isArray(data.goals) ? data.goals : [];
  if (Array.isArray(data.categories) && data.categories.length) {
    CATEGORIES = { receita: [], gasto: [] };
    data.categories.forEach((item) => {
      if (CATEGORIES[item.type] && !CATEGORIES[item.type].includes(item.name)) CATEGORIES[item.type].push(item.name);
    });
  }
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function openModal(modalId) {
  const modal = document.querySelector(`#${modalId}`);
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => modal.querySelector("input, button, select")?.focus());
}

function closeModals() {
  if (document.querySelector('.modal-bg.show form[aria-busy="true"]')) return;
  document.querySelectorAll(".modal-bg.show").forEach((modal) => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  });
  if (resolveConfirm) {
    resolveConfirm(false);
    resolveConfirm = null;
  }
  if (resolvePrompt) {
    resolvePrompt(null);
    resolvePrompt = null;
  }
  lastFocusedElement?.focus?.();
}

/** Themed replacement for window.confirm(); resolves true/false. */
function showConfirm(message, { confirmLabel = "Excluir", danger = true } = {}) {
  return new Promise((resolve) => {
    resolveConfirm = resolve;
    elements.confirmMessage.textContent = message;
    elements.confirmOkBtn.textContent = confirmLabel;
    elements.confirmOkBtn.classList.toggle("danger-solid", danger);
    openModal("modalConfirm");
  });
}

/** Themed replacement for window.prompt(); resolves a number or null if cancelled. */
function showAmountPrompt(title) {
  return new Promise((resolve) => {
    resolvePrompt = resolve;
    elements.promptTitle.textContent = title;
    elements.promptInput.value = "";
    openModal("modalPrompt");
  });
}

function setFormSaving(form, button, saving) {
  form.setAttribute("aria-busy", String(saving));
  button.disabled = saving;
  if (saving) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = "Salvando…";
  } else {
    button.textContent = button.dataset.idleLabel || button.textContent;
  }
}

function defaultDateForSelectedMonth() {
  if (currentMonth === todayISO().slice(0, 7)) return todayISO();
  return `${currentMonth}-01`;
}

function shiftMonth(delta) {
  const [year, month] = currentMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  render();
}

function setTxType(type) {
  currentTxType = type;
  elements.typeIn.classList.toggle("active-in", type === "receita");
  elements.typeOut.classList.toggle("active-out", type === "gasto");
  elements.typeIn.setAttribute("aria-pressed", String(type === "receita"));
  elements.typeOut.setAttribute("aria-pressed", String(type === "gasto"));
  elements.fCategory.innerHTML = CATEGORIES[type]
    .map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`)
    .join("");
}

async function addTransaction(event) {
  event.preventDefault();
  if (elements.txForm.getAttribute("aria-busy") === "true") return;
  if (!elements.txForm.reportValidity()) return;

  const transaction = {
    type: currentTxType,
    desc: elements.fDesc.value.trim(),
    amount: Number(elements.fAmount.value),
    category: elements.fCategory.value,
    date: elements.fDate.value,
  };

  setFormSaving(elements.txForm, elements.txSubmit, true);
  try {
    const saved = editingTransactionId
      ? await window.nortis.transactions.update(editingTransactionId, transaction)
      : await window.nortis.transactions.create(transaction);
    if (editingTransactionId) {
      transactions = transactions.map((item) => (item.id === editingTransactionId ? saved : item));
    } else {
      transactions.push(saved);
    }
    currentMonth = monthKey(saved.date);
    elements.txForm.reset();
    setFormSaving(elements.txForm, elements.txSubmit, false);
    closeModals();
    render();
    showToast(editingTransactionId ? "Lançamento atualizado." : "Lançamento adicionado.");
    editingTransactionId = null;
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setFormSaving(elements.txForm, elements.txSubmit, false);
  }
}

function editTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;
  editingTransactionId = id;
  elements.txModalTitle.textContent = "Editar lançamento";
  elements.txSubmit.textContent = "Salvar alterações";
  elements.fDesc.value = transaction.desc;
  elements.fAmount.value = transaction.amount;
  elements.fDate.value = transaction.date;
  setTxType(transaction.type);
  elements.fCategory.value = transaction.category;
  openModal("modalTx");
}

async function removeTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;
  const confirmed = await showConfirm(`Excluir o lançamento "${transaction.desc}"? Essa ação não pode ser desfeita.`);
  if (!confirmed) return;
  try {
    await window.nortis.transactions.remove(id);
    transactions = transactions.filter((item) => item.id !== id);
    render();
    showToast("Lançamento excluído.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function addGoal(event) {
  event.preventDefault();
  if (elements.goalForm.getAttribute("aria-busy") === "true") return;
  if (!elements.goalForm.reportValidity()) return;

  const goal = {
    name: elements.gName.value.trim(),
    target: Number(elements.gTarget.value),
    current: Number(elements.gCurrent.value) || 0,
    targetDate: elements.gTargetDate.value || null,
  };
  setFormSaving(elements.goalForm, elements.goalSubmit, true);
  try {
    const saved = editingGoalId
      ? await window.nortis.goals.update(editingGoalId, goal)
      : await window.nortis.goals.create(goal);
    if (editingGoalId) {
      goals = goals.map((item) => (item.id === editingGoalId ? saved : item));
    } else {
      goals.push(saved);
    }
    elements.goalForm.reset();
    setFormSaving(elements.goalForm, elements.goalSubmit, false);
    closeModals();
    render();
    showToast(editingGoalId ? "Meta atualizada." : "Meta criada.");
    editingGoalId = null;
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setFormSaving(elements.goalForm, elements.goalSubmit, false);
  }
}

function editGoal(id) {
  const goal = goals.find((item) => item.id === id);
  if (!goal) return;
  editingGoalId = id;
  elements.goalModalTitle.textContent = "Editar meta";
  elements.goalSubmit.textContent = "Salvar alterações";
  elements.gName.value = goal.name;
  elements.gTarget.value = goal.target;
  elements.gCurrent.value = "";
  elements.gCurrent.disabled = true;
  elements.gCurrent.closest(".field").hidden = true;
  elements.gTargetDate.value = goal.targetDate || "";
  openModal("modalGoal");
}

async function removeGoal(id) {
  const goal = goals.find((item) => item.id === id);
  if (!goal) return;
  const confirmed = await showConfirm(`Excluir a meta "${goal.name}"? Essa ação não pode ser desfeita.`);
  if (!confirmed) return;
  try {
    await window.nortis.goals.remove(id);
    goals = goals.filter((item) => item.id !== id);
    render();
    showToast("Meta excluída.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function increaseGoal(id, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  try {
    const saved = await window.nortis.goals.contribute(id, { amount, date: todayISO() });
    goals = goals.map((goal) => (goal.id === id ? saved : goal));
    render();
    showToast("Contribuição registrada.");
  } catch (error) {
    showToast(error.message, true);
  }
}

function getRecentMonthKeys() {
  const [year, month] = currentMonth.split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function previousMonthKey(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function applyDelta(element, current, previous, favorableWhenHigher) {
  if (!previous) {
    element.textContent = "";
    element.className = "kpi-delta";
    return;
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) {
    element.textContent = "estável vs mês anterior";
    element.className = "kpi-delta";
    return;
  }
  const rising = diff > 0;
  const favorable = rising === favorableWhenHigher;
  const pct = Math.min(999, Math.abs((diff / previous) * 100));
  element.textContent = `${rising ? "▲" : "▼"} ${pct.toFixed(0)}% vs mês anterior`;
  element.className = `kpi-delta ${favorable ? "good" : "bad"}`;
}

function renderSummary(monthTransactions) {
  const incomeTransactions = monthTransactions.filter((item) => item.type === "receita");
  const expenseTransactions = monthTransactions.filter((item) => item.type === "gasto");
  const income = incomeTransactions.reduce((sum, item) => sum + item.amount, 0);
  const expense = expenseTransactions.reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;
  const rate = income > 0 ? (balance / income) * 100 : null;

  const previousMonthTransactions = transactions.filter((item) => monthKey(item.date) === previousMonthKey(currentMonth));
  const previousIncome = previousMonthTransactions.filter((item) => item.type === "receita").reduce((sum, item) => sum + item.amount, 0);
  const previousExpense = previousMonthTransactions.filter((item) => item.type === "gasto").reduce((sum, item) => sum + item.amount, 0);

  elements.kpiIncome.textContent = formatCurrency(income);
  elements.kpiExpense.textContent = formatCurrency(expense);
  elements.kpiBalance.textContent = formatCurrency(balance);
  elements.kpiBalance.classList.toggle("pos", balance >= 0);
  elements.kpiRate.textContent = rate === null ? "—" : `${rate.toFixed(0)}%`;
  elements.kpiIncomeSub.textContent = `${incomeTransactions.length} ${incomeTransactions.length === 1 ? "entrada" : "entradas"}`;
  elements.kpiExpenseSub.textContent = `${expenseTransactions.length} ${expenseTransactions.length === 1 ? "saída" : "saídas"}`;
  elements.kpiBalanceSub.textContent = balance >= 0 ? "positivo no mês" : "negativo no mês";
  applyDelta(elements.kpiIncomeDelta, income, previousIncome, true);
  applyDelta(elements.kpiExpenseDelta, expense, previousExpense, false);
  applyDelta(elements.kpiBalanceDelta, balance, previousIncome - previousExpense, true);

  return { income, expense };
}

function renderTransactions(monthTransactions) {
  const normalizeSearch = (value) => value.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLocaleLowerCase("pt-BR");
  const query = normalizeSearch(elements.txSearch.value.trim());
  const type = elements.txTypeFilter.value;
  const filtered = monthTransactions.filter(
    (item) => (!type || item.type === type) && (!query || normalizeSearch(`${item.desc} ${item.category}`).includes(query))
  );
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  elements.txCount.textContent =
    query || type ? `${sorted.length} de ${monthTransactions.length} lançamentos` : `${sorted.length} ${sorted.length === 1 ? "lançamento" : "lançamentos"}`;
  elements.txEmpty.hidden = sorted.length > 0;
  elements.txEmpty.textContent = query || type ? "Nenhum lançamento corresponde aos filtros deste mês." : "Nenhum lançamento neste mês";
  elements.txBody.innerHTML = sorted
    .map(
      (transaction) => `
    <tr>
      <td class="date-cell">${transaction.date.slice(8, 10)}/${transaction.date.slice(5, 7)}</td>
      <td class="tx-desc" title="${escapeHTML(transaction.desc)}">${escapeHTML(transaction.desc)}</td>
      <td><span class="tag">${escapeHTML(transaction.category)}</span></td>
      <td class="align-right ${transaction.type === "receita" ? "amt-in" : "amt-out"}">${transaction.type === "receita" ? "+" : "−"} ${formatCurrency(transaction.amount)}</td>
      <td class="row-actions">
        <span class="inline-actions">
          <button class="icon-btn" type="button" data-action="edit-transaction" data-id="${escapeHTML(transaction.id)}" aria-label="Editar ${escapeHTML(transaction.desc)}">✎</button>
          <button class="icon-btn danger" type="button" data-action="remove-transaction" data-id="${escapeHTML(transaction.id)}" aria-label="Excluir ${escapeHTML(transaction.desc)}">✕</button>
        </span>
      </td>
    </tr>
  `
    )
    .join("");
}

function goalDeadlineText(goal) {
  if (!goal.targetDate || goal.current >= goal.target) return "";
  const diffDays = Math.round((new Date(`${goal.targetDate}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)) / 86400000);
  if (diffDays < 0) return "prazo vencido";
  if (diffDays === 0) return "vence hoje";
  return diffDays === 1 ? "1 dia restante" : `${diffDays} dias restantes`;
}

function renderGoals() {
  elements.goalsEmpty.hidden = goals.length > 0;
  elements.goalsList.innerHTML = goals
    .map((goal) => {
      const percentage = Math.min(100, (goal.current / goal.target) * 100);
      const deadline = goalDeadlineText(goal);
      const deadlineHTML = deadline
        ? ` · <span class="${deadline === "prazo vencido" ? "overdue" : ""}">${escapeHTML(deadline)}</span>`
        : "";
      return `
      <div class="goal">
        <div class="goal-top">
          <span class="goal-name" title="${escapeHTML(goal.name)}">${escapeHTML(goal.name)}</span>
          <span class="goal-amounts">
            ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}
            <button class="icon-btn" type="button" data-action="edit-goal" data-id="${escapeHTML(goal.id)}" aria-label="Editar meta ${escapeHTML(goal.name)}">✎</button>
            <button class="icon-btn danger" type="button" data-action="remove-goal" data-id="${escapeHTML(goal.id)}" aria-label="Excluir meta ${escapeHTML(goal.name)}">✕</button>
          </span>
        </div>
        <div class="bar-bg" role="progressbar" aria-label="Progresso de ${escapeHTML(goal.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage.toFixed(0)}">
          <div class="bar-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="goal-foot">
          <span class="goal-pct">${percentage.toFixed(0)}%${deadlineHTML}</span>
          <div class="goal-actions">
            <button class="chip" type="button" data-action="increase-goal" data-id="${escapeHTML(goal.id)}" data-amount="50">+R$ 50</button>
            <button class="chip" type="button" data-action="increase-goal" data-id="${escapeHTML(goal.id)}" data-amount="100">+R$ 100</button>
            <button class="chip" type="button" data-action="custom-goal" data-id="${escapeHTML(goal.id)}">Outro valor</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function chartTooltipOptions() {
  return {
    backgroundColor: "#14120f",
    borderColor: "rgba(210,195,170,.16)",
    borderWidth: 1,
    padding: 10,
    callbacks: {
      label: (context) => `${context.dataset.label ? `${context.dataset.label}: ` : ""}${formatCurrency(context.raw)}`,
    },
  };
}

function renderCategoryChart(monthTransactions, expense) {
  const totalsByCategory = {};
  monthTransactions
    .filter((item) => item.type === "gasto")
    .forEach((item) => {
      totalsByCategory[item.category] = (totalsByCategory[item.category] || 0) + item.amount;
    });

  const entries = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(([name]) => name);
  const values = entries.map(([, value]) => value);
  const hasData = labels.length > 0;

  elements.catEmpty.hidden = hasData;
  elements.categoryCanvas.closest(".chart-box").hidden = !hasData;
  elements.catTotal.textContent = hasData ? formatCurrency(expense) : "";
  elements.catLegend.innerHTML = hasData
    ? entries
        .map(
          ([name, value], index) => `
      <div class="row">
        <span class="dot" style="background:${DONUT_COLORS[index % DONUT_COLORS.length]}"></span>
        <span class="name">${escapeHTML(name)}</span>
        <span>${((value / expense) * 100).toFixed(0)}%</span>
      </div>`
        )
        .join("")
    : "";

  categoryChart?.destroy();
  categoryChart = undefined;
  if (!hasData || typeof Chart === "undefined") return;

  categoryChart = new Chart(elements.categoryCanvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: DONUT_COLORS, borderColor: "#14120f", borderWidth: 3, hoverOffset: 6 }] },
    options: {
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: { legend: { display: false }, tooltip: chartTooltipOptions() },
    },
  });
}

function renderTrendChart() {
  if (typeof Chart === "undefined") return;

  const recentMonths = getRecentMonthKeys();
  const labels = recentMonths.map((key) => {
    const [year, month] = key.split("-");
    return `${MONTH_NAMES[Number(month) - 1].slice(0, 3)}/${year.slice(2)}`;
  });
  const incomeValues = recentMonths.map((key) =>
    transactions.filter((item) => monthKey(item.date) === key && item.type === "receita").reduce((sum, item) => sum + item.amount, 0)
  );
  const expenseValues = recentMonths.map((key) =>
    transactions.filter((item) => monthKey(item.date) === key && item.type === "gasto").reduce((sum, item) => sum + item.amount, 0)
  );

  trendChart?.destroy();
  trendChart = new Chart(elements.trendCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Receitas", data: incomeValues, backgroundColor: "#cda45e", borderRadius: 4, maxBarThickness: 22 },
        { label: "Gastos", data: expenseValues, backgroundColor: "#5c554a", borderRadius: 4, maxBarThickness: 22 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#8a8276", font: { size: 11.5 } }, grid: { display: false }, border: { color: "rgba(210,195,170,.12)" } },
        y: {
          beginAtZero: true,
          ticks: { color: "#8a8276", font: { size: 11 }, callback: (value) => `R$ ${Number(value).toLocaleString("pt-BR")}` },
          grid: { color: "rgba(210,195,170,.06)" },
          border: { display: false },
        },
      },
      plugins: {
        legend: { labels: { color: "#8a8276", boxWidth: 9, font: { size: 11.5 } } },
        tooltip: chartTooltipOptions(),
      },
    },
  });
}

function render() {
  const [year, month] = currentMonth.split("-").map(Number);
  elements.monthLabel.textContent = `${MONTH_NAMES[month - 1]} ${year}`;

  const monthTransactions = transactions.filter((item) => monthKey(item.date) === currentMonth);
  const { expense } = renderSummary(monthTransactions);
  renderTransactions(monthTransactions);
  renderGoals();
  renderCategoryChart(monthTransactions, expense);
  renderTrendChart();
}

async function exportBackup() {
  try {
    const data = await window.nortis.backup.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nortis-backup-${todayISO()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function importBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const confirmed = await showConfirm("Importar este backup substituirá os lançamentos e metas atuais. Continuar?", {
      confirmLabel: "Importar",
      danger: false,
    });
    if (!confirmed) return;
    const imported = await window.nortis.backup.import({ ...data, replace: true });
    applyBootstrap(imported);
    render();
    showToast("Backup importado com sucesso.");
  } catch (error) {
    showToast(error instanceof SyntaxError ? "O arquivo não contém um JSON válido." : error.message, true);
  } finally {
    elements.importFile.value = "";
  }
}

async function logout() {
  try {
    await window.nortis.auth.logout();
  } catch {
    // A sessão pode já ter expirado; seguimos para a tela de login de qualquer forma.
  }
  window.location.href = "login.html";
}

function registerEvents() {
  document.querySelector("#prevMonth").addEventListener("click", () => shiftMonth(-1));
  document.querySelector("#nextMonth").addEventListener("click", () => shiftMonth(1));

  document.querySelector("#btnTx").addEventListener("click", () => {
    editingTransactionId = null;
    elements.txForm.reset();
    elements.txModalTitle.textContent = "Novo lançamento";
    elements.txSubmit.textContent = "Adicionar lançamento";
    setTxType("gasto");
    elements.fDate.value = defaultDateForSelectedMonth();
    openModal("modalTx");
  });

  document.querySelector("#btnGoal").addEventListener("click", () => {
    editingGoalId = null;
    elements.goalForm.reset();
    elements.goalModalTitle.textContent = "Nova meta";
    elements.goalSubmit.textContent = "Criar meta";
    elements.gCurrent.disabled = false;
    elements.gCurrent.closest(".field").hidden = false;
    openModal("modalGoal");
  });

  document.querySelector("#btnExport").addEventListener("click", exportBackup);
  document.querySelector("#btnImport").addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", () => importBackup(elements.importFile.files[0]));
  elements.btnLogout.addEventListener("click", logout);

  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => setTxType(button.dataset.type));
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
  document.querySelectorAll(".modal-bg").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModals();
    });
  });

  elements.confirmOkBtn.addEventListener("click", () => {
    resolveConfirm?.(true);
    resolveConfirm = null;
    closeModals();
  });
  elements.confirmCancelBtn.addEventListener("click", closeModals);
  elements.promptCancelBtn.addEventListener("click", closeModals);
  elements.promptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number(elements.promptInput.value.replace(",", "."));
    resolvePrompt?.(Number.isFinite(value) ? value : null);
    resolvePrompt = null;
    closeModals();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
    if (event.key !== "Tab") return;
    const modal = document.querySelector(".modal-bg.show");
    if (!modal) return;
    const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(
      (element) => element.getClientRects().length > 0
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  const refreshTransactions = () => renderTransactions(transactions.filter((item) => monthKey(item.date) === currentMonth));
  elements.txSearch.addEventListener("input", refreshTransactions);
  elements.txTypeFilter.addEventListener("change", refreshTransactions);

  elements.txForm.addEventListener("submit", addTransaction);
  elements.goalForm.addEventListener("submit", addGoal);

  elements.txBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit-transaction") editTransaction(button.dataset.id);
    if (button.dataset.action === "remove-transaction") removeTransaction(button.dataset.id);
  });

  elements.goalsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "remove-goal") removeGoal(button.dataset.id);
    if (button.dataset.action === "edit-goal") editGoal(button.dataset.id);
    if (button.dataset.action === "increase-goal") increaseGoal(button.dataset.id, Number(button.dataset.amount));
    if (button.dataset.action === "custom-goal") {
      const value = await showAmountPrompt("Valor da contribuição (R$)");
      if (value !== null && value > 0) increaseGoal(button.dataset.id, value);
    }
  });
}

async function init() {
  registerEvents();
  setTxType("gasto");
  try {
    const [loaded, user] = await Promise.all([window.nortis.bootstrap(), window.nortis.auth.me()]);
    applyBootstrap(loaded);
    elements.storageLabel.textContent = `${user.name} · conta principal`;
    render();
  } catch (error) {
    if (error?.message?.includes("autenticado")) {
      window.location.href = "login.html";
      return;
    }
    elements.storageLabel.textContent = "Banco indisponível";
    showToast(error.message, true);
    render();
  }

  elements.appRoot?.classList.add("ready");

  if (typeof Chart === "undefined") {
    showToast("Os gráficos não carregaram.", true);
  }
}

init();
