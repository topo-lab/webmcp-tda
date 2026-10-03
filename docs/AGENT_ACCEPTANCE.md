# Live agent acceptance

Run this checklist against a top-level page in a browser that exposes real WebMCP tools to an agent. Registration mocks, calling JavaScript handlers, and a browser page loading successfully do not satisfy this check. `cypress/e2e/agent-acceptance.cy.ts` runs the same fixtures against a recorded stand-in for the browser's channel and belongs to the local gate, but it cannot show how a given browser or agent client behaves. Keep the discovered schemas, call inputs/results, and a screenshot of the final shared workbench with the run evidence. Do not change browser security settings to make the test pass.

## Discover and compute

1. Discover all four tools through the browser's agent tool channel (in Chrome, the WebMCP pane of DevTools). Call `tda_get_capabilities` with `{}` and confirm browser-local execution, the advertised filtration units, and the result conventions.
2. Call `tda_compute_simplicial_persistence` with the following arguments. Repeat with the three complex/parameter variants below; compare numerical values with tolerance `1e-10`.

```json
{
  "complex": "rips",
  "points": [[0, 0], [1, 0], [1, 1], [0, 1]],
  "coefficientField": 2,
  "parameters": {"maxEdgeLength": 1.5, "maxSimplexDimension": 2}
}
```

| Complex | Parameters | Unit-square finite H1 pair (`birth`, `death`) |
| --- | --- | --- |
| `rips` | `{"maxEdgeLength":1.5,"maxSimplexDimension":2}` | `(1, sqrt(2))` in distance |
| `alpha` | `{"maxSimplexDimension":2}` | `(0.25, 0.5)` in squared radius |
| `cech` | `{"maxRadius":1,"maxSimplexDimension":2}` | `(0.5, sqrt(0.5))` in radius |

These are geometric closed-form checks: adjacent square vertices are one unit apart, and the enclosing circle has radius `sqrt(0.5)`. Each result must report `ok: true`, `components: 1`, `loops: 1`, the `units` in the table, and `shownInWorkspace: true`. The `pairs` list holds the one essential H0 class (`death: "infinity"`) and the finite H1 pair, and no pair of dimension 2: for a 2D cloud, Rips and Čech classes above H1 exist only because the complex is capped at simplex dimension 2, so they are left out and counted rather than returned.

3. Call `tda_compute_cubical_persistence` with:

```json
{
  "source": "values",
  "width": 3,
  "height": 3,
  "values": [0, 0, 0, 0, 1, 0, 0, 0, 0],
  "binarize": false,
  "filtration": "sublevel",
  "downsample": 1
}
```

The vertex lower-star filtration has one finite H1 pair `(0, 1)` and one essential H0 class: the zero-valued boundary forms a loop until the central vertex enters. Check the visible cubical workspace shows the input (`agent-values · 3 × 3`) and a ready result. Call `tda_get_latest_result` with `{}` and compare its `result` to the computation, including the pair values. Its `request` is a summary (`valueCount: 9`) and must not contain the `values` array.

## Shared state and recovery

4. Use the human UI to change Downsample to `2× · faster`. Call `tda_get_latest_result` again: `status` must be `idle` and `result` null. This verifies an agent cannot read an obsolete result after a human changes the input.
5. Send a malformed simplicial call containing `points: [[0,0],[1,1,1]]`. Expect a result with `ok: false`, `error.code: "invalid_input"`, `error.field: "points[1]"` and the message "Point 1 does not match dimension 2." Send the cubical call from step 3 with `downsample: 3` and expect `error.field: "downsample"`. A client may reject at its tool boundary; capture that rejection rather than bypassing validation.
6. Repeat the valid cubical call, then read the latest result. The workbench must recover to ready with the same two pairs.
7. Send two computations at once, for example Rips and Alpha on the same points. Both must return `ok: true`. Exactly one, the newer, reports `shownInWorkspace: true`, and the workbench shows that one.
8. Call `tda_compute_simplicial_persistence` with a 60-point noisy circle and no `parameters`. The result must stay near 1.5K characters at the default `resultLimit` (1,103 measured), report `loops: 1`, and say in `input.defaulted` that the Rips limit was taken from the cloud's diameter.

## Verification boundaries

Record browser/agent provenance and the exact tested build. These fixtures verify the live transport, shared state, units, selected numerical outputs, and recovery. They do not prove every dataset or algorithm. Run the repository unit/contract, E2E, typecheck, and build gates separately; use the engine's reference-fixture and differential suites for broader numerical coverage. Browser support and tool-discovery APIs can evolve, so rediscover schemas rather than assuming an old browser API still works.
