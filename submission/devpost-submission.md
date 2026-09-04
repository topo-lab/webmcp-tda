# WebMCP TDA Devpost submission

## Project overview

### Project name

WebMCP TDA

### Elevator pitch

A browser-local topology workbench where people shape point clouds and images while agents compute and explain persistent homology through WebMCP.

## Project details

### About the project

## Inspiration

Persistent homology can reveal connected components, loops, and voids in point clouds and images, but most tools assume that the user already knows the right library, data format, and filtration parameters. An AI agent can help with those choices, but a normal website gives the agent only buttons and text to interpret.

I built WebMCP TDA to give the person and the agent the same computational workspace. The person can manipulate the data visually. The agent can call typed topology tools directly. Both see the same inputs and results in the page.

## What it does

The human workbench accepts 2D and 3D point clouds as well as images. A person can drag points, enter exact coordinates, choose a Vietoris-Rips, Alpha, or Cech complex, and play the filtration. For images, the page shows the original, grayscale, and binary-mask stages before computing cubical persistence.

Results include feature counts, essential classes, H1 loops, runtime, a persistence diagram, and structured JSON. The point-cloud preview, filtration geometry, and persistence-diagram playhead move together.

The page exposes four WebMCP tools:

- `tda_get_capabilities` describes supported complexes, parameters, limits, and image inputs.
- `tda_compute_simplicial_persistence` computes persistence for an agent-supplied 2D or 3D point cloud.
- `tda_compute_cubical_persistence` analyzes the current image, a bundled photograph, or an agent-supplied scalar grid.
- `tda_get_latest_result` reads the result currently shared by the person and agent.

An agent call updates the visible workbench. This matters because the person can inspect what the agent submitted instead of trusting a hidden computation.

## Why WebMCP fits this use case

A point cloud may contain hundreds of coordinates, and a persistence result may contain many intervals. Asking an agent to operate the visual interface would be slow and error prone. WebMCP gives the agent a bounded schema for the real computation while leaving the visual controls available to the person.

The collaboration also works in both directions. A person can upload an image and ask the agent to analyze the current image. An agent can generate a point cloud, compute its persistence, and leave the exact coordinates and result visible for the person to edit or rerun. Without WebMCP, that workflow requires copying arrays between a notebook, a chat, and a visualization tool.

## How I built it

The app registers imperative tools with `document.modelContext.registerTool`. Each tool has a closed JSON schema, safety annotations, runtime validation, and an `AbortSignal`. Tool calls and human actions use the same runtime and workspace state.

Computation runs locally through an MIT-licensed WebAssembly package in a Web Worker. The interface uses TypeScript, Vite, React, Plotly.js, PlayCanvas, and the companion `tda-viz-react` library. Cloudflare Pages hosts the static production build.

The browser enforces limits on point count, coordinate magnitude, image dimensions, filtration scale, result count, and worst-case simplex count. Cancellation terminates the active worker so an expensive request cannot leave later computations stuck behind it.

## Challenges

The hardest part was keeping the mathematical and visual states consistent. Rips, Cech, and Alpha complexes use different filtration conventions, so the displayed cover radius cannot be treated as the raw filtration value in every case. I also had to keep the point-cloud projection fixed while a filtration plays, preserve the axis origin while points move, and fit persistence-diagram ranges to each result without rescaling during playback.

WebMCP is still an evolving browser API. I tested registration, cleanup, schemas, execution, cancellation, and malformed inputs separately instead of treating tool discovery as proof that everything worked.

## What I learned

I learned how much better an agent interaction becomes when the website exposes a small domain API rather than asking the model to infer actions from layout. I also learned that shared state needs to be visible. A correct tool response is not enough when the person cannot inspect the input that produced it.

## What is next

The next useful addition is a seeded point-cloud generator with named shapes, sample count, noise, and dimension. It would make agent-generated experiments reproducible without sending large coordinate arrays. I would also add accessible data tables for persistence pairs and continue profiling the large visualization bundles.

## Built with

Use these Devpost tags:

- WebMCP
- TypeScript
- JavaScript
- Vite
- React
- WebAssembly
- Web Workers
- C++
- Emscripten
- GUDHI
- Plotly.js
- PlayCanvas
- Cloudflare Pages
- Vitest
- Cypress

## Try it out links

- Live demo: https://webmcp-tda.pages.dev
- Public source: https://github.com/topo-lab/webmcp-tda
- WASM source: https://github.com/topo-lab/tda-wasm
- Visualization source: https://github.com/topo-lab/tda-viz-react
- Demo video: ADD_PUBLIC_YOUTUBE_URL

## Additional information

### Submitter type

Individual

### Country of residence

Japan

### Organization

Leave blank unless you are submitting on behalf of TopoLab as an organization.

### App status

Existing, extended during the submission period.

### Existing-project explanation

I began with existing MIT-licensed WebAssembly and visualization libraries for topological data analysis. During the challenge period, I built a dedicated WebMCP application around them. The new work includes the shared human-agent workspace, four WebMCP tools, closed input schemas, cancellation and lifecycle handling, browser safety limits, synchronized 2D and 3D filtration playback, the image-processing workflow, the Plotly persistence diagram, contract tests, end-to-end tests, and the Cloudflare deployment.

### Live URL

https://webmcp-tda.pages.dev

### Testing instructions

No credentials are required.

1. Open the live URL in ChatGPT's in-app browser.
2. Ask ChatGPT: `Inspect this page's WebMCP tools and call tda_get_capabilities.`
3. Then ask: `Generate 24 noisy points around a unit circle in 2D. Use tda_compute_simplicial_persistence with the Vietoris-Rips complex and maxEdgeLength 0.8.`
4. Watch the point cloud and result update in the page.
5. Ask: `Call tda_get_latest_result and explain whether the result contains an H1 loop.`
6. For an image example, ask: `Use tda_compute_cubical_persistence on the bundled donut sample, then summarize the latest result.`

### Public code repository

https://github.com/topo-lab/webmcp-tda

### Agents or clients tested

Current honest answer before the manual smoke test:

`Automated WebMCP registration and tool-contract tests. ChatGPT in-app browser smoke test pending.`

After completing the steps above successfully, replace it with:

`ChatGPT in-app browser, plus automated WebMCP registration and tool-contract tests.`

### AI tools used

OpenAI Codex and Devin.

### Level of learning

Some. I built on existing TDA and WebAssembly experience, then learned how to design, register, validate, cancel, and test WebMCP tools that share state with a human interface.

### Career value

Yes, somewhat. The project produced reusable patterns for agent-facing schemas, browser tool lifecycle management, bounded local computation, and shared human-agent state.

## Final form checklist

- Add a 3:2 thumbnail from `submission/images/thumbnail-3x2.png`.
- Add the screenshots from `submission/images/` to the image gallery.
- Upload the final video to YouTube as Public or Unlisted.
- Replace `ADD_PUBLIC_YOUTUBE_URL` with the YouTube URL.
- Complete the ChatGPT in-app browser smoke test and update the tested-client answer.
- Confirm the GitHub repository is public and the MIT license is visible.
- Confirm the Cloudflare URL opens without credentials.
- Select the exact Devpost dropdown wording that corresponds to Individual, Japan, Existing project, Some learning, and Some career value.
