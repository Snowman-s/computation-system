import { 
  Fractran, 
  FractranFraction, 
  toFractranNumber,
  FractranNumber
} from "../src/fractran";

describe("factorizeToFractranNumber", () => {
  it("should factorize prime numbers", () => {
    const result = toFractranNumber(2);
    expect(result.factors).toEqual([{ base: 2, exponent: 1 }]);
  });

  it("should factorize composite numbers", () => {
    const result = toFractranNumber(6);
    expect(result.factors).toEqual([
      { base: 2, exponent: 1 },
      { base: 3, exponent: 1 }
    ]);
  });

  it("should handle numbers with repeated prime factors", () => {
    const result = toFractranNumber(8);
    expect(result.factors).toEqual([{ base: 2, exponent: 3 }]);
  });

  it("should factorize complex numbers", () => {
    const result = toFractranNumber(24);
    expect(result.factors).toEqual([
      { base: 2, exponent: 3 },
      { base: 3, exponent: 1 }
    ]);
  });

  it("should handle 1 as empty factors", () => {
    const result = toFractranNumber(1);
    expect(result.factors).toEqual([]);
  });

  it("should factorize larger primes", () => {
    const result = toFractranNumber(13);
    expect(result.factors).toEqual([{ base: 13, exponent: 1 }]);
  });
});

describe("FractranFraction", () => {
  describe("fromNumbers", () => {
    it("should create fraction from two numbers", () => {
      const frac = FractranFraction.fromNumbers(3, 2);
      expect(frac.numerator.factors).toEqual([{ base: 3, exponent: 1 }]);
      expect(frac.denominator.factors).toEqual([{ base: 2, exponent: 1 }]);
    });

    it("should simplify fractions with common factors", () => {
      const frac = FractranFraction.fromNumbers(6, 4); // 6/4 = 3/2
      expect(frac.numerator.factors).toEqual([{ base: 3, exponent: 1 }]);
      expect(frac.denominator.factors).toEqual([{ base: 2, exponent: 1 }]);
    });

    it("should handle fractions that reduce to integers", () => {
      const frac = FractranFraction.fromNumbers(6, 3); // 6/3 = 2/1
      expect(frac.numerator.factors).toEqual([{ base: 2, exponent: 1 }]);
      expect(frac.denominator.factors).toEqual([]);
    });
  });

  describe("fromFractranNumbers", () => {
    it("should create fraction from FractranNumbers", () => {
      const num: FractranNumber = { factors: [{ base: 2, exponent: 2 }] };
      const den: FractranNumber = { factors: [{ base: 3, exponent: 1 }] };
      const frac = FractranFraction.fromFractranNumbers(num, den);
      
      expect(frac.numerator.factors).toEqual([{ base: 2, exponent: 2 }]);
      expect(frac.denominator.factors).toEqual([{ base: 3, exponent: 1 }]);
    });
  });

  describe("simplifyFractranFraction", () => {
    it("should simplify fractions with common prime factors", () => {
      const num: FractranNumber = { factors: [{ base: 2, exponent: 3 }, { base: 3, exponent: 2 }] };
      const den: FractranNumber = { factors: [{ base: 2, exponent: 1 }, { base: 3, exponent: 2 }] };
      const frac = FractranFraction.fromFractranNumbers(num, den);
      
      // 2^3 * 3^2 / (2 * 3^2) = 2^2 / 1 = 4/1
      expect(frac.numerator.factors).toEqual([{ base: 2, exponent: 2 }]);
      expect(frac.denominator.factors).toEqual([]);
    });
  });
});

