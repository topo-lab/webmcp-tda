describe('WebMCP TDA video capture', () => {
  it('shows the complete human workbench flow', () => {
    cy.viewport(1440, 900);
    cy.visit('/');
    cy.get('h1').should('contain.text', 'Find the shape');
    cy.wait(2500);

    cy.get('#workbench').scrollIntoView();
    cy.get('[data-testid="tda-point"]').should('have.length', 32);
    cy.wait(1800);
    cy.get('#toggle-point-axes').click();
    cy.wait(1800);

    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.wait(2200);
    cy.get('#toggle-filtration').click();
    cy.wait(3200);
    cy.get('#toggle-filtration').click();
    cy.wait(1600);

    cy.get('.diagram-card').scrollIntoView();
    cy.wait(2200);

    cy.get('[data-mode="cubical"]').click();
    cy.get('#image-sample').select('pretzel');
    cy.get('#image-meta').should('contain.text', 'pretzel');
    cy.wait(2200);
    cy.get('#run-cubical').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.wait(2800);

    cy.get('#agent-access').scrollIntoView();
    cy.wait(3500);
  });
});
