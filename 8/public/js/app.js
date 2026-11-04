import {
  apiRequest,
  clearToken,
  getToken,
  setToken,
} from './api.js';

const ROLE_LABELS = {
  tester: 'Тестировщик',
  analyst: 'Аналитик',
  manager: 'Менеджер',
};

const FIELD_LABELS = {
  name: 'Имя',
  email: 'E-mail',
  password: 'Пароль',
  role: 'Роль',
  position: 'Должность',
  about: 'Описание',
  avatar: 'Аватар',
};

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const TOAST_DURATION = 3500;

const state = {
  token: '',
  user: null,
};

const elements = {
  authView: document.getElementById('auth-view'),
  profileView: document.getElementById('profile-view'),
  editView: document.getElementById('edit-view'),
  sessionStatus: document.getElementById('session-status'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  editForm: document.getElementById('edit-form'),
  loginDialog: document.getElementById('login-dialog'),
  registerDialog: document.getElementById('register-dialog'),
  openLogin: document.getElementById('open-login'),
  openRegister: document.getElementById('open-register'),
  switchToRegister: document.getElementById('switch-to-register'),
  switchToLogin: document.getElementById('switch-to-login'),
  profileTitle: document.getElementById('profile-title'),
  profileRole: document.getElementById('profile-role'),
  profileEmail: document.getElementById('profile-email'),
  profilePosition: document.getElementById('profile-position'),
  profileAbout: document.getElementById('profile-about'),
  editName: document.getElementById('edit-name'),
  editRole: document.getElementById('edit-role'),
  editPosition: document.getElementById('edit-position'),
  editAbout: document.getElementById('edit-about'),
  editAvatarInput: document.getElementById('edit-avatar-input'),
  editButton: document.getElementById('edit-button'),
  logoutButton: document.getElementById('logout-button'),
  deleteButton: document.getElementById('delete-button'),
  cancelEdit: document.getElementById('cancel-edit'),
  deleteDialog: document.getElementById('delete-dialog'),
  cancelDelete: document.getElementById('cancel-delete'),
  confirmDelete: document.getElementById('confirm-delete'),
  toast: document.getElementById('toast'),
};

let previewUrl = '';
let toastTimer = null;

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function setAvatar(prefix, user) {
  const image = document.getElementById(`${prefix}-avatar`);
  const initials = document.getElementById(`${prefix}-initials`);

  if (!image || !initials) {
    return;
  }

  if (user && user.avatarUrl) {
    image.src = user.avatarUrl;
    image.alt = `Аватар ${user.name}`;
    image.hidden = false;
    initials.textContent = '';
    initials.hidden = true;
    return;
  }

  image.hidden = true;
  image.removeAttribute('src');
  image.alt = '';
  initials.textContent = getInitials(user ? user.name : '');
  initials.hidden = false;
}

function setSessionStatus(text) {
  elements.sessionStatus.textContent = text;
}

function closeDialog(dialog) {
  if (dialog.open) {
    dialog.close();
  }
}

function openAuthDialog(dialog, form, focusField) {
  clearFormMessage(form);
  clearInvalidFields(form);

  if (!dialog.open) {
    dialog.showModal();
  }

  if (focusField) {
    focusField.focus();
  }
}

function openLoginDialog() {
  openAuthDialog(
    elements.loginDialog,
    elements.loginForm,
    elements.loginForm.elements.namedItem('email'),
  );
}

function openRegisterDialog() {
  openAuthDialog(
    elements.registerDialog,
    elements.registerForm,
    elements.registerForm.elements.namedItem('name'),
  );
}

function setFormMessage(form, message, stateName = 'error') {
  const messageElement = form.querySelector('[data-form-message]');

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.dataset.state = stateName;
  messageElement.hidden = false;
}

function clearFormMessage(form) {
  const messageElement = form.querySelector('[data-form-message]');

  if (!messageElement) {
    return;
  }

  messageElement.textContent = '';
  messageElement.hidden = true;
  delete messageElement.dataset.state;
}

function clearInvalidFields(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
    field.removeAttribute('aria-invalid');
  });
}

