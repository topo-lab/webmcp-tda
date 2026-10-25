import { describe, expect, it } from 'vitest';
import { ToolInputError } from '../src/tda/errors';
import { PLACEHOLDER_IMAGE_NAME } from '../src/state';
import { describeImageName, redactImageName, summarizeRequest, toAgentError, toAgentResult } from '../src/webmcp/agentView';
import { cubicalResult, pair, simplicialResult, summary } from './helpers/fixtures';

describe('agent view of a result', () => {
  it('reports components, loops and long-lived rule for a 2D cloud and never voids', () => {
    const result = simplicialResult({
      persistence: summary({
        persistentByDimension: { 0: 3, 1: 2 },
        persistenceThreshold: 0.2,
        pairCount: 5,
        pairsByDimension: { 0: 3, 1: 2 },
      }),
    });
    const view = toAgentResult(result, { shownInWorkspace: true });
    expect(view).toMatchObject({ ok: true, kind: 'simplicial', components: 1, loops: 2, voids: null, units: 'edge length', pairsReturned: 3 });
    expect(view.longLived).toBe('alive at computed end, or lifetime >= 0.2 (20% of the longest-lived class of dimension >= 1)');
    const alone = toAgentResult(simplicialResult({ persistence: summary({ persistenceThreshold: 0 }) }), { shownInWorkspace: true });
    expect(alone.longLived).toBe('alive at computed end only (no class of dimension >= 1 to compare with)');
    expect(view.elapsedMs).toBe(2.3);
  });

  it('counts voids only for a 3D cloud whose complex can be trusted through H2', () => {
    const base = simplicialResult({
      input: { ...simplicialResult().input, dimension: 3 },
      persistence: summary({ persistentByDimension: { 0: 1, 1: 0, 2: 1 } }),
      interpretation: { reliableThroughDimension: 2, warnings: [] },
    });
    expect(toAgentResult(base, { shownInWorkspace: true })).toMatchObject({ loops: 0, voids: 1 });
    const capped = { ...base, interpretation: { reliableThroughDimension: 1, warnings: ['capped'] } };
    expect(toAgentResult(capped, { shownInWorkspace: true })).toMatchObject({ loops: 0, voids: null, warnings: ['capped'] });
    const edgesOnly = { ...base, interpretation: { reliableThroughDimension: 0, warnings: [] } };
    expect(toAgentResult(edgesOnly, { shownInWorkspace: true })).toMatchObject({ loops: null, voids: null });
  });

  it('names the units of each construction and states which limits were defaulted', () => {
    const alpha = toAgentResult(simplicialResult({ complex: 'alpha' }), { shownInWorkspace: true });
    expect(alpha.units).toBe('squared radius');
    const cech = toAgentResult(simplicialResult({
      complex: 'cech',
      input: { ...simplicialResult().input, defaulted: ['maxRadius'], parameters: { maxRadius: 1.4, maxSimplexDimension: 2 } },
    }), { shownInWorkspace: false });
    expect(cech).toMatchObject({ units: 'radius', shownInWorkspace: false, input: { defaulted: ['maxRadius'], scale: { diameter: expect.any(Number) } } });
    expect(toAgentResult(simplicialResult(), { shownInWorkspace: true }).input).not.toHaveProperty('defaulted');
  });

  it('summarizes an image result without voids and with the generic image name for an upload', () => {
    const view = toAgentResult(cubicalResult({ input: { ...cubicalResult().input, name: 'holiday photo.jpg' } }), { shownInWorkspace: true, limit: 2 });
    expect(view).toMatchObject({ kind: 'cubical', voids: null, loops: 0, pairsReturned: 2, warnings: [], input: { name: 'uploaded image' } });
    expect(view.pairs).toHaveLength(2);
    expect(view.units).toMatch(/gray level/);
  });

  it('keeps essential classes JSON-safe with an explicit infinity death', () => {
    const view = toAgentResult(simplicialResult(), { shownInWorkspace: true });
    expect(view.pairs[0]).toEqual({ dimension: 0, birth: 0, death: 'infinity' });
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
    expect(view.pairs.map((p) => p.dimension)).toEqual([0, 0, 0]);
    expect(pair(1, 0.5, 2).lifetime).toBe(1.5);
  });
});

