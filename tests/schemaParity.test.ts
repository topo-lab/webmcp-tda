import Ajv from 'ajv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateWorkspace } from '../src/state';
import { TdaRuntime } from '../src/tda/runtime';
import { createWebMcpTools } from '../src/webmcp/tools';
import { simplicialResult } from './helpers/fixtures';

/**
 * A host may not enforce a tool's JSON Schema, so the page must reject everything the schema rejects.
 * This takes a valid call for each tool, replaces one field at a time with awkward values, and checks
 * that whenever the schema says "invalid" the tool answers { ok: false } instead of computing.
 */
const AWKWARD: unknown[] = ['text', 'false', '', 0, 1, -1, 1.5, 3, 5, 257, 1e9, -1e9, null, true, false, [], {}, [[0, 0]], ['a']];

const valid: Record<string, Record<string, unknown>> = {
  tda_compute_simplicial_persistence: { complex: 'rips', points: [[0, 0], [1, 0], [0, 1]] },
  tda_compute_cubical_persistence: { source: 'values', width: 2, height: 2, values: [0, 1, 1, 0] },
};

beforeEach(() => {
  updateWorkspace({
    status: 'idle',
    error: null,
    latestRequest: null,
    latestResult: null,
    currentImage: { name: 'test-image', width: 2, height: 2, values: [0, 255, 255, 0] },
    currentImageRgba: null,
  });
});

describe('every schema rule is also enforced inside the page', () => {
  for (const [toolName, base] of Object.entries(valid)) {
    it(`${toolName} rejects whatever its schema rejects`, async () => {
      const run = vi.fn(async () => simplicialResult());
      const tool = createWebMcpTools(new TdaRuntime({ run })).find((candidate) => candidate.name === toolName)!;
      const validate = new Ajv({ allErrors: true, strict: false }).compile(tool.inputSchema!);
      const properties = (tool.inputSchema as { properties: Record<string, { properties?: Record<string, unknown> }> }).properties;
      expect(validate(base)).toBe(true);

      const escaped: string[] = [];
      let checked = 0;
      for (const [field, schema] of Object.entries(properties)) {
        const targets: Array<{ label: string; build: (value: unknown) => Record<string, unknown> }> = [
          { label: field, build: (value) => ({ ...base, [field]: value }) },
          ...Object.keys(schema.properties ?? {}).map((inner) => ({
            label: `${field}.${inner}`,
            build: (value: unknown) => ({ ...base, [field]: { [inner]: value } }),
          })),
        ];
        for (const { label, build } of targets) {
          for (const value of AWKWARD) {
            const input = build(value);
            if (validate(input)) continue;
            checked += 1;
            const answer = await tool.execute(input) as { ok: boolean };
            if (answer.ok) escaped.push(`${label} = ${JSON.stringify(value)}`);
          }
        }
      }
      expect(checked).toBeGreaterThan(50);
      expect(escaped).toEqual([]);
      expect(run).not.toHaveBeenCalled();
    });
  }
});
