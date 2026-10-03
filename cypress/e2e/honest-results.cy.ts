function ready() {
  cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
}

/**
 * Delays only the first engine download, long enough to act on a running computation. A worker that is cancelled
 * simply abandons it, and every later request passes straight through.
 */
function slowFirstWasm(milliseconds: number) {
  let delayed = false;
  cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache' }));
  cy.intercept('**/*.wasm*', (request) => {
    if (delayed) return;
    delayed = true;
    request.on('response', (response) => response.setDelay(milliseconds));
  });
}

describe('Results say what was found', () => {
  it('shows components and loops with the pair count, not truncation artifacts', () => {
    cy.visit('/');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#metric-components').should('have.text', '1');
    cy.get('#metric-loops').should('have.text', '1');
    cy.get('#metric-voids').should('have.text', '—');
    cy.get('#diagram-note')
      .should('contain.text', 'Showing 33 of 33 pairs')
      .and('contain.text', 'truncation artifacts hidden');
    cy.get('#result-description')
      .should('contain.text', '1 connected component')
      .and('contain.text', '1 long-lived loop (H₁)')
      .and('contain.text', 'Long-lived means');
    cy.get('#result-json').invoke('text').then((text) => {
      const { persistence } = JSON.parse(text);
      expect(persistence.excludedPairs).to.have.property('2');
      expect(persistence.pairsByDimension).not.to.have.property('2');
    });
  });

  it('reports voids for a 3D cloud and none for a 2D one', () => {
    cy.visit('/');
    cy.get('#point-sample').select('sphere');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#metric-voids').should('not.have.text', '—');
    cy.get('#point-sample').select('circle');
    cy.get('#metric-voids').should('have.text', '—');
  });

  it('puts the counts of an image result in the same tiles', () => {
    cy.visit('/');
    cy.get('#cubical-tab').click();
    cy.get('#image-meta').should('contain.text', 'chocolate-doughnut');
    cy.get('#run-cubical').click();
    ready();
    cy.get('#metric-components').should('not.have.text', '—');
    cy.get('#metric-loops').should('have.text', '1');
    cy.get('#metric-voids').should('have.text', '—');
  });
});

describe('Filtration limits and failures', () => {
  it('accepts any positive filtration limit instead of blocking Compute on a step', () => {
    cy.visit('/');
    cy.get('[data-parameter="maxEdgeLength"]').clear().type('0.33');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).input.parameters.maxEdgeLength).to.equal(0.33));
  });

  it('reports an invalid limit in the page instead of a browser bubble', () => {
    cy.visit('/');
    cy.get('[data-parameter="maxEdgeLength"]').clear().type('-1');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'error');
    cy.get('#activity').should('contain.text', 'maxEdgeLength must be positive');
  });

  it('says so when the limit stops the filtration before the points connect', () => {
    cy.visit('/');
    cy.get('[data-parameter="maxEdgeLength"]').clear().type('0.1');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#result-description').should('contain.text', 'connected components; the points connect at');
    cy.get('#metric-components').should('not.have.text', '1');
  });
});

describe('Running and cancelling', () => {
  it('keeps Compute focusable while it runs and lets the person cancel', () => {
    slowFirstWasm(8000);
    cy.visit('/');
    cy.get('#cancel-simplicial').should('not.be.visible');
    cy.get('#run-simplicial').focus().click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'computing');
    cy.get('#run-simplicial').should('have.attr', 'aria-disabled', 'true').and('not.be.disabled');
    cy.focused().should('have.id', 'run-simplicial');
    cy.get('#cancel-simplicial').should('be.visible').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'idle');
    cy.get('#activity').should('have.text', 'Computation cancelled.');
    cy.get('#cancel-simplicial').should('not.be.visible');
    cy.get('#metric-components').should('have.text', '—');
    cy.get('#run-simplicial').should('have.attr', 'aria-disabled', 'false').click();
    ready();
    cy.get('#metric-components').should('have.text', '1');
  });

  it('shows the result after Compute on a phone', () => {
    cy.viewport(390, 844);
    cy.visit('/');
    cy.get('#run-simplicial').click();
    ready();
    cy.window().its('scrollY').should('be.greaterThan', 300);
    cy.get('.result-pane').should(($pane) => {
      const { top } = $pane[0]!.getBoundingClientRect();
      expect(top).to.be.lessThan(200);
    });
  });
});

describe('Uploaded images', () => {
  it('composites a transparent PNG over white so the object, not the background, is the foreground', () => {
    cy.visit('/');
    cy.window().then((win) => {
      const canvas = win.document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d')!;
      context.fillStyle = 'rgb(30,30,30)';
      context.beginPath();
      context.arc(64, 64, 50, 0, Math.PI * 2);
      context.arc(64, 64, 25, 0, Math.PI * 2, true);
      context.fill('evenodd');
      return canvas.toDataURL('image/png').split(',')[1]!;
    }).then((base64) => {
      cy.get('#cubical-tab').click();
      cy.get('#image-file').selectFile({ contents: Cypress.Buffer.from(base64, 'base64'), fileName: 'ring.png', mimeType: 'image/png' }, { force: true });
    });
    cy.get('#image-meta').should('contain.text', 'ring.png');
    cy.get('#color-preview').should(($canvas) => {
      const pixel = ($canvas[0] as HTMLCanvasElement).getContext('2d')!.getImageData(2, 2, 1, 1).data;
      expect([...pixel]).to.deep.equal([255, 255, 255, 255]);
    });
    cy.get('#run-cubical').click();
    ready();
    cy.get('#metric-components').should('have.text', '1');
    cy.get('#metric-loops').should('have.text', '1');
  });
});
