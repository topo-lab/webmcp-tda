# Live agent acceptance

Run this checklist against a top-level page in a browser that exposes real WebMCP tools to an agent. Registration mocks, calling JavaScript handlers, and a browser page loading successfully do not satisfy this check. Keep the discovered schemas, call inputs/results, and a screenshot of the final shared workbench with the run evidence. Do not change browser security settings to make the test pass.

## Discover and compute

1. Discover all four tools through the browser's agent tool channel. Call `tda_get_capabilities` with `{}` and confirm browser-local execution and the advertised filtration units.
2. Call `tda_compute_simplicial_persistence` with the following arguments. Repeat with the three complex/parameter variants below; compare numerical values with tolerance `1e-10`.

```json
{
  "complex": "rips",
  "points": [[0, 0], [1, 0], [1, 1], [0, 1]],
  "coefficientField": 2,
  "parameters": {"maxEdgeLength": 1.5, "maxSimplexDimension": 2},
  "resultLimit": 50
}
```

| Complex | Parameters | Unit-square finite H1 interval |
| --- | --- | --- |
| `rips` | `{"maxEdgeLength":1.5,"maxSimplexDimension":2}` | `(1, sqrt(2))` in distance |
| `alpha` | `{"maxSimplexDimension":2}` | `(0.25, 0.5)` in squared radius |
| `cech` | `{"maxRadius":1,"maxSimplexDimension":2}` | `(0.5, sqrt(0.5))` in radius |

These are geometric closed-form checks: adjacent square vertices are one unit apart, and the enclosing circle has radius `sqrt(0.5)`. Each computation must also have one essential H0 class. Rips and Cech capped at simplex dimension 2 can produce an essential H2 truncation artifact; verify the result warns that only H0 through H1 are reliable. Do not interpret that artifact as a feature of the full complex.

3. Call `tda_compute_cubical_persistence` with:

```json
{
  "source": "values",
  "width": 3,
  "height": 3,
  "values": [0, 0, 0, 0, 1, 0, 0, 0, 0],
  "binarize": false,
  "filtration": "sublevel",
  "downsample": 1,
  "resultLimit": 50
}
```

The vertex lower-star filtration has one finite H1 interval `(0, 1)` and one essential H0 class: the zero-valued boundary forms a loop until the central vertex enters. Check the visible cubical workspace shows the input and ready result. Call `tda_get_latest_result` with `{}` and compare its result to the computation, including the pair values.

## Shared state and recovery

4. Use the human UI to change Downsample to `2× · faster`. Call `tda_get_latest_result` again: status must be idle and result null. This verifies an agent cannot read an obsolete result after a human changes the input.
5. Send a malformed simplicial call containing `points: [[0,0],[1,1,1]]`. Expect a useful dimension-mismatch error. A client may reject at its tool boundary; capture that rejection rather than bypassing validation.
6. Repeat the valid cubical call, then read latest result. The workbench must recover to ready with the same two pairs. Save the final visible state and tool responses.

## Verification boundaries

Record browser/agent provenance and the exact tested build. These fixtures verify the live transport, shared state, units, selected numerical outputs, and recovery. They do not prove every dataset or algorithm. Run the repository unit/contract, E2E, typecheck, and build gates separately; use the engine's reference-fixture and differential suites for broader numerical coverage. Browser support and tool-discovery APIs can evolve, so rediscover schemas rather than assuming an old browser API still works.
