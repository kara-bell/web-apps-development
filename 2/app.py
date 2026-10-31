import os
import re

from flask import Flask, redirect, render_template, request, session, url_for

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "qualityhub-dev-secret")

TOPICS = {
    "demo": "Демонстрация",
    "implementation": "Внедрение",
    "support": "Техническая поддержка",
    "other": "Другое",
}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_application(form):
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

    return data, errors


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
    data, errors = validate_application(request.form)

    if errors:
        return render_template(
            "index.html",
            form=data,
            errors=errors,
            topics=TOPICS,
            has_draft=False,
            applications_count=session.get("applications_count", 0),
        )

    session["application"] = data
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
        topic_label=TOPICS.get(application.get("topic"), "—"),
        applications_count=session.get("applications_count", 0),
    )


@app.post("/reset")
def reset():
    session.clear()
    return redirect(url_for("index"))


if __name__ == "__main__":
    app.run(debug=True)
