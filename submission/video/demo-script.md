# WebMCP TDA demo script

Target length: 2 minutes 20 seconds

The final requirement is a public or unlisted YouTube video with audio. Record the ChatGPT interaction manually because the in-app browser is the only place that can show the real agent tool invocation.

## Recording setup

- Set the browser window to 1440 by 900 or larger.
- Open https://webmcp-tda.pages.dev in ChatGPT's in-app browser.
- Keep the WebMCP status badge visible at the start.
- Record the browser and microphone.
- Use the prompts below verbatim so the agent interaction is easy to follow.
- Keep the final video below 3 minutes.

## Shot list and narration

### 0:00 to 0:15

Show the landing page and scroll to the workbench.

Narration:

"This is WebMCP TDA, a browser-local persistent homology workbench shared by a person and an AI agent. The computation runs in WebAssembly and the page exposes four typed WebMCP tools."

### 0:15 to 0:35

In ChatGPT, enter:

`Inspect this page's WebMCP tools and call tda_get_capabilities.`

Show the returned capability summary and the page's WebMCP-ready status.

Narration:

"The agent does not need to click through the interface. It can discover the supported complexes, parameters, input limits, and image modes directly from the site."

### 0:35 to 1:05

Enter:

`Generate 24 noisy points around a unit circle in 2D. Call tda_compute_simplicial_persistence with the Vietoris-Rips complex and maxEdgeLength 0.8.`

Keep the page visible as the point cloud and result update.

Narration:

"Here ChatGPT creates a point cloud and calls the real persistence computation. The exact points appear in the human workbench, and the result includes feature counts, a persistence diagram, and structured output. Nothing is sent to an application backend."

### 1:05 to 1:30

Click Replay filtration. Let it play for several seconds. Toggle the axes if they are hidden.

Narration:

"The filtration view, growing cover, simplices, and persistence-diagram playhead stay synchronized. A person can pause the animation, drag a point, enter exact coordinates, or change the filtration settings before recomputing."

### 1:30 to 1:50

Enter:

`Call tda_get_latest_result and explain whether this point cloud contains an H1 loop.`

Show the response next to the persistence diagram.

Narration:

"The agent can read the same result the person sees. That shared state is the main idea: the computation is inspectable instead of disappearing inside a chat response."

### 1:50 to 2:10

Switch to the Image tab. Enter:

`Use tda_compute_cubical_persistence on the bundled donut sample and summarize the latest result.`

Show the original, grayscale, and mask stages and the resulting diagram.

Narration:

"The same workflow applies to images. The agent can analyze the current human-uploaded image, a bundled photograph, or a supplied scalar grid, while the page shows each processing stage."

### 2:10 to 2:20

Scroll to the WebMCP tool list.

Narration:

"WebMCP turns this from a visual demo into a small computational instrument that a person and an agent can operate together. The source is MIT licensed and the live demo runs on Cloudflare Pages."

## YouTube metadata

Title:

`WebMCP TDA | Shared persistent homology for people and agents`

Description:

`WebMCP TDA is a browser-local computational topology workbench. This demo shows ChatGPT discovering typed WebMCP tools, generating a point cloud, computing persistent homology through WebAssembly, reading the shared result, and analyzing an image. Built for The WebMCP Challenge.`

Links:

- https://webmcp-tda.pages.dev
- https://github.com/topo-lab/webmcp-tda

## Final video checks

- Duration is below 3 minutes.
- Audio is understandable without headphones.
- The video shows an actual WebMCP invocation in ChatGPT.
- The page visibly updates after the tool call.
- No private tabs, notifications, tokens, account details, or local file paths are visible.
- YouTube visibility is Public or Unlisted, not Private.
