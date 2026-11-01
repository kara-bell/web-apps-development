"use strict";

// ============================================================
// Общие элементы страницы
// ============================================================

const loadButton = document.querySelector("#load-json");
const message = document.querySelector("#json-message");
const runsContainer = document.querySelector("#runs-container");
const runsBody = document.querySelector("#runs-body");

const wsStatus = document.querySelector("#ws-status");
const wsStatusText = document.querySelector("#ws-status-text");
const wsUpdates = document.querySelector("#ws-updates");
const wsUpdated = document.querySelector("#ws-updated");
const wsRefresh = document.querySelector("#ws-refresh");

const JSON_URL = "/data/runs.json";
const RELOAD_URL = "/api/runs/reload";
const WS_URL = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;

const STATUS_LABELS = {
  passed: "Пройден",
  failed: "Провален",
  running: "Выполняется",
};

// ============================================================
// Общий рендер таблицы
// ============================================================

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

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString("ru-RU", { hour12: false });
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

  runsContainer.hidden = runs.length === 0;
}

// ============================================================
// Пункт 2. Загрузка JSON и синхронизация памяти сервера
// ============================================================

function showJsonLink() {
  const fileLink = document.createElement("a");
  fileLink.className = "message__link";
  fileLink.href = JSON_URL;
  fileLink.target = "_blank";
  fileLink.rel = "noopener noreferrer";
  fileLink.textContent = "data/runs.json";
  message.append(fileLink);
}

async function loadRuns() {
  loadButton.disabled = true;
  loadButton.setAttribute("aria-busy", "true");
  setMessage("Загрузка данных…");

  try {
    const response = await fetch(RELOAD_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body.error) {
          detail = body.error;
        }
      } catch {
        // Ответ не JSON — оставляем код ошибки.
      }
      throw new Error(detail);
    }

    const payload = await response.json();
    const runs = payload.runs;

    if (!Array.isArray(runs)) {
      throw new Error("Сервер вернул неверный формат данных");
    }

    renderRuns(runs);
    setMessage(
      `Загружено прогонов: ${runs.length}. Данные сервера синхронизированы с файлом. Файл: `,
      "success",
    );
    showJsonLink();
  } catch (error) {
    console.error("Ошибка загрузки JSON:", error);
    runsContainer.hidden = true;
    setMessage(
      "Не удалось загрузить данные. Проверьте соединение с сервером.",
      "error",
    );
  } finally {
    loadButton.disabled = false;
    loadButton.removeAttribute("aria-busy");
  }
}

// ============================================================
// Пункт 3. WebSocket: снимки данных и управление обновлениями
// ============================================================

let socket = null;
let reconnectTimer = null;
let firstConnection = true;

function setWsState(state, text) {
  wsStatus.dataset.state = state;
  wsStatusText.textContent = text;
  wsRefresh.disabled = state !== "on";
}

function sendWs(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

function applySnapshot(payload) {
  if (!Array.isArray(payload.runs)) {
    return;
  }

  if (payload.reason === "tick" && !wsUpdates.checked) {
    return;
  }

  renderRuns(payload.runs);

  if (payload.serverTime) {
    wsUpdated.textContent = `Обновлено: ${formatTime(payload.serverTime)}`;
  }
}

function scheduleReconnect() {
  if (reconnectTimer !== null) {
    return;
  }

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, 3000);
}

function connectWebSocket() {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  if (firstConnection) {
    setWsState("wait", "WS: подключение…");
    firstConnection = false;
  }

  try {
    socket = new WebSocket(WS_URL);
  } catch (error) {
    console.error("Не удалось создать WebSocket:", error);
    setWsState("off", "WS: недоступен");
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    setWsState("on", "WS: подключено");
    sendWs({ type: "updates", enabled: wsUpdates.checked });
    sendWs({ type: "refresh" });
  });

  socket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (payload.type === "snapshot") {
      applySnapshot(payload);
    } else if (payload.type === "error") {
      console.warn("WebSocket:", payload.message);
    }
  });

  socket.addEventListener("error", () => {
    setWsState("wait", "WS: переподключение…");
  });

  socket.addEventListener("close", () => {
    socket = null;
    setWsState("wait", "WS: переподключение…");
    scheduleReconnect();
  });
}

wsRefresh.addEventListener("click", () => {
  sendWs({ type: "refresh" });
});

wsUpdates.addEventListener("change", () => {
  sendWs({ type: "updates", enabled: wsUpdates.checked });
  if (wsUpdates.checked) {
    sendWs({ type: "refresh" });
  }
});

loadButton.addEventListener("click", loadRuns);

connectWebSocket();
