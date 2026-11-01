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

const sseStatus = document.querySelector("#sse-status");
const sseStatusText = document.querySelector("#sse-status-text");
const eventsList = document.querySelector("#events-list");

const loadXmlButton = document.querySelector("#load-xml");
const xmlMessage = document.querySelector("#xml-message");
const xmlContainer = document.querySelector("#xml-container");
const xmlBody = document.querySelector("#xml-body");

const JSON_URL = "/data/runs.json";
const RELOAD_URL = "/api/runs/reload";
const XML_URL = "/data/test-cases.xml";
const WS_URL = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
const SSE_URL = "/api/events";

const STATUS_LABELS = {
  passed: "Пройден",
  failed: "Провален",
  running: "Выполняется",
};

const PRIORITY_LABELS = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

// ============================================================
// Общий рендер таблицы
// ============================================================

function setMessageOn(element, text, state = "info") {
  element.textContent = text;
  element.classList.toggle("message--error", state === "error");
  element.classList.toggle("message--success", state === "success");
}

function setMessage(text, state = "info") {
  setMessageOn(message, text, state);
}

function setXmlMessage(text, state = "info") {
  setMessageOn(xmlMessage, text, state);
}

function appendFileLink(target, url, label) {
  const fileLink = document.createElement("a");
  fileLink.className = "message__link";
  fileLink.href = url;
  fileLink.target = "_blank";
  fileLink.rel = "noopener noreferrer";
  fileLink.textContent = label;
  target.append(fileLink);
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
  appendFileLink(message, JSON_URL, "data/runs.json");
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

// ============================================================
// Пункт 4. Server Sent Events: лента событий
// ============================================================

let sseSource = null;
let sseReconnectTimer = null;
let firstSseConnection = true;

function setSseState(state, text) {
  sseStatus.dataset.state = state;
  sseStatusText.textContent = text;
}

function appendEvent({ time, text, status }) {
  const empty = eventsList.querySelector(".events__empty");
  if (empty) {
    empty.remove();
  }

  const item = document.createElement("li");
  item.className = "event";

  const timeEl = document.createElement("span");
  timeEl.className = "event__time";
  timeEl.textContent = time;
  item.append(timeEl);

  const textEl = document.createElement("span");
  textEl.className = "event__text";
  textEl.textContent = text;
  item.append(textEl);

  if (status) {
    const badge = document.createElement("span");
    badge.className = `badge badge--${status}`;
    badge.textContent = STATUS_LABELS[status] || status;
    item.append(badge);
  }

  eventsList.prepend(item);

  while (eventsList.children.length > 30) {
    eventsList.lastElementChild.remove();
  }
}

function handleSseMessage(event) {
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }

  if (event.type === "run") {
    appendEvent({
      time: formatTime(payload.time),
      text: `${payload.suite} — ${payload.duration} с`,
      status: payload.status,
    });
  } else if (event.type === "info") {
    appendEvent({
      time: formatTime(payload.time),
      text: payload.message,
    });
  } else if (event.type === "hello") {
    setSseState("on", "SSE: подключено");
  }
}

function scheduleSseReconnect() {
  if (sseReconnectTimer !== null) {
    return;
  }

  sseReconnectTimer = window.setTimeout(() => {
    sseReconnectTimer = null;
    connectSse();
  }, 3000);
}

function connectSse() {
  if (sseSource) {
    return;
  }

  setSseState(
    "wait",
    firstSseConnection ? "SSE: подключение…" : "SSE: переподключение…",
  );
  firstSseConnection = false;

  let source;
  try {
    source = new EventSource(SSE_URL);
  } catch (error) {
    console.error("Не удалось создать EventSource:", error);
    setSseState("off", "SSE: недоступен");
    scheduleSseReconnect();
    return;
  }

  sseSource = source;

  source.addEventListener("open", () => {
    setSseState("on", "SSE: подключено");
  });

  source.addEventListener("error", () => {
    setSseState("wait", "SSE: переподключение…");
    source.close();
    if (sseSource === source) {
      sseSource = null;
    }
    scheduleSseReconnect();
  });

  source.addEventListener("hello", handleSseMessage);
  source.addEventListener("run", handleSseMessage);
  source.addEventListener("info", handleSseMessage);
}

// ============================================================
// Пункт 5. AJAX-загрузка XML и вывод тест-кейсов
// ============================================================

function readCaseText(caseElement, tag) {
  const node = caseElement.querySelector(tag);
  return node ? node.textContent.trim() : "—";
}

function parseTestCase(caseElement) {
  return {
    id: caseElement.getAttribute("id") || "—",
    priority: caseElement.getAttribute("priority") || "unknown",
    automated: caseElement.getAttribute("automated") === "true",
    title: readCaseText(caseElement, "title"),
    suite: readCaseText(caseElement, "suite"),
    owner: readCaseText(caseElement, "owner"),
    steps: readCaseText(caseElement, "steps"),
  };
}

function createPriorityCell(priority) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge badge--${priority}`;
  badge.textContent = PRIORITY_LABELS[priority] || priority;
  cell.append(badge);
  return cell;
}

function createAutomatedCell(automated) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = automated ? "badge badge--auto" : "badge badge--muted";
  badge.textContent = automated ? "Да" : "Нет";
  cell.append(badge);
  return cell;
}

function renderTestCases(cases) {
  xmlBody.replaceChildren();

  for (const testCase of cases) {
    const row = document.createElement("tr");
    row.append(
      createCell(testCase.id),
      createCell(testCase.title),
      createCell(testCase.suite),
      createPriorityCell(testCase.priority),
      createAutomatedCell(testCase.automated),
      createCell(testCase.owner),
      createCell(testCase.steps),
    );
    xmlBody.append(row);
  }

  xmlContainer.hidden = cases.length === 0;
}

async function loadXml() {
  loadXmlButton.disabled = true;
  loadXmlButton.setAttribute("aria-busy", "true");
  setXmlMessage("Загрузка XML…");

  try {
    const response = await fetch(XML_URL, {
      headers: { Accept: "application/xml" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const documentXml = new DOMParser().parseFromString(text, "application/xml");

    if (documentXml.querySelector("parsererror")) {
      throw new Error("Ошибка разбора XML");
    }

    const cases = Array.from(documentXml.querySelectorAll("case")).map(parseTestCase);

    if (cases.length === 0) {
      xmlContainer.hidden = true;
      setXmlMessage("В XML-файле нет тест-кейсов.");
      return;
    }

    renderTestCases(cases);
    setXmlMessage(`Загружено тест-кейсов: ${cases.length}. Файл: `, "success");
    appendFileLink(xmlMessage, XML_URL, "data/test-cases.xml");
  } catch (error) {
    console.error("Ошибка загрузки XML:", error);
    xmlContainer.hidden = true;
    setXmlMessage(
      "Не удалось загрузить XML. Проверьте файл и соединение с сервером.",
      "error",
    );
  } finally {
    loadXmlButton.disabled = false;
    loadXmlButton.removeAttribute("aria-busy");
  }
}

loadXmlButton.addEventListener("click", loadXml);

loadButton.addEventListener("click", loadRuns);

connectWebSocket();
connectSse();
