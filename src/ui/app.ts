import { getWorkspaceState, subscribeWorkspace, updateWorkspace, type WebMcpStatus } from '../state';
import { CAPABILITIES } from '../tda/capabilities';
import { IMAGE_SAMPLES, loadImageSample, loadImageSource } from '../tda/imageSources';
import { POINT_SAMPLE_IDS, pointSample, type PointSampleId } from '../tda/samples';
import { binarizeImage, closeBinaryImage, gaussianBlurImage, otsuThreshold, type ForegroundPolarity } from '../tda/imageProcessing';
import { tdaRuntime } from '../tda/runtime';
import { defaultMaximumSimplexDimension } from '../tda/validation';
import { COMPLEX_KINDS } from '../tda/types';
import type {
  ComplexKind,
  ComplexParameters,
  ComputeResult,
  CubicalRequest,
  ImageSampleId,
  ScalarImage,
  SimplicialResult,
} from '../tda/types';
import { renderPersistenceDiagram, unmountPersistenceDiagram } from './persistenceDiagram';
import { mountPointCloudVisualization } from './pointCloudVisualization';

export const WORKBENCH_COMPLEX_KINDS = [...COMPLEX_KINDS];

const WEB_MCP_STATUS_LABELS: Record<WebMcpStatus, string> = {
  registering: 'WebMCP checking',
  ready: 'WebMCP ready',
  unsupported: 'WebMCP Unavailable in this browser',
  error: 'WebMCP error',
};

export function webMcpStatusLabel(status: WebMcpStatus): string {
  return WEB_MCP_STATUS_LABELS[status];
}

