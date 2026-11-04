import {
  ApiError,
  createTestCase,
  deleteTestCase,
  getStats,
  getTestCases,
  updateTestCase,
} from './api.js';

const STATUS_LABELS = {
  draft: 'Черновик',
  in_progress: 'В работе',
  ready: 'Готов',
};

const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const NEXT_STATUS = {
  draft: 'in_progress',
  in_progress: 'ready',
  ready: 'draft',
};

const NEXT_ACTION_LABEL = {
  draft: 'В работу',
  in_progress: 'Готов',
  ready: 'В черновик',
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const refs = {
  message: document.getElementById('message'),
  statTotal: document.getElementById('stat-total'),
  statDraft: document.getElementById('stat-draft'),
  statProgress: document.getElementById('stat-progress'),
  statReady: document.getElementById('stat-ready'),
  statHigh: document.getElementById('stat-high'),
  summaryBadges: document.querySelector('.summary-badges'),
  search: document.getElementById('search'),
  priorityFilter: document.getElementById('priority-filter'),
  statusFilter: document.getElementById('status-filter'),
  casesBody: document.getElementById('cases-body'),
  openCreate: document.getElementById('open-create'),
  createDialog: document.getElementById('create-dialog'),
  createTitle: document.getElementById('create-title'),
  closeCreate: document.getElementById('close-create'),
  cancelCreate: document.getElementById('cancel-create'),
  createForm: document.getElementById('create-form'),
  createMessage: document.getElementById('create-message'),
  createButton: document.getElementById('create-button'),
  deleteDialog: document.getElementById('delete-dialog'),
  deleteName: document.getElementById('delete-name'),
  deleteMessage: document.getElementById('delete-message'),
  closeDelete: document.getElementById('close-delete'),
  cancelDelete: document.getElementById('cancel-delete'),
  confirmDelete: document.getElementById('confirm-delete'),
};

const state = {
  filters: {
    search: '',
    priority: '',
    status: '',
  },
  items: [],
  editingId: null,
  deletingId: null,
};

let messageTimer;
let searchTimer;

function setMessage(text, type = 'success') {
  clearTimeout(messageTimer);
  refs.message.textContent = text;
  refs.message.className = `message is-${type}`;
  refs.message.hidden = false;

  messageTimer = setTimeout(() => {
    refs.message.hidden = true;
  }, 6000);
}

function formatErrorText(error) {
  const details =
    error instanceof ApiError && error.errors
      ? Object.values(error.errors).join(' ')
      : '';

  return (
    [error.message, details].filter(Boolean).join(' ') ||
    'Не удалось выполнить действие.'
  );
}

function showError(error) {
  setMessage(formatErrorText(error), 'error');
}

function setCreateMessage(text, type = 'error') {
  refs.createMessage.textContent = text;
  refs.createMessage.className = `message is-${type}`;
  refs.createMessage.hidden = false;
}

function clearCreateMessage() {
  refs.createMessage.textContent = '';
  refs.createMessage.hidden = true;
}

function setDeleteMessage(text, type = 'error') {
  refs.deleteMessage.textContent = text;
  refs.deleteMessage.className = `message is-${type}`;
  refs.deleteMessage.hidden = false;
}

function clearDeleteMessage() {
  refs.deleteMessage.textContent = '';
  refs.deleteMessage.hidden = true;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function countSteps(steps) {
  return String(steps || '')
    .split('\n')
    .filter((line) => line.trim())
    .length;
}

function createEmptyRow(text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');

  cell.className = 'empty';
  cell.colSpan = 6;
  cell.textContent = text;
  row.append(cell);

  return row;
}

function createRow(item) {
  const row = document.createElement('tr');

  const titleCell = document.createElement('td');
  const title = document.createElement('button');
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const steps = document.createElement('p');

  title.type = 'button';
  title.className = 'case-title case-title--button';
  title.dataset.action = 'edit';
  title.dataset.id = item.id;
  title.textContent = item.title;
  title.setAttribute(
    'aria-label',
    `Редактировать тест-кейс: ${item.title}`,
  );
  details.className = 'case-steps';
  summary.textContent = `Шаги (${countSteps(item.steps)})`;
  steps.textContent = item.steps;
  details.append(summary, steps);
  titleCell.append(title, details);

  const moduleCell = document.createElement('td');
  moduleCell.textContent = item.module || '—';

  const priorityCell = document.createElement('td');
  const priority = document.createElement('span');
  priority.className = `badge priority-${item.priority}`;
  priority.textContent = PRIORITY_LABELS[item.priority] || item.priority || '—';
  priorityCell.append(priority);

  const statusCell = document.createElement('td');
  const status = document.createElement('span');
  status.className = `badge status-${item.status}`;
  status.textContent = STATUS_LABELS[item.status] || item.status || '—';
  statusCell.append(status);

  const dateCell = document.createElement('td');
  const time = document.createElement('time');
  time.dateTime = item.updatedAt || '';
  time.textContent = formatDate(item.updatedAt);
  dateCell.append(time);

  const actionsCell = document.createElement('td');
  actionsCell.className = 'actions-cell';

  const statusButton = document.createElement('button');
  statusButton.type = 'button';
  statusButton.className = 'button button--small';
  statusButton.dataset.action = 'status';
  statusButton.dataset.id = item.id;
  statusButton.textContent = NEXT_ACTION_LABEL[item.status] || 'Изменить статус';
  statusButton.setAttribute(
    'aria-label',
    `${statusButton.textContent}: ${item.title}`,
  );

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'button button--small button--danger';
  deleteButton.dataset.action = 'delete';
  deleteButton.dataset.id = item.id;
  deleteButton.textContent = 'Удалить';
  deleteButton.setAttribute('aria-label', `Удалить тест-кейс: ${item.title}`);

  actionsCell.append(statusButton, deleteButton);

  row.append(
    titleCell,
    moduleCell,
    priorityCell,
    statusCell,
    dateCell,
    actionsCell,
  );

  return row;
}

function renderList(items, emptyText = 'Тест-кейсов пока нет. Добавьте первый сценарий.') {
  refs.casesBody.replaceChildren();

  if (!items.length) {
    refs.casesBody.append(createEmptyRow(emptyText));
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of items) {
    fragment.append(createRow(item));
  }

  refs.casesBody.append(fragment);
}

function renderStats(stats) {
  refs.statTotal.textContent = String(stats.total ?? 0);
  refs.statDraft.textContent = String(stats.draft ?? 0);
  refs.statProgress.textContent = String(stats.in_progress ?? 0);
  refs.statReady.textContent = String(stats.ready ?? 0);
  refs.statHigh.textContent = String(stats.high ?? 0);
}

function updateSummaryActive() {
  const buttons = refs.summaryBadges.querySelectorAll(
    'button[data-filter-type]',
  );

  for (const button of buttons) {
    const type = button.dataset.filterType;
    const value = button.dataset.filterValue;
    const isActive =
      (type === 'all' && !state.filters.status && !state.filters.priority) ||
      (type === 'status' && state.filters.status === value) ||
      (type === 'priority' && state.filters.priority === value);

    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

function applySummaryFilter(type, value) {
  state.filters = { search: '', priority: '', status: '' };
  refs.search.value = '';
  refs.priorityFilter.value = '';
  refs.statusFilter.value = '';

  if (type === 'status') {
    state.filters.status = value;
    refs.statusFilter.value = value;
  } else if (type === 'priority') {
    state.filters.priority = value;
    refs.priorityFilter.value = value;
  }

  updateSummaryActive();
  loadData();
}

async function loadData() {
  updateSummaryActive();
  refs.casesBody.setAttribute('aria-busy', 'true');

  try {
    const [items, stats] = await Promise.all([
      getTestCases(state.filters),
      getStats(),
    ]);

    const hasFilters = Boolean(
      state.filters.search || state.filters.priority || state.filters.status,
    );

    state.items = items;
    renderList(
      items,
      hasFilters
        ? 'По заданным условиям ничего не найдено.'
        : 'Тест-кейсов пока нет. Добавьте первый сценарий.',
    );
    renderStats(stats);

    return true;
  } catch (error) {
    state.items = [];
    renderList([], 'Не удалось загрузить тест-кейсы. Проверьте сервер.');
    renderStats({ total: 0, draft: 0, in_progress: 0, ready: 0, high: 0 });
    showError(error);
    return false;
  } finally {
    refs.casesBody.removeAttribute('aria-busy');
  }
}

async function changeStatus(button) {
  const item = state.items.find((entry) => entry.id === button.dataset.id);

  if (!item) return;

  const nextStatus = NEXT_STATUS[item.status] || 'draft';
  button.disabled = true;

  try {
    await updateTestCase(item.id, { status: nextStatus });
    const loaded = await loadData();

    if (loaded) {
      setMessage(
        `Статус изменён на «${STATUS_LABELS[nextStatus]}».`,
        'success',
      );
    }
  } catch (error) {
    button.disabled = false;
    showError(error);
  }
}

function openDeleteModal(button) {
  const item = state.items.find((entry) => entry.id === button.dataset.id);

  if (!item) return;

  state.deletingId = item.id;
  refs.deleteName.textContent = item.title;
  clearDeleteMessage();
  refs.deleteDialog.showModal();
  refs.cancelDelete.focus();
}

async function confirmDelete() {
  const id = state.deletingId;

  if (!id) return;

  const buttonText = refs.confirmDelete.textContent;
  refs.confirmDelete.disabled = true;
  refs.confirmDelete.textContent = 'Удаление…';

  try {
    await deleteTestCase(id);
    refs.deleteDialog.close();
    const loaded = await loadData();

    if (loaded) {
      setMessage('Тест-кейс удалён.', 'success');
    }
  } catch (error) {
    setDeleteMessage(formatErrorText(error));
  } finally {
    refs.confirmDelete.disabled = false;
    refs.confirmDelete.textContent = buttonText;
  }
}

refs.casesBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');

  if (!button) return;

  if (button.dataset.action === 'status') {
    changeStatus(button);
  }

  if (button.dataset.action === 'delete') {
    openDeleteModal(button);
  }

  if (button.dataset.action === 'edit') {
    openEditModal(button.dataset.id);
  }
});

refs.summaryBadges.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter-type]');

  if (!button) return;

  applySummaryFilter(
    button.dataset.filterType,
    button.dataset.filterValue,
  );
});

