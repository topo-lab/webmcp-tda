# WebMCP TDA

WebMCP TDA is a shared computational-topology workbench for people and their agents. People can explore examples, configure filtrations, upload images, run one-parameter persistent homology, and inspect visual results directly in the page. A WebMCP-aware agent can use the same calculations and update the same visible workspace. Computation stays in the browser through WebAssembly and Web Workers.

Live demo: [webmcp-tda.pages.dev](https://webmcp-tda.pages.dev)

This is a dedicated WebMCP project. It is not the TDA Explorer and contains no lessons or tutorial flow.

## Human workbench

- Explore built-in 2D and 3D point-cloud examples with a live SVG/WebGL preview. In 2D, choose the Move tool to drag points or the Edit tool to enter exact coordinates. In both dimensions, play the computed filtration while its growing cover, simplices, and persistence-diagram playhead advance together. The maximum simplex dimension is selected automatically from the input dimension, while agents may explicitly override it. The cover uses radius t/2 for Rips, t for Čech, and √t for alpha. Three-dimensional clouds rotate automatically and support drag-to-orbit and wheel/pinch zoom through the local `tda-viz-react` library.
- Choose Vietoris–Rips, Alpha, or Čech and edit the relevant filtration limit through structured controls.
- Paste exact point coordinates when needed without making raw JSON the default experience.
- Analyze real doughnut, pretzel, and eyeglasses photographs—or upload your own image—through a visible original-color → grayscale → denoise → binary-mask → small-hole cleanup → cubical-persistence pipeline. Otsu thresholding is automatic, with manual threshold, foreground polarity, and grayscale controls available. Bundled-photo credits are recorded in [`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md).
- Read the number of connected components, long-lived loops (and voids for a 3D cloud) and the runtime, an interactive Plotly persistence diagram with hover, zoom, and SVG export that states how many pairs it shows, a plain-language summary that says what "long-lived" means, and the complete structured result. A class is long-lived when it never dies, or lives at least 20% as long as the longest-lived class of dimension 1 or higher (a reading aid, not a statistical test; the diagram and the pairs are exact); classes that exist only because the complex was capped at a simplex dimension are left out and counted.

## Agent tools

- `tda_get_capabilities` — discover supported complexes, parameters, limits, units, defaults, and result conventions.
- `tda_compute_simplicial_persistence` — compute persistence from a 2D or 3D point cloud using Vietoris–Rips, Alpha, or Čech complexes.
- `tda_compute_cubical_persistence` — compute vertex lower-star cubical persistence from the current uploaded image, a built-in sample, or a supplied scalar grid.
- `tda_get_latest_result` — read what the visible workbench shows now: its status, a summary of the request behind it, and the compact result.

Tool calls synchronize their inputs and results back into the human workbench. Tool registration follows the current draft WebMCP API (`document.modelContext.registerTool`) and is removed through an `AbortSignal` when a page is stored in the back/forward cache; the tools are registered again when the page is restored.

**What an agent receives.** A compact result, not the data the page draws with: the number of connected components, the number of long-lived loops (and voids for a 3D cloud), the strongest persistence pairs (10 by default, up to 200 with `resultLimit`), the units of birth and death, warnings, and whether the workbench still shows this result. At the default limit a result is about 1,000 characters (1,033 for 24 points on a circle; 1,046 for 120), within the 1.5K characters per output that Chrome recommends. Dimensions above what the complex can be trusted for, such as H₂ of a Rips complex capped at simplex dimension 2, are truncation artifacts; they are left out and counted.

**Failures are results.** In the draft specification a rejected `execute` reaches the caller only as a generic `UnknownError`, so expected failures are returned as `{ "ok": false, "error": { "code", "message", "field", "hint" } }` with the codes `invalid_input`, `unsupported_field`, `budget_exceeded`, `cancelled` and `compute_failed`. Only a cancellation by the host is rethrown. A host that passes no input or no options is accepted.

**Defaults.** An omitted Rips `maxEdgeLength` or Čech `maxRadius` defaults to the diameter of the point cloud, so no scale cuts the filtration off. A limit that stops the filtration before the points connect is reported in `warnings`, with the scale at which they do.

Agent-controlled inputs are bounded by coordinate, point, image, and worst-case simplex budgets, and every field a tool's schema declares is also checked inside the page, because hosts do not all enforce JSON Schema. Overlapping calls each receive their own result; the newest request owns the visible workbench, and `shownInWorkspace` says whether a result is the one on screen. An input edit stops the computation a person started, and the Cancel button stops any computation. Stopping terminates the Worker and starts queued work in a fresh Worker, so one expensive request cannot permanently wedge the tool service.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

The repository vendors the browser runtime for [`tda-wasm`](https://github.com/topo-lab/tda-wasm) and a source-containing package archive built from [`tda-viz-react`](https://github.com/topo-lab/tda-viz-react), so a standalone clone has everything required to install and run.

Open `http://127.0.0.1:5180`. A standard browser gets the complete visual workbench; a WebMCP-enabled browser also discovers the four tools above.

```bash
npm test
npm run test:coverage
npm run typecheck
npm run build
```

## Testing WebMCP

WebMCP needs tests at three layers because browser discovery alone does not prove that a tool is safe or correct:

1. **Registration contract:** mock `document.modelContext.registerTool` and verify every tool is registered with one lifecycle `AbortSignal`, late browser injection is retried, failures reach the visible status, and page cleanup unregisters pending or active tools.
2. **Tool contract:** compile every `inputSchema`, check names, descriptions, closed objects, and safety annotations, then call every `execute` handler with valid and invalid inputs. The page validates its own inputs because clients may not enforce every JSON Schema keyword.
3. **Agent smoke test:** open the top-level page in a WebMCP-capable browser, inspect the discovered tools, invoke all four through the browser's WebMCP channel, and verify computation results appear in the shared visible workbench. Also verify a malformed call returns a result that names the field. `cypress/e2e/agent-acceptance.cy.ts` automates this against the real page, Worker and WebAssembly engine through a recorded stand-in for the browser's channel; it checks the closed-form values, shared state, error results, output size, overlapping calls and abort. It does not show how a particular browser or agent client behaves, so the live checklist below still applies for a release.

Use the [live agent acceptance checklist](docs/AGENT_ACCEPTANCE.md) for reproducible closed-form computations, shared-state invalidation, malformed-input rejection, and recovery through a real browser tool channel.

`npm run test:coverage` reports all first-party `src/**/*.ts` files, including unexecuted UI and Worker code, to `coverage/all`. It separately enforces 100% statements, branches, functions, and lines for the runtime WebMCP boundary in `src/webmcp/register.ts`, `src/webmcp/tools.ts` and `src/webmcp/agentView.ts`; that is not a whole-application coverage claim. A schema-parity test takes a valid call for each tool, replaces one field at a time with awkward values, and checks that whatever the schema rejects the page also rejects. Generated/vendor code is outside this first-party report.

The worker oracle suite runs the checked-in real WASM against an independent small-complex F2 boundary-matrix reduction: 128 seeded vertex-grid filtrations, sublevel/superlevel/downsampling cases, exhaustive small Rips complexes, and analytic square and binary two-hole examples. Image tests independently check Otsu's objective and the Gaussian convolution. These are correctness checks, not just execution counts; they do not establish real `document.modelContext` agent invocation or complete browser/GPU coverage.

For local Chrome testing, enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome. Codex and ChatGPT Work can discover imperative tools registered by the top-level page in the ChatGPT desktop app's built-in browser. Current built-in-browser support does not include declarative tools or tools registered inside iframes.

References: [WebMCP specification](https://webmachinelearning.github.io/webmcp/), [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp), and [ChatGPT site-tools guide](https://learn.chatgpt.com/docs/webmcp).

## Why there is no authentication

The application has no backend, account data, or remote computation. Inputs and results stay in the active browser tab. Adding sign-in would not protect a server-side resource and would add friction to the agent workflow. WebMCP registration remains same-origin by default.

## Computational backend

The repository vendors the built browser distribution of [`tda-wasm`](https://github.com/topo-lab/tda-wasm), an MIT-licensed WebAssembly toolkit. Its license and third-party notices are retained under `vendor/tda-wasm/`. Vite fingerprints and serves the WASM asset from the production bundle.

The WebMCP API is an evolving Community Group draft. See the [current specification](https://webmachinelearning.github.io/webmcp/).
