function setupRegistry() {
  const moduleName = `E2E_AUTO_${Date.now()}`;

  return cy.createUser('e2e_owner', { name: 'E2E Owner' }).then((owner) =>
    cy.createUser('e2e_viewer', { name: 'E2E Viewer' }).then((viewer) =>
      cy
        .createCase(owner.token, {
          title: 'E2E Auto Alpha',
          module: moduleName,
          priority: 'high',
          status: 'ready',
          steps: 'alpha-step: открыть реестр и проверить запись'
        })
        .then((alpha) =>
          cy
            .createCase(owner.token, {
              title: 'E2E Auto Beta',
              module: moduleName,
              priority: 'medium',
              status: 'draft',
              steps: 'beta-step: проверить изменение статуса'
            })
            .then((beta) =>
              cy
                .createCase(viewer.token, {
                  title: 'E2E Auto Gamma',
                  module: moduleName,
                  priority: 'high',
                  status: 'in_progress',
                  steps: 'gamma-step: проверить чужие права'
                })
                .then((gamma) => ({
                  owner,
                  viewer,
                  moduleName,
                  alpha: alpha.body,
                  beta: beta.body,
                  gamma: gamma.body
                }))
            )
        )
    )
  );
}

describe('FS-03 / FS-04. Реестр тест-кейсов', () => {
  it('TC-07. Создание корректного тест-кейса', () => {
    cy.createUser('e2e_create', { name: 'E2E Creator' }).then((account) => {
      cy.loginWithToken(account.token);
      cy.get('[data-testid="open-create"]').click();
      cy.fillCaseForm({
        title: 'E2E Auto Created',
        module: 'E2E Auto',
        priority: 'high',
        steps: 'Открыть форму. Заполнить поля. Сохранить.'
      });
      cy.get('#case-submit').click();

      cy.contains('#cases-body tr', 'E2E Auto Created').within(() => {
        cy.contains('Черновик');
        cy.contains('(вы)');
        cy.contains('Удалить');
      });
      cy.get('#toast').should('contain', 'Тест-кейс добавлен.');
    });
  });

  it('TC-08. Валидация полей и недопустимый приоритет', () => {
    cy.createUser('e2e_validate', { name: 'E2E Validate' }).then((account) => {
      const auth = { Authorization: `Bearer ${account.token}` };

      cy.loginWithToken(account.token);
      cy.request({ url: '/api/test-cases/stats', headers: auth }).then((before) => {
        cy.get('[data-testid="open-create"]').click();
        cy.get('#case-submit').click();
        cy.get('#case-error')
          .should('contain', 'Название должно содержать')
          .and('contain', 'Модуль должен содержать')
          .and('contain', 'Шаги должны содержать');

        cy.fillCaseForm({
          title: 'ab',
          module: 'a',
          priority: 'medium',
          steps: '1234'
        });
        cy.get('#case-submit').click();
        cy.get('#case-error').should('contain', 'Название должно содержать');
        cy.get('#case-dialog [data-close]').first().click();

        cy.request({
          method: 'POST',
          url: '/api/test-cases',
          headers: auth,
          body: {
            title: 'E2E Invalid Priority',
            module: 'E2E',
            priority: 'urgent',
            steps: 'Проверка недопустимого приоритета'
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body.fields.priority).to.contain('приоритет');
        });

        cy.request({ url: '/api/test-cases/stats', headers: auth }).then((after) => {
          expect(after.body.total).to.eq(before.body.total);
        });
      });
    });
  });

  it('TC-09. Граничные значения полей', () => {
    cy.createUser('e2e_bounds', { name: 'E2E Bounds' }).then((account) => {
      const headers = {
        Authorization: `Bearer ${account.token}`,
        'Content-Type': 'application/json'
      };

      const post = (body) =>
        cy.request({
          method: 'POST',
          url: '/api/test-cases',
          headers,
          body,
          failOnStatusCode: false
        });

      post({
        title: '  E2E Min  ',
        module: ' AB ',
        priority: 'low',
        steps: ' 12345 '
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.title).to.eq('E2E Min');
        expect(response.body.module).to.eq('AB');
        expect(response.body.steps).to.eq('12345');
      });

      post({
        title: 'A'.repeat(120),
        module: 'B'.repeat(60),
        priority: 'medium',
        steps: 'C'.repeat(2000)
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.title).to.have.length(120);
        expect(response.body.module).to.have.length(60);
        expect(response.body.steps).to.have.length(2000);
      });

      post({
        title: 'D'.repeat(121),
        module: 'E'.repeat(61),
        priority: 'high',
        steps: 'F'.repeat(2001)
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.fields).to.have.all.keys('title', 'module', 'steps');
      });
    });
  });

  it('TC-10. Список, авторы и сводка', () => {
    setupRegistry().then((data) => {
      cy.loginWithToken(data.owner.token);

      cy.contains('#cases-body tr', 'E2E Auto Alpha').within(() => {
        cy.contains('(вы)');
        cy.contains('Удалить');
      });

      cy.contains('#cases-body tr', 'E2E Auto Gamma').within(() => {
        cy.contains('E2E Viewer');
        cy.contains('Просмотр');
        cy.contains('Удалить').should('not.exist');
      });

      cy.request({
        url: '/api/test-cases/stats',
        headers: { Authorization: `Bearer ${data.owner.token}` }
      }).then(({ body }) => {
        cy.get('#stat-total').should('have.text', String(body.total));
        cy.get('#stat-draft').should('have.text', String(body.draft));
        cy.get('#stat-in-progress').should('have.text', String(body.in_progress));
        cy.get('#stat-ready').should('have.text', String(body.ready));
        cy.get('#stat-high').should('have.text', String(body.high));
      });
    });
  });

  it('TC-11. Поиск, фильтры, сводка и пустое состояние', () => {
    setupRegistry().then((data) => {
      cy.loginWithToken(data.owner.token);

      cy.get('#search').type(data.moduleName);
      cy.get('#cases-body tr').should('have.length', 3);

      cy.get('#search').clear().type('E2E Auto Alpha');
      cy.get('#cases-body tr').should('have.length', 1);

      cy.get('#search').clear().type('gamma-step');
      cy.get('#cases-body tr').should('have.length', 1);

      cy.get('#search').clear().type(data.moduleName);
      cy.get('#priority-filter').select('high');
      cy.get('#cases-body tr').should('have.length', 2);

      cy.get('#priority-filter').select('');
      cy.get('#status-filter').select('draft');
      cy.get('#cases-body tr').should('have.length', 1);

      cy.get('#stats [data-stat="ready"]').click();
      cy.get('#stats [data-stat="ready"]')
        .should('have.attr', 'aria-pressed', 'true');
      cy.get('#status-filter').should('have.value', 'ready');

      cy.request({
        url: '/api/test-cases',
        headers: { Authorization: `Bearer ${data.owner.token}` }
      }).then(({ body }) => {
        cy.get('#stats [data-stat="all"]').click();
        cy.get('#cases-body tr').should('have.length', body.items.length);
      });

      cy.get('#search').clear().type('zzzz');
      cy.get('#cases-body .empty').should('contain', 'Тест-кейсов пока нет.');
    });
  });

  it('TC-12. Чужая запись только для чтения, своя — изменение и удаление', () => {
    setupRegistry().then((data) => {
      const auth = { Authorization: `Bearer ${data.owner.token}` };
      cy.loginWithToken(data.owner.token);

      cy.contains('#cases-body tr', 'E2E Auto Gamma').find('.case-title').click();
      cy.get('#case-dialog-title').should('contain', 'Просмотр тест-кейса');
      cy.get('#case-note').should('contain', 'E2E Viewer');
      cy.get('#case-title').should('be.disabled');
      cy.get('#case-module').should('be.disabled');
      cy.get('#case-priority').should('be.disabled');
      cy.get('#case-steps').should('be.disabled');
      cy.get('#case-submit').should('have.class', 'hidden');
      cy.get('#case-dialog [data-close]').first().click();

      cy.request({
        method: 'PATCH',
        url: `/api/test-cases/${data.gamma._id}`,
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: { title: 'Hacked' },
        failOnStatusCode: false
      })
        .its('status')
        .should('eq', 403);

      cy.request({
        method: 'DELETE',
        url: `/api/test-cases/${data.gamma._id}`,
        headers: auth,
        failOnStatusCode: false
      })
        .its('status')
        .should('eq', 403);

      cy.contains('#cases-body tr', 'E2E Auto Beta')
        .find('button[data-action="status"]')
        .click();
      cy.get('#toast').should('contain', 'Статус обновлён.');
      cy.contains('#cases-body tr', 'E2E Auto Beta').should('contain', 'В работе');

      cy.contains('#cases-body tr', 'E2E Auto Beta').find('.case-title').click();
      cy.get('#case-title').clear().type('E2E Auto Beta Updated');
      cy.get('#case-submit').click();
      cy.contains('#cases-body tr', 'E2E Auto Beta Updated').should('be.visible');

      cy.contains('#cases-body tr', 'E2E Auto Beta Updated')
        .find('button[data-action="delete"]')
        .click();
      cy.get('#confirm-delete').click();
      cy.get('#toast').should('contain', 'Тест-кейс удалён.');
      cy.get('#cases-body').should('not.contain', 'E2E Auto Beta Updated');
    });
  });

  it('TC-16. XSS в названии и шагах выводится как текст', () => {
    cy.createUser('e2e_xss', { name: 'E2E XSS' }).then((account) => {
      cy.createCase(account.token, {
        title: '<img src=x onerror="window.__xss=1">E2E XSS',
        module: 'E2E XSS',
        priority: 'high',
        steps: '<script>window.__xss=2</script>E2E XSS steps'
      }).then((response) => {
        expect(response.status).to.eq(201);
        cy.loginWithToken(account.token);
        cy.get('#cases-body .case-title').then(($titles) => {
          const titles = [...$titles].map((element) => element.textContent);
          expect(titles.some((text) => text.includes('<img'))).to.eq(true);
        });
        cy.get('#cases-body img').should('not.exist');
        cy.window().then((win) => {
          expect(win.__xss).to.eq(undefined);
        });
      });
    });
  });
});
