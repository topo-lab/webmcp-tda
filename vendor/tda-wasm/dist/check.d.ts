/**
 * Argument checks shared by the API (internal). A value of the wrong type is
 * a `TypeError`, a value out of range a `RangeError`; both messages name the
 * parameter as the caller wrote it (`maxEdgeLength`, `points.d`). The checks
 * that `@topolab/ot-wasm` also has (`kind` to `sized`) are its own, word for
 * word, so the two packages refuse the same input with the same message.
 */
/** Weights, matrices and values: a `Float64Array`, or an array of numbers (converted). */
export type Vec = Float64Array | number[];
/** How a wrong value is described in a message. */
export declare function kind(v: unknown): string;
/** A `Float64Array` as it is, an array converted; anything else is a `TypeError`. */
export declare function f64(v: unknown, name: string): Float64Array;
/**
 * A `Float64Array` as it is, an array of numbers converted with every entry
 * checked (`f64`, ot-wasm's check, converts any array: `['0.5']` becomes 0.5
 * and `null` 0; the diagram distances keep it, to refuse what ot-wasm
 * refuses); anything else is a `TypeError`.
 */
export declare function numbers(v: unknown, name: string): Float64Array;
/** A number (any value; ranges are checked where they are known). */
export declare function num(v: unknown, name: string): number;
/** Largest value of an integer control: the wasm boundary takes u32. */
export declare const U32_MAX = 4294967295;
/** An integer control in `[min, 2³² − 1]`: the wasm boundary would truncate a fraction and wrap anything else. */
export declare function u32(v: unknown, name: string, min: number, max?: number): number;
/** A boolean. */
export declare function bool(v: unknown, name: string): boolean;
/** One of `allowed`. */
export declare function oneOf<T extends string>(v: unknown, name: string, allowed: readonly T[]): T;
/** An options object (`undefined` reads as `{}`). */
export declare function options<T extends object>(v: unknown, name: string): Partial<T>;
/** A point cloud: `n` points of `d` coordinates, row-major (`coords[i·d + c]`). */
export interface PointCloud {
    /** The coordinates, point after point (length `n · d`). */
    coords: Float64Array;
    /** Coordinates per point (a positive integer). */
    d: number;
}
/** A point cloud with at least one point; returns its number of points. */
export declare function cloud(v: unknown, name: string): number;
/** `length` must be `expected`. */
export declare function sized(length: number, expected: number, name: string, what: string): void;
/** A number that is not NaN. */
export declare function notNaN(v: unknown, name: string): number;
/** A positive number or `Infinity` (a cutoff). */
export declare function positive(v: unknown, name: string): number;
/** A non-negative number or `Infinity` (a cutoff that may be 0). */
export declare function nonNegative(v: unknown, name: string): number;
/** A finite number. */
export declare function finite(v: unknown, name: string): number;
/** Every entry of `values` finite, naming the first that is not. */
export declare function allFinite(values: ArrayLike<number>, name: string): void;
/** No entry of `values` NaN, naming the first that is. */
export declare function noNaN(values: ArrayLike<number>, name: string): void;
/**
 * The largest coefficient field: `2^31 - 1`, a prime. The engines are exact
 * up to it: sums of two elements stay below `2^32`, products are taken in 64
 * bits, inverses come from a table below `2^16` and from Fermat's
 * `a^(p - 2)` above, and the field reaches the engines as a 32-bit `int`.
 */
export declare const MAX_COEFF = 2147483647;
/** A prime coefficient field `coeff` in `[2, MAX_COEFF]`, default 2. */
export declare function coeff(v: unknown): number;
/** The `minPersistence` option: a finite non-negative number, default 0. */
export declare function minPersistence(v: unknown): number;
/** The `flatTolerance` option: a finite non-negative number, or `undefined` (off). */
export declare function flatTolerance(v: unknown): number | undefined;
/** An integer in `[min, max]` (a count or a dimension; `max` at most `2^31 - 1`, the module's 32-bit `int` arguments). */
export declare function int(v: unknown, name: string, min: number, max?: number): number;
/**
 * A point cloud (`cloud`) whose coordinates are finite, with `d` among
 * `dims` when given and at least `min` points; returns its number of points.
 */
export declare function points(v: unknown, name: string, opts?: {
    min?: number;
    dims?: readonly number[];
}): number;
/** An integer option with a default. */
export declare function intOption(v: unknown, name: string, fallback: number, min: number, max?: number): number;
/** A boolean option with a default. */
export declare function boolOption(v: unknown, name: string, fallback: boolean): boolean;
