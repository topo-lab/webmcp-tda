const ready = () =>
  cy.get("#compute-status").should("have.attr", "data-status", "ready");
const result = () =>
  cy
    .get("#result-json")
    .invoke("text")
    .then((text) => JSON.parse(text));

describe("Release controls — full workbench input matrix", () => {
  it("computes every construction with each point cloud and all five coefficient fields", () => {
    cy.visit("/");
    for (const sample of ["circle", "figure-eight", "clusters", "sphere"]) {
      cy.get("#point-sample").select(sample);
      for (const kind of ["rips", "alpha", "cech"]) {
        cy.get("#complex-kind").select(kind);
        cy.get("#run-simplicial").click();
        ready();
        result().then((r) => {
          expect(r.kind).to.equal("simplicial");
          expect(r.persistence.pairCount).to.be.greaterThan(0);
        });
      }
    }
    cy.get("#point-sample").select("circle");
    for (const field of ["2", "3", "5", "7", "11"]) {
      cy.get("#coefficient-field").select(field);
      cy.get("#run-simplicial").click();
      ready();
      result().then((r) =>
        expect(r.input.coefficientField).to.equal(Number(field)),
      );
    }
    cy.screenshot("workbench-constructions-and-fields");
  });

  it("edits point coordinates, validates input, cancels, and recomputes the changed cloud", () => {
    cy.visit("/");
    cy.get("#run-simplicial").click();
    ready();
    cy.get('[data-point-tool="edit"]').click();
    cy.get('[data-testid="tda-point"]').first().click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.contains('[role="dialog"] label', "X coordinate").find("input").clear();
    cy.contains('[role="dialog"] button', "Save").click();
    cy.get('[role="dialog"]').should("contain", "Enter two finite numbers");
    cy.contains('[role="dialog"] label', "X coordinate")
      .find("input")
      .type("0.1");
    cy.contains('[role="dialog"] label', "Y coordinate")
      .find("input")
      .clear()
      .type("-0.2");
    cy.contains('[role="dialog"] button', "Save").click();
    cy.get('[role="dialog"]').should("not.exist");
    cy.get("#points-input")
      .invoke("val")
      .then((value) =>
        expect(JSON.parse(String(value))[0]).to.deep.equal([0.1, -0.2]),
      );
    cy.get("#compute-status").should("have.attr", "data-status", "idle");
    cy.get('[data-testid="tda-point"]').first().click();
    cy.contains('[role="dialog"] button', "Cancel").click();
    cy.get('[role="dialog"]').should("not.exist");
    cy.get("#complex-kind").select("cech");
    cy.get('[data-parameter="maxRadius"]').clear().type("1.2");
    cy.get("#run-simplicial").click();
    ready();
    result().then((r) => expect(r.input.parameters.maxRadius).to.equal(1.2));
    cy.screenshot("edited-coordinates-recomputed");
  });

  it("exports the diagram, resets its axes, and cancels cloud sharing without uploading", () => {
    cy.visit("/");
    cy.get("#run-simplicial").click();
    ready();
    cy.get('#diagram [data-title="Download plot"]').click();
    cy.get(".notifier-close").first().click();
    cy.readFile(
      `${Cypress.config("downloadsFolder")}/persistence-diagram.svg`,
    ).should((source: string) => {
      const svg = new DOMParser().parseFromString(source, "image/svg+xml");
      expect(svg.querySelector("parsererror")).to.equal(null);
      expect(svg.querySelector(".xtitle")?.textContent).to.equal("birth");
      expect(svg.querySelector(".ytitle")?.textContent).to.equal("death");
      expect(svg.querySelectorAll(".point").length).to.be.greaterThan(0);
    });
    cy.get('#diagram [data-title="Reset axes"]').click();
    cy.get("#diagram").should((plot) =>
      expect(
        (plot[0] as any).layout.xaxis.range.every(Number.isFinite),
      ).to.equal(true),
    );
    cy.get('#diagram [data-title="Share chart..."]').click();
    cy.contains("This chart will be uploaded").should("be.visible");
    cy.contains("button", /^Cancel$/).click();
    cy.contains("This chart will be uploaded").should("not.exist");
  });

  it("computes both image filtrations, all resolutions, foregrounds, and threshold modes", () => {
    cy.visit("/");
    cy.get("#cubical-tab").click();
    cy.get("#image-sample").select("glasses");
    cy.get("#image-meta").should("contain", "eyeglasses");
    for (const filtration of ["sublevel", "superlevel"]) {
      cy.get("#filtration").select(filtration);
      for (const scale of ["1", "2", "4"]) {
        cy.get("#downsample").select(scale);
        cy.get("#run-cubical").click();
        ready();
        result().then((r) => {
          expect(r.input.filtration).to.equal(filtration);
          expect(r.input.downsample).to.equal(Number(scale));
        });
      }
    }
    for (const foreground of ["light", "dark"]) {
      cy.get("#foreground").select(foreground);
      cy.get("#threshold")
        .invoke("val", 180)
        .trigger("input")
        .trigger("change");
      cy.get("#run-cubical").click();
      ready();
      result().then((r) => {
        expect(r.input.foreground).to.equal(foreground);
        expect(r.input.threshold).to.equal(180);
      });
      cy.get("#auto-threshold").click();
      cy.get("#threshold-value").should("contain", "Auto");
    }
    cy.get("#binarize").uncheck();
    cy.get("#threshold").should("be.disabled");
    cy.get("#run-cubical").click();
    ready();
    result().then((r) => expect(r.input.binarized).to.equal(false));
    cy.screenshot("workbench-image-controls");
  });

  it("copies the computed structured result and operates axes, editing, and filtration", () => {
    cy.visit("/");
    cy.get('[data-point-tool="edit"]')
      .click()
      .should("have.attr", "aria-pressed", "true");
    cy.get('[data-point-tool="move"]')
      .click()
      .should("have.attr", "aria-pressed", "true");
    cy.get("#toggle-point-axes")
      .click()
      .should("have.attr", "aria-pressed", "true");
    cy.get('[data-testid="tda-axis"]').should("exist");
    cy.get("#toggle-point-axes")
      .click()
      .should("have.attr", "aria-pressed", "false");
    cy.get('[data-testid="tda-axis"]').should("not.exist");
    cy.get("#run-simplicial").click();
    ready();
    cy.get("#filtration-progress").invoke("val", 0).trigger("input");
    cy.get("#filtration-progress").should("have.value", "0");
    cy.get("#toggle-filtration").click().should("contain", "Pause");
    cy.get("#filtration-progress").should("not.have.value", "0");
    cy.get("#toggle-filtration").click().should("contain", "Play");
    cy.get(".raw-result summary").click();
    cy.window().then((win) => {
      const copy = cy.stub().resolves().as("copied");
      Object.defineProperty(win.navigator, "clipboard", {
        configurable: true,
        value: { writeText: copy },
      });
    });
    cy.get("#copy-result").click();
    cy.get("@copied")
      .should("have.been.calledOnce")
      .then((stub: any) => {
        const r = JSON.parse(stub.firstCall.args[0]);
        expect(r.kind).to.equal("simplicial");
        expect(r.persistence.pairCount).to.be.greaterThan(0);
      });
  });
});
export {};
