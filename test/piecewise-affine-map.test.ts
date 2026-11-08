import { AffinePiece, PiecewiseAffineMap, Rational, RationalBox } from "../src/computation-system";

describe("PiecewiseAffineMap", () => {
  const q = (n: number, d = 1) => Rational.of(n, d);
  const box = (min: Rational[], max: Rational[]): RationalBox => ({ min, max });

  // The left half of the unit square is stretched horizontally and squashed vertically onto the lower half.
  const stretch: AffinePiece = {
    source: box([q(0), q(0)], [q(1, 2), q(1)]),
    target: box([q(0), q(0)], [q(1), q(1, 2)]),
  };
  // The lower half of the square [2, 3] × [0, 1] is moved onto the left half of the unit square, scaled the other way.
  const back: AffinePiece = {
    source: box([q(2), q(0)], [q(3), q(1, 2)]),
    target: box([q(0), q(0)], [q(1, 2), q(1)]),
  };

  describe("Constructor", () => {
    test("Error if the dimension is not a positive integer", () => {
      expect(() => new PiecewiseAffineMap(0, [])).toThrow(/dimension/);
      expect(() => new PiecewiseAffineMap(1.5, [])).toThrow(/dimension/);
    });

    test("Error if a box does not have the dimension", () => {
      expect(() => new PiecewiseAffineMap(3, [stretch])).toThrow(/dimension/i);
    });

    test("Error if a source has a non-positive width", () => {
      const piece: AffinePiece = { source: box([q(0), q(0)], [q(0), q(1)]), target: stretch.target };
      expect(() => new PiecewiseAffineMap(2, [piece])).toThrow(/width/);
    });

    test("Error if a target has a non-positive width", () => {
      const piece: AffinePiece = { source: stretch.source, target: box([q(0), q(1)], [q(1), q(0)]) };
      expect(() => new PiecewiseAffineMap(2, [piece])).toThrow(/width/);
    });

    test("Error if two sources intersect", () => {
      const other: AffinePiece = { source: box([q(1, 4), q(1, 2)], [q(1), q(2)]), target: back.target };
      expect(() => new PiecewiseAffineMap(2, [stretch, other])).toThrow(/intersect/);
    });

    test("Error if two sources only touch on the boundary, since the boxes are closed", () => {
      const other: AffinePiece = { source: box([q(1, 2), q(0)], [q(1), q(1)]), target: back.target };
      expect(() => new PiecewiseAffineMap(2, [stretch, other])).toThrow(/intersect/);
    });

    test("Sources apart on one coordinate are accepted, and targets may overlap sources", () => {
      expect(() => new PiecewiseAffineMap(2, [stretch, back])).not.toThrow();
    });

    test("Targets may overlap each other", () => {
      const other: AffinePiece = { source: back.source, target: stretch.target };
      expect(() => new PiecewiseAffineMap(2, [stretch, other])).not.toThrow();
    });
  });

  describe("start / proceed", () => {
    test("getConfiguration() is null and isStopped() is false before start()", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      expect(map.getConfiguration()).toBeNull();
      expect(map.isStopped()).toBe(false);
    });

    test("Error if start() is given a point of another dimension", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      expect(() => map.start([q(0)])).toThrow(/dimension/i);
    });

    test("Error if proceed() is called before start()", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      expect(() => map.proceed(1)).toThrow();
    });

    test("Error if step is negative", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      map.start([q(1, 3), q(1, 4)]);
      expect(() => map.proceed(-1)).toThrow();
    });

    test("Applies the affine map determined by the source and target boxes exactly", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      map.start([q(1, 3), q(1, 4)]);
      // step defaults to 1.
      map.proceed();
      expect(map.getConfiguration()!.point).toEqual([q(2, 3), q(1, 8)]);
    });

    test("Applies a translated piece", () => {
      const map = new PiecewiseAffineMap(2, [stretch, back]);
      map.start([q(5, 2), q(1, 4)]);
      map.proceed(1);
      // x: 0 + (1/2) (5/2 - 2) = 1/4, y: 0 + 2 (1/4 - 0) = 1/2
      expect(map.getConfiguration()!.point).toEqual([q(1, 4), q(1, 2)]);
    });

    test("Points on the boundary of a source are mapped", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      map.start([q(1, 2), q(1)]);
      map.proceed(1);
      expect(map.getConfiguration()!.point).toEqual([q(1), q(1, 2)]);
    });

    test("Stops when the point leaves every source, and proceed() then changes nothing", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      map.start([q(1, 3), q(1, 4)]);
      expect(map.isStopped()).toBe(false);
      map.proceed(5);
      // (1/3, 1/4) -> (2/3, 1/8), which is outside the source.
      expect(map.isStopped()).toBe(true);
      expect(map.getConfiguration()!.point).toEqual([q(2, 3), q(1, 8)]);
    });

    test("proceed(0) changes nothing", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      map.start([q(1, 3), q(1, 4)]);
      map.proceed(0);
      expect(map.getConfiguration()!.point).toEqual([q(1, 3), q(1, 4)]);
    });

    test("A map without pieces is stopped immediately", () => {
      const map = new PiecewiseAffineMap(1, []);
      map.start([q(0)]);
      expect(map.isStopped()).toBe(true);
    });

    test("start() does not keep a reference to the input array", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      const input = [q(1, 3), q(1, 4)];
      map.start(input);
      input[0] = q(100);
      expect(map.getConfiguration()!.point).toEqual([q(1, 3), q(1, 4)]);
    });
  });

  describe("asTuple / clone", () => {
    test("asTuple() returns the definition", () => {
      const map = new PiecewiseAffineMap(2, [stretch, back]);
      expect(map.asTuple()).toEqual({ dimension: 2, pieces: [stretch, back] });
    });

    test("The constructor copies the piece array", () => {
      const pieces = [stretch];
      const map = new PiecewiseAffineMap(2, pieces);
      pieces.push(back);
      expect(map.asTuple().pieces).toHaveLength(1);
    });

    test("clone() has the same definition and is not started", () => {
      const map = new PiecewiseAffineMap(2, [stretch]);
      map.start([q(1, 3), q(1, 4)]);
      const copy = map.clone();
      expect(copy.asTuple()).toEqual(map.asTuple());
      expect(copy.getConfiguration()).toBeNull();

      copy.start([q(1, 4), q(1, 2)]);
      copy.proceed(1);
      expect(map.getConfiguration()!.point).toEqual([q(1, 3), q(1, 4)]);
    });
  });
});
