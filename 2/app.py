from flask import Flask, render_template

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/submit")
def submit():
    return "Форма получена. Обработка данных будет добавлена на этапе 5.", 200


if __name__ == "__main__":
    app.run(debug=True)
