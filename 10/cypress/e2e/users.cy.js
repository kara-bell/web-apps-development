describe('FS-05. Пользователи и профили', () => {
  it('TC-13. Список пользователей', () => {
    cy.createUser('e2e_users', { name: 'E2E Users' }).then((account) => {
      cy.loginWithToken(account.token, '/users');
      cy.contains('#users-count', 'Всего пользователей:').should('be.visible');
      cy.get('#users-body tr').should('have.length.at.least', 4);

      cy.contains('#users-body tr', 'anna@test.ru').should('contain', 'Анна Смирнова');
      cy.contains('#users-body tr', 'ivan@test.ru').should('contain', 'Иван Петров');
      cy.contains('#users-body tr', 'maria@test.ru').should('contain', 'Мария Кузнецова');
      cy.contains('#users-body tr', 'petr@test.ru').should('contain', 'Петр Сидоров');
      cy.contains('#users-body tr', account.email).should('contain', '(вы)');

      cy.get('#users-body tr').first().then(($row) => {
        expect($row.text()).to.match(/\d{2}\.\d{2}\.\d{4}/);
      });
    });
  });

  it('TC-14. Профиль пользователя только для чтения', () => {
    cy.createUser('e2e_profile', { name: 'E2E Profile' }).then((account) => {
      cy.loginWithToken(account.token, '/users');
      cy.contains('#users-body tr', 'anna@test.ru').find('button').click();

      cy.get('#user-dialog').should('be.visible');
      cy.get('#profile-name').should('have.text', 'Анна Смирнова');
      cy.get('#profile-email').should('have.text', 'anna@test.ru');
      cy.get('#profile-created').invoke('text').should('match', /\d{2}\.\d{2}\.\d{4}/);
      cy.get('#user-dialog input, #user-dialog textarea, #user-dialog select').should('not.exist');

      cy.request({
        url: '/api/users',
        headers: { Authorization: `Bearer ${account.token}` }
      }).then(({ body }) => {
        expect(body.items.length).to.be.at.least(4);
        expect(body.items[0]).to.have.all.keys('_id', 'name', 'email', 'createdAt');
        expect(body.items.some((user) => 'passwordHash' in user)).to.eq(false);
      });
    });
  });

  it('TC-15. Гость не видит страницу пользователей', () => {
    cy.visitAsGuest('/users');
    cy.location('pathname').should('eq', '/');
    cy.get('#guest-view').should('be.visible');
    cy.get('#users-body').should('not.exist');

    cy.request({ url: '/api/users', failOnStatusCode: false })
      .its('status')
      .should('eq', 401);
  });
});
