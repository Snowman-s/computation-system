/**
 * Returns the greatest common divisor of two non-negative integers.
 * @param a A non-negative integer
 * @param b A non-negative integer
 * @returns gcd(a, b), which is 0 only if both are 0.
 */
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Converts an integer given as a number or a bigint into a bigint.
 * @param value The integer to convert
 * @returns The same integer as a bigint
 * @throws {Error} If "value" is a number that is not a safe integer, since it cannot be converted exactly.
 */
function toBigInt(value: bigint | number): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error(`Not a safe integer: ${value}`);
  }
  return BigInt(value);
}

/**
 * An exact rational number with bigint numerator and denominator.
 *
 * @remarks
 * The value is always normalized: the denominator is positive and coprime to the numerator,
 * so that two equal values are also structurally equal (e.g. with Jest's toEqual).
 */
export class Rational {
  public readonly numerator: bigint;
  public readonly denominator: bigint;

  private constructor(numerator: bigint, denominator: bigint) {
    this.numerator = numerator;
    this.denominator = denominator;
  }

  /**
   * Creates a normalized rational number numerator / denominator.
   * @param numerator The numerator
   * @param denominator The denominator
   * @returns The normalized rational number
   * @throws {Error} If "denominator" is 0, or a number argument is not a safe integer.
   */
  public static of(numerator: bigint | number, denominator: bigint | number = 1n): Rational {
    let n = toBigInt(numerator);
    let d = toBigInt(denominator);
    if (d === 0n) {
      throw new Error("Denominator must not be 0");
    }
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n < 0n ? -n : n, d);
    return new Rational(n / g, d / g);
  }

  /**
   * @param other The addend
   * @returns this + other
   */
  public add(other: Rational): Rational {
    return Rational.of(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  /**
   * @param other The subtrahend
   * @returns this - other
   */
  public sub(other: Rational): Rational {
    return Rational.of(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  /**
   * @param other The multiplier
   * @returns this * other
   */
  public mul(other: Rational): Rational {
    return Rational.of(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  /**
   * @param other The divisor
   * @returns this / other
   * @throws {Error} If "other" is 0.
   */
  public div(other: Rational): Rational {
    if (other.numerator === 0n) {
      throw new Error("Division by 0");
    }
    return Rational.of(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  /**
   * @param other The value to compare with
   * @returns -1 if this < other, 0 if this = other, 1 if this > other.
   */
  public compare(other: Rational): -1 | 0 | 1 {
    // Both denominators are positive, so cross multiplication keeps the order.
    const left = this.numerator * other.denominator;
    const right = other.numerator * this.denominator;
    return left < right ? -1 : left > right ? 1 : 0;
  }

  /**
   * @param other The value to compare with
   * @returns True if this = other, false otherwise.
   */
  public equals(other: Rational): boolean {
    return this.numerator === other.numerator && this.denominator === other.denominator;
  }

  /**
   * @returns The greatest integer not greater than this value (rounding toward negative infinity also for negative values).
   */
  public floor(): bigint {
    // Division of bigint rounds toward 0, so negative non-integers need one more step down.
    const quotient = this.numerator / this.denominator;
    return this.numerator < 0n && quotient * this.denominator !== this.numerator ? quotient - 1n : quotient;
  }

  /**
   * @returns "n/d", or "n" if the denominator is 1.
   */
  public toString(): string {
    return this.denominator === 1n ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
  }
}
