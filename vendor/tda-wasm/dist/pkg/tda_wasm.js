/* @ts-self-types="./tda_wasm.d.ts" */
/**
 * wasm-bindgen's glue (--target web) for rust/tda-wasm, wrapped by
 * scripts/build_wasm.sh in a factory: each __tda_create() holds the
 * state of one instance, so that every load() has a module object of its
 * own. instantiate the module with imports(), then call finalize(instance,
 * module); exports are the bound functions and classes.
 */
export function __tda_create() {

/**
 * The native snapshot behind `prepareComplex` (src/prepared.ts). `delete()`
 * frees it (the name the Embind class had and src/prepared.ts calls);
 * wasm-bindgen's `free()` does too.
 */
class PreparedComplex {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PreparedComplexFinalization.unregister(this);
        return ptr;
    }
    free() {
        if (this.__oomEpoch !== undefined && this.__oomEpoch !== __oomEpoch) throw new Error("wasm handle is invalid after instance recovery or unload");
    const context = { function: "free", input: {...this.__oomContext?.input,}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_preparedcomplex_free(ptr, 0);
    
    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}
    /**
     * Frees the object: the Embind class's name for it, which
     * src/prepared.ts calls.
     */
    delete() {
        if (this.__oomEpoch !== undefined && this.__oomEpoch !== __oomEpoch) throw new Error("wasm handle is invalid after instance recovery or unload");
    const context = { function: "delete", input: {...this.__oomContext?.input,}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
        const ptr = this.__destroy_into_raw();
        wasm.preparedcomplex_delete(ptr);
    
    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}
    /**
     * @returns {number}
     */
    static liveCount() {
    const context = { function: "liveCount", input: {...this.__oomContext?.input,}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
        copies.length = 0;

        const ret = wasm.preparedcomplex_liveCount();
        return ret >>> 0;
    
    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}
    /**
     * @param {Int32Array} vertices
     * @param {Uint32Array} offsets
     * @param {Float64Array} filtrations
     */
    constructor(vertices, offsets, filtrations) {
    const context = { function: "prepareComplex", input: {...this.__oomContext?.input,"vertices": vertices.length,"offsets": offsets.length,"filtrations": filtrations.length}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
        const ptr0 = passArray32ToWasm0(vertices, (size, align) => __oomAllocate(size, align, copies, context));
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(offsets, (size, align) => __oomAllocate(size, align, copies, context));
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF64ToWasm0(filtrations, (size, align) => __oomAllocate(size, align, copies, context));
        const len2 = WASM_VECTOR_LEN;
        copies.length = 0;
        const ret = wasm.preparedcomplex_new(ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        this.__oomEpoch = __oomEpoch;
        this.__oomContext = context;
        PreparedComplexFinalization.register(this, {ptr:this.__wbg_ptr, epoch:__oomEpoch}, this);
        return this;
    
    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}
    /**
     * @param {number} coeff_field
     * @returns {Float64Array}
     */
    persistence(coeff_field) {
        if (this.__oomEpoch !== undefined && this.__oomEpoch !== __oomEpoch) throw new Error("wasm handle is invalid after instance recovery or unload");
    const context = { function: "persistence", input: {...this.__oomContext?.input,}, parameters: {"coeff": coeff_field} };
    const copies = [];
    __oomBegin();
    try {
        copies.length = 0;

        const ret = wasm.preparedcomplex_persistence(this.__wbg_ptr, coeff_field);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }
    
    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}
}
if (Symbol.dispose) PreparedComplex.prototype[Symbol.dispose] = PreparedComplex.prototype.free;

/**
 * @param {Float64Array} diagram
 * @param {Float64Array} grid
 * @returns {Float64Array}
 */
function bettiCurveFlat(diagram, grid) {
    const context = { function: "bettiCurve", input: {"diagram": diagram.length,"grid": grid.length}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(diagram, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(grid, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.bettiCurveFlat(ptr0, len0, ptr1, len1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} diagram
 * @param {number} t
 * @returns {Float64Array}
 */
function bettiNumbersFlat(diagram, t) {
    const context = { function: "bettiNumbers", input: {"diagram": diagram.length}, parameters: {"t": t} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(diagram, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.bettiNumbersFlat(ptr0, len0, t);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} step_size
 * @param {number} alpha
 * @param {number} max_steps
 * @param {number} max_simplex_dim
 * @param {any} include_box_extents
 * @returns {any}
 */
function boxFiltrationFlat(points, dimension, step_size, alpha, max_steps, max_simplex_dim, include_box_extents) {
    const context = { function: "boxFiltration", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"step_size": step_size,"alpha": alpha,"max_steps": max_steps,"maxDim": max_simplex_dim,"include_box_extents": include_box_extents} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.boxFiltrationFlat(ptr0, len0, dimension, step_size, alpha, max_steps, max_simplex_dim, include_box_extents);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} step_size
 * @param {number} alpha
 * @param {number} max_steps
 * @param {number} max_simplex_dim
 * @param {any} include_box_extents
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @returns {any}
 */
function boxFiltrationPipeline(points, dimension, step_size, alpha, max_steps, max_simplex_dim, include_box_extents, coeff_field, with_simplices) {
    const context = { function: "boxFiltrationPersistence", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"step_size": step_size,"alpha": alpha,"max_steps": max_steps,"maxDim": max_simplex_dim,"include_box_extents": include_box_extents,"coeff": coeff_field,"complex": with_simplices} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.boxFiltrationPipeline(ptr0, len0, dimension, step_size, alpha, max_steps, max_simplex_dim, include_box_extents, coeff_field, with_simplices);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} max_radius
 * @param {number} max_simplex_dimension
 * @returns {any}
 */
function cechComplexFlat(points, dimension, max_radius, max_simplex_dimension) {
    const context = { function: "cechComplex", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"maxRadius": max_radius,"maxDim": max_simplex_dimension} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.cechComplexFlat(ptr0, len0, dimension, max_radius, max_simplex_dimension);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * `{ simplices?, pairs }` or `{ simplices?, empty: true }`, as the glue's
 * `pipelineResult`; for points in dimension 1 to 3 its
 * `bulkPipelineResult` of the Delaunay–Čech complex (the same shape).
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} max_radius
 * @param {number} max_simplex_dimension
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @returns {any}
 */
function cechPipeline(points, dimension, max_radius, max_simplex_dimension, coeff_field, with_simplices) {
    const context = { function: "cechPersistence", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"maxRadius": max_radius,"maxDim": max_simplex_dimension,"coeff": coeff_field,"complex": with_simplices} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.cechPipeline(ptr0, len0, dimension, max_radius, max_simplex_dimension, coeff_field, with_simplices);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} neighborhood_size
 * @param {number} axes_ratio
 * @returns {Float64Array}
 */
function computeEllipsoidGeometry(points, dimension, neighborhood_size, axes_ratio) {
    const context = { function: "ellipsoids", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"neighborhood_size": neighborhood_size,"axes_ratio": axes_ratio} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.computeEllipsoidGeometry(ptr0, len0, dimension, neighborhood_size, axes_ratio);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} q
 * @param {number} theta
 * @param {Float64Array} normals_or_k
 * @returns {Float64Array}
 */
function computeWingGeometry(points, q, theta, normals_or_k) {
    const context = { function: "wings", input: {"points": points.length,"normals_or_k": normals_or_k.length}, parameters: {"q": q,"theta": theta} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(normals_or_k, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.computeWingGeometry(ptr0, len0, q, theta, ptr1, len1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {Float64Array} colors
 * @param {number} max_squared_radius
 * @param {number} max_simplex_dimension
 * @returns {any}
 */
function coupledAlphaComplex2DFlat(points, colors, max_squared_radius, max_simplex_dimension) {
    const context = { function: "coupledAlphaComplex", input: {"points": points.length,"colors": colors.length}, parameters: {"maxSquaredRadius": max_squared_radius,"maxDim": max_simplex_dimension} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(colors, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.coupledAlphaComplex2DFlat(ptr0, len0, ptr1, len1, max_squared_radius, max_simplex_dimension);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Uint32Array} dimensions
 * @param {Float64Array} values
 * @returns {any}
 */
function cubicalComplexFlat(dimensions, values) {
    const context = { function: "cubicalComplex", input: {shape: Array.from(dimensions), cells: values.length}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArray32ToWasm0(dimensions, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(values, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.cubicalComplexFlat(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Uint32Array} dimensions
 * @param {Float64Array} values
 * @param {number} coeff_field
 * @returns {Float64Array}
 */
function cubicalPersistenceFlat(dimensions, values, coeff_field) {
    const context = { function: "cubicalPersistence", input: {shape: Array.from(dimensions), cells: values.length}, parameters: {"coeff": coeff_field} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArray32ToWasm0(dimensions, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(values, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.cubicalPersistenceFlat(ptr0, len0, ptr1, len1, coeff_field);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} values
 * @param {number} width
 * @param {number} height
 * @returns {Float64Array}
 */
function cubicalVertexPersistenceFlat(values, width, height) {
    const context = { function: "cubicalPersistence", input: {shape:[width,height], cells:values.length}, parameters: {coeff:2,construction:"V"} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(values, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.cubicalVertexPersistenceFlat(ptr0, len0, width, height);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} max_radius
 * @param {number} max_simplex_dimension
 * @param {number} flat_tolerance
 * @returns {any}
 */
function delaunayCechComplexFlat(points, dimension, max_radius, max_simplex_dimension, flat_tolerance) {
    const context = { function: "delaunayCechComplex", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"maxRadius": max_radius,"maxDim": max_simplex_dimension,"flatTolerance": (Number.isNaN(flat_tolerance) ? undefined : flat_tolerance)} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.delaunayCechComplexFlat(ptr0, len0, dimension, max_radius, max_simplex_dimension, flat_tolerance);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} d
 * @param {Float64Array} e
 * @returns {Float64Array}
 */
function diagramBottleneckFlat(d, e) {
    const context = { function: "diagramBottleneck", input: {n:d.length/2,m:e.length/2}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(d, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(e, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.diagramBottleneckFlat(ptr0, len0, ptr1, len1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} d
 * @param {Float64Array} e
 * @param {number} order
 * @param {number} internal_p
 * @returns {Float64Array}
 */
function diagramWassersteinFlat(d, e, order, internal_p) {
    const context = { function: "diagramWasserstein", input: {n:d.length/2,m:e.length/2}, parameters: {"order": order,"internal_p": internal_p} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(d, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(e, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.diagramWassersteinFlat(ptr0, len0, ptr1, len1, order, internal_p);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} neighborhood_size
 * @param {number} axes_ratio
 * @param {number} max_simplex_dimension
 * @param {number} max_radius
 * @returns {any}
 */
function ellipsoidCechComplexFlat(points, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_radius) {
    const context = { function: "ellipsoidCechComplex", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"neighborhood_size": neighborhood_size,"axes_ratio": axes_ratio,"maxDim": max_simplex_dimension,"maxRadius": max_radius} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ellipsoidCechComplexFlat(ptr0, len0, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_radius);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} neighborhood_size
 * @param {number} axes_ratio
 * @param {number} max_simplex_dimension
 * @param {number} max_radius
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @returns {any}
 */
function ellipsoidCechPipeline(points, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_radius, coeff_field, with_simplices) {
    const context = { function: "ellipsoidCechPersistence", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"neighborhood_size": neighborhood_size,"axes_ratio": axes_ratio,"maxDim": max_simplex_dimension,"maxRadius": max_radius,"coeff": coeff_field,"complex": with_simplices} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ellipsoidCechPipeline(ptr0, len0, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_radius, coeff_field, with_simplices);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} neighborhood_size
 * @param {number} axes_ratio
 * @param {number} max_simplex_dimension
 * @param {number} max_filtration
 * @returns {any}
 */
function ellipsoidRipsComplexFlat(points, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_filtration) {
    const context = { function: "ellipsoidRipsComplex", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"neighborhood_size": neighborhood_size,"axes_ratio": axes_ratio,"maxDim": max_simplex_dimension,"max_filtration": max_filtration} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ellipsoidRipsComplexFlat(ptr0, len0, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_filtration);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} neighborhood_size
 * @param {number} axes_ratio
 * @param {number} max_simplex_dimension
 * @param {number} max_filtration
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @returns {any}
 */
function ellipsoidRipsPipeline(points, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_filtration, coeff_field, with_simplices) {
    const context = { function: "ellipsoidRipsPersistence", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"neighborhood_size": neighborhood_size,"axes_ratio": axes_ratio,"maxDim": max_simplex_dimension,"max_filtration": max_filtration,"coeff": coeff_field,"complex": with_simplices} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ellipsoidRipsPipeline(ptr0, len0, dimension, neighborhood_size, axes_ratio, max_simplex_dimension, max_filtration, coeff_field, with_simplices);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} num_landmarks
 * @param {number} max_alpha_square
 * @param {number} max_simplex_dimension
 * @returns {any}
 */
function euclideanWitnessComplexFlat(points, dimension, num_landmarks, max_alpha_square, max_simplex_dimension) {
    const context = { function: "witnessComplex", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"num_landmarks": num_landmarks,"max_alpha_square": max_alpha_square,"maxDim": max_simplex_dimension} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.euclideanWitnessComplexFlat(ptr0, len0, dimension, num_landmarks, max_alpha_square, max_simplex_dimension);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * The test hook: `{ pairs, simplexOffsets, vertices }`.
 * @param {Int32Array} vertices
 * @param {Uint32Array} offsets
 * @param {Float64Array} filtrations
 * @param {number} coeff_field
 * @returns {any}
 */
function getPersistentPairs(vertices, offsets, filtrations, coeff_field) {
    const context = { function: "getPersistentPairs", input: {"vertices": vertices.length,"offsets": offsets.length,"filtrations": filtrations.length}, parameters: {"coeff": coeff_field} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArray32ToWasm0(vertices, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(offsets, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF64ToWasm0(filtrations, (size, align) => __oomAllocate(size, align, copies, context));
    const len2 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.getPersistentPairs(ptr0, len0, ptr1, len1, ptr2, len2, coeff_field);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} k
 * @param {number} max_squared_radius
 * @param {number} max_simplex_dim
 * @returns {any}
 */
function kFoldCoverComplexFlat(points, k, max_squared_radius, max_simplex_dim) {
    const context = { function: "kFoldCoverComplex", input: {points: points.length / 3, dimension:3, coordinateElements:points.length}, parameters: {"k": k,"maxSquaredRadius": (max_squared_radius === 0 ? Infinity : max_squared_radius),"maxDim": max_simplex_dim} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.kFoldCoverComplexFlat(ptr0, len0, k, max_squared_radius, max_simplex_dim);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} k
 * @param {number} max_squared_radius
 * @param {number} max_simplex_dim
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @returns {any}
 */
function kFoldCoverPipeline(points, k, max_squared_radius, max_simplex_dim, coeff_field, with_simplices) {
    const context = { function: "kFoldCoverPersistence", input: {points: points.length / 3, dimension:3, coordinateElements:points.length}, parameters: {"k": k,"maxSquaredRadius": (max_squared_radius === 0 ? Infinity : max_squared_radius),"maxDim": max_simplex_dim,"coeff": coeff_field,"complex": with_simplices} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.kFoldCoverPipeline(ptr0, len0, k, max_squared_radius, max_simplex_dim, coeff_field, with_simplices);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} flat
 * @param {number} min_persistence
 * @returns {Float64Array}
 */
function longPairsFlat(flat, min_persistence) {
    const context = { function: "longPairs", input: {"flat": flat.length}, parameters: {"minPersistence": min_persistence} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(flat, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.longPairsFlat(ptr0, len0, min_persistence);
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Int32Array} vertices
 * @param {Uint32Array} offsets
 * @param {Float64Array} filtrations
 * @param {number} coeff_field
 * @returns {Float64Array}
 */
function persistenceFlat(vertices, offsets, filtrations, coeff_field) {
    const context = { function: "persistence", input: {"vertices": vertices.length,"offsets": offsets.length,"filtrations": filtrations.length}, parameters: {"coeff": coeff_field} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArray32ToWasm0(vertices, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(offsets, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF64ToWasm0(filtrations, (size, align) => __oomAllocate(size, align, copies, context));
    const len2 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.persistenceFlat(ptr0, len0, ptr1, len1, ptr2, len2, coeff_field);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} pairs
 * @param {number} rows
 * @param {number} cols
 * @param {any} auto_bounds
 * @param {number} birth_min
 * @param {number} birth_max
 * @param {number} pers_min
 * @param {number} pers_max
 * @param {number} sigma
 * @param {number} weight_power
 * @returns {Float64Array}
 */
function persistenceImageFlat(pairs, rows, cols, auto_bounds, birth_min, birth_max, pers_min, pers_max, sigma, weight_power) {
    const context = { function: "persistenceImage", input: {shape:[rows,cols], cells:rows*cols, pairElements:pairs.length}, parameters: {"rows": rows,"cols": cols,"auto_bounds": auto_bounds,"birth_min": birth_min,"birth_max": birth_max,"pers_min": pers_min,"pers_max": pers_max,"sigma": sigma,"weight_power": weight_power} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(pairs, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.persistenceImageFlat(ptr0, len0, rows, cols, auto_bounds, birth_min, birth_max, pers_min, pers_max, sigma, weight_power);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} pairs
 * @param {number} first
 * @param {number} last
 * @param {Float64Array} grid
 * @returns {Float64Array}
 */
function persistenceLandscapeFlat(pairs, first, last, grid) {
    const context = { function: "persistenceLandscape", input: {gridPoints:grid.length, pairElements:pairs.length}, parameters: {"first": first,"last": last} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(pairs, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(grid, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.persistenceLandscapeFlat(ptr0, len0, first, last, ptr1, len1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} max_edge_length
 * @param {number} max_simplex_dimension
 * @returns {any}
 */
function ripsComplexFlat(points, dimension, max_edge_length, max_simplex_dimension) {
    const context = { function: "ripsComplex", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"maxEdgeLength": max_edge_length,"maxDim": max_simplex_dimension} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ripsComplexFlat(ptr0, len0, dimension, max_edge_length, max_simplex_dimension);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} matrix
 * @param {number} num_points
 * @param {number} max_edge_length
 * @param {number} max_simplex_dimension
 * @returns {any}
 */
function ripsComplexFromMatrixFlat(matrix, num_points, max_edge_length, max_simplex_dimension) {
    const context = { function: "ripsComplex", input: {rows: num_points, columns: num_points, entries: matrix.length}, parameters: {"num_points": num_points,"maxEdgeLength": max_edge_length,"maxDim": max_simplex_dimension} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(matrix, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ripsComplexFromMatrixFlat(ptr0, len0, num_points, max_edge_length, max_simplex_dimension);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} max_dim
 * @param {number} threshold
 * @param {number} modulus
 * @returns {Float64Array}
 */
function ripsPersistenceFlat(points, dimension, max_dim, threshold, modulus) {
    const context = { function: "ripsPersistence", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"maxDim": max_dim,"maxEdgeLength": threshold,"coeff": modulus} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ripsPersistenceFlat(ptr0, len0, dimension, max_dim, threshold, modulus);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} matrix
 * @param {number} num_points
 * @param {number} max_dim
 * @param {number} threshold
 * @param {number} modulus
 * @returns {Float64Array}
 */
function ripsPersistenceFromDistanceMatrixFlat(matrix, num_points, max_dim, threshold, modulus) {
    const context = { function: "ripsPersistence", input: {rows: num_points, columns: num_points, entries: matrix.length}, parameters: {"num_points": num_points,"maxDim": max_dim,"maxEdgeLength": threshold,"coeff": modulus} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(matrix, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ripsPersistenceFromDistanceMatrixFlat(ptr0, len0, num_points, max_dim, threshold, modulus);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} dimension
 * @param {number} max_dim
 * @param {number} threshold
 * @param {number} modulus
 * @param {number} kind
 * @param {number} dims_mask
 * @param {number} min_persistence
 * @returns {any}
 */
function ripsRepresentativesFlat(points, dimension, max_dim, threshold, modulus, kind, dims_mask, min_persistence) {
    const context = { function: "ripsRepresentatives", input: {points: points.length / dimension, dimension, coordinateElements: points.length}, parameters: {"dimension": dimension,"maxDim": max_dim,"maxEdgeLength": threshold,"coeff": modulus,"kind": kind,"dims_mask": dims_mask,"minPersistence": min_persistence} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ripsRepresentativesFlat(ptr0, len0, dimension, max_dim, threshold, modulus, kind, dims_mask, min_persistence);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} matrix
 * @param {number} num_points
 * @param {number} max_dim
 * @param {number} threshold
 * @param {number} modulus
 * @param {number} kind
 * @param {number} dims_mask
 * @param {number} min_persistence
 * @returns {any}
 */
function ripsRepresentativesFromDistanceMatrixFlat(matrix, num_points, max_dim, threshold, modulus, kind, dims_mask, min_persistence) {
    const context = { function: "ripsRepresentativesFromDistanceMatrix", input: {rows: num_points, columns: num_points, entries: matrix.length}, parameters: {"num_points": num_points,"maxDim": max_dim,"maxEdgeLength": threshold,"coeff": modulus,"kind": kind,"dims_mask": dims_mask,"minPersistence": min_persistence} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(matrix, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.ripsRepresentativesFromDistanceMatrixFlat(ptr0, len0, num_points, max_dim, threshold, modulus, kind, dims_mask, min_persistence);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * The package version this module was built as (package.json's).
 * @returns {string}
 */
function version() {
    const context = { function: "version", input: {}, parameters: {} };
    const copies = [];
    __oomBegin();
    try {
    let deferred1_0;
    let deferred1_1;
    try {
        copies.length = 0;
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Int32Array} vertices
 * @param {Uint32Array} offsets
 * @param {Float64Array} filtrations
 * @param {number} ambient_dim
 * @param {any} single
 * @param {number} birth
 * @param {number} death
 * @param {number} min_persistence
 * @returns {Float64Array}
 */
function volumeOptimalCyclesFlat(vertices, offsets, filtrations, ambient_dim, single, birth, death, min_persistence) {
    const context = { function: "volumeOptimalCycles", input: {"vertices": vertices.length,"offsets": offsets.length,"filtrations": filtrations.length}, parameters: {"ambient_dim": ambient_dim,"single": single,"birth": birth,"death": death,"minPersistence": min_persistence} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArray32ToWasm0(vertices, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(offsets, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF64ToWasm0(filtrations, (size, align) => __oomAllocate(size, align, copies, context));
    const len2 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.volumeOptimalCyclesFlat(ptr0, len0, ptr1, len1, ptr2, len2, ambient_dim, single, birth, death, min_persistence);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    try { return new Float64Array(getArrayF64FromWasm0(ret[0], ret[1])); } catch (error) {
        if (error instanceof RangeError) throw __oomCapacity(context, 'output-copy', ret[1] * 8, {elementBytes:8, elements:ret[1]});
        throw error;
    } finally { wasm.__wbindgen_free(ret[0], ret[1] * 8, 8); }

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * `flat_tolerance`: NaN (or an omitted argument) is off.
 * @param {Float64Array} coords
 * @param {number} max_squared_radius
 * @param {number} flat_tolerance
 * @returns {any}
 */
function weightedAlphaComplexFlat(coords, max_squared_radius, flat_tolerance) {
    const context = { function: "alphaComplex", input: {points: coords.length / 4, storedCoordinatesPerPoint: 4}, parameters: {"maxSquaredRadius": (max_squared_radius === 0 ? Infinity : max_squared_radius),"flatTolerance": (Number.isNaN(flat_tolerance) ? undefined : flat_tolerance)} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(coords, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.weightedAlphaComplexFlat(ptr0, len0, max_squared_radius, flat_tolerance);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} coords
 * @param {number} max_squared_radius
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @param {number} flat_tolerance
 * @returns {any}
 */
function weightedAlphaPipeline(coords, max_squared_radius, coeff_field, with_simplices, flat_tolerance) {
    const context = { function: "alphaPersistence", input: {points: coords.length / 4, storedCoordinatesPerPoint: 4}, parameters: {"maxSquaredRadius": (max_squared_radius === 0 ? Infinity : max_squared_radius),"coeff": coeff_field,"complex": with_simplices,"flatTolerance": (Number.isNaN(flat_tolerance) ? undefined : flat_tolerance)} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(coords, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.weightedAlphaPipeline(ptr0, len0, max_squared_radius, coeff_field, with_simplices, flat_tolerance);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} q
 * @param {number} theta
 * @param {Float64Array} normals_or_k
 * @param {number} max_simplex_dimension
 * @param {number} max_eps
 * @returns {any}
 */
function wingComplexFlat(points, q, theta, normals_or_k, max_simplex_dimension, max_eps) {
    const context = { function: "wingComplex", input: {"points": points.length,"normals_or_k": normals_or_k.length}, parameters: {"q": q,"theta": theta,"maxDim": max_simplex_dimension,"max_eps": max_eps} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(normals_or_k, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.wingComplexFlat(ptr0, len0, q, theta, ptr1, len1, max_simplex_dimension, max_eps);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} points
 * @param {number} q
 * @param {number} theta
 * @param {Float64Array} normals_or_k
 * @param {number} max_simplex_dimension
 * @param {number} max_eps
 * @param {number} coeff_field
 * @param {any} with_simplices
 * @returns {any}
 */
function wingPipeline(points, q, theta, normals_or_k, max_simplex_dimension, max_eps, coeff_field, with_simplices) {
    const context = { function: "wingPersistence", input: {"points": points.length,"normals_or_k": normals_or_k.length}, parameters: {"q": q,"theta": theta,"maxDim": max_simplex_dimension,"max_eps": max_eps,"coeff": coeff_field,"complex": with_simplices} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(points, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(normals_or_k, (size, align) => __oomAllocate(size, align, copies, context));
    const len1 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.wingPipeline(ptr0, len0, q, theta, ptr1, len1, max_simplex_dimension, max_eps, coeff_field, with_simplices);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}

/**
 * @param {Float64Array} records
 * @param {any} with_values
 * @returns {any}
 */
function zigzagPersistenceFlat(records, with_values) {
    const context = { function: "zigzagPersistence", input: {"records": records.length}, parameters: {"with_values": with_values} };
    const copies = [];
    __oomBegin();
    try {
    const ptr0 = passArrayF64ToWasm0(records, (size, align) => __oomAllocate(size, align, copies, context));
    const len0 = WASM_VECTOR_LEN;
    copies.length = 0;
    const ret = wasm.zigzagPersistenceFlat(ptr0, len0, with_values);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);

    } catch (error) {
        if (!__oomPoisoned) for (const [ptr, size, align] of copies) wasm.__wbindgen_free(ptr, size, align);
        throw __oomNormalize(error, context);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_falsy_16bd49b68658263e: function(arg0) {
            const ret = !arg0;
            return ret;
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_instanceof_RangeError_62996e9dbf747e67: function(arg0) {
            let result;
            try {
                result = arg0 instanceof RangeError;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_new_343a093a3c2ffb4e: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_511b7d84dfb30888: function() { return handleError(function (arg0, arg1) {
            const ret = new Float64Array(getArrayF64FromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_55ed41becb58cd16: function() { return handleError(function (arg0, arg1) {
            const ret = new Uint32Array(getArrayU32FromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_617a8cdb8bb1130e: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_6ab88fbe741af6b5: function(arg0, arg1) {
            const ret = new RangeError(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_81d0c780bd13b3c8: function() { return handleError(function (arg0, arg1) {
            const ret = new Int32Array(getArrayI32FromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_bc524849b21af6ee: function() { return handleError(function (arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_set_145a351398b48c65: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbindgen_generic_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./tda_wasm_bg.js": import0,
    };
}

const PreparedComplexFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ptr,epoch}) => { if (epoch === __oomEpoch) wasm.__wbg_preparedcomplex_free(ptr, 1); });

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    const limits = WebAssembly.Module.customSections(module, 'topolab.memory-limit');
    if (limits.length) __oomLimit = Number(new TextDecoder().decode(limits[limits.length - 1]));
    wasmInstance = instance;
    wasm = __oomExports(instance.exports);
    __oomEpoch++;
    __oomInitialBytes = wasm.memory.buffer.byteLength;
    __oomRecordAddress = wasm.__oom_record();
    __capacityRecordAddress = wasm.__capacity_record();
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}
// Only evaluated on refusal. Sizes describe a fresh instance with retained
// handles discarded; this is an estimate, never an admission check.
const __oomPhases = ['allocator','edge list','adjacency matrix','edge collapse',
    'coboundary columns','Delaunay triangulation','filtration','boundary matrix',
    'cubical cells','cost matrix','transport plan','transport solver',
    'sorted samples','projections','directions','result','input validation',
    'geometric neighborhoods','zigzag interval state','volume optimization',
    'representation grid','ladder matrices','(unused)','catalogue'];
function __oomSize(bytes) {
    const units=['bytes','KiB','MiB','GiB'];
    let u=0; while(bytes>=1024 && u<3) {bytes/=1024;u++;}
    return bytes.toFixed(2)+' '+units[u];
}
function __oomEstimate(details) {
    const {function:fn,input:i,parameters:p,requestedBytes:r}=details;
    const headroom=Math.max(0,details.limitBytes-__oomInitialBytes);
    // Committed pages are NOT live usage. Their sum with the failed request
    // is a conservative pressure observation, not an exact peak calculation.
    const pressure=details.memoryBytes+r;
    const budget=0.5*headroom;
    const limits=details.allocationLimitBytes;
    let n,m,degree=2,working,unit='points per side',law,reference;
    if(fn==='ripsPersistence' && (p.maxDim??1)<=1 && (p.maxEdgeLength===Infinity) && p.coeff===2) {
        n=i.points??i.rows;
        // Infinity bounds edges by n*(n-1)/2; the enclosing-radius shortcut
        // can remove some. Radix staging and reduction also occupy memory.
        working=x=>(i.rows?56:48)*x*x+8*(i.dimension??0)*x;
        unit='points';law='Rips edge storage O(n^2), at most n*(n-1)/2 edges; same maxDim<=1, Infinity and coeff=2. Reduction is data dependent.';
        if(p.maxDim===1&&((i.dimension===3)||i.rows)) reference={size:i.rows?4096:8192,limitBytes:2147483648,unit:'points',parameters:'uniform unit-cube cloud, maxDim=1, Infinity, coeff=2; dense Euclidean matrix when applicable'};
    } else if((fn==='cubicalComplex'||fn==='cubicalPersistence') && i.shape?.length>=1 && i.shape.length<=3 && (fn==='cubicalComplex'||p.coeff===2)) {
        const d=i.shape.length; n=i.cells;degree=1;
        working=x=>32*3**d*x;
        unit='grid cells';law='Cubical cell count O(3^d * voxels), fixed dimension and aspect ratio, coeff=2. Reduction fill depends on values; conservative structural model.';
        if(fn==='cubicalPersistence'&&p.construction!=='V'&&d>=2&&i.shape.every(x=>x===i.shape[0])) reference={size:(d===2?4096**2:128**3),limitBytes:2147483648,unit:'grid cells',parameters:'uniform values, construction T, coeff=2, equal grid sides'};
    } else if(fn==='ripsComplex' && p.maxEdgeLength===Infinity && p.maxDim>=0 && p.maxDim<=3) {
        n=i.points??i.rows;degree=Math.max(i.rows?2:1,p.maxDim+1);
        working=x=>{let cells=0,choose=1;for(let k=1;k<=p.maxDim+1;k++){choose*=Math.max(0,x-k+1)/k;cells+=choose;}return 64*cells+(i.rows?8*x*x:8*x*(i.dimension??1));};
        unit='points';law='Full Rips complex bounded by sum(k=1..maxDim+1) binomial(n,k) simplices, plus graph and input, at Infinity; fixed maxDim<=3.';
    } else if(fn==='diagramWasserstein' && i.n>0 && i.m>0) {
        n=i.n;m=i.m;const ratio=m/n;
        working=x=>(x+1)*(ratio*x+1)>16777216?Infinity:64*(x+1)*(ratio*x+1)+512*(1+ratio)*x;
        unit='pairs per source diagram';law='Diagram Wasserstein O((n+1)*(m+1)), finite-pair counts bounded by total pairs, fixed ratio; includes cost matrix, diagonal node and simplex scratch. Existing 16777216-entry cap still applies.';
        if(n===m&&p.order===2&&p.internal_p===Infinity) reference={size:2048,limitBytes:2147483648,unit:'pairs per diagram',parameters:'finite uniform births/lifetimes, order=2, internalP=Infinity'};
    } else if(fn==='persistenceLandscape' && i.gridPoints>0 && p.first>=1 && p.last>=p.first) {
        n=i.gridPoints;degree=1;
        working=x=>8*x*(p.last-p.first+1+2*Math.min(p.last,16)+8)+64*i.pairElements;
        unit='grid points';law='Landscape memory O(gridPoints*levels+pairs), fixed first/last levels and same pairs. Includes output, per-grid work and sort buffers.';
    } else if(fn==='persistenceImage' && i.shape?.every(x=>x>0)) {
        n=i.cells;degree=1;
        working=x=>32*x+64*i.pairElements;
        unit='pixels';law='Persistence image memory O(rows*cols+pairs), fixed aspect ratio and same pairs. Output and per-axis work; double output allowance.';
    } else if(fn==='pairwiseCost' && i.n>0 && i.m>0 && i.dimension>0) {
        n=i.n;m=i.m;const ratio=m/n,d=i.dimension;
        working=x=>8*ratio*x*x+8*x*(d*(1+2*ratio)+ratio);
        law='Pairwise cost matrix 8*n*m bytes plus 8*(d*n+2*d*m+m) input/transpose/row bytes; fixed dimension and aspect ratio.';
    } else if(['emd','emdVerify','sinkhorn','sinkhornPlan','sinkhornUnbalanced','sinkhornDivergence','gromovWasserstein','barycenter'].includes(fn) && i.n>0 && i.m>0) {
        n=i.n;m=i.m;const ratio=m/n;
        working=fn==='gromovWasserstein' ? x=>128*(1+ratio+ratio*ratio)*x*x+512*(1+ratio)*x
            :fn==='barycenter' ? x=>64*x*x+64*x*i.m
            :fn==='sinkhornDivergence' ? x=>32*(1+ratio+ratio*ratio)*x*x+512*(1+ratio)*x
            :x=>(fn==='sinkhornPlan'?24:64)*ratio*x*x+512*(1+ratio)*x;
        law=fn==='barycenter' ? 'Barycenter O(n^2+n*k), fixed number k of histograms; cost, kernel and scaling buffers.'
            :fn==='gromovWasserstein' ? 'Gromov-Wasserstein O(n^2+m^2+n*m), fixed support ratio; costs, gradients and plans.'
            :fn==='sinkhornDivergence' ? 'Sinkhorn divergence O(n*m+n^2+m^2), fixed support ratio; three cost matrices.'
            :'Dense OT O(n*m+n+m), fixed support ratio; cost, solver scratch and transport plan. Conservative full-working-set allowance.';
        unit=fn==='barycenter'?'support points':'source points';
        if(((fn==='emd'&&p.maxPivots===0)||(fn==='sinkhorn'&&p.method===0&&p.reg===0.1&&p.maxIter===10000&&p.tol===0.000001&&p.epsilonScaling===0.5)) && n===m)
            reference={size:8192,limitBytes:4294967296,unit:'points per side',parameters:'uniform unit-square squared-Euclidean costs and masses; default EMD or log Sinkhorn reg=0.1, tol=1e-6, maxIter=10000, epsilonScaling=0.5'};
    } else if((fn==='wasserstein1d'||fn==='slicedWasserstein') && i.n>0 && i.m>0) {
        n=i.n;m=i.m;degree=1;const ratio=m/n,d=i.dimension??1;
        working=x=>64*(1+ratio)*x+8*d*(1+ratio)*x+(fn==='slicedWasserstein'?16*(1+ratio)*x+8*(i.projectionElements??0):0);
        unit='source samples';law='Sorting memory O(n+m) (time O((n+m) log(n+m))); input copies, keyed sort buffers, index permutations'+(fn==='slicedWasserstein'?', projections O(d*(n+m)+directions*d), processed one direction at a time.':'.');
        if(n===m && ((fn==='wasserstein1d'&&p.p===1)||(fn==='slicedWasserstein'&&d===2&&p.p===2&&i.projectionElements===8)))
            reference={size:fn==='wasserstein1d'?67108864:33554432,limitBytes:4294967296,unit:'samples per side',parameters:fn==='wasserstein1d'?'uniform unit-interval samples, p=1':'uniform unit-square clouds, p=2, four axis directions'};
    } else if(fn==='randomDirections' && i.rows>0 && i.dimension>0) {
        n=i.rows;degree=1;working=x=>16*i.dimension*x+64*i.dimension;
        unit='directions';law='Direction buffer O(rows*d), fixed dimension; output and scratch.';
    } else if(fn==='GpuMatmul' && i.n>0 && i.m>0 && p.k>0) {
        n=i.n;m=i.m;const ratio=m/n;
        working=x=>4*(ratio*x*x+p.k*(1+ratio)*x);
        unit='matrix rows';law='f32 matrix multiply memory 4*(n*m+k*(n+m)), fixed inner dimension k and output aspect ratio.';
    }
    if(!working || !(n>0) || !Number.isFinite(r) || !(r>0)) {
        details.estimateMethod='Omitted: data-dependent output size or reduction fill, or missing input dimensions, prevent an honest whole-input estimate. Input-copy and result-copy ceilings alone do not predict pipeline capacity.';
        return;
    }
    // Invert both the full working-set model and the failed structure's
    // measured pressure under its known degree. Round down, never up.
    const structural=n*Math.min(1,(budget/Math.max(pressure,1))**(1/degree), (limits/r)**(1/degree));
    let lo=0,hi=Math.min(n,structural);
    for(let k=0;k<48;k++) {const mid=(lo+hi)/2;if(working(mid)<=budget)lo=mid;else hi=mid;}
    let fit=Math.floor(lo);
    if(reference) {
        // Cross-check against the same-parameter capacity-benchmark doubling ladder.
        // A measured largest success is a conservative ceiling, not the true
        // maximum. Scaling that reference is still only a model at 64 MiB.
        fit=Math.min(fit,Math.floor(reference.size*(details.limitBytes/reference.limitBytes)**(1/degree)));
        details.capacityReference=reference;
    }
    if(fit<1) {details.estimateMethod=law+' Omitted: fixed inputs or the modeled working set leave no positive retry size.';return;}
    if(i.shape) {
        const factor=(fit/n)**(1/i.shape.length);
        const shape=i.shape.map(x=>Math.max(1,Math.floor(x*factor)));
        fit=shape.reduce((a,b)=>a*b,1);details.estimatedInputShape=shape;
    } else if(m && fn!=='barycenter') details.estimatedInputShape=[fit,Math.floor(fit*m/n)];
    if(fit<1 || (details.estimatedInputShape?.some(x=>x<1))) return;
    details.estimatedMaxInput=fit;
    details.estimateUnit=unit;
    details.estimateMethod=law+' Invert requestedBytes and committedBytes pressure with growth degree '+degree+'; take the smaller of that and the full working-set model using 50% of fresh-instance headroom, bounded by the single-buffer ceiling'+(reference?' and cross-checked against the 2026-10-17 capacity benchmark at the stated parameters':'')+'. Round down. Discard retained handles first; fragmentation, data-dependent fill and later stages can reduce capacity. Estimate, not a guarantee.';
}

// Embedded inside each generated glue instance by patch_memory_glue.mjs.
let __oomLimit = 4294967296;
let __oomEpoch = 0, __oomPoisoned = false, __oomInitialBytes = 0;
let __oomRecovery = () => {};
let __oomCallDepth = 0, __oomFailureContext;
function __oom_on_recover(callback) { __oomRecovery = callback; }
function __oom_status() { return {memory:wasm.memory, epoch:__oomEpoch, limitBytes:__oomLimit}; }
function __oomExports(raw) {
    const exports = {...raw};
    for (const [name, fn] of Object.entries(raw)) {
        if (typeof fn !== 'function') continue;
        exports[name] = (...args) => {
            if (__oomPoisoned) {
                if (/free|dealloc/.test(name)) return;
                throw new WebAssembly.RuntimeError('instance already trapped');
            }
            __oomCallDepth++;
            try {
                const result=fn(...args);
                if (__oomPoisoned) throw new WebAssembly.RuntimeError('nested engine call trapped');
                return result;
            }
            catch (error) {
                if (error instanceof WebAssembly.RuntimeError) __oomPoisoned = true;
                throw error;
            } finally { __oomCallDepth--; }
        };
    }
    return exports;
}
function __oomBegin() {
    if (__oomPoisoned) throw new WebAssembly.RuntimeError('instance already trapped');
    // A previous fallible reservation may have returned an ordinary error.
    // Clear only the failure marker; Rust exports set their own function id.
    new Uint32Array(wasm.memory.buffer, __oomRecordAddress, 5)[0] = 0;
    new Uint32Array(wasm.memory.buffer, __capacityRecordAddress, 5).fill(0);
}
function __oomCapacity(context, phase, requestedBytes, extra = {}) {
    const memoryBytes = extra.memoryBytes ?? wasm.memory.buffer.byteLength;
    // A recorded allocator failure whose request still fits the declared
    // remaining address space means the host refused growth before that max.
    // The reached pages are a conservative retry budget, not a discovered
    // permanent browser ceiling. Never infer this from a Layout/JS-copy error.
    const record = new Uint32Array(wasm.memory.buffer, __oomRecordAddress, 5);
    const capacityOverflow = extra.capacityOverflow === true || (phase === 'input-copy' && requestedBytes > 2147483647);
    const growthRefused = !capacityOverflow && phase !== 'output-copy' && record[0] > 0
        && memoryBytes < __oomLimit && requestedBytes <= __oomLimit - memoryBytes;
    const limitBytes = capacityOverflow ? Math.min(__oomLimit,2147483647) : growthRefused ? memoryBytes : __oomLimit;
    const details = {...context, phase, requestedBytes, inUseBytes:null,
        memoryBytes, committedBytes:memoryBytes, limitBytes, declaredMaxBytes:__oomLimit,
        allocationLimitBytes:Math.min(limitBytes,2147483647), ...extra};
    if (extra.elementBytes > 0) details.capacityEstimate = {
        maximumElements: Math.floor(details.allocationLimitBytes / extra.elementBytes),
        method:'Absolute ceiling for this buffer alone; other allocations and fragmentation reduce it. Not a largest-fitting whole-input estimate.'
    };
    // Pairwise costs have a known full working set: output 8*n*m,
    // input copies, transposed y, and one row. Estimate equal support sizes
    // at the original dimension using 75% of fresh-instance headroom.
    if (context.function==='pairwiseCost' && context.input.n===context.input.m && context.input.dimension>0) {
        const linear=8*(3*context.input.dimension+1);
        const budget=Math.max(0,(details.limitBytes-__oomInitialBytes)*0.75);
        const samples=Math.floor(2*budget/(Math.sqrt(linear*linear+32*budget)+linear));
        details.capacityEstimate={maximumEqualSamples:samples, failingSamples:context.input.n,
            method:'Fresh-instance pairwise working-set model: 8*n*n + 8*n*(3*d+1) bytes, same dimension, using 75% of headroom after initial memory. Excludes JS heap and fragmentation; estimate, not a guarantee. Discard retained handles first.'};
    }
    __oomEstimate(details);
    const describe = value => JSON.stringify(value,(_key,x)=>typeof x==='number' && !Number.isFinite(x)?String(x):x);
    const remedy = /rips/i.test(context.function) ? 'Use fewer points, a smaller maxEdgeLength or maxDim, or the native build.' : /cubical/i.test(context.function) ? 'Use fewer grid cells, or the native build.' : /alpha|cech|kFold/i.test(context.function) ? 'Use fewer points, a smaller maxRadius/maxSquaredRadius or maxDim, or the native build.' : 'Use fewer points or samples, smaller matrices, or the native build.';
    const ceiling = requestedBytes > 2147483647 ? '; exceeds the wasm32 per-allocation ceiling (just below 2 GiB)' : '';
    const growth = growthRefused ? '; this browser refused to grow WebAssembly memory beyond '+__oomSize(limitBytes)+' (declared maximum '+__oomSize(__oomLimit)+')' : '';
    const fit = details.estimatedMaxInput;
    const estimate = fit ? '. About '+fit.toLocaleString('en-US')+' '+details.estimateUnit+' should fit with these parameters'+(details.estimatedInputShape ? ' (shape '+details.estimatedInputShape.join(' × ')+')' : '')+' in a fresh instance; estimate, not a guarantee' : '. No whole-input fit estimate is available for this stage';
    const error = new RangeError(context.function+': input too large for WebAssembly memory while building '+phase+'; '+__oomSize(requestedBytes)+' requested'+ceiling+'; '+__oomSize(details.memoryBytes)+' committed (live usage unknown) of a '+__oomSize(__oomLimit)+' maximum'+growth+'; input '+describe(context.input)+'; parameters '+describe(context.parameters)+estimate+'. '+remedy);
    error.code='TOO_LARGE'; error.details=details;
    return error;
}
function __oomAllocate(size, align, copies, context) {
    const ptr=Number.isSafeInteger(size) && size>=0 && size<=Math.min(__oomLimit,2147483647) ? wasm.oom_reserve(size/align,align)>>>0 : 0;
    if (!ptr) throw __oomCapacity(context,'input-copy',size,{elements:size/align,elementBytes:align});
    copies.push([ptr,size,align]);
    return ptr;
}
function __oomNormalize(error, context) {
    if (error instanceof WebAssembly.RuntimeError) {
        // A nested user callback may catch a trap while an outer Rust call
        // is still on the stack. Recover only after all old wasm frames exit.
        __oomFailureContext ??= context;
        if (__oomCallDepth) throw error;
        context=__oomFailureContext;
        __oomFailureContext=undefined;
        // Read the poisoned instance before replacing any glue state. Do not
        // call back into it: even the record's address is cached at finalize.
        const record=Array.from(new Uint32Array(wasm.memory.buffer,__oomRecordAddress,5));
        const capacity=Array.from(new Uint32Array(wasm.memory.buffer,__capacityRecordAddress,5));
        const failure=(capacity[0] || capacity[1]) ? __oomCapacity(context,__oomPhases[capacity[3]]??'allocator',capacity[0]+4294967296*capacity[1],{
            capacityOverflow:true,alignment:capacity[2],functionId:record[2],phaseId:capacity[3],memoryBytes:capacity[4]*65536
        }) : record[0] ? __oomCapacity(context,__oomPhases[record[3]]??'allocator',record[0],{
            alignment:record[1],functionId:record[2],phaseId:record[3],memoryBytes:record[4]*65536
        }) : new Error(context.function+': internal WebAssembly trap ('+error.message+'); instance recovered',{cause:error});
        const compiled=wasmModule;
        const start=performance.now();
        __oomPoisoned=false;
        try {
            __wbg_finalize_init(new WebAssembly.Instance(compiled,__wbg_get_imports()),compiled);
        } catch (recoveryError) {
            __oomPoisoned=true;
            throw new Error(context.function+': WebAssembly instance recovery failed',{cause:recoveryError});
        }
        if (failure.details) failure.details.recoveryMilliseconds=performance.now()-start;
        // Memory views, scratch addresses and handles are invalidated before
        // control returns to the caller, including for an internal trap.
        __oomRecovery(wasm.memory);
        throw failure;
    }
    if (error && error.code==='TOO_LARGE') return error.details?.function ? error : __oomCapacity(context,error.details.phase,error.details.requestedBytes,error.details);
    // Existing allocation Result errors are retained only where already free.
    const match=/out of memory allocating (\d+) elements/.exec(error?.message);
    if (match) {
        const record=new Uint32Array(wasm.memory.buffer,__oomRecordAddress,5);
        if(record[0]) return __oomCapacity(context,__oomPhases[record[3]]??'allocator',record[0],{alignment:record[1],functionId:record[2],phaseId:record[3],memoryBytes:record[4]*65536});
    }
    return error;
}
let __oomRecordAddress=0, __capacityRecordAddress=0;
    return {
        exports: { PreparedComplex, bettiCurveFlat, bettiNumbersFlat, boxFiltrationFlat, boxFiltrationPipeline, cechComplexFlat, cechPipeline, computeEllipsoidGeometry, computeWingGeometry, coupledAlphaComplex2DFlat, cubicalComplexFlat, cubicalPersistenceFlat, cubicalVertexPersistenceFlat, delaunayCechComplexFlat, diagramBottleneckFlat, diagramWassersteinFlat, ellipsoidCechComplexFlat, ellipsoidCechPipeline, ellipsoidRipsComplexFlat, ellipsoidRipsPipeline, euclideanWitnessComplexFlat, getPersistentPairs, kFoldCoverComplexFlat, kFoldCoverPipeline, longPairsFlat, persistenceFlat, persistenceImageFlat, persistenceLandscapeFlat, ripsComplexFlat, ripsComplexFromMatrixFlat, ripsPersistenceFlat, ripsPersistenceFromDistanceMatrixFlat, ripsRepresentativesFlat, ripsRepresentativesFromDistanceMatrixFlat, version, volumeOptimalCyclesFlat, weightedAlphaComplexFlat, weightedAlphaPipeline, wingComplexFlat, wingPipeline, zigzagPersistenceFlat, __oom_on_recover, __oom_status },
        imports: __wbg_get_imports,
        finalize: __wbg_finalize_init,
    };
}
