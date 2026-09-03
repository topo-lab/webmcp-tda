/**
 * Core type definitions for tda-wasm.
 *
 * Shared across modules. Rips complexes reuse `AlphaComplexResult`; the
 * default Rips methods are backed by GUDHI `Rips_complex`.
 * q-Wasserstein lives on `GudhiPersistentCohomology`; default methods use
 * Hera optimal transport and explicit `*Greedy` methods retain the legacy
 * approximation.
 */
/**
 * Validates that coordinates array has correct format for 3D weighted points.
 * Layout is [x, y, z, weight, ...] — the 4th value per point is a weight, not a 4D coordinate.
 * @param coords - Flat array [x, y, z, weight, ...]
 * @throws {ValidationError} If validation fails
 */
export function validateCoordinates(coords) {
    if (!Array.isArray(coords)) {
        const error = new Error('coords must be an array');
        error.code = 'INVALID_INPUT';
        throw error;
    }
    if (coords.length === 0) {
        const error = new Error('coords array cannot be empty');
        error.code = 'INVALID_INPUT';
        throw error;
    }
    if (coords.length % 4 !== 0) {
        const error = new Error(`coords length must be multiple of 4 (x,y,z,weight per point), got ${coords.length}`);
        error.code = 'INVALID_DIMENSIONS';
        throw error;
    }
    if (!coords.every(c => typeof c === 'number' && isFinite(c))) {
        const error = new Error('All coordinates must be finite numbers');
        error.code = 'INVALID_INPUT';
        throw error;
    }
    // Validate weights are non-negative
    for (let i = 3; i < coords.length; i += 4) {
        const weight = coords[i];
        if (weight !== undefined && weight < 0) {
            const error = new Error(`Weight at point ${Math.floor(i / 4)} must be non-negative, got ${weight}`);
            error.code = 'INVALID_WEIGHTS';
            throw error;
        }
    }
}
/**
 * Converts Point3D array to flat coordinate array
 * @param points - Array of 3D points with weights
 * @returns Flat array [x0, y0, z0, w0, x1, y1, z1, w1, ...]
 */
export function pointsToCoordinates(points) {
    const coords = [];
    for (const point of points) {
        coords.push(point.x, point.y, point.z, point.weight);
    }
    return coords;
}
/**
 * Converts flat coordinate array back to Point3D array
 * @param coords - Flat array [x0, y0, z0, w0, x1, y1, z1, w1, ...]
 * @returns Array of Point3D objects
 */
export function coordinatesToPoints(coords) {
    validateCoordinates(coords);
    const points = [];
    for (let i = 0; i < coords.length; i += 4) {
        const x = coords[i];
        const y = coords[i + 1];
        const z = coords[i + 2];
        const weight = coords[i + 3];
        if (x === undefined || y === undefined || z === undefined || weight === undefined) {
            throw new Error(`Missing coordinate data at index ${i}`);
        }
        points.push({ x, y, z, weight });
    }
    return points;
}
/**
 * Validates cubical complex input dimensions and data
 * @throws {ValidationError} If validation fails
 */
export function validateCubicalInput(dimensions, data) {
    if (!Array.isArray(dimensions) || dimensions.length === 0) {
        const error = new Error('dimensions must be a non-empty array');
        error.code = 'INVALID_DIMENSIONS';
        throw error;
    }
    for (let i = 0; i < dimensions.length; i++) {
        const d = dimensions[i];
        if (!Number.isInteger(d) || d <= 0) {
            const error = new Error(`Dimension ${i} must be a positive integer, got ${d}`);
            error.code = 'INVALID_DIMENSIONS';
            throw error;
        }
    }
    const expectedSize = dimensions.reduce((a, b) => a * b, 1);
    if (data.length !== expectedSize) {
        const error = new Error(`Data length (${data.length}) does not match dimensions (expected ${expectedSize})`);
        error.code = 'INVALID_INPUT';
        throw error;
    }
    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        if (typeof value !== 'number' || !isFinite(value)) {
            const error = new Error('All data values must be finite numbers');
            error.code = 'INVALID_INPUT';
            throw error;
        }
    }
}
/**
 * Operation type for zigzag persistence
 */
