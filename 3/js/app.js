/* QualityHub — панель дефектов.
   Этап 4: определение событий и подключение обработчиков.
   Действия обработчиков реализуются на этапе 5. */

(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const ui = {
    search: document.querySelector("#defect-search"),
    filters: document.querySelector(".filters"),
    form: document.querySelector("#defect-form"),
    tableBody: document.querySelector("#defects-body"),
    resetDemo: document.querySelector("#reset-demo"),
    resetFilters: document.querySelector("#reset-filters")
  };

  /* ---------- Обработчики ---------- */

  function handleSearch() {
    // Этап 5: фильтрация по введённому тексту.
  }

  function handleFilterClick(event) {
    const chip = event.target.closest("[data-priority]");
    if (!chip) return;

    // Этап 5: переключение активного фильтра и перерисовка таблицы.
  }

  function handleAddDefect(event) {
    event.preventDefault();

    // Этап 5: проверка названия и добавление дефекта.
  }

  function handleTableClick(event) {
    const closeButton = event.target.closest('[data-action="close"]');
    if (!closeButton) return;

    // Этап 5: закрытие дефекта по data-id.
  }

  function resetDemo() {
    // Этап 5: возврат исходного демонстрационного набора.
  }

  function resetFilters() {
    // Этап 5: сброс поиска и фильтра.
  }

  /* ---------- Подключение событий ---------- */

  function initEvents() {
    ui.search?.addEventListener("input", handleSearch);
    ui.filters?.addEventListener("click", handleFilterClick);
    ui.form?.addEventListener("submit", handleAddDefect);

    // Делегирование: один обработчик на всю таблицу.
    ui.tableBody?.addEventListener("click", handleTableClick);

    ui.resetDemo?.addEventListener("click", resetDemo);
    ui.resetFilters?.addEventListener("click", resetFilters);
  }

  initEvents();
})();
