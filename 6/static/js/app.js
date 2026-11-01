"use strict";

// ============================================================
// Пункт 2. AJAX-загрузка JSON и вывод таблицы прогонов
// ============================================================

const loadButton = document.querySelector("#load-json");
const message = document.querySelector("#json-message");
const runsContainer = document.querySelector("#runs-container");
const runsBody = document.querySelector("#runs-body");

const JSON_URL = "/data/runs.json";

const STATUS_LABELS = {
  passed: "Пройден",
  failed: "Провален",
  running: "Выполняется",
};

function setMessage(text, state = "info") {
  message.textContent = text;
  message.classList.toggle("message--error", state === "error");
  message.classList.toggle("message--success", state === "success");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function createStatusCell(status) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge badge--${status}`;
  badge.textContent = STATUS_LABELS[status] || status;
  cell.append(badge);
  return cell;
}

function renderRuns(runs) {
  runsBody.replaceChildren();

  for (const run of runs) {
    const row = document.createElement("tr");
    row.append(
      createCell(run.suite || "—"),
      createStatusCell(run.status),
      createCell(`${run.duration} с`),
      createCell(run.author || "—"),
      createCell(formatDate(run.startedAt)),
    );
    runsBody.append(row);
  }
}

async function loadRuns() {
  loadButton.disabled = true;
  loadButton.setAttribute("aria-busy", "true");
  setMessage("Загрузка данных…");

  try {
    const response = await fetch(JSON_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const runs = await response.json();

    if (!Array.isArray(runs)) {
      throw new Error("JSON-файл должен содержать массив");
    }

    if (runs.length === 0) {
      runsContainer.hidden = true;
      setMessage("В JSON-файле нет прогонов.");
      return;
    }

    renderRuns(runs);
    runsContainer.hidden = false;
    setMessage(`Загружено прогонов: ${runs.length}. Файл: `, "success");

    const fileLink = document.createElement("a");
    fileLink.className = "message__link";
    fileLink.href = JSON_URL;
    fileLink.target = "_blank";
    fileLink.rel = "noopener noreferrer";
    fileLink.textContent = "data/runs.json";
    message.append(fileLink);
  } catch (error) {
    console.error("Ошибка загрузки JSON:", error);
    runsContainer.hidden = true;
    setMessage("Не удалось загрузить данные. Проверьте соединение с сервером.", "error");
  } finally {
    loadButton.disabled = false;
    loadButton.removeAttribute("aria-busy");
  }
}

loadButton.addEventListener("click", loadRuns);
