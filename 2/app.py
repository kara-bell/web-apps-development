import re

from flask import Flask, render_template, request

app = Flask(__name__)

TOPICS = {
    "demo": "Демонстрация возможностей",
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
    return render_template("index.html", form={}, errors={}, topics=TOPICS)


@app.post("/submit")
def submit():
    data, errors = validate_application(request.form)

    if errors:
        return render_template("index.html", form=data, errors=errors, topics=TOPICS)

    return render_template(
        "result.html",
        application=data,
        topic_label=TOPICS[data["topic"]],
    )


if __name__ == "__main__":
    app.run(debug=True)