function formatApiError(error) {
  if (error && error.errors) {
    const messages = Object.entries(error.errors).map(
      ([field, message]) => `${FIELD_LABELS[field] || field}: ${message}`,
    );

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  if (error && error.message) {
    return error.message;
  }

  return 'Не удалось выполнить запрос';
}

function showFormError(form, error) {
  clearInvalidFields(form);

  if (error && error.errors) {
    Object.keys(error.errors).forEach((field) => {
      const input = form.elements.namedItem(field);

      if (input) {
        input.setAttribute('aria-invalid', 'true');
      }
    });
  }

  setFormMessage(form, formatApiError(error), 'error');
}

function setFormBusy(form, busy) {
  const submitButton = form.querySelector('button[type="submit"]');

  if (!submitButton) {
    return;
  }

  if (busy) {
    if (!submitButton.dataset.idleLabel) {
      submitButton.dataset.idleLabel = submitButton.textContent.trim();
    }

    submitButton.textContent = 'Подождите…';
    submitButton.disabled = true;
    return;
  }

  if (submitButton.dataset.idleLabel) {
    submitButton.textContent = submitButton.dataset.idleLabel;
  }

  submitButton.disabled = false;
}

function setButtonBusy(button, busy, busyText) {
  if (!button) {
    return;
  }

  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent.trim();
  }

  button.textContent = busy ? busyText : button.dataset.idleLabel;
  button.disabled = busy;
}

function showToast(message, stateName = 'success') {
  elements.toast.textContent = message;
  elements.toast.dataset.state = stateName;
  elements.toast.hidden = false;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, TOAST_DURATION);
}

function renderProfile(user) {
  elements.profileTitle.textContent = user.name;
  elements.profileEmail.textContent = user.email;
  elements.profilePosition.textContent = user.position || 'Не указана';
  elements.profileAbout.textContent = user.about || 'Пока ничего не рассказано';
  elements.profileRole.textContent = ROLE_LABELS[user.role] || user.role;
  elements.profileRole.dataset.role = user.role;
  setAvatar('profile', user);
}

function resetAvatarPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }

  elements.editAvatarInput.value = '';
  setAvatar('edit', state.user);
}

function showAuth({ resetForms = true } = {}) {
  elements.authView.hidden = false;
  elements.profileView.hidden = true;
  elements.editView.hidden = true;
  closeDialog(elements.loginDialog);
  closeDialog(elements.registerDialog);
  setSessionStatus('Гость');
  resetAvatarPreview();

  if (resetForms) {
    elements.loginForm.reset();
    elements.registerForm.reset();
    clearFormMessage(elements.loginForm);
    clearFormMessage(elements.registerForm);
    clearInvalidFields(elements.loginForm);
    clearInvalidFields(elements.registerForm);
  }
}

function showProfile() {
  elements.authView.hidden = true;
  elements.profileView.hidden = false;
  elements.editView.hidden = true;
  closeDialog(elements.loginDialog);
  closeDialog(elements.registerDialog);
  renderProfile(state.user);
  setSessionStatus(`Вы вошли: ${state.user.name}`);
  resetAvatarPreview();
}

function fillEditForm(user) {
  elements.editName.value = user.name;
  elements.editRole.value = user.role;
  elements.editPosition.value = user.position || '';
  elements.editAbout.value = user.about || '';
  elements.editAvatarInput.value = '';
  clearFormMessage(elements.editForm);
  clearInvalidFields(elements.editForm);
  setAvatar('edit', user);
}

function showEdit() {
  elements.authView.hidden = true;
  elements.profileView.hidden = true;
  elements.editView.hidden = false;
  fillEditForm(state.user);
  setSessionStatus(`Вы вошли: ${state.user.name}`);
  elements.editName.focus();
}

function clearSession() {
  clearToken();
  state.token = '';
  state.user = null;
}

function showSessionExpired(message = 'Сессия истекла. Войдите снова.') {
  clearSession();
  showAuth();
  showToast(message, 'error');
}

function validateAvatarFile(file) {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return 'Поддерживаются только JPEG, PNG и WebP';
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return 'Файл больше 2 МБ';
  }

  return '';
}

function previewAvatar(file) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);

  const image = document.getElementById('edit-avatar');
  const initials = document.getElementById('edit-initials');

  image.src = previewUrl;
  image.alt = 'Предпросмотр аватара';
  image.hidden = false;
  initials.hidden = true;
}

async function handleLogin(event) {
  event.preventDefault();

  const form = elements.loginForm;
  clearFormMessage(form);

  if (!form.reportValidity()) {
    return;
  }

  setFormBusy(form, true);

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: {
        email: form.elements.namedItem('email').value.trim(),
        password: form.elements.namedItem('password').value,
      },
    });

    setToken(data.token);
    state.token = data.token;
    state.user = data.user;
    form.reset();
    showProfile();
    showToast('Вы вошли в аккаунт');
  } catch (error) {
    showFormError(form, error);
  } finally {
    setFormBusy(form, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const form = elements.registerForm;
  clearFormMessage(form);

  if (!form.reportValidity()) {
    return;
  }

  setFormBusy(form, true);

  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        name: form.elements.namedItem('name').value.trim(),
        email: form.elements.namedItem('email').value.trim(),
        password: form.elements.namedItem('password').value,
        role: form.elements.namedItem('role').value,
      },
    });

    setToken(data.token);
    state.token = data.token;
    state.user = data.user;
    form.reset();
    showProfile();
    showToast('Аккаунт создан');
  } catch (error) {
    showFormError(form, error);
  } finally {
    setFormBusy(form, false);
  }
}

