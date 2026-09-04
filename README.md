# WebMCP TDA

WebMCP TDA is a shared computational-topology workbench for people and their agents. People can explore examples, configure filtrations, upload images, run one-parameter persistent homology, and inspect visual results directly in the page. A WebMCP-aware agent can use the same calculations and update the same visible workspace. Computation stays in the browser through WebAssembly and Web Workers.

Live demo: [webmcp-tda.pages.dev](https://webmcp-tda.pages.dev)

This is a dedicated WebMCP project. It is not the TDA Explorer and contains no lessons or tutorial flow.

## Human workbench

- Explore built-in 2D and 3D point-cloud examples with a live SVG/WebGL preview. In 2D, choose the Move tool to drag points or the Edit tool to enter exact coordinates. In both dimensions, play the computed filtration while its growing cover, simplices, and persistence-diagram playhead advance together. The maximum simplex dimension is selected automatically from the input dimension, while agents may explicitly override it. The cover uses radius t/2 for Rips, t for Čech, and √t for alpha. Three-dimensional clouds rotate automatically and support drag-to-orbit and wheel/pinch zoom through the local `tda-viz-react` library.
- Choose Vietoris–Rips, Alpha, or Čech and edit the relevant filtration limit through structured controls.
- Paste exact point coordinates when needed without making raw JSON the default experience.
- Analyze real doughnut, pretzel, and eyeglasses photographs—or upload your own image—through a visible original-color → grayscale → denoise → binary-mask → small-hole cleanup → cubical-persistence pipeline. Otsu thresholding is automatic, with manual threshold, foreground polarity, and grayscale controls available. Bundled-photo credits are recorded in [`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md).
- Read feature counts, essential classes, H1 loops, runtime, an interactive Plotly persistence diagram with hover, zoom, selection, and SVG export, a plain-language result summary, and the complete structured result.

## Agent tools

- `tda_get_capabilities` — discover supported complexes, parameters, limits, and image inputs.
- `tda_compute_simplicial_persistence` — compute persistence from a 2D or 3D point cloud using Vietoris–Rips, Alpha, or Čech complexes.
- `tda_compute_cubical_persistence` — compute vertex lower-star cubical persistence from the current uploaded image, a built-in sample, or a supplied scalar grid.
- `tda_get_latest_result` — read the latest result shared by the human and agent.

Tool calls synchronize their inputs and results back into the human workbench. Tool registration follows the current draft WebMCP API (`document.modelContext.registerTool`) and is automatically removed through an `AbortSignal` when the page unloads.

Agent-controlled inputs are bounded by coordinate, point, image, and worst-case simplex budgets. Cancelling a running WebMCP computation terminates its Worker and starts queued work in a fresh Worker, so one expensive request cannot permanently wedge the tool service.

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
3. **Agent smoke test:** open the top-level page in a WebMCP-capable browser, inspect the discovered tools, invoke all four through the browser's WebMCP channel, and verify computation results appear in the shared visible workbench. Also verify a malformed call returns a useful error.

`npm run test:coverage` enforces 100% statements, branches, functions, and lines for the runtime WebMCP boundary in `src/webmcp/register.ts` and `src/webmcp/tools.ts`. The wider application keeps its normal full-suite reporting separate, so generated code, visualization code, and Worker code are not mislabeled as covered by these contract tests.

For local Chrome testing, enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome. Codex and ChatGPT Work can discover imperative tools registered by the top-level page in the ChatGPT desktop app's built-in browser. Current built-in-browser support does not include declarative tools or tools registered inside iframes.

References: [WebMCP specification](https://webmachinelearning.github.io/webmcp/), [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp), and [ChatGPT site-tools guide](https://learn.chatgpt.com/docs/webmcp).

## Why there is no authentication

The application has no backend, account data, or remote computation. Inputs and results stay in the active browser tab. Adding sign-in would not protect a server-side resource and would add friction to the agent workflow. WebMCP registration remains same-origin by default.

## Computational backend

The repository vendors the built browser distribution of [`tda-wasm`](https://github.com/topo-lab/tda-wasm), an MIT-licensed WebAssembly toolkit. Its license and third-party notices are retained under `vendor/tda-wasm/`. Vite fingerprints and serves the WASM asset from the production bundle.

The WebMCP API is an evolving Community Group draft. See the [current specification](https://webmachinelearning.github.io/webmcp/).
