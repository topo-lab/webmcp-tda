# WebMCP TDA

WebMCP TDA turns a browser tab into a local computational-topology tool server for AI agents. It exposes one-parameter persistent homology for several simplicial-complex constructions and 2D cubical persistence for images. Computation stays in the browser through WebAssembly and Web Workers.

This is a dedicated WebMCP project. It is not the TDA Explorer and contains no lessons or tutorial flow.

## Agent tools

- `tda_get_capabilities` — discover supported complexes, parameters, limits, and image inputs.
- `tda_compute_simplicial_persistence` — compute persistence from a 2D or 3D point cloud using Rips, Alpha, Čech, ellipsoid Rips, ellipsoid Čech, Wing, Box, exact k-fold cover, or Euclidean weak witness complexes.
- `tda_compute_cubical_persistence` — compute vertex lower-star cubical persistence from the current uploaded image, a built-in sample, or a supplied scalar grid.
- `tda_get_latest_result` — read the latest result shared by the human and agent.

Tool calls update the same compact console the human sees. Tool registration follows the current draft WebMCP API (`document.modelContext.registerTool`) and is automatically removed through an `AbortSignal` when the page unloads.

Agent-controlled inputs are bounded by coordinate, point, image, and worst-case simplex budgets. Cancelling a running WebMCP computation terminates its Worker and starts queued work in a fresh Worker, so one expensive request cannot permanently wedge the tool service.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5180`. A standard browser can use the manual console; a WebMCP-enabled browser also discovers the four tools above.

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
