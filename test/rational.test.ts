import { Rational } from "../src/computation-system";

describe("Rational", () => {
  describe("of", () => {
    test("Normalizes by the greatest common divisor", () => {
      const r = Rational.of(6, 4);
      expect(r.numerator).toBe(3n);
      expect(r.denominator).toBe(2n);
    });

    test("Moves the sign to the numerator", () => {
      const r = Rational.of(3n, -6n);
      expect(r.numerator).toBe(-1n);
      expect(r.denominator).toBe(2n);
    });

    test("Zero has denominator 1", () => {
      const r = Rational.of(0, -5);
      expect(r.numerator).toBe(0n);
      expect(r.denominator).toBe(1n);
    });

    test("Denominator defaults to 1", () => {
      expect(Rational.of(7)).toEqual(Rational.of(7n, 1n));
    });

    test("Equal values are structurally equal", () => {
      expect(Rational.of(2, 6)).toEqual(Rational.of(-1, -3));
    });

    test("Error if the denominator is 0", () => {
      expect(() => Rational.of(1, 0)).toThrow();
    });

    test("Error if a number is not a safe integer", () => {
      expect(() => Rational.of(0.5)).toThrow();
      expect(() => Rational.of(1, 2 ** 60)).toThrow();
    });
  });

  describe("Arithmetic", () => {
    const half = Rational.of(1, 2);
    const third = Rational.of(1, 3);

    test("add", () => {
      expect(half.add(third)).toEqual(Rational.of(5, 6));
    });

    test("sub", () => {
      expect(third.sub(half)).toEqual(Rational.of(-1, 6));
    });

    test("mul", () => {
      expect(half.mul(Rational.of(-2, 3))).toEqual(Rational.of(-1, 3));
    });

    test("div", () => {
      expect(half.div(third)).toEqual(Rational.of(3, 2));
      expect(half.div(Rational.of(-1, 4))).toEqual(Rational.of(-2));
    });

    test("Error on division by 0", () => {
      expect(() => half.div(Rational.of(0))).toThrow();
    });

    test("Large values are exact", () => {
      const tiny = Rational.of(1n, 21n ** 40n);
      expect(tiny.mul(Rational.of(21n ** 40n))).toEqual(Rational.of(1));
    });
  });

  describe("Comparison", () => {
    test("compare", () => {
      expect(Rational.of(1, 3).compare(Rational.of(1, 2))).toBe(-1);
      expect(Rational.of(1, 2).compare(Rational.of(1, 3))).toBe(1);
      expect(Rational.of(2, 4).compare(Rational.of(1, 2))).toBe(0);
      expect(Rational.of(-1, 2).compare(Rational.of(1, 3))).toBe(-1);
    });

    test("equals", () => {
      expect(Rational.of(2, 4).equals(Rational.of(1, 2))).toBe(true);
      expect(Rational.of(1, 2).equals(Rational.of(1, 3))).toBe(false);
    });
  });

  describe("floor", () => {
    test("Positive values", () => {
      expect(Rational.of(7, 2).floor()).toBe(3n);
      expect(Rational.of(4).floor()).toBe(4n);
      expect(Rational.of(1, 3).floor()).toBe(0n);
    });

    test("Negative values round toward negative infinity", () => {
      expect(Rational.of(-7, 2).floor()).toBe(-4n);
      expect(Rational.of(-4).floor()).toBe(-4n);
      expect(Rational.of(-1, 3).floor()).toBe(-1n);
    });
  });

  test("toString", () => {
    expect(Rational.of(-3, 6).toString()).toBe("-1/2");
    expect(Rational.of(8, 4).toString()).toBe("2");
  });
});
