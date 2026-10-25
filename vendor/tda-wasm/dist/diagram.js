/**
 * What is read off a persistence diagram: Betti numbers and curves,
 * landscapes, images, and the distances between two diagrams (internal
 * module; the package root re-exports the API).
 */
import { call, module } from './load.js';
import { f64, finite, int, kind, noNaN, num, numbers, options } from './check.js';
/**
 * The `[birth, death, …]` arrays of a diagram, after their checks: an even
 * length and `birth <= death` without NaN in each pair (a class born at
 * `Infinity`, which `persistence` gives a vertex valued `Infinity`, is a
 * pair).
 */
function perDimension(diagram, name) {
    if (diagram === null || typeof diagram !== 'object' || !Array.isArray(diagram.pairs)) {
        throw new TypeError(`${name} must be a diagram { pairs: Float64Array[], … }, got ${kind(diagram)}`);
    }
    return diagram.pairs.map((p, k) => {
        const a = numbers(p, `${name}.pairs[${k}]`);
        evenLength(a, `${name}.pairs[${k}]`);
        for (let i = 0; i < a.length; i += 2) {
            if (!(a[i] <= a[i + 1])) {
                throw new RangeError(`${name}.pairs[${k}][${i}], [${i + 1}] = (${a[i]}, ${a[i + 1]}) is not a persistence pair (need birth <= death, no NaN)`);
            }
        }
        return a;
    });
}
function evenLength(a, name) {
    if (a.length % 2 !== 0)
        throw new RangeError(`${name} must hold [birth, death] pairs (an even length), got length ${a.length}`);
}
/**
 * The pairs a landscape or an image reads: an even length, every birth
 * finite, every death at least the birth or `Infinity` (no NaN).
 */
function pairCheck(a, name) {
    evenLength(a, name);
    for (let i = 0; i < a.length; i += 2) {
        const b = a[i];
        const d = a[i + 1];
        if (!Number.isFinite(b) || !(d >= b)) {
            throw new RangeError(`${name}[${i}], ${name}[${i + 1}] = (${b}, ${d}) is not a pair this function reads (need a finite birth and death >= birth or Infinity)`);
        }
    }
}
/** The most values a landscape or an image returns: 2^27 doubles, 1 GiB. */
const MAX_VALUES = 2 ** 27;
/** A diagram packed as the module takes it: `[m, n_0 … n_(m−1)]`, then the m dimensions' `[birth, death, …]` back to back. */
function packed(pairs) {
    const m = pairs.length;
    let total = 1 + m;
    for (const p of pairs)
        total += p.length;
    const out = new Float64Array(total);
    out[0] = m;
    let at = 1 + m;
    pairs.forEach((p, k) => {
        out[1 + k] = p.length;
        out.set(p, at);
        at += p.length;
    });
    return out;
}
/** `rows` arrays of `length` values each, out of the module's one array (a copy each, so each owns its buffer). */
function cut(out, rows, length, as) {
    return Array.from({ length: rows }, (_, k) => as(out.subarray(k * length, (k + 1) * length)));
}
/**
 * The Betti numbers at `t`, read off the diagram: entry `k` is the number of
 * pairs of `H_k` with `birth <= t < death`, an essential class (death
 * `Infinity`) counted at every `t >= birth`, `t = Infinity` included: the
 * rank of `H_k` of the complex of the simplices valued `<= t`. One entry per
 * dimension of the diagram. Computed by the Rust core
 * (rust/tda-core/src/representations/betti.rs), by binary search in each
 * dimension's sorted births and finite deaths.
 */
export function bettiNumbers(diagram, t) {
    module();
    const pairs = perDimension(diagram, 'diagram');
    num(t, 't');
    if (Number.isNaN(t))
        throw new RangeError('t must not be NaN');
    const out = call((m) => m.bettiNumbersFlat(packed(pairs), t));
    return Uint32Array.from(out);
}
/**
 * The Betti curves on `grid` (any order, no NaN): `curves[k][i]` is
 * `bettiNumbers(diagram, grid[i])[k]`. One curve per dimension of the
 * diagram, by binary search in the sorted births and deaths (the Rust core,
 * as {@link bettiNumbers}).
 */
export function bettiCurve(diagram, grid) {
    module();
    const pairs = perDimension(diagram, 'diagram');
    const g = numbers(grid, 'grid');
    noNaN(g, 'grid');
    const out = call((m) => m.bettiCurveFlat(packed(pairs), g));
    return cut(out, pairs.length, g.length, (c) => Uint32Array.from(c));
}
/**
 * The persistence landscape of one dimension's pairs `[birth, death, …]`:
 * `λ_k(t)` is the k-th largest of `max(0, min(t − birth, death − t))` over
 * the finite pairs, counted with multiplicity (0 when fewer than k pairs hold
 * `t` strictly inside). Essential pairs carry no tent. Returns `layers`
 * arrays, `landscape[k − 1][i] = λ_k(grid[i])`. Each value is one tent
 * evaluated as `min(t − birth, death − t)` (the Rust core,
 * rust/tda-core/src/representations/landscape.rs), so the result does not
 * depend on how the work is ordered.
 */