export var ZigzagOpType;
(function (ZigzagOpType) {
    ZigzagOpType[ZigzagOpType["INSERT"] = 0] = "INSERT";
    ZigzagOpType[ZigzagOpType["REMOVE"] = 1] = "REMOVE";
})(ZigzagOpType || (ZigzagOpType = {}));
/**
 * Creates an insert operation for zigzag persistence
 * @param cellId - Unique identifier for the cell
 * @param boundary - Array of cell IDs forming the boundary (empty for vertices)
 * @param dimension - Dimension of the cell (0 for vertices, 1 for edges, etc.)
 * @param filtration - Filtration value (optional, for filtered zigzag)
 */
export function createInsertOp(cellId, boundary, dimension, filtration = 0) {
    return {
        op_type: ZigzagOpType.INSERT,
        cell_id: cellId,
        boundary,
        dimension,
        filtration
    };
}
/**
 * Creates a remove operation for zigzag persistence
 * @param cellId - Identifier of the cell to remove
 * @param filtration - Filtration value (optional, for filtered zigzag)
 */
export function createRemoveOp(cellId, filtration = 0) {
    return {
        op_type: ZigzagOpType.REMOVE,
        cell_id: cellId,
        boundary: [],
        dimension: 0,
        filtration
    };
}
/**
 * Converts zigzag operations to flat array format for WASM
 * Format: [op_type, cell_id, dimension, filtration, boundary_size, boundary...]
 */
export function operationsToFlat(operations) {
    const flat = [];
    for (const op of operations) {
        flat.push(op.op_type, op.cell_id, op.dimension, op.filtration, op.boundary.length, ...op.boundary);
    }
    return flat;
}
/**
 * Validates zigzag operations
 * @throws {ValidationError} If validation fails
 */
export function validateZigzagOperations(operations) {
    if (!Array.isArray(operations)) {
        const error = new Error('operations must be an array');
        error.code = 'INVALID_INPUT';
        throw error;
    }
    if (operations.length === 0) {
        const error = new Error('operations array cannot be empty');
        error.code = 'INVALID_INPUT';
        throw error;
    }
    const insertedCells = new Set();
    for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (op.op_type !== ZigzagOpType.INSERT && op.op_type !== ZigzagOpType.REMOVE) {
            const error = new Error(`Invalid operation type at index ${i}: ${op.op_type}`);
            error.code = 'INVALID_INPUT';
            throw error;
        }
        if (typeof op.cell_id !== 'number' || !Number.isInteger(op.cell_id)) {
            const error = new Error(`Invalid cell_id at index ${i}: must be an integer`);
            error.code = 'INVALID_INPUT';
            throw error;
        }
        if (op.op_type === ZigzagOpType.INSERT) {
            // Check dimension
            if (typeof op.dimension !== 'number' || op.dimension < 0) {
                const error = new Error(`Invalid dimension at index ${i}: must be non-negative`);
                error.code = 'INVALID_INPUT';
                throw error;
            }
            // Check boundary references existing cells
            for (const boundaryId of op.boundary) {
                if (!insertedCells.has(boundaryId)) {
                    const error = new Error(`Boundary cell ${boundaryId} at index ${i} references non-existent cell`);
                    error.code = 'INVALID_INPUT';
                    throw error;
                }
            }
            insertedCells.add(op.cell_id);
        }
        else {
            // Remove operation - check cell exists
            if (!insertedCells.has(op.cell_id)) {
                const error = new Error(`Cannot remove cell ${op.cell_id} at index ${i}: cell does not exist`);
                error.code = 'INVALID_INPUT';
                throw error;
            }
            // Note: We don't remove from insertedCells because zigzag allows re-insertion
        }
    }
}
//# sourceMappingURL=types.js.map