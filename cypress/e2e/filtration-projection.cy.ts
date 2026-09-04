interface ProjectionTrace {
  observer: MutationObserver;
  snapshots: string[];
}

type TracedWindow = Window & { __projectionTrace?: ProjectionTrace };

function startProjectionTrace(): void {
  cy.window().then((appWindow) => {
    const tracedWindow = appWindow as TracedWindow;
    const container = appWindow.document.querySelector('#point-preview');
    expect(container, 'point-cloud container').not.to.equal(null);

    const snapshots: string[] = [];
    const capture = () => {
      const coordinates = [...appWindow.document.querySelectorAll<SVGCircleElement>('[data-testid="tda-point"]')]
        .map((point) => `${point.getAttribute('cx')},${point.getAttribute('cy')}`)
        .join('|');
      if (coordinates && snapshots.at(-1) !== coordinates) snapshots.push(coordinates);
    };
    const observer = new appWindow.MutationObserver(capture);
    observer.observe(container!, { attributes: true, childList: true, subtree: true });
    capture();
    tracedWindow.__projectionTrace = { observer, snapshots };
  });
}

function expectStableProjection(label: string): void {
  cy.window().then((appWindow) => {
    const trace = (appWindow as TracedWindow).__projectionTrace;
    expect(trace, `${label} trace`).not.to.equal(undefined);
    trace!.observer.disconnect();
    expect(trace!.snapshots, `${label} rendered coordinate sets`).to.have.length(1);
  });
}

describe('2D filtration viewport', () => {
  it('keeps every circle point fixed through compute, recompute, and Play', () => {
    cy.visit('/');
    cy.get('[data-testid="tda-point"]').should('have.length', 32);

    startProjectionTrace();
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    expectStableProjection('initial compute');

    startProjectionTrace();
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    expectStableProjection('recompute');

    startProjectionTrace();
    cy.get('#toggle-filtration').click();
    cy.wait(250);
    cy.get('#toggle-filtration').click();
    expectStableProjection('filtration playback');
  });

  it('keeps the axis origin fixed when a point is dragged', () => {
    cy.visit('/');
    cy.get('#toggle-point-axes').click();
    cy.get('[data-testid="tda-axis"]').then(($axes) => {
      const initialCenter = [$axes[1]?.getAttribute('x1'), $axes[0]?.getAttribute('y1')];

      cy.get('[data-testid="tda-point"]').first().then(($point) => {
        const svg = $point[0]!.ownerSVGElement!;
        const bounds = svg.getBoundingClientRect();
        const clientX = bounds.left + Number($point.attr('cx')) / 720 * bounds.width;
        const clientY = bounds.top + Number($point.attr('cy')) / 380 * bounds.height;
        cy.wrap($point).trigger('pointerdown', { pointerId: 1, clientX, clientY });
        cy.wrap(svg).trigger('pointermove', {
          pointerId: 1,
          clientX: bounds.right - 4,
          clientY: bounds.top + 4,
        });
        cy.wrap(svg).trigger('pointerup', { pointerId: 1 });
      });

      cy.get('#point-sample').should('have.value', 'custom');
      cy.get('[data-testid="tda-axis"]').then(($movedAxes) => {
        expect([$movedAxes[1]?.getAttribute('x1'), $movedAxes[0]?.getAttribute('y1')]).to.deep.equal(initialCenter);
      });
    });
  });
});
