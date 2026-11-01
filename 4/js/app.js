"use strict";

// ---------- Элементы формы ----------

const inputA = document.getElementById("operand-a");
const inputB = document.getElementById("operand-b");
const keys = document.querySelector(".calc__keys");
const expression = document.getElementById("expression");
const result = document.getElementById("result");
const message = document.getElementById("message");
const resetButton = document.getElementById("reset");

// ---------- Чтение и проверка ввода ----------

/**
 * Читает значение поля и преобразует его в число.
 * Возвращает объект { value, error }: value === null при ошибке.
 */
function readNumber(input, fieldName) {
  const raw = input.value.trim();

  if (raw === "") {
    return { value: null, error: `Введите число в поле ${fieldName}.` };
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return { value: null, error: `Поле ${fieldName} должно содержать число.` };
  }

  return { value, error: "" };
}

// ---------- Арифметические операции ----------

function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  return a / b;
}

function power(a, b) {
  return a ** b;
}

function squareRoot(a) {
  return Math.sqrt(a);
}

// ---------- Обработка событий ----------

const operations = {
  add,
  subtract,
  multiply,
  divide,
  power,
  sqrt: squareRoot
};

const operationSymbols = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  power: "^"
};

let lastCalculation = null;
let activeButton = null;

keys.addEventListener("click", handleKeyClick);
inputA.addEventListener("input", handleInput);
inputB.addEventListener("input", handleInput);
resetButton.addEventListener("click", resetCalculator);

function handleKeyClick(event) {
  const button = event.target.closest("button[data-op]");
  if (!button) {
    return;
  }

  setActiveOperation(button);
  lastCalculation = runOperation(button.dataset.op);
  renderCalculation(lastCalculation);
}

function runOperation(op) {
  const operation = operations[op];
  if (!operation) {
    return null;
  }

  const a = readNumber(inputA, "A");
  if (a.error) {
    return { ok: false, error: a.error };
  }

  if (op === "sqrt") {
    if (a.value < 0) {
      return { ok: false, error: "Корень из отрицательного числа не вычисляется." };
    }

    const value = operation(a.value);
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Результат слишком велик." };
    }

    return {
      ok: true,
      expression: `√${a.value}`,
      value
    };
  }

  const b = readNumber(inputB, "B");
  if (b.error) {
    return { ok: false, error: b.error };
  }

  if (op === "divide" && b.value === 0) {
    return { ok: false, error: "Деление на ноль невозможно." };
  }

  const value = operation(a.value, b.value);

  if (!Number.isFinite(value)) {
    return {
      ok: false,
      error: Number.isNaN(value)
        ? "Результат не является числом."
        : "Результат слишком велик."
    };
  }

  return {
    ok: true,
    expression: `${a.value} ${operationSymbols[op]} ${b.value}`,
    value
  };
}

function handleInput() {
  clearActiveOperation();

  if (!message.hidden) {
    resetDisplay();
  }
}

function setActiveOperation(button) {
  if (activeButton === button) {
    return;
  }

  if (activeButton) {
    activeButton.classList.remove("key--active");
  }

  activeButton = button;
  activeButton.classList.add("key--active");
}

function clearActiveOperation() {
  if (!activeButton) {
    return;
  }

  activeButton.classList.remove("key--active");
  activeButton = null;
}

function renderCalculation(calculation) {
  if (!calculation) {
    return;
  }

  if (!calculation.ok) {
    showError(calculation.error);
    return;
  }

  if (!Number.isFinite(calculation.value)) {
    showError("Результат слишком велик.");
    return;
  }

  expression.textContent = `${calculation.expression} =`;
  result.textContent = formatNumber(calculation.value);
  clearMessage();
  animateResult();
}

function animateResult() {
  result.classList.remove("is-updated");
  void result.offsetWidth;
  result.classList.add("is-updated");
}

function formatNumber(value) {
  return String(Number(value.toFixed(6)));
}

function showError(text) {
  expression.textContent = "Проверьте ввод";
  result.textContent = "—";
  result.classList.remove("is-updated");
  message.textContent = text;
  message.hidden = false;
  message.classList.remove("is-visible");
  void message.offsetWidth;
  message.classList.add("is-visible");
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
  message.classList.remove("is-visible");
}

function resetDisplay() {
  expression.textContent = "Введите числа и выберите операцию";
  result.textContent = "0";
  result.classList.remove("is-updated");
  clearMessage();
}

function resetCalculator() {
  inputA.value = "";
  inputB.value = "";
  lastCalculation = null;
  clearActiveOperation();
  resetDisplay();
  inputA.focus();
}
