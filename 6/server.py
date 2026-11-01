"""Сервер монитора тестовых прогонов.

Данные о прогонах хранятся в памяти. Файл data/runs.json только читается
и никогда не изменяется. WebSocket рассылает снимки данных, SSE — ленту
событий об изменениях.
"""

from __future__ import annotations

import json
import queue
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import (
    Flask,
    Response,
    jsonify,
    render_template,
    request,
    send_from_directory,
    stream_with_context,
)
from flask_sock import Sock

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RUNS_JSON = DATA_DIR / "runs.json"

TICK_INTERVAL = 5
RUN_STATUSES = {"passed", "failed", "running"}
SSE_KEEPALIVE_INTERVAL = 15

app = Flask(__name__)
app.json.ensure_ascii = False
sock = Sock(app)


class RunStore:
    """Список прогонов в памяти сервера."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()
        self._runs: list[dict] = []

    def load(self) -> None:
        """Читает прогоны из JSON-файла и заменяет данные в памяти."""
        with self.path.open(encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, list):
            raise ValueError("JSON-файл должен содержать массив прогонов")

        required = {"id", "suite", "status", "duration", "author", "startedAt"}
        for run in data:
            if not isinstance(run, dict) or not required.issubset(run):
                raise ValueError("Запись прогона имеет неверный формат")
            if run["status"] not in RUN_STATUSES:
                raise ValueError(f"Неизвестный статус: {run['status']}")

        with self._lock:
            self._runs = data

    def snapshot(self) -> list[dict]:
        """Возвращает копию списка прогонов."""
        with self._lock:
            return [dict(run) for run in self._runs]

    def add(self, suite: str, author: str, duration: int, status: str) -> dict:
        """Добавляет прогон в память и возвращает созданную запись."""
        with self._lock:
            next_id = max((run["id"] for run in self._runs), default=0) + 1
            run = {
                "id": next_id,
                "suite": suite,
                "status": status,
                "duration": duration,
                "author": author,
                "startedAt": datetime.now().isoformat(timespec="seconds"),
            }
            self._runs.append(run)
            return dict(run)

    def tick(self) -> list[dict]:
        """Обновляет все выполняющиеся прогоны и возвращает изменённые записи."""
        with self._lock:
            running = [run for run in self._runs if run["status"] == "running"]

            if not running:
                candidate = next(
                    (run for run in self._runs if run["status"] == "passed"), None
                )
                if candidate is None:
                    return []
                candidate["status"] = "running"
                candidate["duration"] = 0
                return [dict(candidate)]

            changed: list[dict] = []
            for run in running:
                run["duration"] = int(run["duration"]) + TICK_INTERVAL
                if run["duration"] >= 60:
                    run["status"] = "passed"
                changed.append(dict(run))

            return changed


store = RunStore(RUNS_JSON)
store.load()

ws_clients: list[dict] = []
ws_clients_lock = threading.Lock()
ws_send_lock = threading.Lock()

sse_clients: list[dict] = []
sse_clients_lock = threading.Lock()


def snapshot_message(reason: str) -> dict:
    """Формирует сообщение с полным снимком данных."""
    return {
        "type": "snapshot",
        "reason": reason,
        "serverTime": datetime.now().isoformat(timespec="seconds"),
        "runs": store.snapshot(),
    }


def send_json(client: dict, payload: dict) -> None:
    """Отправляет JSON одному WebSocket-клиенту."""
    data = json.dumps(payload, ensure_ascii=False)
    with ws_send_lock:
        client["ws"].send(data)


def remove_ws_client(client: dict) -> None:
    """Убирает WebSocket-клиента из реестра."""
    with ws_clients_lock:
        ws_clients[:] = [item for item in ws_clients if item is not client]


def broadcast_ws(payload: dict) -> None:
    """Рассылает снимок WebSocket-клиентам с включёнными обновлениями."""
    with ws_clients_lock:
        targets = [client for client in ws_clients if client["updates"]]

    for client in targets:
        try:
            send_json(client, payload)
        except Exception:
            remove_ws_client(client)


def sse_event(event: str, payload: dict) -> str:
    """Форматирует одно SSE-событие."""
    data = json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {data}\n\n"


def remove_sse_client(client: dict) -> None:
    """Убирает SSE-клиента из реестра."""
    with sse_clients_lock:
        sse_clients[:] = [item for item in sse_clients if item is not client]


def broadcast_sse(event: str, payload: dict) -> None:
    """Рассылает событие всем подключённым SSE-клиентам."""
    with sse_clients_lock:
        targets = list(sse_clients)

    for client in targets:
        try:
            client["queue"].put_nowait({"event": event, "payload": payload})
        except queue.Full:
            pass


def event_stream(client: dict):
    """Генератор потока SSE для одного клиента."""
    try:
        yield "retry: 3000\n\n"
        yield sse_event(
            "hello",
            {
                "serverTime": datetime.now().isoformat(timespec="seconds"),
                "message": "SSE подключён",
            },
        )

        while True:
            try:
                item = client["queue"].get(timeout=SSE_KEEPALIVE_INTERVAL)
            except queue.Empty:
                yield ": ping\n\n"
                continue

            yield sse_event(item["event"], item["payload"])
    finally:
        remove_sse_client(client)


@app.get("/")
def index():
    """Главная страница."""
    return render_template("index.html")


@app.get("/data/<path:filename>")
def data_file(filename: str):
    """Отдаёт JSON- и XML-файлы из data/ без изменения."""
    return send_from_directory(str(DATA_DIR), filename)


@app.post("/api/runs/reload")
def reload_runs():
    """Перечитывает runs.json в память и рассылает новый снимок."""
    try:
        store.load()
    except Exception:
        app.logger.exception("Не удалось перечитать data/runs.json")
        return jsonify({"error": "Не удалось прочитать data/runs.json"}), 500

    payload = snapshot_message("reload")
    broadcast_ws(payload)
    broadcast_sse(
        "info",
        {
            "time": datetime.now().isoformat(timespec="seconds"),
            "message": "Данные перечитаны из файла",
        },
    )
    return jsonify(payload)


@app.get("/api/events")
def sse_stream():
    """Односторонний поток событий Server Sent Events."""
    client = {"queue": queue.Queue(maxsize=100)}
    with sse_clients_lock:
        sse_clients.append(client)

    response = Response(
        stream_with_context(event_stream(client)), mimetype="text/event-stream"
    )
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


def validate_run(payload) -> str | None:
    """Проверяет данные формы. Возвращает текст ошибки или None."""
    if not isinstance(payload, dict):
        return "Ожидается JSON-объект"

    suite = payload.get("suite")
    author = payload.get("author")
    duration = payload.get("duration")
    status = payload.get("status")

    if not isinstance(suite, str) or not suite.strip():
        return "Введите название набора тестов"
    if len(suite.strip()) > 80:
        return "Название набора слишком длинное"
    if not isinstance(author, str) or not author.strip():
        return "Введите автора"
    if len(author.strip()) > 40:
        return "Имя автора слишком длинное"
    if (
        not isinstance(duration, int)
        or isinstance(duration, bool)
        or duration < 0
    ):
        return "Длительность должна быть целым неотрицательным числом"
    if status not in RUN_STATUSES:
        return "Неизвестный статус"

    return None


@app.post("/api/runs")
def create_run():
    """Добавляет прогон в память и рассылает обновление по WS и SSE."""
    payload = request.get_json(silent=True)
    error = validate_run(payload)

    if error:
        return jsonify({"error": error}), 400

    suite = payload["suite"].strip()
    author = payload["author"].strip()
    run = store.add(suite, author, payload["duration"], payload["status"])

    snapshot = snapshot_message("run_added")
    broadcast_ws(snapshot)
    broadcast_sse(
        "run",
        {
            "time": run["startedAt"],
            "id": run["id"],
            "suite": run["suite"],
            "status": run["status"],
            "duration": run["duration"],
        },
    )

    snapshot["created"] = run
    return jsonify(snapshot), 201


@sock.route("/ws")
def websocket(ws):
    """Двусторонний канал: запросы клиента и снимки данных."""
    client = {"ws": ws, "updates": True}
    with ws_clients_lock:
        ws_clients.append(client)

    try:
        while True:
            raw = ws.receive()
            if raw is None:
                break

            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                send_json(client, {"type": "error", "message": "Некорректный JSON"})
                continue

            if not isinstance(message, dict):
                send_json(client, {"type": "error", "message": "Ожидается объект"})
                continue

            message_type = message.get("type")

            if message_type == "refresh":
                send_json(client, snapshot_message("refresh"))
            elif message_type == "updates":
                with ws_clients_lock:
                    client["updates"] = bool(message.get("enabled"))
            else:
                send_json(
                    client, {"type": "error", "message": "Неизвестная команда"}
                )
    except Exception:
        pass
    finally:
        remove_ws_client(client)


_ticker_started = False
_ticker_lock = threading.Lock()


def _ticker_loop(interval: int) -> None:
    while True:
        time.sleep(interval)
        try:
            changed = store.tick()
            if not changed:
                continue

            broadcast_ws(snapshot_message("tick"))

            event_time = datetime.now().isoformat(timespec="seconds")
            for run in changed:
                broadcast_sse(
                    "run",
                    {
                        "time": event_time,
                        "id": run["id"],
                        "suite": run["suite"],
                        "status": run["status"],
                        "duration": run["duration"],
                    },
                )
        except Exception:
            app.logger.exception("Ошибка фонового обновления прогонов")


def start_ticker(interval: int = TICK_INTERVAL) -> None:
    """Запускает фоновый поток обновлений один раз."""
    global _ticker_started
    with _ticker_lock:
        if _ticker_started:
            return
        _ticker_started = True
    threading.Thread(
        target=_ticker_loop, args=(interval,), daemon=True
    ).start()


if __name__ == "__main__":
    start_ticker()
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False, threaded=True)
