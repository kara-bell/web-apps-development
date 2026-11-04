const TOKEN_KEY = 'qualityhub10_token';
const CSRF_KEY = 'qualityhub10_csrf';
const PASSWORD = 'Password123!';
const cleanupTokens = [];

function uniqueSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

beforeEach(() => {
  cleanupTokens.length = 0;
});

afterEach(() => {
  const tokens = [...cleanupTokens];
  cleanupTokens.length = 0;

  if (tokens.length > 0) {
    cy.wrap(tokens, { log: false }).each((token) => {
      cy.request({
        method: 'DELETE',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
        log: false
      });
    });
  }
});

Cypress.Commands.add('trackToken', (token) => {
  if (token) cleanupTokens.push(token);
});

Cypress.Commands.add('trackCurrentToken', () => {
  cy.getCookie(TOKEN_KEY).then((cookie) => {
    if (cookie) cleanupTokens.push(cookie.value);
  });
});

Cypress.Commands.add('createUser', (prefix = 'e2e_auto', options = {}) => {
  const suffix = uniqueSuffix();
  const email = `${prefix}_${suffix}@test.ru`;
  const name = options.name || `E2E ${suffix}`;

  return cy
    .request({
      method: 'POST',
      url: '/api/auth/register',
      body: { name, email, password: PASSWORD },
      failOnStatusCode: false
    })
    .then((response) => {
      expect(response.status, 'регистрация тестового пользователя').to.eq(201);
      cleanupTokens.push(response.body.token);
      return {
        token: response.body.token,
        user: response.body.user,
        email,
        password: PASSWORD,
        name
      };
    });
});

Cypress.Commands.add('loginWithToken', (token, path = '/') => {
  cy.setCookie(TOKEN_KEY, token, { httpOnly: true, sameSite: 'lax' });
  cy.setCookie(CSRF_KEY, 'e2e-csrf-token', { sameSite: 'lax' });
  cy.visit(path);
});

Cypress.Commands.add('visitAsGuest', (path = '/') => {
  cy.clearCookies();
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.clear();
    }
  });
});

Cypress.Commands.add('createCase', (token, payload) => {
  return cy.request({
    method: 'POST',
    url: '/api/test-cases',
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    failOnStatusCode: false
  });
});

Cypress.Commands.add('deleteAccount', (token) => {
  return cy.request({
    method: 'DELETE',
    url: '/api/auth/me',
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false
  });
});

Cypress.Commands.add('fillCaseForm', (testCase) => {
  cy.get('#case-title').clear().type(testCase.title);
  cy.get('#case-module').clear().type(testCase.module);
  cy.get('#case-priority').select(testCase.priority);
  cy.get('#case-steps').clear().type(testCase.steps);
});

Cypress.Commands.add('fillRegisterForm', (user) => {
  cy.get('#register-form [name="name"]').clear().type(user.name);
  cy.get('#register-form [name="email"]').clear().type(user.email);
  cy.get('#register-form [name="password"]').clear().type(user.password);
});

Cypress.Commands.add('fillLoginForm', (email, password) => {
  cy.get('#login-form [name="email"]').clear().type(email);
  cy.get('#login-form [name="password"]').clear().type(password);
});
