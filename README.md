# WebMCP TDA

WebMCP TDA is a shared computational-topology workbench for people and their agents. People can explore examples, configure filtrations, upload images, run one-parameter persistent homology, and inspect visual results directly in the page. A WebMCP-aware agent can use the same calculations and update the same visible workspace. Computation stays in the browser through WebAssembly and Web Workers.

This is a dedicated WebMCP project. It is not the TDA Explorer and contains no lessons or tutorial flow.

## Human workbench

- Explore built-in 2D and 3D point-cloud examples with a live SVG/WebGL preview. In 2D, choose the Move tool to drag points or the Edit tool to enter exact coordinates, then play the computed filtration while its associated disks, edges, and persistence-diagram playhead advance together. The cover uses radius t/2 for Rips, t for Čech, and √t for alpha. Three-dimensional clouds rotate automatically and support drag-to-orbit and wheel/pinch zoom through the local `tda-viz-react` library.
- Choose among nine simplicial-complex constructions and edit their relevant parameters through structured controls.
- Paste exact point coordinates when needed without making raw JSON the default experience.
- Analyze a doughnut photograph, built-in masks, or uploaded images through a visible original-color → grayscale → denoise → binary-mask → small-hole cleanup → cubical-persistence pipeline. Otsu thresholding is automatic, with manual threshold, foreground polarity, and grayscale controls available.
- Read feature counts, essential classes, H1 loops, runtime, a persistence diagram, a plain-language result summary, and the complete structured result.

## Agent tools

- `tda_get_capabilities` — discover supported complexes, parameters, limits, and image inputs.
- `tda_compute_simplicial_persistence` — compute persistence from a 2D or 3D point cloud using Rips, Alpha, Čech, ellipsoid Rips, ellipsoid Čech, Wing, Box, exact k-fold cover, or Euclidean weak witness complexes.
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

The current private workspace consumes `tda-viz-react` from the sibling `../tda-viz-react` checkout. Keep both private repositories side by side when installing locally.

Open `http://127.0.0.1:5180`. A standard browser gets the complete visual workbench; a WebMCP-enabled browser also discovers the four tools above.

```bash
npm test
npm run typecheck
npm run build
```

## Why there is no authentication

The application has no backend, account data, or remote computation. Inputs and results stay in the active browser tab. Adding sign-in would not protect a server-side resource and would add friction to the agent workflow. WebMCP registration remains same-origin by default.

## Computational backend

The repository vendors the built browser distribution of [`tda-wasm`](https://github.com/topo-lab/tda-wasm), an MIT-licensed WebAssembly toolkit. Its license and third-party notices are retained under `vendor/tda-wasm/`. Vite fingerprints and serves the WASM asset from the production bundle.

The WebMCP API is an evolving Community Group draft. See the [current specification](https://webmachinelearning.github.io/webmcp/).