describe("Fractran", () => {
  describe("constructor and basic methods", () => {
    it("should create Fractran instance with program", () => {
      const program = [
        FractranFraction.fromNumbers(3, 2)
      ];
      const fractran = new Fractran(program);
      
      expect(fractran.program).toEqual(program);
    });

    it("should get configuration", () => {
      const program = [
        FractranFraction.fromNumbers(3, 2)
      ];
      const fractran = new Fractran(program);
      const config = fractran.getConfiguration();
      
      expect(config).toBeNull();
    });

    it("should return tuple representation", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      const tuple = fractran.asTuple();
      expect(tuple.program).toEqual(program);
    });
  });

  describe("start", () => {
    it("should set initial input", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      const input: FractranNumber = { factors: [{ base: 2, exponent: 1 }] };
      
      fractran.start(input);
      
      expect(fractran.getConfiguration()?.input).toEqual(input);
    });
  });

  describe("proceed", () => {
    it("should throw error if input not set", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      expect(() => fractran.proceed(1)).toThrow("Input number is not set.");
    });

    it("should apply first matching fraction", () => {
      // Program: 3/2 (multiply by 3/2 if divisible by 2)
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      // Start with 2: 2 * 3/2 = 3
      fractran.start(toFractranNumber(2));
      fractran.proceed(1);
      
      const result = fractran.getConfiguration()?.input;
      expect(result?.factors).toEqual([{ base: 3, exponent: 1 }]);
    });

    it("should stop when no fraction matches", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      // Start with 3 (not divisible by 2)
      fractran.start(toFractranNumber(3));
      fractran.proceed(10);
      
      // Should remain 3
      const result = fractran.getConfiguration()?.input;
      expect(result?.factors).toEqual([{ base: 3, exponent: 1 }]);
    });

    it("should execute multiple steps", () => {
      // Program: 3/2 (multiply by 3/2 if divisible by 2)
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      // Start with 4 = 2^2: 4 * 3/2 = 6, 6 * 3/2 = 9
      fractran.start(toFractranNumber(4));
      fractran.proceed(2);
      
      const result = fractran.getConfiguration()?.input;
      // After 2 steps: 2^2 -> 2 * 3 -> 3^2
      expect(result?.factors).toEqual([{ base: 3, exponent: 2 }]);
    });

    it("should try fractions in order", () => {
      // Program: 5/2, 3/2
      const program = [
        FractranFraction.fromNumbers(5, 2),
        FractranFraction.fromNumbers(3, 2)
      ];
      const fractran = new Fractran(program);
      
      // Start with 2
      fractran.start(toFractranNumber(2));
      fractran.proceed(1);
      
      // Should apply first fraction: 2 * 5/2 = 5
      const result = fractran.getConfiguration()?.input;
      expect(result?.factors).toEqual([{ base: 5, exponent: 1 }]);
    });
  });

  describe("isStopped", () => {
    it("should throw error if input not set", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      expect(() => fractran.isStopped()).toThrow("Input number is not set.");
    });

    it("should return false when computation can continue", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      fractran.start(toFractranNumber(2));
      
      expect(fractran.isStopped()).toBe(false);
    });

    it("should return true when no fraction can be applied", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      fractran.start(toFractranNumber(3));
      
      expect(fractran.isStopped()).toBe(true);
    });
  });

  describe("clone", () => {
    it("should create independent copy of Fractran instance", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      fractran.start(toFractranNumber(2));
      
      const cloned = fractran.clone() as Fractran;
      
      // Advance original
      fractran.proceed(1);
      
      // Clone should still have original input
      expect(cloned.getConfiguration()?.input).toEqual(toFractranNumber(2));
      expect(fractran.getConfiguration()?.input).not.toEqual(cloned.getConfiguration()?.input);
    });

    it("should clone without input", () => {
      const program = [FractranFraction.fromNumbers(3, 2)];
      const fractran = new Fractran(program);
      
      const cloned = fractran.clone() as Fractran;
      
      expect(cloned.getConfiguration()).toBeNull();
    });
  });

  describe("Conway's FRACTRAN programs", () => {
    it("should execute addition program (2 + 3 = 5)", () => {
      // Conway's addition: Input 2^a * 3^b produces 5^(a+b)
      const program = [
        FractranFraction.fromNumbers(5, 2),
        FractranFraction.fromNumbers(5, 3),
      ];
      const fractran = new Fractran(program);
      
      // Start with 2^2 * 3^3 = 4 * 27 = 108 (represents 2 + 3)
      const input: FractranNumber = {
        factors: [
          { base: 2, exponent: 2 },
          { base: 3, exponent: 3 }
        ]
      };
      fractran.start(input);
      fractran.proceed(100);
      
      const result = fractran.getConfiguration()?.input;
      // After min(2,3)=2 steps: 2^2 * 3^3 -> 2^1 * 3^2 * 5 -> 3 * 5^2
      // Stops when either 2 or 3 runs out
      expect(result?.factors).toContainEqual({ base: 5, exponent: 5 });
      expect(fractran.isStopped()).toBe(true);
    });

    it("should execute Conway's prime generator (first steps)", () => {
      // Conway's prime generator (simplified first few fractions)
      // Full program: 17/91, 78/85, 19/51, 23/38, 29/33, 77/29, 95/23, 77/19, 1/17, 11/13, 13/11, 15/14, 15/2, 55/1
      const program = [
        FractranFraction.fromNumbers(17, 91),
        FractranFraction.fromNumbers(78, 85),
        FractranFraction.fromNumbers(19, 51),
        FractranFraction.fromNumbers(23, 38),
        FractranFraction.fromNumbers(29, 33),
        FractranFraction.fromNumbers(77, 29),
        FractranFraction.fromNumbers(95, 23),
        FractranFraction.fromNumbers(77, 19),
        FractranFraction.fromNumbers(1, 17),
        FractranFraction.fromNumbers(11, 13),
        FractranFraction.fromNumbers(13, 11),
        FractranFraction.fromNumbers(15, 14),
        FractranFraction.fromNumbers(15, 2),
        FractranFraction.fromNumbers(55, 1)
      ];
      const fractran = new Fractran(program);
      // Conway's FRACTRAN generates primes in order: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, ...
      const expectedPrimes: number[] = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
      const foundPrimes: number[] = [];

      // Start with 2
      fractran.start(toFractranNumber(2));
      for (let i = 0; i < 50000 && foundPrimes.length < expectedPrimes.length; i++) {
        fractran.proceed(1);
        // if current input only has factor 2^k, it should produce next prime
        const currentInput = fractran.getConfiguration()?.input;
        if (currentInput && currentInput.factors.length === 1 && currentInput.factors[0].base === 2) {
          const exponent = currentInput.factors[0].exponent;
          foundPrimes.push(exponent);
        }
      }
      
      expect(foundPrimes).toEqual(expectedPrimes);
    });

    it("should execute multi-step transformation", () => {
      // Program: [7/3, 3/2]
      // Starting with 6 = 2 * 3: 
      //   6 * 7/3 = 14 = 2 * 7 (first fraction applies)
      //   14 * 3/2 = 21 = 3 * 7 (second fraction applies) 
      //   21 * 7/3 = 49 = 7^2 (first fraction applies again)
      //   49 cannot be transformed (stopped)
      const program = [
        FractranFraction.fromNumbers(7, 3),
        FractranFraction.fromNumbers(3, 2)
      ];
      const fractran = new Fractran(program);
      
      // Start with 6 = 2 * 3
      const input: FractranNumber = {
        factors: [
          { base: 2, exponent: 1 },
          { base: 3, exponent: 1 }
        ]
      };
      fractran.start(input);
      
      // Run until stopped
      fractran.proceed(100);
      
      const result = fractran.getConfiguration()?.input;
      // Expected: 49 = 7^2
      expect(result?.factors).toEqual([{ base: 7, exponent: 2 }]);
      expect(fractran.isStopped()).toBe(true);
    });
  });
});
