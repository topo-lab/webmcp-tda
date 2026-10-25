import { formatScale, type PointCloudScale } from './scale';
import type { ComplexKind, PersistenceSummary } from './types';

export interface ResolvedParameters {
  maxSimplexDimension: number;
  maxEdgeLength: number;
  maxRadius: number;
  defaulted: Array<'maxEdgeLength' | 'maxRadius'>;
}

/**
 * Highest homology dimension that is not an artifact of capping the complex. A complex capped at
 * dimension d is missing the (d+1)-simplices that would fill its d-cycles, so H_d is unreliable.
 * An alpha complex capped at the ambient dimension is the whole Delaunay complex and loses nothing.
 */
export function reliableThroughDimension(kind: ComplexKind, maxSimplexDimension: number, ambientDimension: number): number {
  if (kind === 'alpha' && maxSimplexDimension >= ambientDimension) return ambientDimension;
  return Math.max(0, maxSimplexDimension - 1);
}

export function interpretationWarnings(args: {
  kind: ComplexKind;
  persistence: PersistenceSummary;
  maxSimplexDimension: number;
  /** The depth used when the caller does not choose one; capping below it is what deserves a note. */
  defaultSimplexDimension: number;
  parameters: Pick<ResolvedParameters, 'maxEdgeLength' | 'maxRadius'>;
  scale: PointCloudScale;
}): string[] {
  const { kind, persistence, maxSimplexDimension, defaultSimplexDimension, parameters, scale } = args;
  const warnings: string[] = [];
  const excludedDimensions = Object.keys(persistence.excludedPairs).map(Number).sort((a, b) => a - b);
  // Every full-range Rips or Čech complex has artifacts in its top dimension, so only a cap below the default is news.
  if (excludedDimensions.length > 0 && maxSimplexDimension < defaultSimplexDimension) {
    const total = excludedDimensions.reduce((sum, dimension) => sum + persistence.excludedPairs[dimension]!, 0);
    const dimensions = excludedDimensions.map((dimension) => `H${dimension}`).join('/');
    warnings.push(
      `${total} ${dimensions} ${total === 1 ? 'class is' : 'classes are'} not reported: the complex is capped at simplex dimension ${maxSimplexDimension}, so ${total === 1 ? 'it is a truncation artifact' : 'they are truncation artifacts'}.`,
    );
  }
  const components = persistence.essentialByDimension[0] ?? 0;
  if (kind !== 'alpha' && components > 1) {
    const name = kind === 'rips' ? 'maxEdgeLength' : 'maxRadius';
    const limit = kind === 'rips' ? parameters.maxEdgeLength : parameters.maxRadius;
    const connectsAt = kind === 'rips' ? scale.connectingDistance : scale.connectingDistance / 2;
    warnings.push(
      `At ${name} ${formatScale(limit)} the complex still has ${components} connected components; the points connect at ${formatScale(connectsAt)}. Raise ${name} to see them merge.`,
    );
  }
  if (kind !== 'alpha') {
    const unresolved = Object.entries(persistence.essentialByDimension).filter(([dimension, count]) => Number(dimension) > 0 && count > 0);
    if (unresolved.length > 0) {
      const total = unresolved.reduce((sum, [, count]) => sum + count, 0);
      const dimensions = unresolved.map(([dimension]) => `H${dimension}`).join('/');
      const name = kind === 'rips' ? 'maxEdgeLength' : 'maxRadius';
      const limit = kind === 'rips' ? parameters.maxEdgeLength : parameters.maxRadius;
      warnings.push(`${total} ${dimensions} ${total === 1 ? 'class is' : 'classes are'} still alive at ${name} ${formatScale(limit)}. An infinite death means beyond the computed range; ${total === 1 ? 'it may' : 'they may'} die if the limit is increased.`);
    }
  }
  return warnings;
}
