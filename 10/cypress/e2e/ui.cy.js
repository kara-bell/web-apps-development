describe('UI. Модальные окна и адаптивность', () => {
  it('TC-17. Модальные окна закрываются клавишей Escape', () => {
    cy.createUser('e2e_ui', { name: 'E2E UI' }).then((account) => {
      cy.loginWithToken(account.token);

      cy.get('[data-testid="open-create"]').click();
      cy.get('#case-dialog').should('have.attr', 'open');
      cy.get('#case-title').type('{esc}');
      cy.get('#case-dialog').should('not.have.attr', 'open');

      cy.get('#session-label').click();
      cy.get('#profile-dialog').should('have.attr', 'open');
      cy.get('#profile-dialog .icon-btn').type('{esc}');
      cy.get('#profile-dialog').should('not.have.attr', 'open');
    });
  });

  it('TC-18. Нет горизонтальной прокрутки страницы на 360/768/1440 px', () => {
    cy.createUser('e2e_responsive', { name: 'E2E Responsive' }).then((account) => {
      cy.loginWithToken(account.token);

      [360, 768, 1440].forEach((width) => {
        cy.viewport(width, 900);
        cy.get('#app-view').should('be.visible');
        cy.window().then((win) => {
          const documentElement = win.document.documentElement;
          expect(documentElement.scrollWidth).to.be.at.most(width + 1);
        });

        if (width === 360) {
          cy.get('.registry-panel .table-wrap').then(($element) => {
            expect($element[0].scrollWidth).to.be.at.most($element[0].clientWidth + 1);
          });
          cy.get('#cases-body button[data-action]').first().should('be.visible');
        }
      });
    });
  });

  it('TC-19. На мобильном профиль доступен по короткой подписи', () => {
    cy.createUser('e2e_mobile_profile', { name: 'E2E Mobile' }).then((account) => {
      cy.loginWithToken(account.token);
      cy.viewport(360, 800);
      cy.get('#session-label').should('have.text', 'Профиль').and('not.be.disabled').click();
      cy.get('#profile-dialog').should('be.visible');
      cy.get('#profile-name').should('have.text', account.name);
      cy.get('#profile-dialog .icon-btn').type('{esc}');
      cy.get('#profile-dialog').should('not.have.attr', 'open');
    });
  });

  it('TC-20. При загрузке списка показывается индикатор', () => {
    cy.createUser('e2e_loading', { name: 'E2E Loading' }).then((account) => {
      cy.intercept('GET', '/api/test-cases*', (req) => {
        req.on('response', (res) => {
          res.setDelay(700);
        });
      }).as('cases');

      cy.loginWithToken(account.token);
      cy.get('#table-loading').should('be.visible');
      cy.wait('@cases');
      cy.get('#table-loading').should('not.be.visible');
    });
  });
});
