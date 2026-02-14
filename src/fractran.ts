import { ComputationSystem } from "./computation-system";

/**
 * A factorized number representation for Fractran computations.
 * 
 * if factors = [ { base: 2, exponent: 3 }, { base: 3, exponent: 1 } ]
 * then the represented number is 2^3 * 3^1 = 8 * 3 = 24
 * 
 * factors = [] means the number is 1
 */
export class FractranNumber {
  public factors: {
    base: number;
    exponent: number;
  }[];

  constructor(factors: { base: number; exponent: number; }[]) {
    this.factors = factors;
    this.simplify();
  }

  private simplify(): void {
    const factorMap: Map<number, number> = new Map();
    for (const factor of this.factors) {
      if (factor.base === 1) {
        continue; // Skip factors of 1
      } else if (factor.base <= 0) {
        throw new Error(`Invalid factor base: ${factor.base}. Base must be a positive integer.`);
      }
      if (factor.exponent < 0) {
        throw new Error(`Invalid factor exponent: ${factor.exponent}. Exponent must be a non-negative integer.`);
      }
      factorMap.set(factor.base, (factorMap.get(factor.base) || 0) + factor.exponent);
    }
    this.factors = [];
    for (const [base, exponent] of factorMap.entries()) {
      if (exponent > 0) {
        this.factors.push({ base, exponent });
      }
    }
  }

  /**
   * Creates a FractranNumber from a regular number by computing its prime factorization.
   * 
   * @param n - The number to convert (must be a positive integer)
   * @returns The FractranNumber representation with prime factorization
   */
  public static fromNumber(n: number): FractranNumber {
    const factors: { base: number; exponent: number; }[] = [];
    let num = n;

    for (let i = 2; i <= Math.sqrt(num); i++) {
      let count = 0;
      while (num % i === 0) {
        num /= i;
        count++;
      }
      if (count > 0) {
        factors.push({ base: i, exponent: count });
      }
    }

    // If num is still greater than 1, it's a prime factor
    if (num > 1) {
      factors.push({ base: num, exponent: 1 });
    }

    return new FractranNumber(factors);
  }

  /**
   * Multiplies this Fractran number with another by combining their prime factorizations.
   * 
   * @param other - The Fractran number to multiply with
   * @returns The product as a new FractranNumber
   */
  public multiply(other: FractranNumber): FractranNumber {
    const factorMap: Map<number, number> = new Map();
    for (const factor of this.factors) {
      factorMap.set(factor.base, factor.exponent);
    }
    for (const factor of other.factors) {
      factorMap.set(factor.base, (factorMap.get(factor.base) || 0) + factor.exponent);
    }
    const resultFactors: { base: number; exponent: number; }[] = [];
    for (const [base, exponent] of factorMap.entries()) {
      if (base === 1) {
        continue; 
      }
      resultFactors.push({ base, exponent });
    }
    return new FractranNumber(resultFactors);
  }

  /**
   * Divides this Fractran number by another by subtracting exponents in their prime factorizations.
   * 
   * @param other - The divisor
   * @returns The quotient if division is exact (no remainder), or null if division is not possible
   */
  public divide(other: FractranNumber): FractranNumber | null {
    const factorMap: Map<number, number> = new Map();
    for (const factor of this.factors) {
      factorMap.set(factor.base, factor.exponent);
    }
    for (const factor of other.factors) {
      const currentExponent = factorMap.get(factor.base) || 0;
      const newExponent = currentExponent - factor.exponent;
      if (newExponent < 0) {
        return null; // Division not possible
      }
      factorMap.set(factor.base, newExponent);
    }
    const resultFactors: { base: number; exponent: number; }[] = [];
    for (const [base, exponent] of factorMap.entries()) {
      if (exponent > 0) {
        resultFactors.push({ base, exponent });
      }
    }
    return new FractranNumber(resultFactors);
  }

  /**
   * Checks if this Fractran number equals another by comparing their prime factorizations.
   * 
   * @param other - The Fractran number to compare with
   * @returns True if the numbers are equal, false otherwise
   */
  public equals(other: FractranNumber): boolean {
    if (this.factors.length !== other.factors.length) {
      return false;
    }
    const factorMap: Map<number, number> = new Map();
    for (const factor of this.factors) {
      factorMap.set(factor.base, factor.exponent);
    }
    for (const factor of other.factors) {
      const exp = factorMap.get(factor.base);
      factorMap.delete(factor.base);
      if (exp === undefined || exp !== factor.exponent) {
        return false;
      }
    }

    return factorMap.size === 0;
  }
}

/**
 * Represents a Fractran program as a tuple containing a list of fractions.
 */
export type FractranTuple = {
  program: readonly FractranFraction[];
}

/**
 * Represents the current configuration of a Fractran computation.
 */