describe('agent view of a sparse result', () => {
  it('reports zero rather than missing counts when a dimension has no entry', () => {
    const empty = summary({ pairCount: 0, pairsByDimension: {}, essentialByDimension: {}, persistentByDimension: {}, essentialCount: 0, returnedPairCount: 0, strongestPairs: [] });
    expect(toAgentResult(simplicialResult({ persistence: empty }), { shownInWorkspace: true })).toMatchObject({ components: 0, loops: 0, voids: null, pairs: [], pairsReturned: 0 });
    const threeDimensional = simplicialResult({
      input: { ...simplicialResult().input, dimension: 3 },
      persistence: empty,
      interpretation: { reliableThroughDimension: 2, warnings: [] },
    });
    expect(toAgentResult(threeDimensional, { shownInWorkspace: true })).toMatchObject({ loops: 0, voids: 0 });
  });
});

describe('request summaries', () => {
  it('drops coordinates and image values but keeps the parameters that explain a result', () => {
    expect(summarizeRequest(null)).toBeNull();
    expect(summarizeRequest({ kind: 'simplicial', complex: 'rips', points: [[0, 0], [1, 0]], parameters: { maxEdgeLength: 2 } }))
      .toEqual({ kind: 'simplicial', complex: 'rips', pointCount: 2, coefficientField: 2, parameters: { maxEdgeLength: 2 } });
    expect(summarizeRequest({ kind: 'simplicial', complex: 'alpha', points: [[0, 0], [1, 0]], coefficientField: 3 }))
      .toMatchObject({ coefficientField: 3, parameters: {} });
    expect(summarizeRequest({ kind: 'cubical', source: 'values', width: 2, height: 2, values: [0, 1, 1, 0], threshold: 100 }))
      .toEqual({ kind: 'cubical', source: 'values', width: 2, height: 2, threshold: 100, valueCount: 4 });
    expect(summarizeRequest({ kind: 'cubical', source: 'sample', sample: 'donut' })).toEqual({ kind: 'cubical', source: 'sample', sample: 'donut' });
  });
});

describe('error results', () => {
  it('carries the code, field and hint of an expected failure and omits what is missing', () => {
    expect(toAgentError(new ToolInputError('invalid_input', 'bad', { field: 'points', hint: 'fix it' })))
      .toEqual({ ok: false, error: { code: 'invalid_input', message: 'bad', field: 'points', hint: 'fix it' } });
    expect(toAgentError(new ToolInputError('budget_exceeded', 'too big')))
      .toEqual({ ok: false, error: { code: 'budget_exceeded', message: 'too big' } });
  });

  it('maps cancellations and unexpected failures to codes an agent can act on', () => {
    expect(toAgentError(new DOMException('stop', 'AbortError'))).toMatchObject({ error: { code: 'cancelled' } });
    expect(toAgentError(new Error('engine failed'))).toEqual({ ok: false, error: { code: 'compute_failed', message: 'engine failed' } });
    expect(toAgentError('plain string')).toEqual({ ok: false, error: { code: 'compute_failed', message: 'plain string' } });
  });
});

describe('text the agent may see', () => {
  it('shows names the page generated and replaces anything else', () => {
    expect(describeImageName('chocolate-doughnut')).toBe('chocolate-doughnut');
    expect(describeImageName('agent-values')).toBe('agent-values');
    expect(describeImageName(PLACEHOLDER_IMAGE_NAME)).toBe(PLACEHOLDER_IMAGE_NAME);
    expect(describeImageName('anything else.png')).toBe('uploaded image');
  });

  it('redacts an uploaded name inside a message and leaves other messages alone', () => {
    expect(redactImageName('Loaded a.png and a.png.', 'a.png')).toBe('Loaded uploaded image and uploaded image.');
    expect(redactImageName('Loaded agent-values.', 'agent-values')).toBe('Loaded agent-values.');
    expect(redactImageName('Ready.', '')).toBe('Ready.');
  });
});
