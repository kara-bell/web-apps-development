(function () {
  'use strict';

  const api = window.QHApi;

  const PRIORITY_LABELS = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
  const STATUS_LABELS = { draft: 'Черновик', in_progress: 'В работе', ready: 'Готов' };
  const NEXT_STATUS = {
    draft: { label: 'В работу', value: 'in_progress' },
    in_progress: { label: 'Готов', value: 'ready' },
    ready: { label: 'В черновик', value: 'draft' }
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    guestView: $('guest-view'),
    appView: $('app-view'),
    sessionLabel: $('session-label'),
    usersLink: $('users-link'),
    logoutBtn: $('logout-btn'),
    loginDialog: $('login-dialog'),
    loginForm: $('login-form'),
    loginError: $('login-error'),
    registerDialog: $('register-dialog'),
    registerForm: $('register-form'),
    registerError: $('register-error'),
    profileDialog: $('profile-dialog'),
    profileName: $('profile-name'),
    profileEmail: $('profile-email'),
    openDeleteAccount: $('open-delete-account'),
    caseDialog: $('case-dialog'),
    caseForm: $('case-form'),
    caseDialogTitle: $('case-dialog-title'),
    caseError: $('case-error'),
    caseNote: $('case-note'),
    caseTitle: $('case-title'),
    caseModule: $('case-module'),
    casePriority: $('case-priority'),
    caseSteps: $('case-steps'),
    caseSubmit: $('case-submit'),
    deleteDialog: $('delete-dialog'),
    deleteCaseName: $('delete-case-name'),
    confirmDelete: $('confirm-delete'),
    accountDialog: $('account-dialog'),
    confirmDeleteAccount: $('confirm-delete-account'),
    search: $('search'),
    priorityFilter: $('priority-filter'),
    statusFilter: $('status-filter'),
    casesBody: $('cases-body'),
    tableLoading: $('table-loading'),
    resultCount: $('result-count'),
    stats: $('stats'),
    toast: $('toast')
  };

  const state = {
    user: null,
    cases: [],
    stats: null,
    filters: { search: '', priority: '', status: '' },
    editingId: null,
    deletingId: null,
    readOnly: false
  };

  let searchTimer = null;
  let toastTimer = null;
  const mobileQuery = window.matchMedia('(max-width: 640px)');

  // ---------- Утилиты интерфейса ----------

  function show(element) {
    element.classList.remove('hidden');
  }

  function hide(element) {
    element.classList.add('hidden');
  }

  function openModal(dialog) {
    document.querySelectorAll('dialog[open]').forEach((other) => {
      if (other !== dialog) other.close();
    });
    if (!dialog.open) dialog.showModal();
    const firstField = dialog.querySelector(
      'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)'
    );
    if (firstField) {
      firstField.focus();
    } else {
      const firstButton = dialog.querySelector('button');
      if (firstButton) firstButton.focus();
    }
  }

  function closeAllDialogs() {
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  }

  function setBusy(button, busy, label) {
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  function showFormError(element, error) {
    const fieldMessages = error.fields ? Object.values(error.fields).filter(Boolean) : [];
    const fallback = error.message || 'Не удалось выполнить действие.';
    const useGeneralMessage = error.status === 409 && Boolean(error.message);
    const messages = [
      ...new Set(
        useGeneralMessage
          ? [error.message]
          : fieldMessages.length > 0
            ? fieldMessages
            : [fallback]
      )
    ];
    const list = document.createElement('ul');
    list.className = 'alert__list';

    messages.forEach((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      list.append(item);
    });

    element.replaceChildren(list);
    show(element);
  }

  function hideFormError(element) {
    element.replaceChildren();
    hide(element);
  }

  function toast(message, isError = false) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.toggle('toast--error', isError);
    show(el.toast);
    toastTimer = setTimeout(() => hide(el.toast), 3500);
  }

  function handleApiError(error) {
    if (error.status === 401) {
      expireSession();
      return;
    }
    toast(error.message || 'Не удалось выполнить запрос', true);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function ownerIdOf(testCase) {
    return typeof testCase.owner === 'object' && testCase.owner
      ? testCase.owner._id
      : testCase.owner;
  }

  function ownerNameOf(testCase) {
    return typeof testCase.owner === 'object' && testCase.owner && testCase.owner.name
      ? testCase.owner.name
      : 'Неизвестный автор';
  }

  function isOwnCase(testCase) {
    return Boolean(state.user && ownerIdOf(testCase) === state.user._id);
  }

  // ---------- Состояние экранов ----------

  function updateSessionLabel() {
    if (!state.user) {
      el.sessionLabel.textContent = 'Гость';
      el.sessionLabel.disabled = true;
      el.sessionLabel.title = '';
      return;
    }

    el.sessionLabel.textContent = mobileQuery.matches
      ? 'Профиль'
      : `Вы вошли: ${state.user.name}`;
    el.sessionLabel.disabled = false;
    el.sessionLabel.title = 'Открыть профиль';
  }

  mobileQuery.addEventListener('change', updateSessionLabel);

  function setUser(user) {
    state.user = user;
    updateSessionLabel();

    if (user) {
      show(el.usersLink);
      show(el.logoutBtn);
    } else {
      hide(el.usersLink);
      hide(el.logoutBtn);
    }
  }

  function showGuest() {
    show(el.guestView);
    hide(el.appView);
    state.user = null;
    updateSessionLabel();
    hide(el.usersLink);
    hide(el.logoutBtn);
  }

  function showWorkspace() {
    hide(el.guestView);
    show(el.appView);
    show(el.logoutBtn);
  }

  function resetWorkspaceState() {
    state.cases = [];
    state.stats = null;
    state.filters = { search: '', priority: '', status: '' };
    state.editingId = null;
    state.deletingId = null;
    state.readOnly = false;
    syncFilters();
    renderStats();
    renderCases();
  }

  function expireSession() {
    api.clearToken();
    setUser(null);
    showGuest();
    closeAllDialogs();
    resetWorkspaceState();
    toast('Сессия истекла. Войдите снова.', true);
  }

  // ---------- Загрузка данных ----------

  async function loadCases() {
    show(el.tableLoading);
    try {
      const data = await api.listCases(state.filters);
      state.cases = Array.isArray(data.items) ? data.items : [];
      renderCases();
    } finally {
      hide(el.tableLoading);
    }
  }

  async function loadStats() {
    state.stats = await api.getStats();
    renderStats();
  }

  async function refresh() {
    try {
      await Promise.all([loadCases(), loadStats()]);
    } catch (error) {
      handleApiError(error);
    }
  }

  // ---------- Отрисовка ----------

  function renderStats() {
    const stats = state.stats || { total: 0, draft: 0, in_progress: 0, ready: 0, high: 0 };
    $('stat-total').textContent = stats.total;
    $('stat-draft').textContent = stats.draft;
    $('stat-in-progress').textContent = stats.in_progress;
    $('stat-ready').textContent = stats.ready;
    $('stat-high').textContent = stats.high;

    const filters = state.filters;
    let active = '';
    if (filters.status) {
      active = filters.status;
    } else if (filters.priority === 'high') {
      active = 'high';
    } else if (!filters.search && !filters.priority) {
      active = 'all';
    }

    el.stats.querySelectorAll('[data-stat]').forEach((button) => {
      const isActive = button.dataset.stat === active;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    updateResultCount();
  }

  function updateResultCount() {
    if (!el.resultCount) return;
    const shown = state.cases.length;
    const total = state.stats ? state.stats.total : shown;
    const filtered = Boolean(state.filters.search || state.filters.priority || state.filters.status);
    el.resultCount.textContent = filtered ? `Показано: ${shown} из ${total}` : `Показано: ${total}`;
  }

  function makeBadge(label, modifier) {
    const badge = document.createElement('span');
    badge.className = `badge ${modifier}`;
    badge.textContent = label;
    return badge;
  }

  function makeActionButton(label, action, id, extraClass) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--small ${extraClass || ''}`.trim();
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = id;
    return button;
  }

  function buildRow(testCase) {
    const own = isOwnCase(testCase);
    const row = document.createElement('tr');
    row.dataset.id = testCase._id;

    const titleCell = document.createElement('td');
    titleCell.dataset.label = 'Тест-кейс';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'case-title-cell';

    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'case-title';
    titleButton.textContent = testCase.title;
    titleButton.dataset.action = own ? 'edit' : 'view';
    titleButton.dataset.id = testCase._id;
    titleButton.setAttribute(
      'aria-label',
      own ? `Редактировать тест-кейс «${testCase.title}»` : `Открыть тест-кейс «${testCase.title}»`
    );

    const details = document.createElement('details');
    details.className = 'case-steps';
    const summary = document.createElement('summary');
    summary.textContent = 'Шаги';
    const steps = document.createElement('pre');
    steps.textContent = testCase.steps;
    details.append(summary, steps);

    titleWrap.append(titleButton, details);
    titleCell.append(titleWrap);

    const moduleCell = document.createElement('td');
    moduleCell.dataset.label = 'Модуль';
    moduleCell.textContent = testCase.module;

    const authorCell = document.createElement('td');
    authorCell.dataset.label = 'Автор';
    authorCell.textContent = own ? `${ownerNameOf(testCase)} (вы)` : ownerNameOf(testCase);

    const priorityCell = document.createElement('td');
    priorityCell.dataset.label = 'Приоритет';
    priorityCell.append(
      makeBadge(PRIORITY_LABELS[testCase.priority] || testCase.priority, `priority-${testCase.priority}`)
    );

    const statusCell = document.createElement('td');
    statusCell.dataset.label = 'Статус';
    statusCell.append(
      makeBadge(STATUS_LABELS[testCase.status] || testCase.status, `status-${testCase.status}`)
    );

    const dateCell = document.createElement('td');
    dateCell.dataset.label = 'Обновлён';
    dateCell.textContent = formatDate(testCase.updatedAt);

    const actionsCell = document.createElement('td');
    actionsCell.dataset.label = 'Действия';
    const actions = document.createElement('div');
    actions.className = 'actions-cell';

    if (own) {
      const next = NEXT_STATUS[testCase.status];
      if (next) {
        const statusButton = makeActionButton(next.label, 'status', testCase._id, 'btn--ghost');
        statusButton.dataset.next = next.value;
        statusButton.setAttribute('aria-label', `${next.label}: ${testCase.title}`);
        actions.append(statusButton);
      }

      const deleteButton = makeActionButton('Удалить', 'delete', testCase._id, 'btn--danger');
      deleteButton.setAttribute('aria-label', `Удалить тест-кейс «${testCase.title}»`);

      actions.append(deleteButton);
    } else {
      const viewButton = makeActionButton('Просмотр', 'view', testCase._id, 'btn--ghost');
      viewButton.setAttribute('aria-label', `Просмотр тест-кейса «${testCase.title}»`);
      actions.append(viewButton);
    }

    actionsCell.append(actions);

    row.append(titleCell, moduleCell, authorCell, priorityCell, statusCell, dateCell, actionsCell);
    return row;
  }

  function renderCases() {
    el.casesBody.replaceChildren();

    if (state.cases.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'empty';
      cell.dataset.testid = 'empty-state';
      cell.textContent = 'Тест-кейсов пока нет. Добавьте первый сценарий.';
      row.append(cell);
      el.casesBody.append(row);
      updateResultCount();
      return;
    }

    state.cases.forEach((testCase) => el.casesBody.append(buildRow(testCase)));
    updateResultCount();
  }

  // ---------- Фильтры ----------

  function syncFilters() {
    el.search.value = state.filters.search;
    el.priorityFilter.value = state.filters.priority;
    el.statusFilter.value = state.filters.status;
  }

  function applyStatFilter(stat) {
    state.filters = { search: '', priority: '', status: '' };
    if (stat === 'draft' || stat === 'in_progress' || stat === 'ready') {
      state.filters.status = stat;
    }
    if (stat === 'high') {
      state.filters.priority = 'high';
    }
    syncFilters();
    refresh();
  }

  // ---------- Аутентификация ----------

  async function handleLogin(event) {
    event.preventDefault();
    hideFormError(el.loginError);

    const data = new FormData(el.loginForm);
    const submit = el.loginForm.querySelector('button[type="submit"]');
    setBusy(submit, true, 'Вход…');

    let result;
    try {
      result = await api.login({
        email: data.get('email'),
        password: data.get('password')
      });
    } catch (error) {
      showFormError(el.loginError, error);
      return;
    } finally {
      setBusy(submit, false);
    }

    api.setToken(result.token);
    setUser(result.user);
    el.loginForm.reset();
    el.loginDialog.close();
    showWorkspace();
    await refresh();
    toast('Вы вошли в аккаунт.');
  }

  async function handleRegister(event) {
    event.preventDefault();
    hideFormError(el.registerError);

    const data = new FormData(el.registerForm);
    const submit = el.registerForm.querySelector('button[type="submit"]');
    setBusy(submit, true, 'Создание…');

    let result;
    try {
      result = await api.register({
        name: data.get('name'),
        email: data.get('email'),
        password: data.get('password')
      });
    } catch (error) {
      showFormError(el.registerError, error);
      return;
    } finally {
      setBusy(submit, false);
    }

    api.setToken(result.token);
    setUser(result.user);
    el.registerForm.reset();
    el.registerDialog.close();
    showWorkspace();
    await refresh();
    toast('Аккаунт создан.');
  }

  function openProfileDialog() {
    if (!state.user) return;
    el.profileName.textContent = state.user.name;
    el.profileEmail.textContent = state.user.email;
    openModal(el.profileDialog);
  }

  function handleLogout() {
    api.clearToken();
    setUser(null);
    showGuest();
    closeAllDialogs();
    resetWorkspaceState();
    toast('Вы вышли из аккаунта.');
  }

  async function handleDeleteAccount() {
    const button = el.confirmDeleteAccount;
    setBusy(button, true, 'Удаление…');
    try {
      await api.deleteAccount();
      api.clearToken();
      setUser(null);
      showGuest();
      closeAllDialogs();
      resetWorkspaceState();
      toast('Аккаунт удалён.');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(button, false);
    }
  }

  // ---------- Тест-кейсы ----------

  function setCaseFormEditable(editable, note) {
    state.readOnly = !editable;
    el.caseTitle.disabled = !editable;
    el.caseModule.disabled = !editable;
    el.casePriority.disabled = !editable;
    el.caseSteps.disabled = !editable;
    el.caseSubmit.classList.toggle('hidden', !editable);

    if (note) {
      el.caseNote.textContent = note;
      show(el.caseNote);
    } else {
      el.caseNote.textContent = '';
      hide(el.caseNote);
    }
  }

  function openCreateDialog() {
    state.editingId = null;
    el.caseForm.reset();
    el.casePriority.value = 'medium';
    el.caseDialogTitle.textContent = 'Новый тест-кейс';
    el.caseSubmit.textContent = 'Добавить тест-кейс';
    hideFormError(el.caseError);
    setCaseFormEditable(true);
    openModal(el.caseDialog);
  }

  function openEditDialog(id) {
    const testCase = state.cases.find((item) => item._id === id);
    if (!testCase) return;
    if (!isOwnCase(testCase)) {
      openViewDialog(id);
      return;
    }

    state.editingId = id;
    el.caseForm.reset();
    el.caseTitle.value = testCase.title;
    el.caseModule.value = testCase.module;
    el.casePriority.value = testCase.priority;
    el.caseSteps.value = testCase.steps;
    el.caseDialogTitle.textContent = 'Редактировать тест-кейс';
    el.caseSubmit.textContent = 'Сохранить';
    hideFormError(el.caseError);
    setCaseFormEditable(true);
    openModal(el.caseDialog);
  }

  function openViewDialog(id) {
    const testCase = state.cases.find((item) => item._id === id);
    if (!testCase) return;

    state.editingId = null;
    el.caseForm.reset();
    el.caseTitle.value = testCase.title;
    el.caseModule.value = testCase.module;
    el.casePriority.value = testCase.priority;
    el.caseSteps.value = testCase.steps;
    el.caseDialogTitle.textContent = 'Просмотр тест-кейса';
    hideFormError(el.caseError);
    setCaseFormEditable(
      false,
      `Автор: ${ownerNameOf(testCase)}. Редактировать и удалять может только автор.`
    );
    openModal(el.caseDialog);
  }

  async function handleCaseSubmit(event) {
    event.preventDefault();
    if (state.readOnly) return;
    hideFormError(el.caseError);

    const payload = {
      title: el.caseTitle.value,
      module: el.caseModule.value,
      priority: el.casePriority.value,
      steps: el.caseSteps.value
    };

    const editingId = state.editingId;
    const button = el.caseSubmit;
    setBusy(button, true, editingId ? 'Сохранение…' : 'Добавление…');

    try {
      if (editingId) {
        await api.updateCase(editingId, payload);
      } else {
        await api.createCase(payload);
      }
    } catch (error) {
      if (error.status === 401) {
        expireSession();
      } else {
        showFormError(el.caseError, error);
      }
      return;
    } finally {
      setBusy(button, false);
    }

    state.editingId = null;
    el.caseForm.reset();
    el.caseDialog.close();
    await refresh();
    toast(editingId ? 'Тест-кейс обновлён.' : 'Тест-кейс добавлен.');
  }

  async function changeStatus(id, status, button) {
    const testCase = state.cases.find((item) => item._id === id);
    if (!testCase || !isOwnCase(testCase)) {
      toast('Изменять можно только свои тест-кейсы.', true);
      return;
    }

    setBusy(button, true, '…');
    try {
      await api.updateCase(id, { status });
      await refresh();
      toast('Статус обновлён.');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(button, false);
    }
  }

  function openDeleteDialog(id) {
    const testCase = state.cases.find((item) => item._id === id);
    if (!testCase) return;
    if (!isOwnCase(testCase)) {
      toast('Удалять можно только свои тест-кейсы.', true);
      return;
    }

    state.deletingId = id;
    el.deleteCaseName.textContent = `«${testCase.title}» будет удалён безвозвратно.`;
    openModal(el.deleteDialog);
  }

  async function handleConfirmDelete() {
    if (!state.deletingId) return;

    const button = el.confirmDelete;
    setBusy(button, true, 'Удаление…');
    try {
      await api.deleteCase(state.deletingId);
      state.deletingId = null;
      el.deleteDialog.close();
      await refresh();
      toast('Тест-кейс удалён.');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(button, false);
    }
  }

  // ---------- События ----------

  function bindEvents() {
    $('open-login').addEventListener('click', () => openModal(el.loginDialog));
    $('open-register').addEventListener('click', () => openModal(el.registerDialog));

    document.querySelectorAll('[data-switch]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.switch);
        closeAllDialogs();
        if (target) openModal(target);
      });
    });

    document.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => {
        const dialog = button.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const openDialog = document.querySelector('dialog[open]');
      if (openDialog) {
        event.preventDefault();
        openDialog.close();
      }
    });

    el.loginForm.addEventListener('submit', handleLogin);
    el.registerForm.addEventListener('submit', handleRegister);
    el.logoutBtn.addEventListener('click', handleLogout);
    el.sessionLabel.addEventListener('click', openProfileDialog);

    el.openDeleteAccount.addEventListener('click', () => {
      el.profileDialog.close();
      openModal(el.accountDialog);
    });

    el.confirmDeleteAccount.addEventListener('click', handleDeleteAccount);

    $('open-create').addEventListener('click', openCreateDialog);
    el.caseForm.addEventListener('submit', handleCaseSubmit);
    el.confirmDelete.addEventListener('click', handleConfirmDelete);

    el.casesBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const { action, id } = button.dataset;
      if (action === 'view') openViewDialog(id);
      if (action === 'edit') openEditDialog(id);
      if (action === 'delete') openDeleteDialog(id);
      if (action === 'status') changeStatus(id, button.dataset.next, button);
    });

    el.search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.search = el.search.value.trim();
        refresh();
      }, 250);
    });

    el.priorityFilter.addEventListener('change', () => {
      state.filters.priority = el.priorityFilter.value;
      refresh();
    });

    el.statusFilter.addEventListener('change', () => {
      state.filters.status = el.statusFilter.value;
      refresh();
    });

    el.stats.addEventListener('click', (event) => {
      const button = event.target.closest('[data-stat]');
      if (!button) return;
      applyStatFilter(button.dataset.stat);
    });
  }

  async function restoreSession() {
    if (!api.getToken()) {
      setUser(null);
      showGuest();
      resetWorkspaceState();
      return;
    }

    try {
      const data = await api.getMe();
      api.syncSessionCookie();
      setUser(data.user);
      showWorkspace();
      await refresh();
    } catch (error) {
      api.clearToken();
      setUser(null);
      showGuest();
      resetWorkspaceState();
      toast(error.status === 401 ? 'Сессия истекла. Войдите снова.' : error.message, true);
    }
  }

  bindEvents();
  restoreSession();
})();
