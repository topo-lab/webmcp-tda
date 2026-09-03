import { getWorkspaceState, subscribeWorkspace, updateWorkspace, type WorkspaceState } from '../state';
import { circlePoints, imageSample } from '../tda/samples';
import { tdaRuntime } from '../tda/runtime';
import type { ComplexKind, CubicalRequest, SerializablePair } from '../tda/types';

const PARAMETER_DEFAULTS: Record<ComplexKind, Record<string, unknown>> = {
  rips: { maxEdgeLength: 0.7, maxSimplexDimension: 2 },
  alpha: { maxSimplexDimension: 2 },
  cech: { maxRadius: 0.5, maxSimplexDimension: 2 },
  'ellipsoid-rips': { neighborhoodSize: 6, axesMode: 'pca', maxFiltration: 1.5, maxSimplexDimension: 2 },
  'ellipsoid-cech': { neighborhoodSize: 6, axesMode: 'pca', maxFiltration: 1.5, maxSimplexDimension: 2 },
  wing: { q: 0.3, theta: 0.7853981633974483, neighborhoodSize: 6, maxEps: 1.5, maxSimplexDimension: 2 },
  box: { stepSize: 0.1, alpha: 0.5, maxSteps: 20, maxSimplexDimension: 2 },
  'k-fold-cover': { k: 2, maxSquaredRadius: 4, maxSimplexDimension: 3 },
  witness: { numLandmarks: 12, maxAlphaSquare: 1, maxSimplexDimension: 2 },
};

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing UI element ${selector}.`);
  return found;
}

function drawImage(canvas: HTMLCanvasElement, state: WorkspaceState): void {
  const { currentImage } = state;
  canvas.width = currentImage.width;
  canvas.height = currentImage.height;
  const context = canvas.getContext('2d');
  if (!context) return;
  const pixels = context.createImageData(currentImage.width, currentImage.height);
  currentImage.values.forEach((value, index) => {
    const shade = Math.max(0, Math.min(255, Math.round(value)));
    const offset = index * 4;
    pixels.data[offset] = shade;
    pixels.data[offset + 1] = shade;
    pixels.data[offset + 2] = shade;
    pixels.data[offset + 3] = 255;
  });
  context.putImageData(pixels, 0, 0);
}

function drawDiagram(canvas: HTMLCanvasElement, pairs: SerializablePair[]): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#0d1117';
  context.fillRect(0, 0, width, height);
  const finiteValues = pairs.flatMap((pair) => [pair.birth, pair.death === 'infinity' ? pair.birth : pair.death]);
  const minimum = Math.min(0, ...finiteValues);
  const maximum = Math.max(1, ...finiteValues);
  const margin = 28;
  const scaleX = (value: number) => margin + ((value - minimum) / (maximum - minimum || 1)) * (width - margin * 2);
  const scaleY = (value: number) => height - margin - ((value - minimum) / (maximum - minimum || 1)) * (height - margin * 2);
  context.strokeStyle = '#53606c';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(scaleX(minimum), scaleY(minimum));
  context.lineTo(scaleX(maximum), scaleY(maximum));
  context.stroke();
  pairs.forEach((pair) => {
    const death = pair.death === 'infinity' ? maximum : pair.death;
    context.fillStyle = pair.dimension === 0 ? '#67e8f9' : pair.dimension === 1 ? '#fbbf24' : '#f472b6';
    context.beginPath();
    context.arc(scaleX(pair.birth), scaleY(death), pair.death === 'infinity' ? 5 : 3.5, 0, Math.PI * 2);
    context.fill();
  });
}

async function loadImageFile(file: File): Promise<void> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(2, Math.round(bitmap.width * scale));
  const height = Math.max(2, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const rgba = context.getImageData(0, 0, width, height).data;
  const values: number[] = [];
  for (let index = 0; index < rgba.length; index += 4) {
    values.push(0.2126 * rgba[index]! + 0.7152 * rgba[index + 1]! + 0.0722 * rgba[index + 2]!);
  }
  updateWorkspace({ currentImage: { name: file.name, width, height, values }, activity: `Loaded ${file.name}.` });
}

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <header class="masthead">
      <a class="wordmark" href="#">WEBMCP <span>TDA</span></a>
      <div class="status-cluster">
        <span class="status-label">WebMCP</span>
        <span id="webmcp-status" class="status-pill">registering</span>
      </div>
    </header>

    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Browser-local topology for agents</p>
          <h1>Persistent homology,<br><em>exposed as tools.</em></h1>
        </div>
        <p class="lede">A focused WebMCP surface for point-cloud simplicial complexes and image cubical homology. No backend. No account. No tutorial layer.</p>
      </section>

      <section class="tool-strip" aria-label="Registered agent tools">
        <div><b>01</b><span>tda_get_capabilities</span></div>
        <div><b>02</b><span>tda_compute_simplicial_persistence</span></div>
        <div><b>03</b><span>tda_compute_cubical_persistence</span></div>
        <div><b>04</b><span>tda_get_latest_result</span></div>
      </section>

      <section class="workspace">
        <article class="panel controls-panel">
          <div class="panel-heading"><span>POINT CLOUD</span><strong>SIMPLICIAL</strong></div>
          <label>Complex
            <select id="complex-kind">
              <option value="rips">Vietoris–Rips</option>
              <option value="alpha">Alpha</option>
              <option value="cech">Čech</option>
              <option value="ellipsoid-rips">Ellipsoid Rips</option>
              <option value="ellipsoid-cech">Ellipsoid Čech</option>
              <option value="wing">Wing</option>
              <option value="box">Box filtration</option>
              <option value="k-fold-cover">k-fold cover</option>
              <option value="witness">Weak witness</option>
            </select>
          </label>
          <label>Points · JSON array
            <textarea id="points-input" spellcheck="false"></textarea>
          </label>
          <label>Parameters · JSON object
            <textarea id="parameters-input" class="short" spellcheck="false"></textarea>
          </label>
          <button id="run-simplicial" type="button">Compute simplicial persistence</button>
        </article>

        <article class="panel controls-panel">
          <div class="panel-heading"><span>SCALAR IMAGE</span><strong>CUBICAL</strong></div>
          <div class="image-row">
            <canvas id="image-preview" aria-label="Current grayscale image"></canvas>
            <div class="image-controls">
              <label>Sample
                <select id="image-sample">
                  <option value="ring">Ring</option>
                  <option value="two-rings">Two rings</option>
                  <option value="two-blobs">Two blobs</option>
                </select>
              </label>
              <label class="file-label">Upload image<input id="image-file" type="file" accept="image/*"></label>
              <label>Filtration
                <select id="filtration"><option value="sublevel">Sublevel</option><option value="superlevel">Superlevel</option></select>
              </label>
              <label>Downsample
                <select id="downsample"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select>
              </label>
            </div>
          </div>
          <button id="run-cubical" type="button">Compute cubical persistence</button>
        </article>

        <article class="panel result-panel">
          <div class="panel-heading"><span>SHARED OUTPUT</span><strong id="compute-status">IDLE</strong></div>
          <p id="activity" class="activity" role="status" aria-live="polite" aria-atomic="true"></p>
          <canvas id="diagram" width="520" height="300" aria-label="Persistence diagram"></canvas>
          <pre id="result-json">No result yet.</pre>
        </article>
      </section>
    </main>

    <footer><span>TopoLab · WebMCP Challenge 2026</span><span>WASM / local-only / agent-first</span></footer>
  `;

  const pointsInput = element<HTMLTextAreaElement>('#points-input');
  const parametersInput = element<HTMLTextAreaElement>('#parameters-input');
  const complexSelect = element<HTMLSelectElement>('#complex-kind');
  const imageSelect = element<HTMLSelectElement>('#image-sample');
  const imageFile = element<HTMLInputElement>('#image-file');
  const filtration = element<HTMLSelectElement>('#filtration');
  const downsample = element<HTMLSelectElement>('#downsample');
  const imagePreview = element<HTMLCanvasElement>('#image-preview');
  const diagram = element<HTMLCanvasElement>('#diagram');
  const resultJson = element<HTMLPreElement>('#result-json');
  const activity = element<HTMLParagraphElement>('#activity');
  const computeStatus = element<HTMLElement>('#compute-status');
  const webMcpStatus = element<HTMLElement>('#webmcp-status');
  const runSimplicial = element<HTMLButtonElement>('#run-simplicial');
  const runCubical = element<HTMLButtonElement>('#run-cubical');

  pointsInput.value = JSON.stringify(circlePoints(), null, 2);
  parametersInput.value = JSON.stringify(PARAMETER_DEFAULTS.rips, null, 2);

  complexSelect.addEventListener('change', () => {
    const kind = complexSelect.value as ComplexKind;
    parametersInput.value = JSON.stringify(PARAMETER_DEFAULTS[kind], null, 2);
  });

  imageSelect.addEventListener('change', () => {
    updateWorkspace({ currentImage: imageSample(imageSelect.value as 'ring' | 'two-rings' | 'two-blobs'), activity: `Loaded ${imageSelect.value}.` });
  });

  imageFile.addEventListener('change', () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    void loadImageFile(file).catch((error: unknown) => updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error) }));
  });

  runSimplicial.addEventListener('click', () => {
    try {
      const points = JSON.parse(pointsInput.value) as number[][];
      const parameters = JSON.parse(parametersInput.value) as Record<string, unknown>;
      void tdaRuntime.computeSimplicial({
        kind: 'simplicial',
        complex: complexSelect.value as ComplexKind,
        points,
        parameters,
      }).catch(() => undefined);
    } catch (error) {
      updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error), activity: 'Invalid JSON input.' });
    }
  });

  runCubical.addEventListener('click', () => {
    void tdaRuntime.computeCubical({
      kind: 'cubical',
      source: 'current',
      filtration: filtration.value as CubicalRequest['filtration'],
      downsample: Number(downsample.value) as 1 | 2 | 4,
    }).catch(() => undefined);
  });

  subscribeWorkspace((state) => {
    webMcpStatus.textContent = state.webMcpStatus;
    webMcpStatus.dataset.status = state.webMcpStatus;
    computeStatus.textContent = state.status.toUpperCase();
    computeStatus.dataset.status = state.status;
    activity.textContent = state.error ?? state.activity;
    runSimplicial.disabled = state.status === 'computing';
    runCubical.disabled = state.status === 'computing';
    drawImage(imagePreview, state);
    if (state.latestResult) {
      resultJson.textContent = JSON.stringify(state.latestResult, null, 2);
      drawDiagram(diagram, state.latestResult.persistence.strongestPairs);
    } else {
      drawDiagram(diagram, []);
    }
  });

  drawImage(imagePreview, getWorkspaceState());
}
