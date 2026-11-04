(function () {
  'use strict';

  const api = window.QHApi;
  const $ = (id) => document.getElementById(id);

  const el = {
    sessionLabel: $('session-label'),
    logoutBtn: $('logout-btn'),
    usersCount: $('users-count'),
    usersBody: $('users-body'),
    emptyState: $('empty-state'),
    userDialog: $('user-dialog'),
    profileName: $('profile-name'),
    profileEmail: $('profile-email'),
    profileCreated: $('profile-created'),
    toast: $('toast')
  };

  const state = {
    users: [],
    currentUser: null
  };

  let toastTimer = null;

  function toast(message, isError = false) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.toggle('toast--error', isError);
    el.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 3500);
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

  function setSession(user) {
    state.currentUser = user;
    el.sessionLabel.textContent = `Вы вошли: ${user.name}`;
    el.logoutBtn.classList.remove('hidden');
  }

  function redirectToLogin() {
    api.clearToken();
    window.location.replace('/');
  }

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    const firstButton = dialog.querySelector('button');
    if (firstButton) firstButton.focus();
  }

  function renderUsers() {
    el.usersBody.replaceChildren();

    state.users.forEach((user) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      const isMe = state.currentUser && user._id === state.currentUser._id;
      nameCell.textContent = isMe ? `${user.name} (вы)` : user.name;

      const emailCell = document.createElement('td');
      emailCell.textContent = user.email;

      const dateCell = document.createElement('td');
      dateCell.textContent = formatDate(user.createdAt);

      const actionsCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'actions';

      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'btn btn--small btn--ghost';
      viewButton.textContent = 'Профиль';
      viewButton.dataset.action = 'view';
      viewButton.dataset.id = user._id;
      viewButton.setAttribute('aria-label', `Открыть профиль пользователя ${user.name}`);

      actions.append(viewButton);
      actionsCell.append(actions);

      row.append(nameCell, emailCell, dateCell, actionsCell);
      el.usersBody.append(row);
    });

    el.emptyState.classList.toggle('hidden', state.users.length > 0);
    el.usersCount.textContent = `Всего пользователей: ${state.users.length}`;
  }

  function openProfile(id) {
    const user = state.users.find((item) => item._id === id);
    if (!user) return;

    el.profileName.textContent = user.name;
    el.profileEmail.textContent = user.email;
    el.profileCreated.textContent = formatDate(user.createdAt);
    openDialog(el.userDialog);
  }

  async function loadUsers() {
    const data = await api.listUsers();
    state.users = Array.isArray(data.items) ? data.items : [];
    renderUsers();
  }

  async function init() {
    if (!api.getToken()) {
      redirectToLogin();
      return;
    }

    try {
      const data = await api.getMe();
      setSession(data.user);
      await loadUsers();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      el.usersCount.textContent = 'Не удалось загрузить список пользователей.';
      toast(error.message || 'Ошибка загрузки', true);
    }
  }

  el.logoutBtn.addEventListener('click', redirectToLogin);

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = button.closest('dialog');
      if (dialog) dialog.close();
    });
  });

  el.userDialog.addEventListener('click', (event) => {
    if (event.target === el.userDialog) el.userDialog.close();
  });

  el.usersBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="view"]');
    if (button) openProfile(button.dataset.id);
  });

  init();
})();
