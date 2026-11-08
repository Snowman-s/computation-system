import { ComputationSystem } from "./computation-system";
// Imported directly, not via "./computation-system", because that module re-exports this one
// and importing a value (class) through it could see it before initialization.
import { Rational } from "./rational";

/**
 * An axis-parallel closed box ∏_j [min[j], max[j]] with rational corners.
 */
export interface RationalBox {
  readonly min: readonly Rational[];
  readonly max: readonly Rational[];
}

/**
 * A piece of the piecewise affine map.
 *
 * @remarks
 * The map sends "source" onto "target" by the unique affine map with a positive diagonal linear part
 * that maps each corner "min" / "max" of the source to that of the target:
 * x ↦ target.min + (target width / source width) ⊙ (x − source.min), coordinate by coordinate.
 */
export interface AffinePiece {
  readonly source: RationalBox;
  readonly target: RationalBox;
}

/**
 * The operation-independent definition of the piecewise affine map.
 * @see {@link PiecewiseAffineMap.asTuple}
 */
export interface PiecewiseAffineMapTuple {
  readonly dimension: number;
  readonly pieces: readonly AffinePiece[];
}

/**
 * The runtime state of the piecewise affine map.
 */
export interface PiecewiseAffineMapConfiguration {
  readonly point: readonly Rational[];
}

/**
 * Returns whether the closed box contains the point.
 * @param box A box
 * @param point A point of the same dimension
 * @returns True if min[j] ≤ point[j] ≤ max[j] for every coordinate j, false otherwise.
 */
function boxContains(box: RationalBox, point: readonly Rational[]): boolean {
  return point.every((x, j) => box.min[j].compare(x) <= 0 && x.compare(box.max[j]) <= 0);
}

/**
 * Returns whether two closed boxes intersect.
 * @param a A box
 * @param b A box of the same dimension
 * @returns True if the boxes share a point (including touching only on the boundary), false otherwise.
 */
function boxesIntersect(a: RationalBox, b: RationalBox): boolean {
  return a.min.every((_, j) => a.min[j].compare(b.max[j]) <= 0 && b.min[j].compare(a.max[j]) <= 0);
}

/**
 * Applies the affine map of the piece to the point.
 * @param piece A piece whose source contains the point
 * @param point A point
 * @returns The image of the point.
 */
function applyPiece(piece: AffinePiece, point: readonly Rational[]): Rational[] {
  const { source, target } = piece;
  return point.map((x, j) => {
    const scale = target.max[j].sub(target.min[j]).div(source.max[j].sub(source.min[j]));
    return target.min[j].add(scale.mul(x.sub(source.min[j])));
  });
}

/**
 * Throws if the box does not have the given dimension or has a non-positive width.
 * @param box The box to check
 * @param dimension The expected dimension
 * @throws {Error} If the box is invalid.
 */
function validateBox(box: RationalBox, dimension: number): void {
  if (box.min.length !== dimension || box.max.length !== dimension) {
    throw new Error(`Box dimension does not match: expected ${dimension}`);
  }
  // A box of width 0 would make the scale of its piece undefined (as a source) or degenerate (as a target).
  if (box.min.some((min, j) => min.compare(box.max[j]) >= 0)) {
    throw new Error("Box must have a positive width on every coordinate");
  }
}

/**
 * A object for simulate the piecewise affine map, which repeatedly applies a map defined on finitely many boxes.
 *
 * @remarks
 * Each step finds the piece whose source box contains the current point and replaces the point with its image.
 * The source boxes are required to be pairwise disjoint, so that the map is well-defined.
 * The target boxes may overlap each other and the source boxes; injectivity and volume preservation
 * are properties of particular constructions (e.g. {@link BalancedThreeStackMachineToPiecewiseAffineMapTransformElement}),
 * not of this model.
 * The map stops when the point is in no source box.
 * Points are exact rationals, so the simulation has no rounding error.
 *
 * @see OpenAI. Incompressible Box Transport and Finite Computation. preprint, 2026. (Section 3, Theorem 3.4)
 * @see C. Moore. Generalized shifts: unpredictability and undecidability in dynamical systems. Nonlinearity 4(2):199–230, 1991.
 */
