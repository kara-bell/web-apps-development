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

// ---------- Обработка событий ----------

const operations = {
  add,
  subtract,
  multiply,
  divide
};

const operationSymbols = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷"
};

let lastCalculation = null;

keys.addEventListener("click", handleKeyClick);
inputA.addEventListener("input", handleInput);
inputB.addEventListener("input", handleInput);
resetButton.addEventListener("click", resetCalculator);

function handleKeyClick(event) {
  const button = event.target.closest("button[data-op]");
  if (!button) {
    return;
  }

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

  const b = readNumber(inputB, "B");
  if (b.error) {
    return { ok: false, error: b.error };
  }

  if (op === "divide" && b.value === 0) {
    return { ok: false, error: "Деление на ноль невозможно." };
  }

  return {
    ok: true,
    expression: `${a.value} ${operationSymbols[op]} ${b.value}`,
    value: operation(a.value, b.value)
  };
}

function handleInput() {
  if (!message.hidden) {
    resetDisplay();
  }
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
}

function formatNumber(value) {
  return String(Number(value.toFixed(6)));
}

function showError(text) {
  expression.textContent = "Проверьте ввод";
  result.textContent = "—";
  message.textContent = text;
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
}

function resetDisplay() {
  expression.textContent = "Введите числа и выберите операцию";
  result.textContent = "0";
  clearMessage();
}

function resetCalculator() {
  inputA.value = "";
  inputB.value = "";
  lastCalculation = null;
  resetDisplay();
  inputA.focus();
}