const PARAMETER_DEFAULTS: Record<ComplexKind, ComplexParameters> = {
  rips: { maxEdgeLength: 0.7 },
  alpha: {},
  cech: { maxRadius: 0.5 },
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

const PARAMETER_FIELDS: Record<ComplexKind, ParameterField[]> = {
  rips: [
    { key: 'maxEdgeLength', label: 'Maximum edge length', help: 'Connect points no farther apart than this.', min: 0.05, step: 0.05 },
  ],
  alpha: [],
  cech: [
    { key: 'maxRadius', label: 'Maximum ball radius', help: 'Grow equal-radius balls around every point.', min: 0.05, step: 0.05 },
  ],
};

const COMPLEX_LABELS: Record<ComplexKind, string> = {
  rips: 'Vietoris–Rips',
  alpha: 'Alpha',
  cech: 'Čech',
};

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing UI element ${selector}.`);
  return found;
}

function escapeAttribute(value: unknown): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function drawImage(canvas: HTMLCanvasElement, image: ScalarImage): void {
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return;
  const pixels = context.createImageData(image.width, image.height);
  image.values.forEach((value, index) => {
    const shade = Math.max(0, Math.min(255, Math.round(value)));
    const offset = index * 4;
    pixels.data[offset] = shade;
    pixels.data[offset + 1] = shade;
    pixels.data[offset + 2] = shade;
    pixels.data[offset + 3] = 255;
  });
  context.putImageData(pixels, 0, 0);
}

function drawColorImage(canvas: HTMLCanvasElement, image: ScalarImage, rgba?: Uint8ClampedArray): void {
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return;
  if (!rgba || rgba.length !== image.width * image.height * 4) {
    drawImage(canvas, image);
    return;
  }
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), image.width, image.height), 0, 0);
}

function metricValue(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

/** Radius of the geometric cover represented by the filtration parameter. */
function coverDiskRadius(complex: ComplexKind, filtrationValue: number): number | null {
  const t = Math.max(0, filtrationValue);
  if (complex === 'rips') return t / 2;
  if (complex === 'cech') return t;
  if (complex === 'alpha') return Math.sqrt(t);
  return null;
}

export function pointCloudFiltrationRadii(
  dimension: number,
  complex: ComplexKind | null,
  currentFiltration: number,
  maximumFiltration: number,
  showCover: boolean,
): { diskRadius: number | null; fitDiskRadius: number | null } {
  if (dimension !== 2 || complex === null) return { diskRadius: null, fitDiskRadius: null };
  return {
    diskRadius: showCover ? coverDiskRadius(complex, currentFiltration) : null,
    fitDiskRadius: coverDiskRadius(complex, maximumFiltration),
  };
}

export function pointCloudFitMaximumFiltration(
  complex: ComplexKind,
  parameters: ComplexParameters,
  computedMaximum: number | null,
): number | null {
  if (complex === 'rips' && Number.isFinite(parameters.maxEdgeLength)) return parameters.maxEdgeLength!;
  if (complex === 'cech' && Number.isFinite(parameters.maxRadius)) return parameters.maxRadius!;
  return computedMaximum;
}

export function imagePipelinePresentation(useBinaryMask: boolean): {
  stepCount: '2' | '3';
  grayscaleLabel: string;
  ariaLabel: string;
  maskDisabled: boolean;
} {
  return useBinaryMask
    ? {
        stepCount: '3',
        grayscaleLabel: '2 · Grayscale',
        ariaLabel: 'Original color, grayscale, and binary mask previews',
        maskDisabled: false,
      }
    : {
        stepCount: '3',
        grayscaleLabel: '2 · Grayscale filtration',
        ariaLabel: 'Original color, grayscale filtration, and dimmed unused binary mask preview',
        maskDisabled: true,
      };
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
  const preprocessing = result.input.binarized
    ? `It was segmented at gray level ${result.input.threshold} with ${result.input.foreground} pixels as foreground.`
    : 'Its grayscale values were used directly.';
  return `${result.input.name} was analyzed as a ${result.input.width} × ${result.input.height} ${result.input.filtration} cubical filtration over F2. ${preprocessing}`;
}

export function mountApp(root: HTMLElement): () => void {
  root.innerHTML = `
    <header class="masthead">
      <a class="wordmark" href="#top" aria-label="WebMCP TDA home">WebMCP TDA</a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#workbench">Workbench</a>
        <a href="#agent-access">Agent access</a>
      </nav>
      <span id="webmcp-status" class="status-pill" title="WebMCP registration status">WebMCP checking</span>
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
                <label>Complex<select id="complex-kind">${WORKBENCH_COMPLEX_KINDS.map((value) => `<option value="${value}">${COMPLEX_LABELS[value]}</option>`).join('')}</select></label>
                <label>Coefficient field<select id="coefficient-field"><option value="2">F₂</option><option value="3">F₃</option><option value="5">F₅</option><option value="7">F₇</option><option value="11">F₁₁</option></select></label>
              </div>
              <p id="complex-note" class="context-note"></p>
              <figure class="data-stage">
                <figcaption><span>Point-cloud preview</span><strong id="point-meta">32 points · 2D</strong></figcaption>
                <div id="point-preview" class="point-cloud-stage" role="img" aria-label="Interactive point-cloud preview"></div>
                <div id="point-tools" class="point-tools" role="toolbar" aria-label="Point-cloud display and editing tools">
                  <button type="button" data-point-tool="move" aria-pressed="true"><span aria-hidden="true">↔</span> Move</button>
                  <button type="button" data-point-tool="edit" aria-pressed="false"><span aria-hidden="true">x,y</span> Edit</button>
                  <button id="toggle-point-axes" type="button" aria-pressed="false" aria-label="Show axes and ticks"><span aria-hidden="true">＋</span> Axes</button>
                </div>
                <div id="point-interaction" class="stage-hint">Drag a point to move it</div>
              </figure>
              <div id="filtration-player" class="filtration-player">
                <button id="toggle-filtration" class="animation-action" type="button" disabled><span aria-hidden="true">▶</span> Play filtration</button>
                <label><span>Filtration scale</span><input id="filtration-progress" type="range" min="0" max="1000" value="1000" disabled></label>
                <output id="filtration-value">Compute first</output>
              </div>
              <div class="run-row run-row--after-player"><button id="run-simplicial" class="primary-action" type="submit">Compute simplicial persistence</button><p>Runs locally. Larger complexes may take a moment.</p></div>
              <div id="parameter-heading" class="parameter-heading"><div><h3>Filtration settings</h3><p>Only geometry-specific controls are shown.</p></div></div>
              <div id="parameter-fields" class="parameter-grid"></div>
              <details class="advanced-input">
                <summary>Edit point coordinates</summary>
                <label>JSON array<textarea id="points-input" spellcheck="false" aria-describedby="point-input-feedback"></textarea></label>
                <p id="point-input-feedback" class="field-feedback">Every point must have two or three coordinates.</p>
              </details>
            </form>

            <form id="cubical-panel" class="input-form" role="tabpanel" aria-label="Cubical persistence controls" hidden>
              <div class="control-grid control-grid--three">
                <label>Example image<select id="image-sample">${Object.entries(IMAGE_SAMPLES).map(([value, sample]) => `<option value="${value}">${sample.label} photo</option>`).join('')}<option value="custom">Custom / agent image</option></select></label>
                <label>Filtration<select id="filtration"><option value="sublevel">Sublevel · foreground first</option><option value="superlevel">Superlevel · background first</option></select></label>
                <label>Downsample<select id="downsample"><option value="1">1× · full resolution</option><option value="2" selected>2× · faster</option><option value="4">4× · fastest</option></select></label>
              </div>
              <figure class="data-stage image-stage">
                <figcaption><span>Image-to-topology pipeline</span><strong id="image-meta">Loading doughnut…</strong></figcaption>
                <div class="image-stage__body">
                  <div class="image-copy"><div><h3>Bring your own image</h3><p>Processing stays in this tab. Images are resized to at most 256 × 256.</p></div><label class="upload-button" for="image-file">Choose an image</label><input id="image-file" class="visually-hidden" type="file" accept="image/*"></div>
                  <div id="image-pipeline" class="image-pipeline" data-steps="3" aria-label="Original color, grayscale, and binary mask previews">
                    <div class="image-frame"><span>1 · Original</span><canvas id="color-preview" aria-label="Original color image"></canvas></div>
                    <span class="pipeline-arrow" aria-hidden="true">→</span>
                    <div class="image-frame"><span id="grayscale-stage-label">2 · Grayscale</span><canvas id="image-preview" aria-label="Current grayscale image"></canvas></div>
                    <span id="mask-pipeline-arrow" class="pipeline-arrow" aria-hidden="true">→</span>
                    <div id="mask-stage" class="image-frame"><span>3 · Binary mask</span><canvas id="mask-preview" aria-label="Current binary mask"></canvas></div>
                  </div>
                  <div class="segmentation-controls">
                    <label class="binary-toggle"><input id="binarize" type="checkbox" checked><span>Use binary mask</span></label>
                    <label class="threshold-control"><span>Threshold <output id="threshold-value">Auto</output></span><input id="threshold" type="range" min="0" max="255" value="127" aria-label="Threshold"></label>
                    <button id="auto-threshold" class="threshold-auto" type="button">Auto · Otsu</button>
                    <label>Foreground<select id="foreground"><option value="dark">Darker pixels</option><option value="light">Lighter pixels</option></select></label>
                  </div>
                </div>
              </figure>
              <div class="run-row"><button id="run-cubical" class="primary-action" type="submit">Compute cubical persistence</button><p>Images never leave your browser.</p></div>
              <div class="method-note"><strong>How it works</strong><p>Photo → grayscale → gentle Gaussian denoise → Otsu or manual threshold → small-hole cleanup → binary cubical filtration over F₂. Turn off the mask to use grayscale intensities directly.</p></div>
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
            <figure class="diagram-card"><figcaption><span>Persistence diagram</span><span class="diagram-legend"><i class="h0"></i>H₀ <i class="h1"></i>H₁ <i class="h2"></i>H₂</span></figcaption><div id="diagram" role="img" aria-label="Interactive persistence diagram"></div></figure>
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

    <footer><span>WebMCP Challenge 2026</span><span>Human-first · agent-ready · browser-local</span></footer>
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
  const parameterHeading = element<HTMLDivElement>('#parameter-heading');
  const parameterFields = element<HTMLDivElement>('#parameter-fields');
  const pointPreview = element<HTMLDivElement>('#point-preview');
  const pointTools = element<HTMLDivElement>('#point-tools');
  const pointToolButtons = [...pointTools.querySelectorAll<HTMLButtonElement>('[data-point-tool]')];
  const pointAxesButton = element<HTMLButtonElement>('#toggle-point-axes');
  const pointInteraction = element<HTMLDivElement>('#point-interaction');
  const pointMeta = element<HTMLElement>('#point-meta');
  const filtrationPlayer = element<HTMLDivElement>('#filtration-player');
  const toggleFiltration = element<HTMLButtonElement>('#toggle-filtration');
  const filtrationProgress = element<HTMLInputElement>('#filtration-progress');
  const filtrationValue = element<HTMLOutputElement>('#filtration-value');
  const imageSelect = element<HTMLSelectElement>('#image-sample');
  const imageFile = element<HTMLInputElement>('#image-file');
  const filtration = element<HTMLSelectElement>('#filtration');
  const downsample = element<HTMLSelectElement>('#downsample');
  const binarize = element<HTMLInputElement>('#binarize');
  const threshold = element<HTMLInputElement>('#threshold');
  const thresholdValue = element<HTMLOutputElement>('#threshold-value');
  const autoThreshold = element<HTMLButtonElement>('#auto-threshold');
  const foreground = element<HTMLSelectElement>('#foreground');
  const imagePipeline = element<HTMLDivElement>('#image-pipeline');
  const grayscaleStageLabel = element<HTMLElement>('#grayscale-stage-label');
  const maskPipelineArrow = element<HTMLElement>('#mask-pipeline-arrow');
  const maskStage = element<HTMLDivElement>('#mask-stage');
  const colorPreview = element<HTMLCanvasElement>('#color-preview');
  const imagePreview = element<HTMLCanvasElement>('#image-preview');
  const maskPreview = element<HTMLCanvasElement>('#mask-preview');
  const imageMeta = element<HTMLElement>('#image-meta');
  const diagram = element<HTMLElement>('#diagram');
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
  let automaticThreshold = true;
  let cachedImage: ScalarImage | null = null;
  let cachedSmoothedImage: ScalarImage | null = null;
  let activeSimplicialResult: SimplicialResult | null = null;
  let filtrationRatio = 1;
  let showFiltrationPlayhead = false;
  let filtrationFrame: number | null = null;
  let pointInteractionMode: 'move' | 'edit' = 'move';
  let showPointAxes = false;
  const pointVisualization = mountPointCloudVisualization(pointPreview);

  const setMode = (mode: 'simplicial' | 'cubical') => {
    modeTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === mode)));
    simplicialPanel.hidden = mode !== 'simplicial';
    cubicalPanel.hidden = mode !== 'cubical';
    if (mode === 'cubical' && activeSimplicialResult) {
      stopFiltrationAnimation();
      filtrationRatio = 1;
      showFiltrationPlayhead = false;
      syncPointPreview();
      renderPersistenceDiagram(diagram, activeSimplicialResult.persistence.strongestPairs);
    }
  };

  const stopFiltrationAnimation = () => {
    if (filtrationFrame !== null) cancelAnimationFrame(filtrationFrame);
    filtrationFrame = null;
  };

  const currentFiltrationValue = () => {
    if (!activeSimplicialResult?.visualization.supported) return 0;
    const { minFiltration, maxFiltration } = activeSimplicialResult.visualization;
    return minFiltration + (maxFiltration - minFiltration) * filtrationRatio;
  };

  const syncPointPreview = () => {
    const dimension = currentPoints[0]?.length ?? 0;
    const visualization = activeSimplicialResult?.visualization;
    const currentT = currentFiltrationValue();
    const selectedComplex = complexSelect.value as ComplexKind;
    const previewParameters: ComplexParameters = {};
    parameterFields.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-parameter]').forEach((control) => {
      const value = Number(control.value);
      if (Number.isFinite(value)) previewParameters[control.dataset.parameter as keyof ComplexParameters] = value;
    });
    const fitMaximum = pointCloudFitMaximumFiltration(
      selectedComplex,
      previewParameters,
      visualization?.supported ? visualization.maxFiltration : null,
    );
    const activeEdges = dimension === 2 && visualization?.supported
      ? visualization.edges.filter((edge) => edge.filtration <= currentT)
      : [];
    const { diskRadius: currentDiskRadius, fitDiskRadius: finalDiskRadius } = pointCloudFiltrationRadii(
      dimension,
      fitMaximum === null ? null : selectedComplex,
      currentT,
      fitMaximum ?? 0,
      showFiltrationPlayhead && Boolean(visualization?.supported),
    );
    pointVisualization.render(currentPoints, {
      edges: activeEdges,
      diskRadii: currentDiskRadius === null ? undefined : currentPoints.map(() => currentDiskRadius),
      fitDiskRadii: finalDiskRadius === null ? undefined : currentPoints.map(() => finalDiskRadius),
      interactionMode: pointInteractionMode,
      showAxes: showPointAxes,
      filtration3d: dimension === 3 && visualization?.supported && activeSimplicialResult ? {
        complex: activeSimplicialResult.complex,
        simplices: visualization.simplices,
        maxSimplexDimension: activeSimplicialResult.input.parameters.maxSimplexDimension ?? 3,
        value: currentT,
        showCover: showFiltrationPlayhead,
      } : undefined,
      onPointsChange: dimension === 2 ? (nextPoints) => {
        stopFiltrationAnimation();
        activeSimplicialResult = null;
        filtrationRatio = 1;
        showFiltrationPlayhead = false;
        updateWorkspace({
          status: 'idle',
          latestResult: null,
          error: null,
          activity: 'Point coordinates changed. Compute persistence to rebuild the filtration.',
        });
        setPoints(nextPoints);
        pointSampleSelect.value = 'custom';
      } : undefined,
    });
    pointMeta.textContent = `${currentPoints.length} points · ${dimension}D`;
    pointPreview.setAttribute('aria-label', `Interactive point cloud with ${currentPoints.length} points in ${dimension} dimensions`);
    pointTools.hidden = dimension !== 2;
    pointToolButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.pointTool === pointInteractionMode)));
    pointAxesButton.setAttribute('aria-pressed', String(showPointAxes));
    pointAxesButton.setAttribute('aria-label', `${showPointAxes ? 'Hide' : 'Show'} axes and ticks`);
    pointInteraction.textContent = dimension === 3
      ? 'Drag to rotate · scroll to zoom'
      : pointInteractionMode === 'move'
        ? 'Drag a point to move it'
        : 'Select a point to enter x, y';
    filtrationPlayer.hidden = false;
  };

  const syncImagePreview = (image: ScalarImage) => {
    if (image !== cachedImage || !cachedSmoothedImage) {
      cachedImage = image;
      cachedSmoothedImage = gaussianBlurImage(image);
    }
    const smoothedImage = cachedSmoothedImage;
    const pipelinePresentation = imagePipelinePresentation(binarize.checked);
    imagePipeline.dataset.steps = pipelinePresentation.stepCount;
    imagePipeline.setAttribute('aria-label', pipelinePresentation.ariaLabel);
    grayscaleStageLabel.textContent = pipelinePresentation.grayscaleLabel;
    maskPipelineArrow.dataset.disabled = String(pipelinePresentation.maskDisabled);
    maskStage.dataset.disabled = String(pipelinePresentation.maskDisabled);
    maskStage.setAttribute('aria-disabled', String(pipelinePresentation.maskDisabled));
    const resolvedThreshold = automaticThreshold ? otsuThreshold(smoothedImage.values) : Number(threshold.value);
    threshold.value = String(resolvedThreshold);
    thresholdValue.value = binarize.checked
      ? `${automaticThreshold ? 'Auto · ' : ''}${resolvedThreshold}`
      : 'Off';
    autoThreshold.dataset.active = String(automaticThreshold && binarize.checked);
    threshold.disabled = !binarize.checked;
    autoThreshold.disabled = !binarize.checked;
    foreground.disabled = !binarize.checked;
    drawColorImage(
      colorPreview,
      image,
      getWorkspaceState().currentImage === image ? getWorkspaceState().currentImageRgba ?? undefined : undefined,
    );
    drawImage(imagePreview, image);
    const preview = closeBinaryImage(binarizeImage(smoothedImage, resolvedThreshold, foreground.value as ForegroundPolarity).image);
    drawImage(maskPreview, preview);
  };

  const setPoints = (points: number[][]) => {
    currentPoints = points;
    pointsInput.value = JSON.stringify(points, null, 2);
    pointFeedback.textContent = 'Every point must have two or three coordinates.';
    pointFeedback.dataset.status = 'valid';
    syncPointPreview();
  };

  let imageLoadGeneration = 0;
  const setImage = (image: ScalarImage, label: string, rgba?: Uint8ClampedArray) => {
    automaticThreshold = true;
    updateWorkspace({ currentImage: image, currentImageRgba: rgba ?? null, activity: `Loaded ${label}.`, error: null });
  };

  const loadSelectedImageSample = async (id: ImageSampleId) => {
    const generation = ++imageLoadGeneration;
    const sample = IMAGE_SAMPLES[id];
    updateWorkspace({ activity: `Loading the ${sample.label.toLowerCase()} example…`, error: null });
    const loaded = await loadImageSample(id);
    if (generation === imageLoadGeneration) setImage(loaded.image, sample.label.toLowerCase(), loaded.rgba);
  };

  const renderParameters = (kind: ComplexKind) => {
    const defaults = PARAMETER_DEFAULTS[kind];
    const fields = PARAMETER_FIELDS[kind];
    parameterHeading.hidden = fields.length === 0;
    parameterFields.hidden = fields.length === 0;
    parameterFields.innerHTML = fields.map((field) => {
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

  const readParameters = (points: number[][]): ComplexParameters => {
    const parameters: Record<string, number> = {
      maxSimplexDimension: defaultMaximumSimplexDimension(points),
    };
    parameterFields.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-parameter]').forEach((control) => {
      const key = control.dataset.parameter!;
      const value = Number(control.value);
      if (!Number.isFinite(value)) throw new Error(`${key} must be a number.`);
      parameters[key] = value;
    });
    return parameters as ComplexParameters;
  };

  const renderFiltrationPosition = (withPlayhead: boolean) => {
    if (!activeSimplicialResult?.visualization.supported) return;
    showFiltrationPlayhead = withPlayhead;
    filtrationProgress.value = String(Math.round(filtrationRatio * 1000));
    const t = currentFiltrationValue();
    const diskRadius = coverDiskRadius(activeSimplicialResult.complex, t);
    filtrationValue.value = diskRadius === null
      ? `t = ${metricValue(t)}`
      : `t = ${metricValue(t)} · radius ${metricValue(diskRadius)}`;
    toggleFiltration.textContent = filtrationFrame !== null
      ? 'Pause filtration'
      : filtrationRatio >= 1 ? 'Replay filtration' : 'Play filtration';
    syncPointPreview();
    renderPersistenceDiagram(
      diagram,
      activeSimplicialResult.persistence.strongestPairs,
      { playhead: withPlayhead ? t : undefined },
    );
  };

  const resetFiltration = (message?: string) => {
    stopFiltrationAnimation();
    activeSimplicialResult = null;
    filtrationRatio = 1;
    showFiltrationPlayhead = false;
    toggleFiltration.disabled = true;
    filtrationProgress.disabled = true;
    toggleFiltration.textContent = 'Play filtration';
    filtrationValue.value = 'Compute first';
    if (message) updateWorkspace({ status: 'idle', latestResult: null, error: null, activity: message });
  };

  const updateResult = (result: ComputeResult | null) => {
    if (!result) {
      resetFiltration();
      metricFeatures.textContent = '—';
      metricEssential.textContent = '—';
      metricLoops.textContent = '—';
      metricRuntime.textContent = '—';
      resultDescriptionElement.textContent = 'Connected components, loops, and higher-dimensional features will appear here after computation.';
      resultJson.textContent = '';
      copyResult.disabled = true;
      renderPersistenceDiagram(diagram, []);
      return;
    }
    metricFeatures.textContent = metricValue(result.persistence.pairCount);
    metricEssential.textContent = metricValue(result.persistence.essentialCount);
    metricLoops.textContent = metricValue(result.persistence.pairsByDimension[1] ?? 0);
    metricRuntime.textContent = `${metricValue(result.elapsedMs)} ms`;
    resultDescriptionElement.textContent = resultDescription(result);
    resultJson.textContent = JSON.stringify(result, null, 2);
    copyResult.disabled = false;
    if (result.kind === 'simplicial') {
      if (activeSimplicialResult !== result) {
        stopFiltrationAnimation();
        activeSimplicialResult = result;
        filtrationRatio = 1;
        showFiltrationPlayhead = false;
      }
      const enabled = result.visualization.supported;
      toggleFiltration.disabled = !enabled;
      filtrationProgress.disabled = !enabled;
      filtrationProgress.value = '1000';
      filtrationValue.value = enabled
        ? `t = ${metricValue(result.visualization.maxFiltration)}`
        : result.visualization.reason ?? 'Unavailable';
      toggleFiltration.textContent = 'Replay filtration';
      syncPointPreview();
      renderPersistenceDiagram(
        diagram,
        result.persistence.strongestPairs,
        { playhead: showFiltrationPlayhead ? currentFiltrationValue() : undefined },
      );
    } else {
      resetFiltration();
      renderPersistenceDiagram(diagram, result.persistence.strongestPairs);
    }
  };

  modeTabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode as 'simplicial' | 'cubical')));

  pointToolButtons.forEach((button) => button.addEventListener('click', () => {
    pointInteractionMode = button.dataset.pointTool as 'move' | 'edit';
    syncPointPreview();
  }));

  pointAxesButton.addEventListener('click', () => {
    showPointAxes = !showPointAxes;
    syncPointPreview();
  });

  pointSampleSelect.addEventListener('change', () => {
    if (pointSampleSelect.value !== 'custom') {
      resetFiltration('Point cloud changed. Compute persistence to build its filtration.');
      setPoints(pointSample(pointSampleSelect.value as PointSampleId));
    }
  });

  complexSelect.addEventListener('change', () => {
    resetFiltration('Complex changed. Compute persistence to build its filtration.');
    renderParameters(complexSelect.value as ComplexKind);
    syncPointPreview();
  });

  parameterFields.addEventListener('input', syncPointPreview);

  pointsInput.addEventListener('input', () => {
    try {
      currentPoints = parsePointInput(pointsInput.value);
      resetFiltration('Point coordinates changed. Compute persistence to rebuild the filtration.');
      pointSampleSelect.value = identifyPointSample(currentPoints);
      pointFeedback.textContent = `${currentPoints.length} points ready.`;
      pointFeedback.dataset.status = 'valid';
      syncPointPreview();
    } catch (error) {
      pointFeedback.textContent = error instanceof Error ? error.message : 'Invalid point data.';
      pointFeedback.dataset.status = 'error';
    }
  });

  toggleFiltration.addEventListener('click', () => {
    if (!activeSimplicialResult?.visualization.supported) return;
    if (filtrationFrame !== null) {
      stopFiltrationAnimation();
      renderFiltrationPosition(true);
      return;
    }
    if (filtrationRatio >= 1) filtrationRatio = 0;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 5_200;
    const startedAt = performance.now() - filtrationRatio * duration;
    const tick = (now: number) => {
      filtrationRatio = Math.min(1, (now - startedAt) / duration);
      renderFiltrationPosition(true);
      if (filtrationRatio < 1) filtrationFrame = requestAnimationFrame(tick);
      else {
        filtrationFrame = null;
        renderFiltrationPosition(true);
      }
    };
    filtrationFrame = requestAnimationFrame(tick);
    renderFiltrationPosition(true);
  });

  filtrationProgress.addEventListener('input', () => {
    stopFiltrationAnimation();
    filtrationRatio = Number(filtrationProgress.value) / 1000;
    renderFiltrationPosition(true);
  });

  imageSelect.addEventListener('change', () => {
    if (imageSelect.value === 'custom') return;
    void loadSelectedImageSample(imageSelect.value as ImageSampleId)
      .catch((error: unknown) => updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error) }));
  });

  imageFile.addEventListener('change', () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    const generation = ++imageLoadGeneration;
    void loadImageSource(file, file.name).then((loaded) => {
      if (generation !== imageLoadGeneration) return;
      imageSelect.value = 'custom';
      setImage(loaded.image, file.name, loaded.rgba);
    }).catch((error: unknown) => updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error) }));
  });

  binarize.addEventListener('change', () => syncImagePreview(getWorkspaceState().currentImage));
  threshold.addEventListener('input', () => {
    automaticThreshold = false;
    syncImagePreview(getWorkspaceState().currentImage);
  });
  autoThreshold.addEventListener('click', () => {
    automaticThreshold = true;
    syncImagePreview(getWorkspaceState().currentImage);
  });
  foreground.addEventListener('change', () => syncImagePreview(getWorkspaceState().currentImage));

  simplicialPanel.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const points = parsePointInput(pointsInput.value);
      void tdaRuntime.computeSimplicial({
        kind: 'simplicial',
        complex: complexSelect.value as ComplexKind,
        points,
        coefficientField: Number(coefficientField.value),
        parameters: readParameters(points),
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
      binarize: binarize.checked,
      threshold: binarize.checked && !automaticThreshold ? Number(threshold.value) : undefined,
      foreground: foreground.value as ForegroundPolarity,
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

  const unsubscribe = subscribeWorkspace((state) => {
    if (state.latestRequest && state.latestRequest !== lastSyncedRequest) {
      lastSyncedRequest = state.latestRequest;
      const request = state.latestRequest as { kind?: string };
      if (request.kind === 'simplicial') {
        resetFiltration();
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
        binarize.checked = cubical.binarize ?? true;
        automaticThreshold = cubical.threshold === undefined;
        if (cubical.threshold !== undefined) threshold.value = String(cubical.threshold);
        foreground.value = cubical.foreground ?? 'dark';
        filtration.value = cubical.filtration ?? 'sublevel';
        downsample.value = String(cubical.downsample ?? 1);
        imageSelect.value = cubical.source === 'sample' ? cubical.sample ?? 'donut' : cubical.source === 'values' ? 'custom' : imageSelect.value;
      }
    }
    webMcpStatus.textContent = webMcpStatusLabel(state.webMcpStatus);
    webMcpStatus.dataset.status = state.webMcpStatus;
    webMcpStatus.title = state.webMcpStatus === 'unsupported'
      ? 'This browser does not support WebMCP, so agent tools cannot connect. The interactive workbench still works normally.'
      : 'WebMCP registration status';
    computeStatus.textContent = state.status === 'computing' ? 'Computing…' : state.status[0]!.toUpperCase() + state.status.slice(1);
    computeStatus.dataset.status = state.status;
    activity.textContent = state.error ?? state.activity;
    const activeKind = (state.latestRequest as { kind?: string } | null)?.kind;
    runSimplicial.disabled = state.status === 'computing';
    runCubical.disabled = state.status === 'computing';
    runSimplicial.textContent = state.status === 'computing' && activeKind === 'simplicial' ? 'Computing…' : 'Compute simplicial persistence';
    runCubical.textContent = state.status === 'computing' && activeKind === 'cubical' ? 'Computing…' : 'Compute cubical persistence';
    syncImagePreview(state.currentImage);
    imageMeta.textContent = `${state.currentImage.name} · ${state.currentImage.width} × ${state.currentImage.height}`;
    updateResult(state.latestResult);
  });

  renderParameters('rips');
  setPoints(currentPoints);
  syncImagePreview(getWorkspaceState().currentImage);
  void loadSelectedImageSample('donut').catch((error: unknown) => updateWorkspace({ status: 'error', error: error instanceof Error ? error.message : String(error) }));

  return () => {
    stopFiltrationAnimation();
    unsubscribe();
    unmountPersistenceDiagram(diagram);
    pointVisualization.unmount();
  };
}