export type FractranConfiguration = {
  input: FractranNumber;
}

/**
 * Represents a fraction in a Fractran program with numerator and denominator as factorized numbers.
 * Fractions are automatically simplified upon construction.
 */
export class FractranFraction {
  public numerator: FractranNumber;
  public denominator: FractranNumber;

  /**
   * Creates a FractranFraction from regular numbers.
   * 
   * @param numerator - The numerator as a regular number
   * @param denominator - The denominator as a regular number
   * @returns A new FractranFraction with simplified numerator and denominator
   */
  public static fromNumbers(numerator: number, denominator: number): FractranFraction {
    return FractranFraction.fromFractranNumbers(
      FractranNumber.fromNumber(numerator),
      FractranNumber.fromNumber(denominator)
    );
  }
  
  /**
   * Creates a FractranFraction from Fractran numbers.
   * 
   * @param numerator - The numerator as a FractranNumber
   * @param denominator - The denominator as a FractranNumber
   * @returns A new FractranFraction with simplified numerator and denominator
   */
  public static fromFractranNumbers(numerator: FractranNumber, denominator: FractranNumber): FractranFraction {
    return new FractranFraction(numerator, denominator);
  }

  private constructor(numerator: FractranNumber, denominator: FractranNumber) {
    this.numerator = numerator;
    this.denominator = denominator;

    this.simplify();
  }

  /**
   * Simplifies the fraction by canceling out common factors between the numerator and denominator.
   * Modifies the fraction in place.
   */
  public simplify(): void {
    const numeratorMap: Map<number, number> = new Map();
    const denominatorMap: Map<number, number> = new Map();

    // Build maps of factors
    for (const factor of this.numerator.factors) {
      numeratorMap.set(factor.base, factor.exponent);
    }
    for (const factor of this.denominator.factors) {
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
    this.numerator.factors = [];
    for (const [base, exponent] of numeratorMap.entries()) {
      if (exponent > 0) {
        this.numerator.factors.push({ base, exponent });
      }
    }

    this.denominator.factors = [];
    for (const [base, exponent] of denominatorMap.entries()) {
      if (exponent > 0) {
        this.denominator.factors.push({ base, exponent });
      }
    }
  }
}



/**
 * Implements the Fractran computation system, a Turing-complete esoteric programming language
 * invented by John Conway. The program consists of a list of fractions, and computation proceeds
 * by multiplying the current number by the first fraction whose denominator divides it.
 */
export class Fractran implements ComputationSystem {
  program: readonly FractranFraction[];

  input: FractranNumber | null = null;

  constructor(program: readonly FractranFraction[]) {
    this.program = program;
  }

  /**
   * Gets the current configuration of the Fractran computation.
   * 
   * @returns The current configuration containing the input number, or null if not started
   */
  getConfiguration(): FractranConfiguration | null {
    if (this.input === null){
        return null;
    }

    return {
      input: this.input as FractranNumber
    };
  }
  
  /**
   * Returns the Fractran program as a tuple.
   * 
   * @returns A tuple containing the program's fractions
   */
  asTuple(): FractranTuple {
    return {
      program: this.program
    };
  }
  
  /**
   * Starts the Fractran computation with the given input number.
   * 
   * @param i - The initial input number for the computation
   */
  start(i: FractranNumber): void {
    this.input = i;
  }
  
  /**
   * Executes the specified number of computation steps.
   * Stops early if the computation halts before completing all steps.
   * 
   * @param step - The number of steps to execute
   * @throws {Error} If the input number is not set
   */
  proceed(step: number): void {
    if (this.input === null) {
      throw new Error("Input number is not set.");
    }

    for (let s = 0; s < step; s++) {
      let progressed = false;
      for (const frac of this.program) {
        const divided: FractranNumber | null = this.input!.divide(frac.denominator);
        if (divided !== null) {
          this.input = divided.multiply(frac.numerator);
          progressed = true;
          break;
        }
      }
      if (!progressed) {
        break;
      }
    }
  }

  /**
   * Checks if the computation has halted.
   * The computation halts when no fraction in the program can divide the current number.
   * 
   * @returns True if the computation has halted, false otherwise
   * @throws {Error} If the input number is not set
   */
  isStopped(): boolean {
    if (this.input === null) {
      throw new Error("Input number is not set.");
    }
    for (const frac of this.program) {
      if (this.input!.divide(frac.denominator) !== null) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Creates a deep copy of this Fractran computation system.
   * 
   * @returns A new Fractran instance with the same program and current state
   */
  clone(): ComputationSystem {
    const newFractran = new Fractran(this.program);
    if (this.input !== null) {
      newFractran.input = new FractranNumber(
        this.input.factors.map(factor => ({ ...factor }))
      );
    }
    return newFractran;
  }
}