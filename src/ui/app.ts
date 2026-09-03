import { getWorkspaceState, subscribeWorkspace, updateWorkspace, type WorkspaceState } from '../state';
import { CAPABILITIES } from '../tda/capabilities';
import { imageSample, POINT_SAMPLE_IDS, pointSample, type PointSampleId } from '../tda/samples';
import { tdaRuntime } from '../tda/runtime';
import type {
  ComplexKind,
  ComplexParameters,
  ComputeResult,
  CubicalRequest,
  SerializablePair,
} from '../tda/types';

const PARAMETER_DEFAULTS: Record<ComplexKind, ComplexParameters> = {
  rips: { maxEdgeLength: 0.7, maxSimplexDimension: 2 },
  alpha: { maxSimplexDimension: 2 },
  cech: { maxRadius: 0.5, maxSimplexDimension: 2 },
  'ellipsoid-rips': { neighborhoodSize: 6, axesMode: 'pca', maxFiltration: 1.5, maxSimplexDimension: 2 },
  'ellipsoid-cech': { neighborhoodSize: 6, axesMode: 'pca', maxFiltration: 1.5, maxSimplexDimension: 2 },
  wing: { q: 0.3, theta: 0.785, neighborhoodSize: 6, maxEps: 1.5, maxSimplexDimension: 2 },
  box: { stepSize: 0.1, alpha: 0.5, maxSteps: 20, maxSimplexDimension: 2 },
  'k-fold-cover': { k: 2, maxSquaredRadius: 4, maxSimplexDimension: 3 },
  witness: { numLandmarks: 12, maxAlphaSquare: 1, maxSimplexDimension: 2 },
};

interface ParameterField {
  key: keyof ComplexParameters;
  label: string;
  help: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
}

const dimensionField: ParameterField = {
  key: 'maxSimplexDimension',
  label: 'Maximum simplex dimension',
  help: 'Compute through edges, triangles, or tetrahedra.',
  options: [
    { label: '1 · edges', value: '1' },
    { label: '2 · triangles', value: '2' },
    { label: '3 · tetrahedra', value: '3' },
  ],
};

const PARAMETER_FIELDS: Record<ComplexKind, ParameterField[]> = {
  rips: [
    { key: 'maxEdgeLength', label: 'Maximum edge length', help: 'Connect points no farther apart than this.', min: 0.05, step: 0.05 },
    dimensionField,
  ],
  alpha: [dimensionField],
  cech: [
    { key: 'maxRadius', label: 'Maximum ball radius', help: 'Grow equal-radius balls around every point.', min: 0.05, step: 0.05 },
    dimensionField,
  ],
  'ellipsoid-rips': [
    { key: 'neighborhoodSize', label: 'Local neighbors', help: 'Points used to estimate local direction.', min: 2, max: 64, step: 1 },
    { key: 'axesMode', label: 'Ellipsoid axes', help: 'Use PCA or a fixed tangent-to-normal ratio.', options: [{ label: 'PCA-derived', value: 'pca' }, { label: '1.5×', value: '1.5' }, { label: '2×', value: '2' }, { label: '3×', value: '3' }] },
    { key: 'maxFiltration', label: 'Maximum filtration', help: 'Stop the anisotropic growth at this scale.', min: 0.05, step: 0.05 },
    dimensionField,
  ],
  'ellipsoid-cech': [
    { key: 'neighborhoodSize', label: 'Local neighbors', help: 'Points used to estimate local direction.', min: 2, max: 64, step: 1 },
    { key: 'axesMode', label: 'Ellipsoid axes', help: 'Use PCA or a fixed tangent-to-normal ratio.', options: [{ label: 'PCA-derived', value: 'pca' }, { label: '1.5×', value: '1.5' }, { label: '2×', value: '2' }, { label: '3×', value: '3' }] },
    { key: 'maxFiltration', label: 'Maximum filtration', help: 'Stop the ellipsoid nerve at this scale.', min: 0.05, step: 0.05 },
    dimensionField,
  ],
  wing: [
    { key: 'q', label: 'Wing ratio q', help: 'Controls spine-to-wing balance.', min: 0, max: 1, step: 0.05 },
    { key: 'theta', label: 'Angle θ · radians', help: 'Maximum local turning angle.', min: 0.001, max: 1.571, step: 0.001 },
    { key: 'neighborhoodSize', label: 'Local neighbors', help: 'Points used for the curvature estimate.', min: 2, max: 64, step: 1 },
    { key: 'maxEps', label: 'Maximum epsilon', help: 'Stop the filtration at this scale.', min: 0.05, step: 0.05 },
    dimensionField,
  ],
  box: [
    { key: 'stepSize', label: 'Step size', help: 'Resolution of the box-growth filtration.', min: 0.05, step: 0.05 },
    { key: 'alpha', label: 'Growth rate α', help: 'Controls box expansion at each step.', min: 0, max: 1, step: 0.05 },
    { key: 'maxSteps', label: 'Maximum steps', help: 'Number of filtration steps.', min: 1, max: 100, step: 1 },
    dimensionField,
  ],
  'k-fold-cover': [
    { key: 'k', label: 'Cover multiplicity k', help: 'Required number of overlapping balls.', min: 1, max: 4, step: 1 },
    { key: 'maxSquaredRadius', label: 'Maximum squared radius', help: 'Stop the multicover filtration here.', min: 0.1, step: 0.1 },
    dimensionField,
  ],
  witness: [
    { key: 'numLandmarks', label: 'Landmarks', help: 'Representative vertices selected from the cloud.', min: 2, max: 64, step: 1 },
    { key: 'maxAlphaSquare', label: 'Maximum squared relaxation', help: 'Tolerance for weak witnesses.', min: 0.1, step: 0.1 },
    dimensionField,
  ],
};

