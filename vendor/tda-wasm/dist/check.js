/**
 * Argument checks shared by the API (internal). A value of the wrong type is
 * a `TypeError`, a value out of range a `RangeError`; both messages name the
 * parameter as the caller wrote it (`maxEdgeLength`, `points.d`). The checks
 * that `@topolab/ot-wasm` also has (`kind` to `sized`) are its own, word for
 * word, so the two packages refuse the same input with the same message.
 */
/** How a wrong value is described in a message. */
export function kind(v) {
    if (v === null || v === undefined)
        return String(v);
    if (Array.isArray(v))
        return 'an array';
    if (ArrayBuffer.isView(v))
        return `a ${v.constructor.name}`;
    return typeof v === 'object' ? 'an object' : `${typeof v} ${String(v)}`;
}
/** A `Float64Array` as it is, an array converted; anything else is a `TypeError`. */
export function f64(v, name) {
    if (v instanceof Float64Array)
        return v;
    if (Array.isArray(v))
        return Float64Array.from(v);
    throw new TypeError(`${name} must be a Float64Array or an array of numbers, got ${kind(v)}`);
}
/**
 * A `Float64Array` as it is, an array of numbers converted with every entry
 * checked (`f64`, ot-wasm's check, converts any array: `['0.5']` becomes 0.5
 * and `null` 0; the diagram distances keep it, to refuse what ot-wasm
 * refuses); anything else is a `TypeError`.
 */
export function numbers(v, name) {
    if (v instanceof Float64Array)
        return v;
    if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
            if (typeof v[i] !== 'number')
                throw new TypeError(`${name}[${i}] must be a number, got ${kind(v[i])}`);
        }
        return Float64Array.from(v);
    }
    throw new TypeError(`${name} must be a Float64Array or an array of numbers, got ${kind(v)}`);
}
/** A number (any value; ranges are checked where they are known). */
export function num(v, name) {
    if (typeof v !== 'number')
        throw new TypeError(`${name} must be a number, got ${kind(v)}`);
    return v;
}
/** Largest value of an integer control: the wasm boundary takes u32. */
export const U32_MAX = 0xffffffff;
/** An integer control in `[min, 2³² − 1]`: the wasm boundary would truncate a fraction and wrap anything else. */
export function u32(v, name, min, max = U32_MAX) {
    num(v, name);
    if (!Number.isSafeInteger(v) || v < min || v > max)
        throw new RangeError(`${name} must be an integer from ${min} to ${max}, got ${v}`);
    return v;
}
/** A boolean. */
export function bool(v, name) {
    if (typeof v !== 'boolean')
        throw new TypeError(`${name} must be a boolean, got ${kind(v)}`);
    return v;
}
/** One of `allowed`. */
export function oneOf(v, name, allowed) {
    if (typeof v !== 'string')
        throw new TypeError(`${name} must be a string, got ${kind(v)}`);
    if (!allowed.includes(v)) {
        throw new RangeError(`${name} must be ${allowed.map((a) => `"${a}"`).join(' or ')}, got "${v}"`);
    }
    return v;
}
/** An options object (`undefined` reads as `{}`). */
export function options(v, name) {
    if (v === undefined)
        return {};
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
        throw new TypeError(`${name} must be an object, got ${kind(v)}`);
    }
    return v;
}
/** A point cloud with at least one point; returns its number of points. */
export function cloud(v, name) {
    if (v === null || typeof v !== 'object' || !(v.coords instanceof Float64Array))
        throw new TypeError(`${name} must be a point cloud { coords: Float64Array, d: number }, got ${kind(v)}`);
    const { coords, d } = v;
    u32(d, `${name}.d`, 1);
    if (coords.length === 0 || coords.length % d !== 0)
        throw new RangeError(`${name}.coords must hold a positive whole number of points of ${d} coordinates, got length ${coords.length}`);
    return coords.length / d;
}
/** `length` must be `expected`. */
export function sized(length, expected, name, what) {
    if (length !== expected)
        throw new RangeError(`${name} must have ${what} (${expected}), got length ${length}`);
}
// ---------------------------------------------------------------------------
// Checks of this package's own
// ---------------------------------------------------------------------------
/** A number that is not NaN. */
export function notNaN(v, name) {
    num(v, name);
    if (Number.isNaN(v))
        throw new RangeError(`${name} must not be NaN`);
    return v;
}
/** A positive number or `Infinity` (a cutoff). */
export function positive(v, name) {
    num(v, name);
    if (!(v > 0))
        throw new RangeError(`${name} must be positive, got ${v}`);
    return v;
}
/** A non-negative number or `Infinity` (a cutoff that may be 0). */
export function nonNegative(v, name) {
    num(v, name);
    if (!(v >= 0))
        throw new RangeError(`${name} must be non-negative, got ${v}`);
    return v;
}
/** A finite number. */
export function finite(v, name) {
    num(v, name);
    if (!Number.isFinite(v))
        throw new RangeError(`${name} must be finite, got ${v}`);
    return v;
}
/** Every entry of `values` finite, naming the first that is not. */
export function allFinite(values, name) {
    for (let i = 0; i < values.length; i++) {
        if (!Number.isFinite(values[i]))
            throw new RangeError(`${name}[${i}] must be finite, got ${values[i]}`);
    }
}
/** No entry of `values` NaN, naming the first that is. */
export function noNaN(values, name) {
    for (let i = 0; i < values.length; i++) {
        if (Number.isNaN(values[i]))
            throw new RangeError(`${name}[${i}] must not be NaN`);
    }
}
/**
 * The largest coefficient field: `2^31 - 1`, a prime. The engines are exact
 * up to it: sums of two elements stay below `2^32`, products are taken in 64
 * bits, inverses come from a table below `2^16` and from Fermat's
 * `a^(p - 2)` above, and the field reaches the engines as a 32-bit `int`.
 */
