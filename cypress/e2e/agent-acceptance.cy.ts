/**
 * Automates docs/AGENT_ACCEPTANCE.md against the real page, Worker and WebAssembly engine.
 *
 * A browser that exposes WebMCP is replaced by a small recorder shaped like the draft API: it keeps what the page
 * registers, removes a tool when its signal aborts, and lets the test call `execute` the way an agent host does.
 * This proves registration, closed-form results, shared state and error handling end to end. It does not prove how
 * any particular browser or agent client behaves, so the manual checklist still applies for a release.
 */

interface RegisteredTool {
  name: string;
  execute: (input?: unknown, options?: { signal: AbortSignal }) => Promise<unknown>;
  signal: AbortSignal;
}

type Agent = {
  tools: () => string[];
  call: (name: string, input?: unknown, signal?: AbortSignal) => Promise<any>;
};

declare global {
  interface Window {
    __agent: Agent;
  }
}

function visitWithAgent(): void {
  cy.visit('/', {
    onBeforeLoad(win) {
      const registered = new Map<string, RegisteredTool>();
      Object.defineProperty(win.document, 'modelContext', {
        configurable: true,
        value: {
          registerTool(tool: { name: string; execute: RegisteredTool['execute'] }, options: { signal: AbortSignal }) {
            registered.set(tool.name, { name: tool.name, execute: tool.execute, signal: options.signal });
            options.signal.addEventListener('abort', () => registered.delete(tool.name), { once: true });
            return Promise.resolve();
          },
        },
      });
      win.__agent = {
        tools: () => [...registered.keys()],
        call: (name, input, signal) => registered.get(name)!.execute(input, { signal: signal ?? new AbortController().signal }),
      };
    },
  });
  cy.get('#webmcp-status').should('have.attr', 'data-status', 'ready');
}

function call(name: string, input?: unknown) {
  return cy.window().then((win) => win.__agent.call(name, input));
}

const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
const closeTo = (actual: number, expected: number) => expect(Math.abs(actual - expected), `${actual} vs ${expected}`).to.be.lessThan(1e-10);

function finiteLoops(result: any): Array<[number, number]> {
  return result.pairs.filter((p: any) => p.dimension === 1 && p.death !== 'infinity').map((p: any) => [p.birth, p.death]);
}