refs.search.addEventListener('input', () => {
  state.filters.search = refs.search.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadData, 250);
});

refs.priorityFilter.addEventListener('change', () => {
  state.filters.priority = refs.priorityFilter.value;
  loadData();
});

refs.statusFilter.addEventListener('change', () => {
  state.filters.status = refs.statusFilter.value;
  loadData();
});

function openCreateModal() {
  state.editingId = null;
  refs.createForm.reset();
  refs.createTitle.textContent = 'Добавить тест-кейс';
  refs.createButton.textContent = 'Добавить тест-кейс';
  clearCreateMessage();
  refs.createDialog.showModal();
  refs.createForm.elements.title.focus();
}

function openEditModal(id) {
  const item = state.items.find((entry) => entry.id === id);

  if (!item) return;

  state.editingId = item.id;
  refs.createTitle.textContent = 'Редактировать тест-кейс';
  refs.createButton.textContent = 'Сохранить';
  refs.createForm.elements.title.value = item.title;
  refs.createForm.elements.module.value = item.module;
  refs.createForm.elements.steps.value = item.steps;
  refs.createForm.elements.priority.value = item.priority;
  clearCreateMessage();
  refs.createDialog.showModal();
  refs.createForm.elements.title.focus();
}

refs.openCreate.addEventListener('click', openCreateModal);

