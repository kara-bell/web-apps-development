import os
import re
import uuid
from pathlib import Path

from flask import (
    Flask,
    abort,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.exceptions import RequestEntityTooLarge

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "qualityhub-dev-secret")
app.config["UPLOAD_FOLDER"] = str(UPLOAD_DIR)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024

TOPICS = {
    "demo": "Демонстрация",
    "implementation": "Внедрение",
    "support": "Техническая поддержка",
    "other": "Другое",
}

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt"}
MAX_FILE_SIZE = 5 * 1024 * 1024
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_application(form, uploaded_file):
    data = {
        "name": form.get("name", "").strip(),
        "email": form.get("email", "").strip(),
        "company": form.get("company", "").strip(),
        "topic": form.get("topic", "").strip(),
        "message": form.get("message", "").strip(),
    }
    errors = {}

    if not 2 <= len(data["name"]) <= 80:
        errors["name"] = "Укажите имя и фамилию: от 2 до 80 символов."

    if len(data["email"]) > 120 or not EMAIL_RE.match(data["email"]):
        errors["email"] = "Укажите корректный e-mail, например anna@example.com."

    if len(data["company"]) > 120:
        errors["company"] = "Название компании не должно превышать 120 символов."

    if data["topic"] not in TOPICS:
        errors["topic"] = "Выберите тему обращения."

    if not 10 <= len(data["message"]) <= 2000:
        errors["message"] = "Опишите вопрос: от 10 до 2000 символов."

    file_info = {
        "original_name": "",
        "extension": "",
        "size": 0,
    }

    if uploaded_file is None or not uploaded_file.filename:
        errors["attachment"] = "Приложите файл: PDF, PNG, JPG, JPEG или TXT."
    else:
        file_info["original_name"] = Path(uploaded_file.filename).name
        file_info["extension"] = Path(file_info["original_name"]).suffix.lower()

        if file_info["extension"] not in ALLOWED_EXTENSIONS:
            errors["attachment"] = "Допустимы файлы PDF, PNG, JPG, JPEG или TXT."
        else:
            uploaded_file.stream.seek(0, os.SEEK_END)
            file_info["size"] = uploaded_file.stream.tell()
            uploaded_file.stream.seek(0)

            if file_info["size"] == 0:
                errors["attachment"] = "Файл пустой. Выберите другой файл."
            elif file_info["size"] > MAX_FILE_SIZE:
                errors["attachment"] = "Файл не должен превышать 5 МБ."

    return data, errors, file_info


def delete_upload(upload):
    if not upload:
        return

    stored_name = upload.get("stored_name")
    if stored_name:
        try:
            (UPLOAD_DIR / stored_name).unlink(missing_ok=True)
        except OSError:
            # Windows может удерживать файл, пока идёт скачивание.
            pass


@app.template_filter("filesize")
def format_filesize(size):
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} МБ"
    return f"{max(1, round(size / 1024))} КБ"


@app.get("/")
def index():
    draft = session.get("application", {})
    return render_template(
        "index.html",
        form=draft,
        errors={},
        topics=TOPICS,
        has_draft=bool(draft),
        applications_count=session.get("applications_count", 0),
    )


@app.post("/submit")
def submit():
    uploaded_file = request.files.get("attachment")
    data, errors, file_info = validate_application(request.form, uploaded_file)

    if errors:
        return render_template(
            "index.html",
            form=data,
            errors=errors,
            topics=TOPICS,
            has_draft=False,
            applications_count=session.get("applications_count", 0),
        )

    stored_name = f"{uuid.uuid4().hex}{file_info['extension']}"

    try:
        uploaded_file.save(UPLOAD_DIR / stored_name)
    except OSError:
        errors["attachment"] = "Не удалось сохранить файл. Попробуйте ещё раз."
        return render_template(
            "index.html",
            form=data,
            errors=errors,
            topics=TOPICS,
            has_draft=False,
            applications_count=session.get("applications_count", 0),
        )

    delete_upload(session.get("upload"))

    session["application"] = data
    session["upload"] = {
        "original_name": file_info["original_name"],
        "stored_name": stored_name,
        "size": file_info["size"],
    }
    session["applications_count"] = session.get("applications_count", 0) + 1
    return redirect(url_for("result"))


@app.get("/result")
def result():
    application = session.get("application")

    if not application:
        return redirect(url_for("index"))

    return render_template(
        "result.html",
        application=application,
        upload=session.get("upload"),
        topic_label=TOPICS.get(application.get("topic"), "—"),
        applications_count=session.get("applications_count", 0),
    )


@app.get("/uploads/<filename>")
def download_file(filename):
    upload = session.get("upload")

    if not upload or upload.get("stored_name") != filename:
        abort(404)

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename,
        as_attachment=True,
        download_name=upload.get("original_name", filename),
    )


@app.post("/reset")
def reset():
    delete_upload(session.get("upload"))
    session.clear()
    return redirect(url_for("index"))


@app.errorhandler(RequestEntityTooLarge)
def handle_large_request(error):
    return render_template(
        "index.html",
        form={},
        errors={"attachment": "Файл слишком большой. Максимальный размер — 5 МБ."},
        topics=TOPICS,
        has_draft=bool(session.get("application")),
        applications_count=session.get("applications_count", 0),
    )


if __name__ == "__main__":
    app.run(debug=True)
