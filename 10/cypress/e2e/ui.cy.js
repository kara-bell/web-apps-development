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
      });
    });
  });
});
