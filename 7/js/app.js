'use strict';

const COLUMNS = [
  { id: 'new', title: 'Новые' },
  { id: 'in-progress', title: 'В работе' },
  { id: 'review', title: 'На проверке' },
  { id: 'closed', title: 'Закрыто' },
];

const PRIORITY_LABELS = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const initialDefects = [
  {
    id: 'QH-101',
    title: 'Кнопка «Оформить заказ» неактивна при пустой корзине',
    priority: 'high',
    assignee: 'Иванов',
    status: 'new',
  },
  {
    id: 'QH-102',
    title: 'Не сохраняется выбранный способ доставки',
    priority: 'medium',
    assignee: 'Петрова',
    status: 'new',
  },
  {
    id: 'QH-109',
    title: 'Не приходит SMS с кодом подтверждения',
    priority: 'high',
    assignee: 'Смирнов',
    status: 'new',
  },
  {
    id: 'QH-103',
    title: 'Ошибка 500 при повторной оплате заказа',
    priority: 'high',
    assignee: 'Сидоров',
    status: 'in-progress',
  },
  {
    id: 'QH-104',
    title: 'Долго загружается список заказов в личном кабинете',
    priority: 'medium',
    assignee: 'Иванов',
    status: 'in-progress',
  },
  {
    id: 'QH-110',
    title: 'Ошибка в расчёте скидки при повторном заказе',
    priority: 'medium',
    assignee: 'Петрова',
    status: 'in-progress',
  },
  {
    id: 'QH-105',
    title: 'Неверный текст в письме подтверждения заказа',
    priority: 'low',
    assignee: 'Петрова',
    status: 'review',
  },
  {
    id: 'QH-106',
    title: 'Съезжает блок итоговой суммы на ширине 768 px',
    priority: 'medium',
    assignee: 'Смирнов',
    status: 'review',
  },
  {
    id: 'QH-111',
    title: 'Не отображается статус возврата заказа',
    priority: 'low',
    assignee: 'Иванов',
    status: 'review',
  },
  {
    id: 'QH-107',
    title: 'Исправлена валидация промокода',
    priority: 'low',
    assignee: 'Сидоров',
    status: 'closed',
  },
  {
    id: 'QH-108',
    title: 'Устранено дублирование заказа при повторной отправке',
    priority: 'high',
    assignee: 'Иванов',
    status: 'closed',
  },
  {
    id: 'QH-112',
    title: 'Исправлено наложение модального окна на мобильном',
    priority: 'medium',
    assignee: 'Смирнов',
    status: 'closed',
  },
];

let defects = cloneDefects(initialDefects);
let activeFilter = null;

const resetButton = document.getElementById('reset-board');
const filterHighButton = document.getElementById('filter-high');
const filterHighNote = document.getElementById('kpi-high-note');
const filterStatus = document.getElementById('filter-status');
const liveRegion = document.getElementById('live-region');
const kpi = {
  total: document.getElementById('kpi-total'),
  open: document.getElementById('kpi-open'),
  closed: document.getElementById('kpi-closed'),
  high: document.getElementById('kpi-high'),
};

function cloneDefects(source) {
  return source.map((defect) => ({ ...defect }));
}

function getColumnTitle(status) {
  return COLUMNS.find((column) => column.id === status)?.title ?? status;
}

function pluralizeDefects(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return 'дефект';
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return 'дефекта';
  }

  return 'дефектов';
}

function getVisibleDefects() {
  return activeFilter === 'high'
    ? defects.filter((defect) => defect.priority === 'high')
    : defects;
}

function countByStatus(items) {
  const counts = Object.fromEntries(COLUMNS.map((column) => [column.id, 0]));

  items.forEach((defect) => {
    if (counts[defect.status] !== undefined) {
      counts[defect.status] += 1;
    }
  });

  return counts;
}

