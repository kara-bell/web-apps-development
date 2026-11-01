"""Сервер монитора тестовых прогонов.

Каркас приложения.
Страница отдаётся Flask, JSON и XML — напрямую из файлов в data/.
"""

from __future__ import annotations

from pathlib import Path

from flask import Flask, render_template, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

app = Flask(__name__)


@app.get("/")
def index():
    """Главная страница."""
    return render_template("index.html")


@app.get("/data/<path:filename>")
def data_file(filename: str):
    """Отдаёт JSON- и XML-файлы из data/ без промежуточной обработки."""
    return send_from_directory(str(DATA_DIR), filename)


if __name__ == "__main__":
    # reloader отключён: позже сервер запустит фоновый поток обновлений.
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)