export function persistenceLandscape(pairs, opts) {
    module();
    const o = options(opts, 'opts');
    const a = numbers(pairs, 'pairs');
    pairCheck(a, 'pairs');
    if (o.grid === undefined)
        throw new TypeError('grid must be a Float64Array or an array of numbers, got undefined');
    const grid = numbers(o.grid, 'grid');
    for (let i = 0; i < grid.length; i++)
        finite(grid[i], `grid[${i}]`);
    const layers = o.layers === undefined ? 1 : int(o.layers, 'layers', 1);
    if (layers * grid.length > MAX_VALUES) {
        throw new RangeError(`layers · grid.length must be at most ${MAX_VALUES} values, got ${layers} · ${grid.length}`);
    }
    const out = call((m) => m.persistenceLandscapeFlat(a, 1, layers, grid));
    return layers === 1 ? [out] : cut(out, layers, grid.length, (l) => l.slice());
}
/**
 * The persistence image of one dimension's pairs (Adams et al., JMLR 18,
 * 2017): each finite pair with `death > birth` adds `persistence^weightPower`
 * times a Gaussian of standard deviation `sigma` centred at
 * `(birth, persistence)`, evaluated at the pixel centres (the Rust core,
 * rust/tda-core/src/representations/image.rs; each pixel's terms are added
 * in the order of the pairs, as the C++ it replaced did). The result is a
 * {@link Grid}-shaped image (it can be fed to {@link cubicalPersistence}).
 */
export function persistenceImage(pairs, opts) {
    module();
    const o = options(opts, 'opts');
    const a = numbers(pairs, 'pairs');
    pairCheck(a, 'pairs');
    let rows;
    let columns;
    if (typeof o.resolution === 'number') {
        rows = columns = int(o.resolution, 'resolution', 1);
    }
    else if (Array.isArray(o.resolution) && o.resolution.length === 2) {
        rows = int(o.resolution[0], 'resolution[0]', 1);
        columns = int(o.resolution[1], 'resolution[1]', 1);
    }
    else {
        throw new TypeError(`resolution must be a positive integer or [rows, columns], got ${kind(o.resolution)}`);
    }
    if (rows * columns > MAX_VALUES)
        throw new RangeError(`resolution must give at most ${MAX_VALUES} pixels, got ${rows} × ${columns}`);
    const auto = o.bounds === undefined || o.bounds === 'auto';
    let given = { birthMin: 0, birthMax: 0, persMin: 0, persMax: 0 };
    if (auto) {
        let finitePair = false;
        for (let i = 1; i < a.length && !finitePair; i += 2)
            finitePair = a[i] !== Infinity;
        if (!finitePair)
            throw new RangeError("bounds 'auto' needs a finite pair; give the bounds for a diagram without one");
    }
    else if (typeof o.bounds === 'object' && o.bounds !== null) {
        given = {
            birthMin: finite(o.bounds.birthMin, 'bounds.birthMin'),
            birthMax: finite(o.bounds.birthMax, 'bounds.birthMax'),
            persMin: finite(o.bounds.persMin, 'bounds.persMin'),
            persMax: finite(o.bounds.persMax, 'bounds.persMax')
        };
        if (!(given.birthMax > given.birthMin) || !(given.persMax > given.persMin)) {
            throw new RangeError('bounds must have birthMax > birthMin and persMax > persMin');
        }
    }
    else {
        throw new TypeError(`bounds must be 'auto' or { birthMin, birthMax, persMin, persMax }, got ${kind(o.bounds)}`);
    }
    const sigma = o.sigma === undefined ? 0.1 : finite(o.sigma, 'sigma');
    if (!(sigma > 0))
        throw new RangeError(`sigma must be positive, got ${sigma}`);
    const weightPower = o.weightPower === undefined ? 1 : finite(o.weightPower, 'weightPower');
    // The module returns the bounds it used, then the pixels.
    const out = call((m) => m.persistenceImageFlat(a, rows, columns, auto, given.birthMin, given.birthMax, given.persMin, given.persMax, sigma, weightPower));
    return {
        values: out.slice(4),
        shape: [rows, columns],
        bounds: { birthMin: out[0], birthMax: out[1], persMin: out[2], persMax: out[3] }
    };
}
const unpackMatching = (out) => ({ distance: out[0], matching: Int32Array.from(out.subarray(1)) });
/**
 * Dense finite-point costs are limited to 16,777,216 entries (128 MiB);
 * larger requests throw `RangeError` before allocation.
 *
 * The exact Wasserstein distance of order `order` between two persistence
 * diagrams of one homology dimension, each a flat `[birth, death, …]`
 * array. Essential points (`death = Infinity`) are matched among their own
 * kind by their finite coordinate; differing counts give `Infinity` (as
 * GUDHI and Hera).
 */
export function diagramWasserstein(D, E, opts) {
    module();
    const o = options(opts, 'opts');
    const order = num(o.order, 'order');
    const internalP = o.internalP === undefined ? Infinity : num(o.internalP, 'internalP');
    const d = f64(D, 'D');
    const e = f64(E, 'E');
    return call((m) => unpackMatching(m.diagramWassersteinFlat(d, e, order, internalP)));
}
/** The exact bottleneck distance (L∞ ground metric) between two persistence diagrams of one homology dimension, with an optimal matching. */
export function diagramBottleneck(D, E) {
    module();
    const d = f64(D, 'D');
    const e = f64(E, 'E');
    return call((m) => unpackMatching(m.diagramBottleneckFlat(d, e)));
}