const COMPLEX_LABELS: Record<ComplexKind, string> = {
  rips: 'Vietoris–Rips',
  alpha: 'Alpha',
  cech: 'Čech',
  'ellipsoid-rips': 'Ellipsoid Rips',
  'ellipsoid-cech': 'Ellipsoid Čech',
  wing: 'Wing',
  box: 'Box filtration',
  'k-fold-cover': 'k-fold cover',
  witness: 'Weak witness',
};

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing UI element ${selector}.`);
  return found;
}

function escapeAttribute(value: unknown): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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

function drawPointCloud(canvas: HTMLCanvasElement, points: number[][]): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.fillStyle = '#0b2531';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(157, 182, 189, .11)';
  context.lineWidth = 1;
  for (let step = 1; step < 8; step += 1) {
    const x = (width / 8) * step;
    const y = (height / 8) * step;
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  if (points.length === 0) return;
  const projected = points.map(([x = 0, y = 0, z = 0]) => [x + z * 0.32, y - z * 0.18]);
  const xs = projected.map(([x]) => x!);
  const ys = projected.map(([, y]) => y!);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 0.2);
  const scale = Math.min((width - 76) / span, (height - 76) / span);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  projected.forEach(([x, y]) => {
    const px = width / 2 + (x! - centerX) * scale;
    const py = height / 2 - (y! - centerY) * scale;
    context.shadowColor = 'rgba(90, 200, 232, .5)';
    context.shadowBlur = 9;
    context.fillStyle = '#eefaff';
    context.beginPath();
    context.arc(px, py, 4.2, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = '#5ac8e8';
    context.stroke();
  });
}

function drawDiagram(canvas: HTMLCanvasElement, pairs: SerializablePair[]): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  const left = 54; const right = 18; const top = 30; const bottom = 46;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.font = '11px IBM Plex Mono, monospace';
  if (pairs.length === 0) {
    context.fillStyle = '#71858b';
    context.textAlign = 'center';
    context.fillText('Run a computation to see the persistence diagram.', width / 2, height / 2);
    return;
  }
  const finiteValues = pairs.flatMap((pair) => [pair.birth, pair.death === 'infinity' ? pair.birth : pair.death]);
  const minimum = Math.min(0, ...finiteValues);
  const maximum = Math.max(1, ...finiteValues);
  const range = maximum - minimum || 1;
  const upper = maximum + range * 0.08;
  const scaleX = (value: number) => left + ((value - minimum) / (upper - minimum)) * (width - left - right);
  const scaleY = (value: number) => height - bottom - ((value - minimum) / (upper - minimum)) * (height - top - bottom);

  context.strokeStyle = '#e1e9e9';
  context.fillStyle = '#71858b';
  context.textAlign = 'center';
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = minimum + ((upper - minimum) * tick) / 4;
    const x = scaleX(value); const y = scaleY(value);
    context.beginPath(); context.moveTo(x, top); context.lineTo(x, height - bottom); context.stroke();
    context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillText(value.toFixed(2), x, height - 23);
  }
  context.strokeStyle = '#9fb2b6';
  context.lineWidth = 1.25;
  context.beginPath();
  context.moveTo(scaleX(minimum), scaleY(minimum));
  context.lineTo(scaleX(upper), scaleY(upper));
  context.stroke();
  context.setLineDash([4, 4]);
  context.strokeStyle = '#c8d5d7';
  context.beginPath(); context.moveTo(left, top); context.lineTo(width - right, top); context.stroke();
  context.setLineDash([]);
  context.fillStyle = '#526971';
  context.fillText('birth', (left + width - right) / 2, height - 6);
  context.save(); context.translate(14, (top + height - bottom) / 2); context.rotate(-Math.PI / 2); context.fillText('death', 0, 0); context.restore();
  context.textAlign = 'left'; context.fillText('∞', width - right - 10, top - 8);

  pairs.forEach((pair) => {
    const death = pair.death === 'infinity' ? upper : pair.death;
    context.fillStyle = pair.dimension === 0 ? '#2f86eb' : pair.dimension === 1 ? '#e85f3f' : '#7657d6';
    context.beginPath();
    context.arc(scaleX(pair.birth), scaleY(death), pair.death === 'infinity' ? 5 : 4, 0, Math.PI * 2);
    context.fill();
    if (pair.death === 'infinity') {
      context.strokeStyle = '#17313a'; context.lineWidth = 1; context.stroke();
    }
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

function metricValue(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

export function parsePointInput(text: string): number[][] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed) || parsed.length < 2) throw new Error('Enter an array containing at least two points.');
  const dimension = Array.isArray(parsed[0]) ? parsed[0].length : 0;
  if (dimension !== 2 && dimension !== 3) throw new Error('Every point must have two or three coordinates.');
  if (!parsed.every((point) => Array.isArray(point) && point.length === dimension && point.every((value) => typeof value === 'number' && Number.isFinite(value)))) {
    throw new Error(`Every point must contain ${dimension} finite numbers.`);
  }
  return parsed as number[][];
}

function identifyPointSample(points: number[][]): PointSampleId | 'custom' {
  const serialized = JSON.stringify(points);
  return POINT_SAMPLE_IDS.find((id) => JSON.stringify(pointSample(id)) === serialized) ?? 'custom';
}

function resultDescription(result: ComputeResult): string {
  if (result.kind === 'simplicial') {
    const base = `${COMPLEX_LABELS[result.complex]} on ${result.input.pointCount} ${result.input.dimension}D points produced ${metricValue(result.complexSummary.simplexCount)} simplices.`;
    return result.interpretation.warning ? `${base} ${result.interpretation.warning}` : base;
  }
  return `${result.input.name} was analyzed as a ${result.input.width} × ${result.input.height} ${result.input.filtration} cubical filtration over F2.`;
}

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <header class="masthead">
      <a class="wordmark" href="#top" aria-label="WebMCP TDA home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand-copy">topolab <b>WebMCP TDA</b></span></a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#workbench">Workbench</a>
        <a href="#agent-access">Agent access</a>
        <a href="https://github.com/topo-lab/webmcp-tda" target="_blank" rel="noreferrer">GitHub ↗</a>
      </nav>
      <div class="status-cluster" title="WebMCP registration status">
        <span class="status-label">Agent tools</span>
        <span id="webmcp-status" class="status-pill">registering</span>
      </div>
    </header>

    <main id="top">
      <section class="hero" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">Persistent homology · entirely in your browser</p>
          <h1 id="page-title">Find the shape<br><em>that survives.</em></h1>
        </div>
        <div class="hero-copy">
          <p class="lede">Compute topology from point clouds and images. Work directly in the lab, or ask your agent to use the same tools while you watch the results appear.</p>
          <div class="trust-row" aria-label="Runtime properties"><span>Local WASM</span><span>No upload</span><span>Shared with your agent</span></div>
        </div>
      </section>

      <section id="workbench" class="workbench-section" aria-labelledby="workbench-title">
        <div class="section-heading">
          <div><p class="eyebrow">Human workbench</p><h2 id="workbench-title">Choose your data, then compute.</h2></div>
          <p>Start with a built-in example or bring your own point coordinates or image. The same calculation is available to WebMCP agents.</p>
        </div>

        <div class="mode-switch" role="tablist" aria-label="Input type">
          <button class="mode-tab" type="button" role="tab" aria-selected="true" aria-controls="simplicial-panel" data-mode="simplicial"><span>Point cloud</span><small>Simplicial persistence</small></button>
          <button class="mode-tab" type="button" role="tab" aria-selected="false" aria-controls="cubical-panel" data-mode="cubical"><span>Image</span><small>Cubical persistence</small></button>
        </div>

        <div class="workbench-grid">
          <div class="input-pane">
            <form id="simplicial-panel" class="input-form" role="tabpanel" aria-label="Simplicial persistence controls">
              <div class="control-grid control-grid--three">
                <label>Example dataset<select id="point-sample"><option value="circle">Circle · 2D</option><option value="figure-eight">Figure eight · 2D</option><option value="clusters">Two clusters · 2D</option><option value="sphere">Sphere · 3D</option><option value="custom">Custom / agent input</option></select></label>
                <label>Complex<select id="complex-kind">${Object.entries(COMPLEX_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
                <label>Coefficient field<select id="coefficient-field"><option value="2">F₂</option><option value="3">F₃</option><option value="5">F₅</option><option value="7">F₇</option><option value="11">F₁₁</option></select></label>
              </div>
              <p id="complex-note" class="context-note"></p>
              <figure class="data-stage">
                <figcaption><span>Point-cloud preview</span><strong id="point-meta">32 points · 2D</strong></figcaption>
                <canvas id="point-preview" width="720" height="380" aria-label="Point-cloud preview"></canvas>
              </figure>
              <div class="parameter-heading"><div><h3>Filtration settings</h3><p>Only parameters used by the selected complex are shown.</p></div></div>
              <div id="parameter-fields" class="parameter-grid"></div>
              <details class="advanced-input">
                <summary>Edit point coordinates</summary>
                <label>JSON array<textarea id="points-input" spellcheck="false" aria-describedby="point-input-feedback"></textarea></label>
                <p id="point-input-feedback" class="field-feedback">Every point must have two or three coordinates.</p>
              </details>
              <div class="run-row"><button id="run-simplicial" class="primary-action" type="submit">Compute simplicial persistence</button><p>Runs locally. Larger complexes may take a moment.</p></div>
            </form>

            <form id="cubical-panel" class="input-form" role="tabpanel" aria-label="Cubical persistence controls" hidden>
              <div class="control-grid control-grid--three">
                <label>Example image<select id="image-sample"><option value="ring">Ring</option><option value="two-rings">Two rings</option><option value="two-blobs">Two blobs</option><option value="custom">Custom / agent image</option></select></label>
                <label>Filtration<select id="filtration"><option value="sublevel">Sublevel · dark first</option><option value="superlevel">Superlevel · light first</option></select></label>
                <label>Downsample<select id="downsample"><option value="1">1× · full resolution</option><option value="2">2× · faster</option><option value="4">4× · fastest</option></select></label>
              </div>
              <figure class="data-stage image-stage">
                <figcaption><span>Scalar-image preview</span><strong id="image-meta">ring · 64 × 64</strong></figcaption>
                <div class="image-stage__body"><canvas id="image-preview" aria-label="Current grayscale image"></canvas><div class="image-copy"><h3>Bring your own image</h3><p>Color images are converted to grayscale and resized to a maximum of 256 × 256 in this tab.</p><label class="upload-button" for="image-file">Choose an image</label><input id="image-file" class="visually-hidden" type="file" accept="image/*"></div></div>
              </figure>
              <div class="method-note"><strong>How it works</strong><p>Pixel values become vertex filtration values. The tool computes a 2D lower-star cubical filtration over F₂.</p></div>
              <div class="run-row"><button id="run-cubical" class="primary-action" type="submit">Compute cubical persistence</button><p>Images never leave your browser.</p></div>
            </form>
          </div>

          <aside class="result-pane" aria-labelledby="result-title">
            <div class="result-heading"><div><p class="eyebrow">Shared result</p><h2 id="result-title">Persistence summary</h2></div><span id="compute-status" class="compute-status">Idle</span></div>
            <p id="activity" class="activity" role="status" aria-live="polite" aria-atomic="true">Choose an example and run a computation.</p>
            <div class="metric-grid" aria-label="Result metrics">
              <div><span>Features</span><strong id="metric-features">—</strong></div>
              <div><span>Essential</span><strong id="metric-essential">—</strong></div>
              <div><span>H₁ loops</span><strong id="metric-loops">—</strong></div>
              <div><span>Runtime</span><strong id="metric-runtime">—</strong></div>
            </div>
            <figure class="diagram-card"><figcaption><span>Persistence diagram</span><span class="diagram-legend"><i class="h0"></i>H₀ <i class="h1"></i>H₁ <i class="h2"></i>H₂+</span></figcaption><canvas id="diagram" width="680" height="410" aria-label="Persistence diagram"></canvas></figure>
            <div class="interpretation"><strong>What this result says</strong><p id="result-description">Connected components, loops, and higher-dimensional features will appear here after computation.</p></div>
            <details class="raw-result"><summary>Inspect structured result</summary><button id="copy-result" class="secondary-action" type="button" disabled>Copy JSON</button><pre id="result-json">No result yet.</pre></details>
          </aside>
        </div>
      </section>

      <section id="agent-access" class="agent-section" aria-labelledby="agent-title">
        <div class="agent-intro"><p class="eyebrow">Agent access</p><h2 id="agent-title">One workbench, two ways to use it.</h2><p>These tools expose the same calculations and update the same visible result. Your agent can inspect capabilities, run a computation, and hand the result back without guessing through the interface.</p></div>
        <div class="tool-list">
          <article><code>tda_get_capabilities</code><p>Discover supported complexes, parameters, units, and safety limits.</p><span>Read only</span></article>
          <article><code>tda_compute_simplicial_persistence</code><p>Compute one-parameter persistence from 2D or 3D point coordinates.</p><span>Updates workbench</span></article>
          <article><code>tda_compute_cubical_persistence</code><p>Analyze the current image, an example, or a supplied scalar grid.</p><span>Updates workbench</span></article>
          <article><code>tda_get_latest_result</code><p>Read the result currently visible to the person using this page.</p><span>Read only</span></article>
        </div>
      </section>
    </main>

    <footer><span>TopoLab · WebMCP Challenge 2026</span><span>Human-first · agent-ready · browser-local</span></footer>
  `;

  const modeTabs = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const simplicialPanel = element<HTMLFormElement>('#simplicial-panel');
  const cubicalPanel = element<HTMLFormElement>('#cubical-panel');
  const pointsInput = element<HTMLTextAreaElement>('#points-input');
  const pointFeedback = element<HTMLParagraphElement>('#point-input-feedback');
  const pointSampleSelect = element<HTMLSelectElement>('#point-sample');
  const complexSelect = element<HTMLSelectElement>('#complex-kind');
  const coefficientField = element<HTMLSelectElement>('#coefficient-field');
  const complexNote = element<HTMLParagraphElement>('#complex-note');
  const parameterFields = element<HTMLDivElement>('#parameter-fields');
  const pointPreview = element<HTMLCanvasElement>('#point-preview');
  const pointMeta = element<HTMLElement>('#point-meta');
  const imageSelect = element<HTMLSelectElement>('#image-sample');
  const imageFile = element<HTMLInputElement>('#image-file');
  const filtration = element<HTMLSelectElement>('#filtration');
  const downsample = element<HTMLSelectElement>('#downsample');
  const imagePreview = element<HTMLCanvasElement>('#image-preview');
  const imageMeta = element<HTMLElement>('#image-meta');
  const diagram = element<HTMLCanvasElement>('#diagram');
  const resultJson = element<HTMLPreElement>('#result-json');
  const copyResult = element<HTMLButtonElement>('#copy-result');
  const resultDescriptionElement = element<HTMLParagraphElement>('#result-description');
  const activity = element<HTMLParagraphElement>('#activity');
  const computeStatus = element<HTMLElement>('#compute-status');
  const webMcpStatus = element<HTMLElement>('#webmcp-status');
  const runSimplicial = element<HTMLButtonElement>('#run-simplicial');
  const runCubical = element<HTMLButtonElement>('#run-cubical');
  const metricFeatures = element<HTMLElement>('#metric-features');
  const metricEssential = element<HTMLElement>('#metric-essential');
  const metricLoops = element<HTMLElement>('#metric-loops');
  const metricRuntime = element<HTMLElement>('#metric-runtime');

  let currentPoints = pointSample('circle');

  const setMode = (mode: 'simplicial' | 'cubical') => {
    modeTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === mode)));
    simplicialPanel.hidden = mode !== 'simplicial';
    cubicalPanel.hidden = mode !== 'cubical';
  };

  const syncPointPreview = () => {
    drawPointCloud(pointPreview, currentPoints);
    pointMeta.textContent = `${currentPoints.length} points · ${currentPoints[0]?.length ?? 0}D`;
  };

  const setPoints = (points: number[][]) => {
    currentPoints = points;
    pointsInput.value = JSON.stringify(points, null, 2);
    pointFeedback.textContent = 'Every point must have two or three coordinates.';
    pointFeedback.dataset.status = 'valid';
    syncPointPreview();
  };

  const renderParameters = (kind: ComplexKind) => {
    const defaults = PARAMETER_DEFAULTS[kind];
    parameterFields.innerHTML = PARAMETER_FIELDS[kind].map((field) => {
      const value = defaults[field.key] ?? '';
      const control = field.options
        ? `<select data-parameter="${field.key}">${field.options.map((option) => `<option value="${option.value}" ${String(value) === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select>`
        : `<input data-parameter="${field.key}" type="number" value="${escapeAttribute(value)}" ${field.min === undefined ? '' : `min="${field.min}"`} ${field.max === undefined ? '' : `max="${field.max}"`} step="${field.step ?? 'any'}">`;
      return `<label>${field.label}${control}<small>${field.help}</small></label>`;
    }).join('');
    const capability = CAPABILITIES.simplicialComplexes.find((entry) => entry.id === kind)!;
    complexNote.innerHTML = `<strong>${capability.filtrationUnits}</strong> · ${capability.note}`;
  };

  const applyParameterValues = (parameters: ComplexParameters = {}) => {
    parameterFields.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-parameter]').forEach((control) => {
      const key = control.dataset.parameter as keyof ComplexParameters;
      const value = parameters[key];
      if (value !== undefined) control.value = String(value);
    });
  };

  const readParameters = (): ComplexParameters => {
    const parameters: Record<string, number | 'pca'> = {};
    parameterFields.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-parameter]').forEach((control) => {
      const key = control.dataset.parameter!;
      if (key === 'axesMode' && control.value === 'pca') parameters[key] = 'pca';
      else {
        const value = Number(control.value);
        if (!Number.isFinite(value)) throw new Error(`${key} must be a number.`);
        parameters[key] = value;
      }
    });
    return parameters as ComplexParameters;
  };

  const updateResult = (result: ComputeResult | null) => {
    if (!result) {
      drawDiagram(diagram, []);
      return;
    }
    metricFeatures.textContent = metricValue(result.persistence.pairCount);
    metricEssential.textContent = metricValue(result.persistence.essentialCount);
    metricLoops.textContent = metricValue(result.persistence.pairsByDimension[1] ?? 0);
    metricRuntime.textContent = `${metricValue(result.elapsedMs)} ms`;
    resultDescriptionElement.textContent = resultDescription(result);
    resultJson.textContent = JSON.stringify(result, null, 2);
    copyResult.disabled = false;
    drawDiagram(diagram, result.persistence.strongestPairs);
  };

  modeTabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode as 'simplicial' | 'cubical')));

  pointSampleSelect.addEventListener('change', () => {
    if (pointSampleSelect.value !== 'custom') setPoints(pointSample(pointSampleSelect.value as PointSampleId));
  });

  complexSelect.addEventListener('change', () => {
    const kind = complexSelect.value as ComplexKind;
    const dimension = currentPoints[0]?.length;
    if (kind === 'k-fold-cover' && dimension !== 3) {
      pointSampleSelect.value = 'sphere';
      setPoints(pointSample('sphere'));
    } else if (kind === 'wing' && dimension !== 2) {
      pointSampleSelect.value = 'circle';
      setPoints(pointSample('circle'));
    }
    renderParameters(kind);
  });

  pointsInput.addEventListener('input', () => {
    try {
      currentPoints = parsePointInput(pointsInput.value);
      pointSampleSelect.value = identifyPointSample(currentPoints);
      pointFeedback.textContent = `${currentPoints.length} points ready.`;
      pointFeedback.dataset.status = 'valid';
      syncPointPreview();
    } catch (error) {
      pointFeedback.textContent = error instanceof Error ? error.message : 'Invalid point data.';
      pointFeedback.dataset.status = 'error';
    }
  });

  imageSelect.addEventListener('change', () => {
    if (imageSelect.value !== 'custom') {
      updateWorkspace({ currentImage: imageSample(imageSelect.value as 'ring' | 'two-rings' | 'two-blobs'), activity: `Loaded ${imageSelect.options[imageSelect.selectedIndex]?.text ?? imageSelect.value}.` });
    }
  });

  imageFile.addEventListener('change', () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    void loadImageFile(file).catch((error: unknown) => updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error) }));
  });

  simplicialPanel.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const points = parsePointInput(pointsInput.value);
      void tdaRuntime.computeSimplicial({
        kind: 'simplicial',
        complex: complexSelect.value as ComplexKind,
        points,
        coefficientField: Number(coefficientField.value),
        parameters: readParameters(),
      }).catch(() => undefined);
    } catch (error) {
      updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error), activity: 'Check the point coordinates and filtration settings.' });
    }
  });

  cubicalPanel.addEventListener('submit', (event) => {
    event.preventDefault();
    void tdaRuntime.computeCubical({
      kind: 'cubical',
      source: 'current',
      filtration: filtration.value as CubicalRequest['filtration'],
      downsample: Number(downsample.value) as 1 | 2 | 4,
    }).catch(() => undefined);
  });

  copyResult.addEventListener('click', () => {
    void navigator.clipboard.writeText(resultJson.textContent ?? '').then(() => {
      copyResult.textContent = 'Copied';
      window.setTimeout(() => { copyResult.textContent = 'Copy JSON'; }, 1400);
    }).catch(() => {
      copyResult.textContent = 'Select JSON below';
    });
  });

  let lastSyncedRequest: unknown = null;

  subscribeWorkspace((state) => {
    if (state.latestRequest && state.latestRequest !== lastSyncedRequest) {
      lastSyncedRequest = state.latestRequest;
      const request = state.latestRequest as { kind?: string };
      if (request.kind === 'simplicial') {
        const simplicial = state.latestRequest as {
          complex: ComplexKind;
          points: number[][];
          coefficientField?: number;
          parameters?: ComplexParameters;
        };
        setMode('simplicial');
        complexSelect.value = simplicial.complex;
        coefficientField.value = String(simplicial.coefficientField ?? 2);
        renderParameters(simplicial.complex);
        applyParameterValues(simplicial.parameters);
        setPoints(simplicial.points);
        pointSampleSelect.value = identifyPointSample(simplicial.points);
      } else if (request.kind === 'cubical') {
        const cubical = state.latestRequest as CubicalRequest;
        setMode('cubical');
        filtration.value = cubical.filtration ?? 'sublevel';
        downsample.value = String(cubical.downsample ?? 1);
        imageSelect.value = cubical.source === 'sample' ? cubical.sample ?? 'ring' : cubical.source === 'values' ? 'custom' : imageSelect.value;
      }
    }
    webMcpStatus.textContent = state.webMcpStatus;
    webMcpStatus.dataset.status = state.webMcpStatus;
    computeStatus.textContent = state.status === 'computing' ? 'Computing…' : state.status[0]!.toUpperCase() + state.status.slice(1);
    computeStatus.dataset.status = state.status;
    activity.textContent = state.error ?? state.activity;
    const activeKind = (state.latestRequest as { kind?: string } | null)?.kind;
    runSimplicial.disabled = state.status === 'computing';
    runCubical.disabled = state.status === 'computing';
    runSimplicial.textContent = state.status === 'computing' && activeKind === 'simplicial' ? 'Computing…' : 'Compute simplicial persistence';
    runCubical.textContent = state.status === 'computing' && activeKind === 'cubical' ? 'Computing…' : 'Compute cubical persistence';
    drawImage(imagePreview, state);
    imageMeta.textContent = `${state.currentImage.name} · ${state.currentImage.width} × ${state.currentImage.height}`;
    updateResult(state.latestResult);
  });

  setPoints(currentPoints);
  renderParameters('rips');
  drawImage(imagePreview, getWorkspaceState());
}