function handleAvatarChange() {
  const file = elements.editAvatarInput.files[0];

  clearFormMessage(elements.editForm);

  if (!file) {
    setAvatar('edit', state.user);
    return;
  }

  const fileError = validateAvatarFile(file);

  if (fileError) {
    resetAvatarPreview();
    setFormMessage(elements.editForm, fileError, 'error');
    return;
  }

  previewAvatar(file);
}

async function handleEditSubmit(event) {
  event.preventDefault();

  const form = elements.editForm;
  clearFormMessage(form);

  if (!form.reportValidity()) {
    return;
  }

  const file = elements.editAvatarInput.files[0];

  if (file) {
    const fileError = validateAvatarFile(file);

    if (fileError) {
      setFormMessage(form, fileError, 'error');
      return;
    }
  }

  const formData = new FormData();
  formData.set('name', elements.editName.value.trim());
  formData.set('role', elements.editRole.value);
  formData.set('position', elements.editPosition.value.trim());
  formData.set('about', elements.editAbout.value.trim());

  if (file) {
    formData.set('avatar', file);
  }

  setFormBusy(form, true);

  try {
    const data = await apiRequest('/api/users/me', {
      method: 'PUT',
      body: formData,
    });

    state.user = data.user;
    resetAvatarPreview();
    showProfile();
    showToast('Профиль обновлён');
  } catch (error) {
    if (error.status === 401) {
      showSessionExpired();
      return;
    }

    showFormError(form, error);
  } finally {
    setFormBusy(form, false);
  }
}

function handleLogout() {
  clearSession();
  showAuth();
  showToast('Вы вышли из аккаунта');
}

async function handleDelete() {
  setButtonBusy(elements.confirmDelete, true, 'Удаление…');

  try {
    await apiRequest('/api/users/me', { method: 'DELETE' });
    elements.deleteDialog.close();
    clearSession();
    showAuth();
    showToast('Аккаунт удалён');
  } catch (error) {
    if (error.status === 401) {
      elements.deleteDialog.close();
      showSessionExpired();
      return;
    }

    showToast(formatApiError(error), 'error');
  } finally {
    setButtonBusy(elements.confirmDelete, false);
  }
}

async function restoreSession() {
  const token = getToken();

  if (!token) {
    showAuth();
    return;
  }

  setSessionStatus('Проверка сессии…');

  try {
    const data = await apiRequest('/api/users/me');
    state.token = token;
    state.user = data.user;
    showProfile();
  } catch (error) {
    clearSession();
    showAuth();

    if (error.status !== 401) {
      showToast('Не удалось загрузить профиль', 'error');
    }
  }
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.registerForm.addEventListener('submit', handleRegister);
  elements.editForm.addEventListener('submit', handleEditSubmit);
  elements.editAvatarInput.addEventListener('change', handleAvatarChange);

  elements.openLogin.addEventListener('click', openLoginDialog);
  elements.openRegister.addEventListener('click', openRegisterDialog);

  elements.switchToRegister.addEventListener('click', () => {
    closeDialog(elements.loginDialog);
    openRegisterDialog();
  });

  elements.switchToLogin.addEventListener('click', () => {
    closeDialog(elements.registerDialog);
    openLoginDialog();
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = button.closest('dialog');

      if (dialog) {
        closeDialog(dialog);
      }
    });
  });

  elements.editButton.addEventListener('click', showEdit);
  elements.logoutButton.addEventListener('click', handleLogout);
  elements.cancelEdit.addEventListener('click', () => {
    resetAvatarPreview();
    showProfile();
  });

  elements.deleteButton.addEventListener('click', () => {
    elements.deleteDialog.showModal();
  });

  elements.cancelDelete.addEventListener('click', () => {
    elements.deleteDialog.close();
  });

  elements.confirmDelete.addEventListener('click', handleDelete);

  [
    elements.loginDialog,
    elements.registerDialog,
    elements.deleteDialog,
  ].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });

  [elements.loginForm, elements.registerForm, elements.editForm].forEach(
    (form) => {
      form.addEventListener('input', () => {
        clearFormMessage(form);
        clearInvalidFields(form);
      });
    },
  );
}

function init() {
  bindEvents();
  restoreSession();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