refs.closeCreate.addEventListener('click', () => {
  refs.createDialog.close();
});

refs.cancelCreate.addEventListener('click', () => {
  refs.createDialog.close();
});

refs.createDialog.addEventListener('click', (event) => {
  if (event.target === refs.createDialog) {
    refs.createDialog.close();
  }
});

refs.createDialog.addEventListener('close', () => {
  clearCreateMessage();
  state.editingId = null;
});

refs.closeDelete.addEventListener('click', () => {
  refs.deleteDialog.close();
});

refs.cancelDelete.addEventListener('click', () => {
  refs.deleteDialog.close();
});

refs.confirmDelete.addEventListener('click', confirmDelete);

refs.deleteDialog.addEventListener('click', (event) => {
  if (event.target === refs.deleteDialog) {
    refs.deleteDialog.close();
  }
});

refs.deleteDialog.addEventListener('close', () => {
  clearDeleteMessage();
  state.deletingId = null;
});

refs.createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearCreateMessage();

  if (!refs.createForm.reportValidity()) {
    return;
  }

  const data = new FormData(refs.createForm);
  const payload = {
    title: data.get('title'),
    module: data.get('module'),
    steps: data.get('steps'),
    priority: data.get('priority'),
  };
  const editingId = state.editingId;
  const isEditing = Boolean(editingId);

  const buttonText = refs.createButton.textContent;
  refs.createButton.disabled = true;
  refs.createButton.textContent = 'Сохранение…';

  try {
    if (isEditing) {
      await updateTestCase(editingId, payload);
    } else {
      await createTestCase(payload);
    }

    refs.createForm.reset();
    refs.createDialog.close();
    const loaded = await loadData();

    if (loaded) {
      setMessage(
        isEditing ? 'Тест-кейс обновлён.' : 'Тест-кейс добавлен.',
        'success',
      );
    }
  } catch (error) {
    setCreateMessage(formatErrorText(error));
  } finally {
    refs.createButton.disabled = false;
    refs.createButton.textContent = buttonText;
  }
});

refs.casesBody.replaceChildren(createEmptyRow('Загрузка…'));
loadData();
