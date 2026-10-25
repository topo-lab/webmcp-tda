/** A WebAssembly memory refusal; the next call needs no load(). */
export interface CapacityError extends RangeError {
    readonly code: 'TOO_LARGE';
    readonly details: CapacityDetails;
}
/** Numbers describe a failed buffer request and committed wasm memory. */
export interface CapacityDetails {
    readonly function: string;
    /** 'allocator' when the exact internal structure is unknown. */
    readonly phase: string;
    readonly requestedBytes: number;
    /** Diagnostic, always `null`: committed pages include free allocator space, so the bytes in use are not known. */
    readonly inUseBytes: null;
    readonly memoryBytes: number;
    readonly committedBytes: number;
    /** Applicable ceiling: Rust Layout, reached wasm memory, module maximum, or documented JS conversion budget. */
    readonly limitBytes: number;
    /** Module maximum, even when the host refuses growth earlier. */
    readonly declaredMaxBytes: number;
    readonly allocationLimitBytes: number;
    readonly input: Readonly<Record<string, number | readonly number[]>>;
    readonly parameters: Readonly<Record<string, unknown>>;
    /** True for a checked Rust Layout refusal before the allocator. */
    readonly capacityOverflow?: boolean;
    /** A conservative API budget for an extra JavaScript conversion buffer, not the host heap limit. */
    readonly hostConversionBudgetBytes?: number;
    readonly alignment?: number;
    /** Diagnostic for bug reports (the module's internal function number); not part of the stable API and may change. */
    readonly functionId?: number;
    /** Diagnostic for bug reports (the module's internal phase number); not part of the stable API and may change. */
    readonly phaseId?: number;
    /** Diagnostic: how long the instance replacement took; not part of the stable API and may change. */
    readonly recoveryMilliseconds?: number;
    readonly elements?: number;
    readonly elementBytes?: number;
    /** Rounded down fresh-instance estimate, in estimateUnit; never an admission guarantee. */
    readonly estimatedMaxInput?: number;
    readonly estimatedInputShape?: readonly number[];
    readonly estimateUnit?: string;
    /** Growth law, failed-structure scaling, working-set model and limits, or omission reason. */
    readonly estimateMethod?: string;
    /** Measured capacity-benchmark success at the stated parameters, not a universal capacity. */
    readonly capacityReference?: {
        readonly size: number;
        readonly limitBytes: number;
        readonly unit: string;
        readonly parameters: string;
    };
    readonly capacityEstimate?: {
        /** A single-buffer ceiling, not a whole-input estimate. */
        readonly maximumElements?: number;
        /** Fresh-instance pairwise estimate at the original dimension. */
        readonly maximumEqualSamples?: number;
        readonly failingSamples?: number;
        readonly method: string;
    };
}