function createCard(defect) {
  const card = document.createElement('li');
  card.className = 'card';
  card.dataset.id = defect.id;

  const top = document.createElement('div');
  top.className = 'card__top';

  const id = document.createElement('span');
  id.className = 'card__id';
  id.textContent = defect.id;

  const priority = document.createElement('span');
  priority.className = `card__priority card__priority--${defect.priority}`;
  priority.textContent = PRIORITY_LABELS[defect.priority] ?? defect.priority;

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = defect.title;

  const footer = document.createElement('div');
  footer.className = 'card__footer';

  const assignee = document.createElement('p');
  assignee.className = 'card__assignee';
  assignee.textContent = defect.assignee;

  const status = document.createElement('span');
  status.className = `card__status card__status--${defect.status}`;
  status.textContent = getColumnTitle(defect.status);

  footer.append(assignee, status);
  top.append(id, priority);
  card.append(top, title, footer);

  return card;
}

function renderBoard() {
  const visibleDefects = getVisibleDefects();

  document.querySelectorAll('.column__list').forEach((list) => {
    const status = list.dataset.status;
    const cards = visibleDefects
      .filter((defect) => defect.status === status)
      .map((defect) => createCard(defect));

    list.replaceChildren(...cards);
  });

  updateSummary();
  updateFilterUI();
}

function updateSummary() {
  const allCounts = countByStatus(defects);
  const visibleCounts = countByStatus(getVisibleDefects());

  COLUMNS.forEach((column) => {
    const badge = document.querySelector(
      `.column__count[data-count="${column.id}"]`
    );

    if (badge) {
      const count = visibleCounts[column.id];
      badge.textContent = count;
      badge.setAttribute(
        'aria-label',
        `${count} ${pluralizeDefects(count)}`
      );
    }
  });

  const open = allCounts.new + allCounts['in-progress'] + allCounts.review;
  const high = defects.filter((defect) => defect.priority === 'high').length;

  kpi.total.textContent = defects.length;
  kpi.open.textContent = open;
  kpi.closed.textContent = allCounts.closed;
  kpi.high.textContent = high;
}

function updateFilterUI() {
  const isActive = activeFilter === 'high';

  filterHighButton.setAttribute('aria-pressed', String(isActive));
  filterHighNote.textContent = isActive
    ? 'фильтр включён · нажмите, чтобы снять'
    : 'нажмите, чтобы отфильтровать';
  filterStatus.hidden = !isActive;

  if (isActive) {
    filterStatus.textContent = `Показаны только дефекты с высоким приоритетом: ${getVisibleDefects().length} из ${defects.length}.`;
  }
}

function updateDefectStatus(id, status) {
  const defect = defects.find((item) => item.id === id);

  if (defect) {
    defect.status = status;
  }
}

function syncStatusBadge(card, status) {
  const badge = card.querySelector('.card__status');

  if (!badge) {
    return;
  }

  badge.className = `card__status card__status--${status}`;
  badge.textContent = getColumnTitle(status);
}

function announce(message) {
  liveRegion.textContent = message;
}

function toggleHighFilter() {
  activeFilter = activeFilter === 'high' ? null : 'high';
  renderBoard();
  announce(
    activeFilter === 'high'
      ? 'Включён фильтр по высокому приоритету.'
      : 'Фильтр по высокому приоритету снят.'
  );
}

function initSortable() {
  if (typeof Sortable === 'undefined') {
    announce('Не удалось загрузить библиотеку SortableJS.');
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  document.querySelectorAll('.column__list').forEach((list) => {
    new Sortable(list, {
      group: 'defects',
      animation: prefersReducedMotion ? 0 : 150,
      ghostClass: 'card--ghost',
      chosenClass: 'card--chosen',
      dragClass: 'card--drag',
      onEnd(event) {
        const id = event.item.dataset.id;
        const status = event.to.dataset.status;

        updateDefectStatus(id, status);
        syncStatusBadge(event.item, status);
        updateSummary();

        if (event.from !== event.to) {
          announce(
            `Дефект ${id} перемещён в колонку «${getColumnTitle(status)}».`
          );
        }
      },
    });
  });
}

function resetBoard() {
  defects = cloneDefects(initialDefects);
  activeFilter = null;
  renderBoard();
  announce('Демонстрационный набор восстановлен.');
}

filterHighButton.addEventListener('click', toggleHighFilter);
resetButton.addEventListener('click', resetBoard);

renderBoard();
initSortable();
