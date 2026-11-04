describe('FS-01 / FS-02. Аутентификация и защита аккаунта', () => {
  it('TC-01. Регистрация и восстановление сессии', () => {
    const email = `e2e_auth_${Date.now()}@test.ru`;

    cy.visitAsGuest();
    cy.get('[data-testid="open-register"]').click();
    cy.get('#register-form [name="name"]').type('E2E Auth');
    cy.get('#register-form [name="email"]').type(email);
    cy.get('#register-form [name="password"]').type('Password123!');
    cy.get('#register-form button[type="submit"]').click();

    cy.contains('#session-label', 'Вы вошли: E2E Auth').should('be.visible');
    cy.get('#app-view').should('be.visible');
    cy.trackCurrentToken();

    cy.reload();
    cy.contains('#session-label', 'Вы вошли: E2E Auth').should('be.visible');
    cy.get('#app-view').should('be.visible');
  });

  it('TC-02. Занятый e-mail и неверные поля регистрации', () => {
    cy.visitAsGuest();
    cy.get('[data-testid="open-register"]').click();

    cy.get('#register-form [name="name"]').type('E2E Dup');
    cy.get('#register-form [name="email"]').type('anna@test.ru');
    cy.get('#register-form [name="password"]').type('Password123!');
    cy.get('#register-form button[type="submit"]').click();
    cy.get('#register-error').should('contain', 'уже зарегистрирован');
    cy.get('#register-error li').should('have.length', 1);

    cy.get('#register-form [name="name"]').clear();
    cy.get('#register-form [name="email"]').clear();
    cy.get('#register-form [name="password"]').clear();
    cy.get('#register-form button[type="submit"]').click();
    cy.get('#register-error')
      .should('contain', 'Имя должно содержать')
      .and('contain', 'Укажите корректный e-mail')
      .and('contain', 'Пароль должен содержать');
    cy.get('#register-error li').should('have.length', 3);
  });

  it('TC-03. Выход, неверный и корректный вход', () => {
    cy.createUser('e2e_login', { name: 'E2E Login' }).then((account) => {
      cy.visitAsGuest();
      cy.get('[data-testid="open-login"]').click();

      cy.fillLoginForm(account.email, 'Wrong123!');
      cy.get('#login-form button[type="submit"]').click();
      cy.get('#login-error').should('contain', 'Неверный e-mail или пароль');

      cy.fillLoginForm(account.email, account.password);
      cy.get('#login-form button[type="submit"]').click();
      cy.contains('#session-label', 'Вы вошли: E2E Login').should('be.visible');
      cy.get('#app-view').should('be.visible');
    });
  });

  it('TC-04. Гость не получает защищённые данные', () => {
    cy.visitAsGuest();
    cy.get('#guest-view').should('be.visible');
    cy.get('#app-view').should('have.class', 'hidden');

    cy.request({
      url: '/users',
      followRedirect: false,
      failOnStatusCode: false
    })
      .its('status')
      .should('eq', 302);

    cy.visitAsGuest('/users');
    cy.location('pathname').should('eq', '/');
    cy.get('#guest-view').should('be.visible');

    cy.request({ url: '/api/test-cases', failOnStatusCode: false })
      .its('status')
      .should('eq', 401);
    cy.request({ url: '/api/users', failOnStatusCode: false })
      .its('status')
      .should('eq', 401);
  });

  it('TC-05. Испорченный и просроченный токен', () => {
    cy.createUser('e2e_token', { name: 'E2E Token' }).then((account) => {
      cy.task('expiredToken', { sub: account.user._id }).then((expiredToken) => {
        cy.request({
          url: '/api/auth/me',
          headers: { Authorization: `Bearer ${expiredToken}` },
          failOnStatusCode: false
        })
          .its('status')
          .should('eq', 401);
      });
    });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('qualityhub10_token', 'invalid-token');
      }
    });
    cy.get('#toast').should('contain', 'Сессия истекла');
    cy.get('#guest-view').should('be.visible');
    cy.window().its('localStorage').invoke('getItem', 'qualityhub10_token').should('eq', null);
  });

  it('TC-06. Удаление аккаунта вместе с тест-кейсами', () => {
    cy.createUser('e2e_delete', { name: 'E2E Delete' }).then((owner) => {
      cy.createUser('e2e_observer', { name: 'E2E Observer' }).then((observer) => {
        cy.createCase(owner.token, {
          title: 'E2E Delete Case',
          module: 'E2E',
          priority: 'low',
          steps: 'Создать запись. Удалить аккаунт. Проверить запись.'
        }).then((created) => {
          const caseId = created.body._id;

          cy.loginWithToken(owner.token);
          cy.get('#session-label').click();
          cy.get('#open-delete-account').click();
          cy.get('#confirm-delete-account').click();
          cy.get('#guest-view').should('be.visible');
          cy.get('#toast').should('contain', 'Аккаунт удалён.');

          cy.request({
            url: '/api/auth/me',
            headers: { Authorization: `Bearer ${owner.token}` },
            failOnStatusCode: false
          })
            .its('status')
            .should('eq', 401);

          cy.request({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: owner.email, password: owner.password },
            failOnStatusCode: false
          })
            .its('status')
            .should('eq', 401);

          cy.request({
            url: `/api/test-cases/${caseId}`,
            headers: { Authorization: `Bearer ${observer.token}` },
            failOnStatusCode: false
          })
            .its('status')
            .should('eq', 404);
        });
      });
    });
  });
});
