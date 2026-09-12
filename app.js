"use strict";

const CATEGORIES = {
  receita: ["Salário", "Estágio", "Freelance", "Outros"],
  gasto: ["Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Assinaturas", "Outros"],
};

const COLORS = ["#4d7fff", "#5eead4", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185", "#60a5fa"];
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const STORAGE_KEYS = {
  transactions: "finance:transactions",
  goals: "finance:goals",
};

let transactions = [];
let goals = [];
let currentTxType = "gasto";
let currentMonth = todayISO().slice(0, 7);
let trendChart;
let categoryChart;
let lastFocusedElement;
let toastTimer;

const elements = {
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
  goalsList: document.querySelector("#goalsList"),
  goalsEmpty: document.querySelector("#goalsEmpty"),
  catTotal: document.querySelector("#catTotal"),
  catEmpty: document.querySelector("#catEmpty"),
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
  toast: document.querySelector("#toast"),
};

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function monthKey(date) {
  return typeof date === "string" ? date.slice(0, 7) : "";
}

function escapeHTML(value) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value).replace(/[&<>"']/g, (character) => replacements[character]);
}

function parseStoredArray(rawValue) {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadCollection(key) {
  try {
    const localData = parseStoredArray(localStorage.getItem(key));
    if (localData !== null) return localData;
  } catch (error) {
    console.error(`Não foi possível ler ${key} do localStorage.`, error);
  }

  // Migra automaticamente dados criados no ambiente antigo do Claude, se disponíveis.
  if (window.storage?.get) {
    try {
      const legacyData = await window.storage.get(key);
      const parsed = parseStoredArray(legacyData?.value);
      if (parsed !== null) {
        localStorage.setItem(key, JSON.stringify(parsed));
        return parsed;
      }
    } catch (error) {
      console.warn(`Não foi possível migrar ${key}.`, error);
    }
  }

  return [];
}

function saveCollection(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Não foi possível salvar ${key}.`, error);
    showToast("Não foi possível salvar os dados neste navegador.", true);
    return false;
  }
}

function normalizeData() {
  transactions = transactions
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || createId()),
      type: item.type === "receita" ? "receita" : "gasto",
      desc: String(item.desc || "Sem descrição"),
      amount: Number(item.amount) || 0,
      category: String(item.category || "Outros"),
      date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : todayISO(),
    }))
    .filter((item) => item.amount > 0);

  goals = goals
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || createId()),
      name: String(item.name || "Meta"),
      target: Number(item.target) || 0,
      current: Math.max(0, Number(item.current) || 0),
    }))
    .filter((item) => item.target > 0);
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
  document.querySelectorAll(".modal-bg.show").forEach((modal) => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  });
  lastFocusedElement?.focus?.();
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

function addTransaction(event) {
  event.preventDefault();
  if (!elements.txForm.reportValidity()) return;

  const amount = Number(elements.fAmount.value);
  const transaction = {
    id: createId(),
    type: currentTxType,
    desc: elements.fDesc.value.trim(),
    amount,
    category: elements.fCategory.value,
    date: elements.fDate.value,
  };

  transactions.push(transaction);
  if (!saveCollection(STORAGE_KEYS.transactions, transactions)) return;

  currentMonth = monthKey(transaction.date);
  elements.txForm.reset();
  closeModals();
  render();
  showToast("Lançamento adicionado.");
}

function removeTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction || !window.confirm(`Excluir o lançamento "${transaction.desc}"?`)) return;

  transactions = transactions.filter((item) => item.id !== id);
  saveCollection(STORAGE_KEYS.transactions, transactions);
  render();
  showToast("Lançamento excluído.");
}

function addGoal(event) {
  event.preventDefault();
  if (!elements.goalForm.reportValidity()) return;

  goals.push({
    id: createId(),
    name: elements.gName.value.trim(),
    target: Number(elements.gTarget.value),
    current: Number(elements.gCurrent.value) || 0,
  });

  if (!saveCollection(STORAGE_KEYS.goals, goals)) return;

  elements.goalForm.reset();
  closeModals();
  render();
  showToast("Meta criada.");
}

function removeGoal(id) {
  const goal = goals.find((item) => item.id === id);
  if (!goal || !window.confirm(`Excluir a meta "${goal.name}"?`)) return;

  goals = goals.filter((item) => item.id !== id);
  saveCollection(STORAGE_KEYS.goals, goals);
  render();
  showToast("Meta excluída.");
}

function increaseGoal(id, amount) {
  goals = goals.map((goal) => goal.id === id ? { ...goal, current: goal.current + amount } : goal);
  saveCollection(STORAGE_KEYS.goals, goals);
  render();
}

function getRecentMonthKeys() {
  const [year, month] = currentMonth.split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function renderSummary(monthTransactions) {
  const incomeTransactions = monthTransactions.filter((item) => item.type === "receita");
  const expenseTransactions = monthTransactions.filter((item) => item.type === "gasto");
  const income = incomeTransactions.reduce((sum, item) => sum + item.amount, 0);
  const expense = expenseTransactions.reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;
  const rate = income > 0 ? Math.max(0, (balance / income) * 100) : 0;

  elements.kpiIncome.textContent = formatCurrency(income);
  elements.kpiExpense.textContent = formatCurrency(expense);
  elements.kpiBalance.textContent = formatCurrency(balance);
  elements.kpiBalance.className = `value ${balance >= 0 ? "up" : "down"}`;
  elements.kpiRate.textContent = `${rate.toFixed(0)}%`;
  elements.kpiIncomeSub.textContent = `${incomeTransactions.length} ${incomeTransactions.length === 1 ? "entrada" : "entradas"}`;
  elements.kpiExpenseSub.textContent = `${expenseTransactions.length} ${expenseTransactions.length === 1 ? "saída" : "saídas"}`;
  elements.kpiBalanceSub.textContent = balance >= 0 ? "positivo no mês" : "negativo no mês";

  return { income, expense };
}

function renderTransactions(monthTransactions) {
  const sorted = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date));
  elements.txCount.textContent = `${sorted.length} ${sorted.length === 1 ? "lançamento" : "lançamentos"}`;
  elements.txEmpty.hidden = sorted.length > 0;
  elements.txBody.innerHTML = sorted.map((transaction) => `
    <tr>
      <td class="date-cell">${transaction.date.slice(8, 10)}/${transaction.date.slice(5, 7)}</td>
      <td class="tx-desc" title="${escapeHTML(transaction.desc)}">${escapeHTML(transaction.desc)}</td>
      <td><span class="tag">${escapeHTML(transaction.category)}</span></td>
      <td class="${transaction.type === "receita" ? "amt-in" : "amt-out"}">${transaction.type === "receita" ? "+" : "−"} ${formatCurrency(transaction.amount)}</td>
      <td class="row-actions"><button class="btn danger" type="button" data-action="remove-transaction" data-id="${escapeHTML(transaction.id)}" aria-label="Excluir ${escapeHTML(transaction.desc)}">✕</button></td>
    </tr>
  `).join("");
}

function renderGoals() {
  elements.goalsEmpty.hidden = goals.length > 0;
  elements.goalsList.innerHTML = goals.map((goal) => {
    const percentage = Math.min(100, (goal.current / goal.target) * 100);
    return `
      <div class="goal">
        <div class="goal-top">
          <span class="goal-name" title="${escapeHTML(goal.name)}">${escapeHTML(goal.name)}</span>
          <span class="goal-amounts">
            ${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}
            <button class="btn danger" type="button" data-action="remove-goal" data-id="${escapeHTML(goal.id)}" aria-label="Excluir meta ${escapeHTML(goal.name)}">✕</button>
          </span>
        </div>
        <div class="bar-bg" role="progressbar" aria-label="Progresso de ${escapeHTML(goal.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage.toFixed(0)}">
          <div class="bar-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="goal-foot">
          <span class="goal-pct">${percentage.toFixed(0)}%</span>
          <div class="goal-actions">
            <button class="chip" type="button" data-action="increase-goal" data-id="${escapeHTML(goal.id)}" data-amount="50">+R$ 50</button>
            <button class="chip" type="button" data-action="increase-goal" data-id="${escapeHTML(goal.id)}" data-amount="100">+R$ 100</button>
            <button class="chip" type="button" data-action="increase-goal" data-id="${escapeHTML(goal.id)}" data-amount="500">+R$ 500</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function chartTooltipOptions() {
  return {
    backgroundColor: "#0b1120",
    borderColor: "rgba(148,168,204,.16)",
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

  const labels = Object.keys(totalsByCategory);
  const values = Object.values(totalsByCategory);
  const hasData = labels.length > 0;

  elements.catEmpty.hidden = hasData;
  elements.categoryCanvas.closest(".chart-box").hidden = !hasData;
  elements.catTotal.textContent = hasData ? formatCurrency(expense) : "";
  categoryChart?.destroy();
  categoryChart = undefined;

  if (!hasData || typeof Chart === "undefined") return;

  categoryChart = new Chart(elements.categoryCanvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: COLORS, borderColor: "#0b1120", borderWidth: 3, hoverOffset: 6 }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { color: "#8792ab", boxWidth: 9, padding: 14, font: { size: 11.5 } } },
        tooltip: chartTooltipOptions(),
      },
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
  const incomeValues = recentMonths.map((key) => transactions
    .filter((item) => monthKey(item.date) === key && item.type === "receita")
    .reduce((sum, item) => sum + item.amount, 0));
  const expenseValues = recentMonths.map((key) => transactions
    .filter((item) => monthKey(item.date) === key && item.type === "gasto")
    .reduce((sum, item) => sum + item.amount, 0));

  trendChart?.destroy();
  trendChart = new Chart(elements.trendCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Receitas", data: incomeValues, backgroundColor: "#34d399", borderRadius: 6, maxBarThickness: 26 },
        { label: "Gastos", data: expenseValues, backgroundColor: "#fb7185", borderRadius: 6, maxBarThickness: 26 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#8792ab", font: { size: 11.5 } }, grid: { display: false }, border: { color: "rgba(148,168,204,.12)" } },
        y: { beginAtZero: true, ticks: { color: "#8792ab", font: { size: 11 }, callback: (value) => `R$ ${Number(value).toLocaleString("pt-BR")}` }, grid: { color: "rgba(148,168,204,.07)" }, border: { display: false } },
      },
      plugins: {
        legend: { labels: { color: "#8792ab", boxWidth: 9, font: { size: 11.5 } } },
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

function registerEvents() {
  document.querySelector("#prevMonth").addEventListener("click", () => shiftMonth(-1));
  document.querySelector("#nextMonth").addEventListener("click", () => shiftMonth(1));

  document.querySelector("#btnTx").addEventListener("click", () => {
    elements.txForm.reset();
    setTxType("gasto");
    elements.fDate.value = defaultDateForSelectedMonth();
    openModal("modalTx");
  });

  document.querySelector("#btnGoal").addEventListener("click", () => {
    elements.goalForm.reset();
    openModal("modalGoal");
  });

  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => setTxType(button.dataset.type));
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
  document.querySelectorAll(".modal-bg").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModals();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
  });

  elements.txForm.addEventListener("submit", addTransaction);
  elements.goalForm.addEventListener("submit", addGoal);

  elements.txBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='remove-transaction']");
    if (button) removeTransaction(button.dataset.id);
  });

  elements.goalsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    if (button.dataset.action === "remove-goal") removeGoal(button.dataset.id);
    if (button.dataset.action === "increase-goal") increaseGoal(button.dataset.id, Number(button.dataset.amount));
  });
}

async function init() {
  registerEvents();
  setTxType("gasto");
  [transactions, goals] = await Promise.all([
    loadCollection(STORAGE_KEYS.transactions),
    loadCollection(STORAGE_KEYS.goals),
  ]);
  normalizeData();
  render();

  if (typeof Chart === "undefined") {
    showToast("Os gráficos não carregaram. Verifique sua conexão.", true);
  }
}

init();