describe('Agent acceptance through a recorded WebMCP channel', () => {
  it('registers exactly the four tools, and removes them when the page is stored for back/forward navigation', () => {
    visitWithAgent();
    cy.window().then((win) => {
      expect(win.__agent.tools().sort()).to.deep.equal([
        'tda_compute_cubical_persistence',
        'tda_compute_simplicial_persistence',
        'tda_get_capabilities',
        'tda_get_latest_result',
      ]);
      win.dispatchEvent(new win.PageTransitionEvent('pagehide', { persisted: true }));
      expect(win.__agent.tools(), 'stored pages unregister').to.deep.equal([]);
      win.dispatchEvent(new win.PageTransitionEvent('pageshow', { persisted: true }));
    });
    cy.get('#webmcp-status').should('have.attr', 'data-status', 'ready');
    cy.window().its('__agent').invoke('tools').should('have.length', 4);
  });

  it('describes the capabilities and units', () => {
    visitWithAgent();
    call('tda_get_capabilities', {}).then((capabilities) => {
      expect(capabilities.execution).to.equal('browser-local WebAssembly in a Web Worker');
      expect(capabilities.simplicialComplexes.map((c: any) => [c.id, c.filtrationUnits])).to.deep.equal([
        ['rips', 'edge length'], ['alpha', 'squared radius'], ['cech', 'radius'],
      ]);
      expect(capabilities.defaults.resultLimit).to.equal(10);
    });
  });

  it('matches the closed-form unit-square loop for Rips, Alpha and Čech, and shows the points in the workbench', () => {
    visitWithAgent();
    const cases = [
      { complex: 'rips', birth: 1, death: Math.SQRT2, units: 'edge length' },
      { complex: 'alpha', birth: 0.25, death: 0.5, units: 'squared radius' },
      { complex: 'cech', birth: 0.5, death: Math.SQRT1_2, units: 'radius' },
    ];
    for (const { complex, birth, death, units } of cases) {
      call('tda_compute_simplicial_persistence', { complex, points: square }).then((result) => {
        expect(result.ok, JSON.stringify(result)).to.equal(true);
        expect(result.units).to.equal(units);
        expect(result.components, 'one component').to.equal(1);
        expect(result.loops, 'one long-lived loop').to.equal(1);
        expect(result.shownInWorkspace).to.equal(true);
        const loops = finiteLoops(result);
        expect(loops).to.have.length(1);
        closeTo(loops[0]![0], birth);
        closeTo(loops[0]![1], death);
        expect(result.pairs.filter((p: any) => p.dimension === 2), 'no truncation artifacts').to.deep.equal([]);
      });
      cy.get('#point-meta').should('have.text', '4 points · 2D');
      cy.get('#complex-kind').should('have.value', complex);
      cy.get('#metric-loops').should('have.text', '1');
      cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    }
  });

  it('computes the cubical fixture, shares it, and drops the result when the person changes an input', () => {
    visitWithAgent();
    const grid = { source: 'values', width: 3, height: 3, values: [0, 0, 0, 0, 1, 0, 0, 0, 0], binarize: false, filtration: 'sublevel', downsample: 1 };
    call('tda_compute_cubical_persistence', grid).then((result) => {
      expect(result.ok, JSON.stringify(result)).to.equal(true);
      expect(result.components).to.equal(1);
      const loops = finiteLoops(result);
      expect(loops).to.have.length(1);
      closeTo(loops[0]![0], 0);
      closeTo(loops[0]![1], 1);
    });
    cy.get('#image-meta').should('contain.text', 'agent-values · 3 × 3');
    call('tda_get_latest_result', {}).then((latest) => {
      expect(latest).to.include({ ok: true, status: 'ready' });
      expect(latest.result.kind).to.equal('cubical');
      expect(latest.request).to.deep.include({ source: 'values', valueCount: 9 });
      expect(latest.request, 'the request is summarized, never echoed').not.to.have.property('values');
    });
    cy.get('#downsample').select('2');
    call('tda_get_latest_result', {}).then((latest) => {
      expect(latest).to.include({ ok: true, status: 'idle' });
      expect(latest.result, 'an obsolete result is never returned').to.equal(null);
    });
  });

  it('answers a malformed call with a result that names the field, and recovers', () => {
    visitWithAgent();
    call('tda_compute_simplicial_persistence', { complex: 'rips', points: [[0, 0], [1, 1, 1]] }).then((result) => {
      expect(result.ok).to.equal(false);
      expect(result.error).to.deep.include({ code: 'invalid_input', field: 'points[1]', message: 'Point 1 does not match dimension 2.' });
    });
    call('tda_compute_cubical_persistence', { source: 'values', width: 2, height: 2, values: [0, 1, 1, 0], downsample: 3 }).then((result) => {
      expect(result.error).to.deep.include({ code: 'invalid_input', field: 'downsample' });
    });
    call('tda_get_capabilities', { unexpected: true }).then((result) => {
      expect(result.error).to.deep.include({ code: 'unsupported_field', field: 'unexpected' });
    });
    call('tda_compute_simplicial_persistence', { complex: 'rips', points: square }).then((result) => {
      expect(result.ok, 'the next valid call still works').to.equal(true);
    });
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
  });

  it('keeps an output small however large the complex is', () => {
    visitWithAgent();
    const noisyCircle = Array.from({ length: 60 }, (_, i) => [
      Math.cos((2 * Math.PI * i) / 60) + 0.02 * Math.sin(i * 12.9898),
      Math.sin((2 * Math.PI * i) / 60) + 0.02 * Math.cos(i * 78.233),
    ]);
    call('tda_compute_simplicial_persistence', { complex: 'rips', points: noisyCircle, parameters: { maxEdgeLength: 1.5 } }).then((result) => {
      const size = JSON.stringify(result).length;
      expect(size, `result is ${size} characters`).to.be.lessThan(1800);
      expect(result.pairsReturned).to.equal(10);
      expect(result.pairsTotal).to.be.greaterThan(10);
      expect(result.loops).to.equal(1);
    });
    call('tda_get_latest_result', {}).then((latest) => {
      const size = JSON.stringify(latest).length;
      expect(size, `latest result is ${size} characters`).to.be.lessThan(2200);
    });
  });

  it('answers two overlapping calls, and says which one the workbench shows', () => {
    visitWithAgent();
    cy.window().then((win) => Promise.all([
      win.__agent.call('tda_compute_simplicial_persistence', { complex: 'rips', points: square }),
      win.__agent.call('tda_compute_simplicial_persistence', { complex: 'alpha', points: square }),
    ])).then(([first, second]) => {
      expect(first.ok && second.ok, JSON.stringify([first, second])).to.equal(true);
      expect(first.units).to.equal('edge length');
      expect(second.units).to.equal('squared radius');
      expect(first.shownInWorkspace, 'the older request was replaced').to.equal(false);
      expect(second.shownInWorkspace).to.equal(true);
    });
    cy.get('#complex-kind').should('have.value', 'alpha');
  });

  it('stops a computation the host aborts, and keeps working afterwards', () => {
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache' }));
    let delayed = false;
    cy.intercept('**/*.wasm*', (request) => {
      if (delayed) return;
      delayed = true;
      request.on('response', (response) => response.setDelay(8000));
    });
    visitWithAgent();
    cy.window().then((win) => {
      const host = new AbortController();
      const run = win.__agent.call('tda_compute_simplicial_persistence', { complex: 'rips', points: square }, host.signal);
      win.setTimeout(() => host.abort(new win.DOMException('stopped by the host', 'AbortError')), 200);
      return run.then(
        () => { throw new Error('the aborted call resolved'); },
        (error: Error) => expect(error.name).to.equal('AbortError'),
      );
    });
    cy.get('#compute-status').should('have.attr', 'data-status', 'idle');
    call('tda_compute_simplicial_persistence', { complex: 'rips', points: square }).then((result) => {
      expect(result.ok, 'a fresh worker serves the next call').to.equal(true);
    });
  });
});
