function ready() {
  cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
  cy.get('#result-json').invoke('text').then((text) => {
    expect(JSON.parse(text).persistence.pairCount).to.be.greaterThan(0);
  });
}

describe('Workbench input and recovery journeys', () => {
  it('uses one keyboard tab stop and supports arrow, Home, and End navigation', () => {
    cy.visit('/');
    cy.get('[role="tab"][tabindex="0"]').should('have.length', 1);
    cy.get('#simplicial-tab').focus().type('{rightarrow}');
    cy.get('#cubical-tab').should('be.focused').and('have.attr', 'aria-selected', 'true');
    cy.get('#cubical-panel').should('be.visible').and('have.attr', 'aria-labelledby', 'cubical-tab');
    cy.get('#simplicial-panel').should('not.be.visible');
    cy.get('#cubical-tab').type('{rightarrow}');
    cy.get('#simplicial-tab').should('be.focused');
    cy.get('#simplicial-tab').type('{end}');
    cy.get('#cubical-tab').should('be.focused');
    cy.get('#cubical-tab').type('{home}');
    cy.get('#simplicial-tab').should('be.focused');
  });

  it('invalidates changed coefficient and filtration settings, then computes the new input', () => {
    cy.visit('/');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#coefficient-field').select('3');
    cy.get('#compute-status').should('have.attr', 'data-status', 'idle');
    cy.get('#metric-features').should('have.text', '—');
    cy.get('#toggle-filtration').should('be.disabled');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).input.coefficientField).to.equal(3));
    cy.get('[data-parameter="maxEdgeLength"]').clear().type('1');
    cy.get('#compute-status').should('have.attr', 'data-status', 'idle');
    cy.get('#filtration-progress').should('be.disabled');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).input.parameters.maxEdgeLength).to.equal(1));
  });

  it('does not restore a superseded result after an input edit during computation', () => {
    let completedWorkerMessages = 0;
    // A warm browser cache bypasses cy.intercept; this case needs a real delayed load.
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache' }));
    cy.intercept('**/*.wasm*', (request) => request.on('response', (response) => response.setDelay(1000))).as('wasm');
    cy.visit('/', {
      onBeforeLoad(win) {
        const NativeWorker = win.Worker;
        // Observe the real worker's completion; do not substitute its computation.
        win.Worker = class extends NativeWorker {
          constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            this.addEventListener('message', () => { completedWorkerMessages += 1; });
          }
        };
      },
    });
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'computing');
    cy.get('#coefficient-field').select('3');
    cy.wait('@wasm');
    cy.wrap(null).should(() => expect(completedWorkerMessages, 'the original worker actually finished').to.be.greaterThan(0));
    cy.get('#compute-status').should('have.attr', 'data-status', 'idle');
    cy.get('#metric-features').should('have.text', '—');
    cy.get('#toggle-filtration').should('be.disabled');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).input.coefficientField).to.equal(3));
  });

  it('recovers from invalid point JSON through a bundled dataset', () => {
    cy.visit('/');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('.advanced-input summary').click();
    cy.get('#points-input').clear().type('invalid JSON');
    cy.get('#toggle-filtration').should('be.disabled');
    cy.get('#metric-features').should('have.text', '—');
    cy.get('#points-input').should('have.attr', 'aria-invalid', 'true');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'error');
    cy.get('#activity').should('not.be.empty');
    cy.get('#point-sample').select('figure-eight');
    cy.get('#run-simplicial').click();
    ready();
    cy.get('#activity').should('contain', 'ready');
  });

  it('reports request validation errors instead of silently ignoring Compute', () => {
    cy.visit('/');
    cy.get('.advanced-input summary').click();
    cy.get('#points-input').clear().type('[[10000000,0],[0,10000000]]');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'error');
    cy.get('#activity').should('contain', 'coordinate magnitude limit');
    cy.get('#point-sample').select('circle');
    cy.get('#run-simplicial').click();
    ready();
  });

  for (const sample of ['donut', 'pretzel', 'glasses']) {
    it(`computes the ${sample} image and preserves all three preview stages in grayscale mode`, () => {
      cy.visit('/');
      cy.get('#cubical-tab').click();
      cy.get('#image-sample').select(sample);
      cy.get('#image-meta').should('not.contain', 'loading-example');
      cy.get('#image-meta').should('contain', sample === 'glasses' ? 'eyeglasses' : sample === 'donut' ? 'chocolate-doughnut' : 'soft-pretzel');
      cy.get('#run-cubical').click();
      ready();
      cy.get('#result-json').invoke('text').then((text) => {
        const result = JSON.parse(text);
        expect(result.kind).to.equal('cubical');
        expect(result.input.binarized).to.equal(true);
        if (sample === 'glasses') expect(result.persistence.pairsByDimension['1']).to.equal(2);
      });
      cy.get('#binarize').uncheck();
      cy.get('#compute-status').should('have.attr', 'data-status', 'idle');
      cy.get('#image-pipeline').should('have.attr', 'data-steps', '3');
      cy.get('#mask-stage').should('be.visible').and('have.attr', 'aria-disabled', 'true');
      cy.get('#threshold').should('be.disabled');
      cy.get('#run-cubical').click();
      ready();
      cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).input.binarized).to.equal(false));
    });
  }

  it('uploads an image locally and gives its keyboard file input a visible focus indicator', () => {
    cy.visit('/');
    cy.get('#cubical-tab').click();
    cy.get('#image-file').focus();
    cy.get('.upload-button').should('have.css', 'outline-style', 'solid');
    cy.get('#image-file').selectFile('public/samples/glasses.jpg', { force: true });
    cy.get('#image-meta').should('contain', 'glasses.jpg');
    cy.get('#image-sample').should('have.value', 'custom');
    cy.get('#run-cubical').click();
    ready();
    cy.get('#result-description').should('contain', 'glasses.jpg');
    cy.screenshot('uploaded-image-result');
  });

  it('keeps both input modes inside a mobile viewport', () => {
    cy.viewport(390, 844);
    cy.visit('/');
    cy.document().should((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
    cy.get('#cubical-tab').click();
    cy.get('#image-meta').should('contain', 'chocolate-doughnut');
    cy.document().should((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
    cy.get('#run-cubical').should('be.visible');
    cy.screenshot('mobile-image-workbench');
  });
});
