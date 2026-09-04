interface PlotlyDiagramElement extends HTMLElement {
  data?: Array<{
    name?: string;
    x?: unknown[];
    marker?: { color?: string };
  }>;
  layout?: {
    shapes?: unknown[];
    xaxis?: { range?: number[] };
    yaxis?: { range?: number[]; scaleanchor?: string; ticktext?: string[] };
  };
}

function plotlyDiagram(): Cypress.Chainable<JQuery<PlotlyDiagramElement>> {
  return cy.get<PlotlyDiagramElement>('#diagram').should(($diagram) => {
    expect($diagram[0]?.data, 'Plotly trace data').to.have.length(3);
    expect($diagram[0]?.data?.flatMap((trace) => trace.x ?? []), 'persistence points').not.to.be.empty;
  });
}

describe('Plotly persistence diagram', () => {
  it('renders H0, H1, and H2 as distinct interactive traces', () => {
    cy.visit('/');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');

    plotlyDiagram().then(($diagram) => {
      const plot = $diagram[0]!;
      expect(plot.data?.map((trace) => trace.name)).to.deep.equal(['H₀', 'H₁', 'H₂']);
      expect(plot.data?.map((trace) => trace.marker?.color)).to.deep.equal(['#137963', '#e85f3f', '#7657d6']);
      expect(plot.layout?.yaxis?.scaleanchor).to.equal('x');
      expect(plot.layout?.yaxis?.ticktext).to.include('∞');
    });
    cy.get('#diagram .modebar').then(($modebar) => {
      cy.get('#diagram .nsewdrag').then(($plotSurface) => {
        expect($modebar[0]!.getBoundingClientRect().bottom).to.be.at.most(
          $plotSurface[0]!.getBoundingClientRect().top + 1,
        );
      });
    });
  });

  it('keeps the diagram range fixed while the filtration playhead moves', () => {
    cy.visit('/');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');

    plotlyDiagram().then(($diagram) => {
      const plot = $diagram[0]!;
      const xRangeBefore = [...(plot.layout?.xaxis?.range ?? [])];
      const yRangeBefore = [...(plot.layout?.yaxis?.range ?? [])];
      cy.get('#toggle-filtration').click();
      cy.wait(250);
      plotlyDiagram().then(($animatedDiagram) => {
        const animatedPlot = $animatedDiagram[0]!;
        expect(animatedPlot.layout?.xaxis?.range).to.deep.equal(xRangeBefore);
        expect(animatedPlot.layout?.yaxis?.range).to.deep.equal(yRangeBefore);
        expect(animatedPlot.layout?.shapes).to.have.length(4);
      });
      cy.get('#toggle-filtration').click();
    });
  });

  it('keeps the filtration action width stable across replay, pause, and play labels', () => {
    cy.visit('/');
    cy.get('#run-simplicial').click();
    cy.get('#compute-status').should('have.attr', 'data-status', 'ready');

    cy.get('#toggle-filtration').then(($button) => {
      const width = $button[0]!.getBoundingClientRect().width;
      cy.wrap($button).should('contain.text', 'Replay filtration').click();
      cy.get('#toggle-filtration').should('contain.text', 'Pause filtration').then(($pauseButton) => {
        expect($pauseButton[0]!.getBoundingClientRect().width).to.equal(width);
      }).click();
      cy.get('#toggle-filtration').should('contain.text', 'Play filtration').then(($playButton) => {
        expect($playButton[0]!.getBoundingClientRect().width).to.equal(width);
      });
    });
  });
});
