const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ ${label}`);
  } else {
    failures += 1;
    console.error(`✗ ${label}`);
  }
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      data = null;
    }
  }

  return { status: response.status, data };
}

async function main() {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const password = 'Password123!';
  const emailA = `e2e_smoke_a_${suffix}@example.com`;
  const emailB = `e2e_smoke_b_${suffix}@example.com`;
  let tokenA = null;
  let tokenB = null;

  try {
    const health = await request('/api/health');
    check('health 200', health.status === 200 && health.data.status === 'ok');

    const guestList = await request('/api/test-cases');
    check('гость не видит тест-кейсы (401)', guestList.status === 401);

    const guestUsers = await request('/api/users');
    check('гость не видит список пользователей (401)', guestUsers.status === 401);

    const registrationA = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'E2E Автор', email: emailA, password }
    });
    tokenA = registrationA.data && registrationA.data.token;
    check('регистрация A 201 и выдан токен', registrationA.status === 201 && Boolean(tokenA));
    check('пароль не возвращается', Boolean(registrationA.data && registrationA.data.user && !registrationA.data.user.passwordHash));

    const meA = await request('/api/auth/me', { token: tokenA });
    check('GET /me 200', meA.status === 200 && meA.data.user.email === emailA);

    const usersA = await request('/api/users', { token: tokenA });
    const listedUserA = usersA.data && usersA.data.items.find((item) => item.email === emailA);
    check('авторизованный пользователь видит список пользователей', usersA.status === 200 && Boolean(listedUserA));
    check('список пользователей не содержит passwordHash', Boolean(listedUserA && !listedUserA.passwordHash));

    const created = await request('/api/test-cases', {
      method: 'POST',
      token: tokenA,
      body: {
        title: 'Проверка входа',
        module: 'Авторизация',
        priority: 'high',
        steps: 'Открыть страницу\nВвести данные\nНажать кнопку'
      }
    });
    const caseId = created.data && created.data._id;
    check('создание тест-кейса 201', created.status === 201 && Boolean(caseId));

    const listA = await request('/api/test-cases', { token: tokenA });
    const listed = listA.data && listA.data.items.find((item) => item._id === caseId);
    check('автор видит свой тест-кейс', listA.status === 200 && Boolean(listed));
    check('в списке есть имя автора', Boolean(listed && listed.owner && listed.owner.name === 'E2E Автор'));

    const stats = await request('/api/test-cases/stats', { token: tokenA });
    check('сводка 200 и учитывает запись', stats.status === 200 && stats.data.total >= 1 && stats.data.draft >= 1);

    const updated = await request(`/api/test-cases/${caseId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { status: 'ready' }
    });
    check('автор меняет статус', updated.status === 200 && updated.data.status === 'ready');

    const registrationB = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'E2E Наблюдатель', email: emailB, password }
    });
    tokenB = registrationB.data && registrationB.data.token;
    check('регистрация B 201', registrationB.status === 201 && Boolean(tokenB));

    const listB = await request('/api/test-cases', { token: tokenB });
    const seenByB = listB.data && listB.data.items.find((item) => item._id === caseId);
    check('B видит чужой тест-кейс', listB.status === 200 && Boolean(seenByB));

    const getByB = await request(`/api/test-cases/${caseId}`, { token: tokenB });
    check('B читает чужой тест-кейс', getByB.status === 200 && getByB.data._id === caseId);

    const patchByB = await request(`/api/test-cases/${caseId}`, {
      method: 'PATCH',
      token: tokenB,
      body: { title: 'Чужая правка' }
    });
    check('B не может изменить чужой тест-кейс (403)', patchByB.status === 403);

    const deleteByB = await request(`/api/test-cases/${caseId}`, {
      method: 'DELETE',
      token: tokenB
    });
    check('B не может удалить чужой тест-кейс (403)', deleteByB.status === 403);

    const createdB = await request('/api/test-cases', {
      method: 'POST',
      token: tokenB,
      body: {
        title: 'Проверка фильтра',
        module: 'Реестр',
        priority: 'low',
        steps: 'Открыть реестр\nВыбрать фильтр'
      }
    });
    check('B создаёт свой тест-кейс', createdB.status === 201);
    const caseBId = createdB.data && createdB.data._id;

    const deleteA = await request(`/api/test-cases/${caseId}`, { method: 'DELETE', token: tokenA });
    check('A удаляет свой тест-кейс (204)', deleteA.status === 204);

    const deleteB = await request(`/api/test-cases/${caseBId}`, { method: 'DELETE', token: tokenB });
    check('B удаляет свой тест-кейс (204)', deleteB.status === 204);

    const deleteAccountA = await request('/api/auth/me', { method: 'DELETE', token: tokenA });
    check('A удаляет аккаунт (204)', deleteAccountA.status === 204);
    tokenA = null;

    const meAfterDelete = await request('/api/auth/me', { token: registrationA.data.token });
    check('токен удалённого пользователя не работает (401)', meAfterDelete.status === 401);

    const deleteAccountB = await request('/api/auth/me', { method: 'DELETE', token: tokenB });
    check('B удаляет аккаунт (204)', deleteAccountB.status === 204);
    tokenB = null;

    const loginAfterDelete = await request('/api/auth/login', {
      method: 'POST',
      body: { email: emailA, password }
    });
    check('вход удалённого пользователя невозможен (401)', loginAfterDelete.status === 401);
  } finally {
    if (tokenA) await request('/api/auth/me', { method: 'DELETE', token: tokenA }).catch(() => {});
    if (tokenB) await request('/api/auth/me', { method: 'DELETE', token: tokenB }).catch(() => {});
  }

  if (failures > 0) {
    console.error(`\nSmoke-тест не пройден. Ошибок: ${failures}`);
    process.exit(1);
  }

  console.log('\nSmoke-тест пройден полностью.');
}

main().catch((error) => {
  console.error('Ошибка smoke-теста:', error.message);
  process.exit(1);
});
