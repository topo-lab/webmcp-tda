describe('Devpost media capture', () => {
  it('captures the live human and agent workbench', () => {
    cy.viewport(1440, 960);
    cy.visit('/');
    cy.get('h1').should('contain.text', 'Find the shape');
    cy.wait(500);
    cy.screenshot('01-hero', { capture: 'viewport', overwrite: true });

    cy.get('#workbench').scrollIntoView();
    cy.get('[data-testid="tda-point"]').should('have.length', 32);
    cy.wait(300);
    cy.screenshot('02-point-cloud-workbench', { capture: 'viewport', overwrite: true });

    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.get('#diagram').should(($diagram) => {
      expect(($diagram[0] as HTMLElement & { data?: unknown[] }).data).to.have.length(3);
    });
    cy.wait(300);
    cy.screenshot('03-persistence-result', { capture: 'viewport', overwrite: true });

    cy.get('[data-mode="cubical"]').click();
    cy.get('#image-sample').select('pretzel');
    cy.get('#image-meta').should('contain.text', 'pretzel');
    cy.wait(300);
    cy.screenshot('04-image-pipeline', { capture: 'viewport', overwrite: true });

    cy.get('#run-cubical').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.wait(300);
    cy.screenshot('05-image-result', { capture: 'viewport', overwrite: true });

    cy.get('#agent-access').scrollIntoView();
    cy.wait(300);
    cy.screenshot('06-webmcp-tools', { capture: 'viewport', overwrite: true });
  });
});
