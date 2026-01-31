import { ComputationSystem } from "./computation-system";

/**
 * A facrtized number representation for Fractran computations.
 * 
 * if factors = [ { base: 2, exponent: 3 }, { base: 3, exponent: 1 } ]
 * then the represented number is 2^3 * 3^1 = 8 * 3 = 24
 * 
 * factors = [] means the number is 1
 */
export type FractranNumber = {
  factors: {
    base: number;
    exponent: number;
  }[];
}

function multiplyFractranNumbers(a: FractranNumber, b: FractranNumber): FractranNumber {
  const result: FractranNumber = { factors: [] };
  const factorMap: Map<number, number> = new Map();
  for (const factor of a.factors) {
    factorMap.set(factor.base, factor.exponent);
  }
  for (const factor of b.factors) {
    factorMap.set(factor.base, (factorMap.get(factor.base) || 0) + factor.exponent);
  }
  for (const [base, exponent] of factorMap.entries()) {
    result.factors.push({ base, exponent });
  }
  return result;
}

function divideFractranNumbers(a: FractranNumber, b: FractranNumber): FractranNumber | null {
  const result: FractranNumber = { factors: [] };
  const factorMap: Map<number, number> = new Map();
  for (const factor of a.factors) {
    factorMap.set(factor.base, factor.exponent);
  }
  for (const factor of b.factors) {
    const currentExponent = factorMap.get(factor.base) || 0;
    const newExponent = currentExponent - factor.exponent;
    if (newExponent < 0) {
      return null; // Division not possible
    }
    factorMap.set(factor.base, newExponent);
  }
  for (const [base, exponent] of factorMap.entries()) {
    if (exponent > 0) {
      result.factors.push({ base, exponent });
    }
  }
  return result;
}

export type FractranTuple = {
  program: readonly FractranFraction[];
}

export type FractranConfiguration = {
  input: FractranNumber;
}

export class FractranFraction {
  public numerator: FractranNumber;
  public denominator: FractranNumber;

  static fromNumbers(numerator: number, denominator: number): FractranFraction {
    return FractranFraction.fromFractranNumbers(
      toFractranNumber(numerator),
      toFractranNumber(denominator)
    );
  }
  static fromFractranNumbers(numerator: FractranNumber, denominator: FractranNumber): FractranFraction {
    return new FractranFraction(numerator, denominator);
  }

  private constructor(numerator: FractranNumber, denominator: FractranNumber) {
    this.numerator = numerator;
    this.denominator = denominator;

    this.simplifyFractranFraction(this);
  }

  public simplifyFractranFraction(n: FractranFraction): FractranFraction {
    const numeratorMap: Map<number, number> = new Map();
    const denominatorMap: Map<number, number> = new Map();

    // Build maps of factors
    for (const factor of n.numerator.factors) {
      numeratorMap.set(factor.base, factor.exponent);
    }
    for (const factor of n.denominator.factors) {
      denominatorMap.set(factor.base, factor.exponent);
    }

    // Cancel common factors
    for (const [base, numExp] of numeratorMap.entries()) {
      const denExp = denominatorMap.get(base);
      if (denExp !== undefined) {
        const minExp = Math.min(numExp, denExp);
        numeratorMap.set(base, numExp - minExp);
        denominatorMap.set(base, denExp - minExp);
      }
    }

    // Rebuild numerator and denominator
    n.numerator.factors = [];
    for (const [base, exponent] of numeratorMap.entries()) {
      if (exponent > 0) {
        n.numerator.factors.push({ base, exponent });
      }
    }

    n.denominator.factors = [];
    for (const [base, exponent] of denominatorMap.entries()) {
      if (exponent > 0) {
        n.denominator.factors.push({ base, exponent });
      }
    }

    return n;
  }
}

export function toFractranNumber(n: number): FractranNumber {
  const factors: FractranNumber = {
    factors: []
  };
  let num = n;

  for (let i = 2; i <= Math.sqrt(num); i++) {
    let count = 0;
    while (num % i === 0) {
      num /= i;
      count++;
    }
    if (count > 0) {
      factors.factors.push({ base: i, exponent: count });
    }
  }

  // If num is still greater than 1, it's a prime factor
  if (num > 1) {
    factors.factors.push({ base: num, exponent: 1 });
  }

  return factors;
}


export class Fractran implements ComputationSystem {
  program: readonly FractranFraction[];

  input: FractranNumber | null = null;

  constructor(program: readonly FractranFraction[]) {
    this.program = program;
  }

  getConfiguration(): FractranConfiguration | null {
    if (this.input === null){
        return null;
    }

    return {
      input: this.input as FractranNumber
    };
  }
  asTuple(): FractranTuple {
    return {
      program: this.program
    };
  }
  start(i: FractranNumber): void {
    this.input = i;
  }
  proceed(step: number): void {
    if (this.input === null) {
      throw new Error("Input number is not set.");
    }

    for (let s = 0; s < step; s++) {
      let progressed = false;
      for (const frac of this.program) {
        const divided = divideFractranNumbers(this.input, frac.denominator);
        if (divided !== null) {
          this.input = divided;
          const multiplied = multiplyFractranNumbers(divided, frac.numerator);
          this.input = multiplied;
          progressed = true;
          break;
        }
      }
      if (!progressed) {
        break;
      }
    }
  }

  isStopped(): boolean {
    if (this.input === null) {
      throw new Error("Input number is not set.");
    }
    for (const frac of this.program) {
      if (divideFractranNumbers(this.input, frac.denominator) !== null) {
        return false;
      }
    }
    return true;
  }
  clone(): ComputationSystem {
    const newFractran = new Fractran(this.program);
    if (this.input !== null) {
      newFractran.input = this.input;
    }
    return newFractran;
  }
}