export const MAX_COEFF = 2147483647;
/** Trial division up to the square root (at most 46,340 divisions). */
function isPrime(n) {
    if (n < 2)
        return false;
    if (n % 2 === 0)
        return n === 2;
    for (let d = 3; d * d <= n; d += 2)
        if (n % d === 0)
            return false;
    return true;
}
/** A prime coefficient field `coeff` in `[2, MAX_COEFF]`, default 2. */
export function coeff(v) {
    if (v === undefined)
        return 2;
    num(v, 'coeff');
    if (!Number.isSafeInteger(v) || v < 2 || v > MAX_COEFF || !isPrime(v)) {
        throw new RangeError(`coeff must be a prime from 2 to ${MAX_COEFF}, got ${v}`);
    }
    return v;
}
/** The `minPersistence` option: a finite non-negative number, default 0. */
export function minPersistence(v) {
    if (v === undefined)
        return 0;
    num(v, 'minPersistence');
    if (!Number.isFinite(v) || !(v >= 0)) {
        throw new RangeError(`minPersistence must be a finite non-negative number, got ${v}`);
    }
    return v;
}
/** An integer in `[min, max]` (a count or a dimension; `max` at most `2^31 - 1`, an embind `int`). */
export function int(v, name, min, max = 0x7fffffff) {
    return u32(v, name, min, max);
}
/**
 * A point cloud (`cloud`) whose coordinates are finite, with `d` among
 * `dims` when given and at least `min` points; returns its number of points.
 */
export function points(v, name, opts = {}) {
    const n = cloud(v, name);
    const { coords, d } = v;
    if (opts.dims !== undefined && !opts.dims.includes(d)) {
        throw new RangeError(`${name}.d must be ${opts.dims.join(' or ')}, got ${d}`);
    }
    if (opts.min !== undefined && n < opts.min) {
        throw new RangeError(`${name} must hold at least ${opts.min} points, got ${n}`);
    }
    allFinite(coords, `${name}.coords`);
    return n;
}
/** An integer option with a default. */
export function intOption(v, name, fallback, min, max) {
    return v === undefined ? fallback : int(v, name, min, max);
}
/** A boolean option with a default. */
export function boolOption(v, name, fallback) {
    return v === undefined ? fallback : bool(v, name);
}
