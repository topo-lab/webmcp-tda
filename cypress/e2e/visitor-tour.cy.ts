// Production smoke test: a visitor's tour of the built site at desktop and phone sizes.
// Run against `vite preview` of `npm run build`, e.g.
//   npx cypress run --spec cypress/e2e/visitor-tour.cy.ts --config baseUrl=http://127.0.0.1:4370

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;

// Visible text that must never reach a visitor. The licence files are plain-text downloads, not page text.
const BLOCKLIST =
  /topolab\.app|hello@|TopoLab|\bTopolab\b|TDA Explorer|PLACEHOLDER|lorem ipsum|\bTODO\b|localhost|honest|clean-room|unofficial|independent of|not affiliated|Geogram|C\+\+|npm install @topolab|github\.com\/topo-lab\/(?!webmcp-tda)/;

function visit() {
  cy.visit('/', {
    onBeforeLoad(win) {
      cy.stub(win.console, 'error').as('consoleError');
    },
  });
  cy.get('#page-title').should('be.visible');
}

function ready() {
  cy.get('#compute-status', { timeout: 60_000 }).should('have.attr', 'data-status', 'ready');
  cy.get('#result-json')
    .invoke('text')
    .then((text) => expect(JSON.parse(text).persistence.pairCount).to.be.greaterThan(0));
}

function readTopToBottom() {
  cy.window().then((win) => {
    const steps = Math.ceil(win.document.documentElement.scrollHeight / win.innerHeight);
    for (let step = 0; step <= steps; step += 1) {
      cy.scrollTo(0, step * win.innerHeight, { ensureScrollable: false });
      cy.wait(150);
    }
  });
  cy.scrollTo('top', { ensureScrollable: false });
}

function checkPage() {
  cy.window().then((win) => {
    const doc = win.document;
    expect(doc.documentElement.scrollWidth, 'no horizontal overflow').to.be.at.most(win.innerWidth + 1);
    for (const image of Array.from(doc.images)) {
      if (image.complete) expect(image.naturalWidth, `image ${image.src} loaded`).to.be.greaterThan(0);
    }
    const text = doc.body.innerText;
    const hit = text.match(BLOCKLIST);
    expect(hit?.[0] ?? null, 'blocklisted visible text').to.equal(null);
  });
  cy.get('@consoleError').should('not.have.been.called');
}

function checkSameOriginLinks() {
  cy.get('a[href]').each(($a) => {
    const href = ($a[0] as HTMLAnchorElement).href;
    const url = new URL(href);
    if (url.origin !== window.location.origin && url.origin !== new URL(Cypress.config('baseUrl') as string).origin) return;
    if (url.hash && url.pathname === '/') {
      cy.get(url.hash).should('exist');
      return;
    }
    cy.request(href).its('status').should('eq', 200);
  });
}

for (const viewport of VIEWPORTS) {
  describe(`Visitor tour at ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    beforeEach(() => cy.viewport(viewport.width, viewport.height));

    it('reads the page, follows its links and opens the credits', () => {
      visit();
      readTopToBottom();
      checkPage();
      checkSameOriginLinks();
      cy.get('#webmcp-status').should('not.contain', 'checking');
      // The example photo preloads quietly; a fresh page must not announce it over the point-cloud tab.
      cy.get('#activity').should('not.contain', 'Loaded');
      cy.request('/favicon.svg').its('status').should('eq', 200);
      if (viewport.width >= 1024) {
        // The phone layout hides the two in-page anchors; a phone reader scrolls instead.
        cy.contains('header a', 'Agent access').click();
        cy.contains('header a', 'Workbench').click();
      }
      cy.get('#agent-access').scrollIntoView().should('be.visible');
      cy.get('.tool-list article').should('have.length', 4);
      cy.get('#workbench').scrollIntoView().should('be.visible');
      cy.get('.credits summary').scrollIntoView().click();
      cy.get('#credits').should('be.visible').and('contain', 'tda-wasm');
      checkPage();
      cy.screenshot(`${viewport.name}-01-page`, { capture: 'fullPage' });
      cy.get('.credits summary').click();
      // Cypress reports the slotted content of a closed <details> as visible on some layouts; the state is the attribute.
      cy.get('.credits').should('not.have.attr', 'open');
    });

    it('computes each complex on point clouds and plays the filtration', () => {
      visit();
      for (const kind of ['rips', 'alpha', 'cech']) {
        cy.get('#point-sample').select('circle');
        cy.get('#complex-kind').select(kind);
        cy.get('#run-simplicial').click();
        ready();
        cy.get('#metric-components').should('not.have.text', '—');
        cy.get('#metric-loops').should('have.text', '1');
        cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).complex).to.equal(kind));
      }
      cy.get('#point-sample').select('sphere');
      cy.get('#complex-kind').select('alpha');
      cy.get('#run-simplicial').click();
      ready();
      cy.get('#metric-voids').should('have.text', '1');
      cy.get('#toggle-filtration').should('not.be.disabled').click();
      cy.wait(800);
      cy.get('#toggle-filtration').click();
      cy.get('#filtration-value').should('not.contain', 'Compute first');
      cy.get('.raw-result summary').click();
      cy.get('#result-json').should('be.visible');
      cy.get('#diagram').scrollIntoView();
      checkPage();
      cy.screenshot(`${viewport.name}-02-point-cloud-result`, { capture: 'fullPage' });
    });

    it('computes cubical persistence for each example photo', () => {
      visit();
      cy.get('#cubical-tab').click();
      cy.get('#cubical-panel').should('be.visible');
      for (const sample of ['donut', 'pretzel', 'glasses']) {
        cy.get('#image-sample').select(sample);
        cy.get('#run-cubical').should('have.attr', 'aria-disabled', 'false').click();
        ready();
        cy.get('#result-json').invoke('text').then((text) => expect(JSON.parse(text).kind).to.equal('cubical'));
        cy.get('#result-description').should('not.be.empty');
      }
      cy.get('#metric-loops').should('have.text', '2');
      checkPage();
      cy.screenshot(`${viewport.name}-03-image-result`, { capture: 'fullPage' });
    });
  });
}