export class PiecewiseAffineMap implements ComputationSystem {
  private point: readonly Rational[] | null = null;
  private readonly tuple: PiecewiseAffineMapTuple;

  /**
   * Initialize map with given arguments.
   *
   * @param dimension The dimension of the space. Must be a positive integer.
   * @param pieces The pieces of the map.
   * @throws {Error} If "dimension" is not a positive integer.
   * @throws {Error} If a box does not have the dimension, or has a non-positive width on some coordinate.
   * @throws {Error} If two source boxes intersect (including touching only on the boundary).
   */
  constructor(dimension: number, pieces: readonly AffinePiece[]) {
    if (!Number.isInteger(dimension) || dimension <= 0) {
      throw new Error("dimension must be a positive integer");
    }
    for (const piece of pieces) {
      validateBox(piece.source, dimension);
      validateBox(piece.target, dimension);
    }
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        // A point in two sources would have two images, and the map would not be well-defined.
        if (boxesIntersect(pieces[i].source, pieces[j].source)) {
          throw new Error(`Source boxes of pieces ${i} and ${j} intersect`);
        }
      }
    }
    this.tuple = { dimension, pieces: [...pieces] };
  }

  /**
   * Initiates processing for given point.
   * @param input The initial point.
   * @throws {Error} If the point does not have the dimension of this map.
   */
  public start(input: readonly Rational[]): void {
    if (input.length !== this.tuple.dimension) {
      throw new Error(`Point dimension does not match: expected ${this.tuple.dimension}`);
    }
    this.point = [...input];
  }

  /**
   * Proceeds with this map. This method must be called after {@link PiecewiseAffineMap.start} called, or get an error.
   *
   * @remarks
   * One "step" is an application of one piece.
   * This method does not change the status if {@link PiecewiseAffineMap.isStopped} is true.
   *
   * @param step Non-negative integer indicating how many steps to advance this map.
   * @throws {Error} If step < 0, or if {@link PiecewiseAffineMap.start} has not been called.
   */
  public proceed(step = 1): void {
    if (step < 0) {
      throw new Error("step must be non-negative");
    }
    if (this.point === null) {
      throw new Error("Map has not been started");
    }
    for (let i = 0; i < step; i++) {
      const piece = this.findPiece();
      if (piece === null) {
        break;
      }
      this.point = applyPiece(piece, this.point);
    }
  }

  /**
   * Returns whether this map is stopped.
   *
   * @returns True if the point is in no source box, false otherwise (including before {@link PiecewiseAffineMap.start} is called).
   */
  public isStopped(): boolean {
    if (this.point === null) {
      return false;
    }
    return this.findPiece() === null;
  }

  /**
   * Returns configuration(current status) of this map.
   *
   * @returns Current point if {@link PiecewiseAffineMap.start} was called, null otherwise.
   */
  public getConfiguration(): PiecewiseAffineMapConfiguration | null {
    if (this.point === null) {
      return null;
    }
    return { point: this.point };
  }

  /**
   * Returns a tuple representation of this map.
   *
   * @remarks
   * - dimension - The dimension of the space.
   * - pieces - The pieces of the map.
   *
   * @returns a tuple representation of this map.
   */
  public asTuple(): PiecewiseAffineMapTuple {
    return this.tuple;
  }

  /**
   * Creates a copy of this map with the same definition, which is not started.
   * @returns A new PiecewiseAffineMap instance.
   */
  public clone(): PiecewiseAffineMap {
    return new PiecewiseAffineMap(this.tuple.dimension, this.tuple.pieces);
  }

  /**
   * Finds the piece whose source box contains the current point.
   * (Assume that {@link PiecewiseAffineMap.start} has been called.)
   *
   * @remarks
   * Since the sources are disjoint, at most one piece is found.
   *
   * @returns The piece, or null if there is none.
   */
  private findPiece(): AffinePiece | null {
    return this.tuple.pieces.find((piece) => boxContains(piece.source, this.point!)) ?? null;
  }
}
