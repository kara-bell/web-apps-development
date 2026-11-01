"""Сервер монитора тестовых прогонов.

Данные о прогонах хранятся в памяти. Файл data/runs.json только читается
и никогда не изменяется. WebSocket рассылает снимки данных клиентам.
"""

from __future__ import annotations

import json
import random
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, send_from_directory
from flask_sock import Sock

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RUNS_JSON = DATA_DIR / "runs.json"

TICK_INTERVAL = 5
RUN_STATUSES = {"passed", "failed", "running"}

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

    def tick(self) -> bool:
        """Имитирует изменение всех выполняющихся прогонов."""
        with self._lock:
            running = [run for run in self._runs if run["status"] == "running"]

            if not running:
                candidate = next(
                    (run for run in self._runs if run["status"] == "passed"), None
                )
                if candidate is None:
                    return False
                candidate["status"] = "running"
                candidate["duration"] = 0
                return True

            for run in running:
                run["duration"] = int(run["duration"]) + random.randint(1, 5)
                if run["duration"] >= 60:
                    run["status"] = "passed"

            return True


store = RunStore(RUNS_JSON)
store.load()

clients: list[dict] = []
clients_lock = threading.Lock()
send_lock = threading.Lock()


def snapshot_message(reason: str) -> dict:
    """Формирует сообщение с полным снимком данных."""
    return {
        "type": "snapshot",
        "reason": reason,
        "serverTime": datetime.now().isoformat(timespec="seconds"),
        "runs": store.snapshot(),
    }


def send_json(client: dict, payload: dict) -> None:
    """Отправляет JSON одному клиенту."""
    data = json.dumps(payload, ensure_ascii=False)
    with send_lock:
        client["ws"].send(data)


def remove_client(client: dict) -> None:
    """Убирает клиента из реестра."""
    with clients_lock:
        clients[:] = [item for item in clients if item is not client]


def broadcast(payload: dict) -> None:
    """Рассылает снимок клиентам с включёнными онлайн-обновлениями."""
    with clients_lock:
        targets = [client for client in clients if client["updates"]]

    for client in targets:
        try:
            send_json(client, payload)
        except Exception:
            remove_client(client)


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
    broadcast(payload)
    return jsonify(payload)


@sock.route("/ws")
def websocket(ws):
    """Двусторонний канал: запросы клиента и снимки данных."""
    client = {"ws": ws, "updates": True}
    with clients_lock:
        clients.append(client)

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
                with clients_lock:
                    client["updates"] = bool(message.get("enabled"))
            else:
                send_json(
                    client, {"type": "error", "message": "Неизвестная команда"}
                )
    except Exception:
        pass
    finally:
        remove_client(client)


_ticker_started = False
_ticker_lock = threading.Lock()


def _ticker_loop(interval: int) -> None:
    while True:
        time.sleep(interval)
        try:
            if store.tick():
                broadcast(snapshot_message("tick"))
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
