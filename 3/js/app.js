/* QualityHub — панель дефектов.
   Этап 5: состояние, рендер таблицы, поиск, фильтр, добавление,
   закрытие дефекта и сброс демо-данных. */

(() => {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- Данные и подписи ---------- */

  const INITIAL_DEFECTS = [
    { id: "QH-142", title: "Ошибка фильтра отчётов", priority: "high", status: "progress" },
    { id: "QH-138", title: "Неверный расчёт покрытия", priority: "high", status: "progress" },
    { id: "QH-131", title: "Опечатка в экспорте CSV", priority: "low", status: "open" },
    { id: "QH-127", title: "Медленная загрузка отчёта", priority: "medium", status: "open" },
    { id: "QH-119", title: "Не сохраняется фильтр", priority: "medium", status: "progress" },
    { id: "QH-104", title: "Нет подсказки в поле даты", priority: "low", status: "closed" }
  ];

  const PRIORITIES = {
    high: { label: "Высокий", badge: "badge--danger" },
    medium: { label: "Средний", badge: "badge--warning" },
    low: { label: "Низкий", badge: "badge--muted" }
  };

  const STATUSES = {
    open: { label: "Открыт", className: "status--open" },
    progress: { label: "В работе", className: "status--progress" },
    closed: { label: "Закрыт", className: "status--closed" }
  };

  const state = {
    defects: INITIAL_DEFECTS.map((defect) => ({ ...defect })),
    query: "",
    priority: "all"
  };

  /* ---------- Элементы ---------- */

  const ui = {
    search: document.querySelector("#defect-search"),
    filters: document.querySelector(".filters"),
    filterChips: Array.from(document.querySelectorAll("[data-priority]")),
    form: document.querySelector("#defect-form"),
    title: document.querySelector("#defect-title"),
    priority: document.querySelector("#defect-priority"),
    tableBody: document.querySelector("#defects-body"),
    tableWrap: document.querySelector("#defects-table"),
    emptyState: document.querySelector("#empty-state"),
    message: document.querySelector("#dashboard-message"),
    resetDemo: document.querySelector("#reset-demo"),
    resetFilters: document.querySelector("#reset-filters"),
    kpiTotal: document.querySelector("#kpi-total"),
    kpiOpen: document.querySelector("#kpi-open"),
    kpiClosed: document.querySelector("#kpi-closed"),
    kpiHigh: document.querySelector("#kpi-high")
  };

  /* ---------- Вспомогательные функции ---------- */

  function getVisibleDefects() {
    const query = state.query.trim().toLowerCase();

    return state.defects.filter((defect) => {
      const matchesQuery =
        !query ||
        defect.id.toLowerCase().includes(query) ||
        defect.title.toLowerCase().includes(query);
      const matchesPriority =
        state.priority === "all" || defect.priority === state.priority;

      return matchesQuery && matchesPriority;
    });
  }

  function nextDefectId(defects) {
    const maxNumber = defects.reduce((max, defect) => {
      const number = Number.parseInt(defect.id.replace(/\D/g, ""), 10);
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);

    return `QH-${maxNumber + 1}`;
  }

  function validateTitle(value) {
    const title = value.trim();

    if (title.length < 3) {
      return "Название дефекта должно содержать минимум 3 символа.";
    }

    if (title.length > 80) {
      return "Название дефекта не должно превышать 80 символов.";
    }

    return "";
  }

  function setMessage(text, type = "") {
    if (!ui.message) return;

    ui.message.textContent = text;
    ui.message.className = "dashboard__message" + (type ? ` dashboard__message--${type}` : "");
  }

  /* ---------- Рендер ---------- */

  function createRow(defect) {
    const row = document.createElement("tr");
    if (defect.status === "closed") row.className = "row--closed";

    const idCell = document.createElement("td");
    idCell.textContent = defect.id;

    const titleCell = document.createElement("td");
    titleCell.textContent = defect.title;

    const priorityCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${PRIORITIES[defect.priority].badge}`;
    badge.textContent = PRIORITIES[defect.priority].label;
    priorityCell.append(badge);

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `status ${STATUSES[defect.status].className}`;
    status.textContent = STATUSES[defect.status].label;
    statusCell.append(status);

    const actionCell = document.createElement("td");

    if (defect.status === "closed") {
      const dash = document.createElement("span");
      dash.className = "table__dash";
      dash.setAttribute("aria-label", "Действия недоступны");
      dash.textContent = "—";
      actionCell.append(dash);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--secondary button--small";
      button.dataset.action = "close";
      button.dataset.id = defect.id;
      button.textContent = "Закрыть";
      button.setAttribute(
        "aria-label",
        `Закрыть дефект ${defect.id}: ${defect.title}`
      );
      actionCell.append(button);
    }

    row.append(idCell, titleCell, priorityCell, statusCell, actionCell);
    return row;
  }

  function updateSummary() {
    const total = state.defects.length;
    const open = state.defects.filter((defect) => defect.status !== "closed").length;
    const closed = total - open;
    const high = state.defects.filter(
      (defect) => defect.priority === "high" && defect.status !== "closed"
    ).length;

    ui.kpiTotal.textContent = String(total);
    ui.kpiOpen.textContent = String(open);
    ui.kpiClosed.textContent = String(closed);
    ui.kpiHigh.textContent = String(high);
  }

  function updateFilterState() {
    ui.filterChips.forEach((chip) => {
      chip.setAttribute(
        "aria-pressed",
        String(chip.dataset.priority === state.priority)
      );
    });
  }

  function render() {
    const visibleDefects = getVisibleDefects();
    const hasVisibleDefects = visibleDefects.length > 0;

    ui.tableBody.replaceChildren(...visibleDefects.map(createRow));
    ui.tableWrap.hidden = !hasVisibleDefects;
    ui.emptyState.hidden = hasVisibleDefects;

    updateSummary();
    updateFilterState();
  }

  /* ---------- Обработчики ---------- */

  function handleSearch(event) {
    state.query = event.target.value;
    render();
  }

  function handleFilterClick(event) {
    if (!(event.target instanceof Element)) return;

    const chip = event.target.closest("[data-priority]");
    if (!chip) return;

    state.priority = chip.dataset.priority;
    render();
  }

  function handleAddDefect(event) {
    event.preventDefault();

    const error = validateTitle(ui.title.value);

    if (error) {
      ui.title.setAttribute("aria-invalid", "true");
      setMessage(error, "error");
      ui.title.focus();
      return;
    }

    ui.title.removeAttribute("aria-invalid");

    const priority = PRIORITIES[ui.priority.value] ? ui.priority.value : "medium";
    const defect = {
      id: nextDefectId(state.defects),
      title: ui.title.value.trim(),
      priority,
      status: "open"
    };

    state.defects.unshift(defect);
    ui.form.reset();
    ui.priority.value = "medium";

    const isVisible = getVisibleDefects().some((item) => item.id === defect.id);

    render();
    setMessage(
      isVisible
        ? `Дефект ${defect.id} добавлен.`
        : `Дефект ${defect.id} добавлен, но скрыт текущим фильтром.`,
      "success"
    );
    ui.title.focus();
  }

  function handleTitleInput() {
    ui.title.removeAttribute("aria-invalid");

    if (ui.message.classList.contains("dashboard__message--error")) {
      setMessage("");
    }
  }

  function handleTableClick(event) {
    if (!(event.target instanceof Element)) return;

    const closeButton = event.target.closest('[data-action="close"]');
    if (!closeButton) return;

    const defect = state.defects.find(
      (item) => item.id === closeButton.dataset.id
    );

    if (!defect || defect.status === "closed") return;

    defect.status = "closed";
    render();
    setMessage(`Дефект ${defect.id} закрыт.`, "success");
  }

  function resetDemo() {
    state.defects = INITIAL_DEFECTS.map((defect) => ({ ...defect }));
    state.query = "";
    state.priority = "all";

    ui.search.value = "";
    ui.title.value = "";
    ui.title.removeAttribute("aria-invalid");
    ui.priority.value = "medium";

    render();
    setMessage("Демо-данные восстановлены.", "success");
  }

  function resetFilters() {
    state.query = "";
    state.priority = "all";
    ui.search.value = "";

    render();
    setMessage("Фильтры сброшены.");
  }

  /* ---------- Подключение событий ---------- */

  function initEvents() {
    ui.search?.addEventListener("input", handleSearch);
    ui.filters?.addEventListener("click", handleFilterClick);
    ui.form?.addEventListener("submit", handleAddDefect);
    ui.title?.addEventListener("input", handleTitleInput);

    // Делегирование: один обработчик на всю таблицу.
    ui.tableBody?.addEventListener("click", handleTableClick);

    ui.resetDemo?.addEventListener("click", resetDemo);
    ui.resetFilters?.addEventListener("click", resetFilters);
  }

  function init() {
    if (!ui.tableBody || !ui.form) return;

    initEvents();
    render();
  }

  init();
})();
