interface PlotlyTrace {
  name?: string;
  hovertemplate?: string | string[];
  customdata?: unknown[][];
  marker?: { size?: number | number[]; color?: string };
}

interface PlotlyDiagramElement extends HTMLElement {
  data?: PlotlyTrace[];
  emit?: (event: string, data: unknown) => void;
}

function noHorizontalScroll(): void {
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth, 'horizontal scroll').to.be.at.most(doc.documentElement.clientWidth + 1);
  });
}

function stubReducedMotion(win: Window, reduced: boolean): void {
  const original = win.matchMedia.bind(win);
  cy.stub(win, 'matchMedia').callsFake((query: string) => {
    const media = original(query);
    if (query === '(prefers-reduced-motion: reduce)') {
      Object.defineProperty(media, 'matches', { configurable: true, get: () => reduced });
    }
    return media;
  });
}

describe('Pause motion and linked hover', () => {
  it('pauses auto-rotation, remembers the choice, and stops a running filtration', () => {
    cy.viewport(1440, 900);
    cy.visit('/');
    cy.get('#pause-motion').should('have.text', 'Pause motion').and('have.attr', 'aria-pressed', 'false');
    cy.get('#point-sample').select('sphere');
    cy.get('.point-cloud-3d-host').should('have.attr', 'data-auto-rotate', 'true');
    cy.get('#pause-motion').focus().type('{enter}');
    cy.get('#pause-motion').should('have.attr', 'aria-pressed', 'true').and('have.text', 'Pause motion');
    cy.get('.point-cloud-3d-host').should('have.attr', 'data-auto-rotate', 'false');
    cy.window().then((win) => expect(win.localStorage.getItem('webmcp-tda-motion')).to.equal('paused'));

    cy.reload();
    cy.get('#pause-motion').should('have.text', 'Pause motion').and('have.attr', 'aria-pressed', 'true');
    cy.get('#point-sample').select('sphere');
    cy.get('.point-cloud-3d-host').should('have.attr', 'data-auto-rotate', 'false');

    cy.get('#pause-motion').click();
    cy.get('#point-sample').select('circle');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.get('#toggle-filtration').click();
    cy.get('#toggle-filtration').should('contain.text', 'Pause filtration');
    cy.get('#pause-motion').click();
    cy.get('#toggle-filtration').should('not.contain.text', 'Pause filtration');
    cy.get('#pause-motion').should('have.attr', 'aria-pressed', 'true');
  });

  it('starts paused under prefers-reduced-motion before a choice is stored', () => {
    cy.viewport(1440, 900);
    cy.visit('/', { onBeforeLoad: (win) => stubReducedMotion(win, true) });
    cy.get('#pause-motion').should('have.text', 'Pause motion').and('have.attr', 'aria-pressed', 'true');
    cy.window().then((win) => expect(win.localStorage.getItem('webmcp-tda-motion')).to.equal(null));
    cy.get('#point-sample').select('sphere');
    cy.get('.point-cloud-3d-host').should('have.attr', 'data-auto-rotate', 'false');
    cy.get('#pause-motion').click();
    cy.get('#pause-motion').should('have.attr', 'aria-pressed', 'false').and('have.text', 'Pause motion');
    cy.get('.point-cloud-3d-host').should('have.attr', 'data-auto-rotate', 'true');
  });

  it('highlights the same interval from the barcode and from the diagram', () => {
    cy.viewport(1440, 900);
    cy.visit('/');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.get('#barcode-note').should('have.text', 'Same intervals as the diagram.');
    cy.get('#barcode [data-pair-id]').should('have.length.greaterThan', 1);

    cy.get<PlotlyDiagramElement>('#diagram').should(($diagram) => {
      const plot = $diagram[0]!;
      expect(plot.data?.[0]?.hovertemplate).to.contain('death %{customdata[0]}');
      const ids = plot.data?.flatMap((trace) => (trace.customdata ?? []).map((row) => row[2]));
      expect(ids?.filter((id) => typeof id === 'string' && id.length > 0).length).to.be.greaterThan(1);
    });

    cy.get('#barcode [data-pair-id]').eq(1).then(($bar) => {
      const id = $bar.attr('data-pair-id');
      expect(id).to.be.a('string');
      cy.wrap($bar).trigger('pointerover');
      cy.get('#barcode [data-highlighted="true"]').should('have.attr', 'data-pair-id', id);
      cy.get<PlotlyDiagramElement>('#diagram').should(($diagram) => {
        const enlarged = $diagram[0]?.data?.some((trace) => {
          const sizes = trace.marker?.size;
          return Array.isArray(sizes) && sizes.some((size) => typeof size === 'number' && size >= 14);
        });
        expect(enlarged, 'hovered interval enlarged on the diagram').to.equal(true);
      });
      cy.get('#diagram .hoverlayer').should('exist');
    });

    cy.get('#barcode').trigger('pointerleave');
    cy.get<PlotlyDiagramElement>('#diagram').then(($diagram) => {
      const plot = $diagram[0]!;
      const curveNumber = plot.data?.findIndex((trace) => (trace.customdata?.length ?? 0) > 0) ?? -1;
      expect(curveNumber, 'trace with intervals').to.be.at.least(0);
      const row = plot.data?.[curveNumber]?.customdata?.[0];
      expect(row?.[2], 'interval id on the diagram point').to.be.a('string');
      plot.emit?.('plotly_hover', { points: [{ customdata: row, curveNumber, pointNumber: 0 }] });
      return String(row?.[2]);
    }).then((id) => {
      cy.get('#barcode [data-highlighted="true"]').should('have.attr', 'data-pair-id', id);
    });
    cy.get<PlotlyDiagramElement>('#diagram').then(($diagram) => {
      $diagram[0]?.emit?.('plotly_unhover', {});
    });
    cy.get('#barcode [data-highlighted="true"]').should('not.exist');
  });

  it('fits the workbench at 1440×900 and 390×844', () => {
    const consoleErrors: string[] = [];
    cy.viewport(1440, 900);
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win.console, 'error').callsFake((...args: unknown[]) => {
          consoleErrors.push(args.map((arg) => String(arg)).join(' '));
        });
      },
    });
    cy.get('#pause-motion').should('be.visible');
    noHorizontalScroll();
    cy.screenshot('pause-motion-1440', { capture: 'viewport' });

    cy.viewport(390, 844);
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');
    cy.get('#barcode').should('be.visible');
    cy.get('#barcode [data-pair-id]').should('have.length.greaterThan', 0);
    noHorizontalScroll();
    cy.screenshot('barcode-hover-390', { capture: 'viewport' });
    cy.viewport(1440, 900);
    cy.get('#barcode [data-pair-id]').first().scrollIntoView().trigger('pointerover');
    cy.get('#barcode [data-highlighted="true"]').should('exist');
    cy.screenshot('linked-hover-1440', { capture: 'viewport' });
    cy.then(() => {
      const unexpected = consoleErrors.filter((message) => !/favicon/i.test(message));
      expect(unexpected, unexpected.join('\n')).to.deep.equal([]);
    });
  });
});
