import { Fractran, FractranConfiguration, FractranFraction, FractranNumber, FractranTuple, ITransformElement, MinskyRegisterMachine, MinskyRegisterMachineConfiguration, MinskyRegisterMachineTuple } from "../computation-system";
import { MinskyRegisterMachineToFractranTransformLog } from "../transform-log-types";

export class MinskyRegisterMachineToFractranTransformElement
  implements ITransformElement<MinskyRegisterMachine, Fractran, MinskyRegisterMachineToFractranTransformLog> {
  transformLog: MinskyRegisterMachineToFractranTransformLog | null = null;
  program: FractranFraction[] | null = null;

  interpretConfigration(real: FractranConfiguration | null): MinskyRegisterMachineConfiguration | null {
    if (real === null) {
      return null;
    }
    if (this.transformLog === null) {
      return null
    }

    let factors = real.input.factors
    // 命令に対応する素数が高々一つあり、それ以外はすべてレジスタに対応する素数である
    let registers: bigint[] = new Array(this.transformLog.primeCorrespondenceTable.filter(item => item.type === "register").length).fill(0).map(() => BigInt(0));
    let instructionPointer: number = -1;

    for (let factor of factors) {
      let correspondence = this.transformLog.primeCorrespondenceTable.find(item => item.prime === factor.base);
      if (correspondence === undefined) {
        continue;
      }
      if (correspondence.type === "register") {
        registers[correspondence.registerIndex] = BigInt(factor.exponent);
      } else if (correspondence.type === "instruction") {
        if (instructionPointer !== -1) {
          return null;
        }
        instructionPointer = correspondence.instructionIndex;
      }
    }

    if (instructionPointer === -1) {
      return null;
    }

    return {
      registers: registers,
      instructionPointer: instructionPointer
    };
  }
  interpretInput(virtual: { registers: bigint[]; }): FractranNumber {
    if (this.transformLog === null) {
      throw new Error("program is not bound.");
    }

    return {
      factors: virtual.registers.map((value, index) => {
        if (value > Number.MAX_SAFE_INTEGER) {
          throw new Error(`Register ${index} value exceeds safe integer range`);
        }
        return {
          base: this.transformLog!.primeCorrespondenceTable.find(item =>
            item.type === "register" && item.registerIndex === index)!.prime!,
          exponent: Number(value),
        };
      }).concat([{ 
        base: this.transformLog!.primeCorrespondenceTable.find(item => item.type === "instruction" && item.instructionIndex === 0)!.prime!, 
        exponent: 1 
      }]),
    }
  }
  bind(system: MinskyRegisterMachineTuple): void {
    let log: MinskyRegisterMachineToFractranTransformLog = {
      primeCorrespondenceTable: []
    };

    let primes = this.getPrimes(system.numberOfRegisters + system.program.length);

    let registers: {
      readonly type: "register";
      readonly registerIndex: number;
      readonly prime: number;
    }[] = new Array(system.numberOfRegisters).fill(0).map((_, index) => ({
      type: "register" as const,
      registerIndex: index,
      prime: primes[index],
    }));

    let instructions: {
      readonly type: "instruction";
      readonly instructionIndex: number;
      readonly prime: number;
      readonly fracs: FractranFraction[];
    }[] = new Array(system.program.length).fill(0).map((_, index) => {
      let instructionFracs: FractranFraction[] = [];
      let instruction = system.program[index];

      switch (instruction.type) {
        case "INC":
          instructionFracs.push(FractranFraction.fromFractranNumbers(
            {
              factors: [
                {
                  base: primes[instruction.register],
                  exponent: 1,
                },
                {
                  base: primes[system.numberOfRegisters + instruction.next],
                  exponent: 1,
                }
              ],
            },
            {
              factors: [{
                base: primes[system.numberOfRegisters + index],
                exponent: 1,
              }],
            },
          ));
          break;
        case "DEC":
          instructionFracs.push(FractranFraction.fromFractranNumbers(
            { factors: [{ base: primes[system.numberOfRegisters + instruction.nextIfNonZero], exponent: 1 }] },
            { factors: [
              { base: primes[system.numberOfRegisters + index], exponent: 1 },
              { base: primes[instruction.register], exponent: 1 }
            ] },
          ));
          instructionFracs.push(FractranFraction.fromFractranNumbers(
            { factors: [ { base: primes[system.numberOfRegisters + instruction.nextIfZero], exponent: 1 } ] },
            { factors: [{ base: primes[system.numberOfRegisters + index], exponent: 1 }]},
          )); 
          break;
        case "HALT":
          break;
      }

      return {
        type: "instruction" as const,
        instructionIndex: index,
        prime: primes[system.numberOfRegisters + index],
        fracs: instructionFracs,
      }
    });

    this.program = [];
    for (let instr of instructions) {
      this.program.push(...instr.fracs);
    }

    log.primeCorrespondenceTable = log.primeCorrespondenceTable.concat(registers).concat(instructions);

    this.transformLog = log;
  }
  asTuple(): FractranTuple | null {
    if (this.program === null) {
      return null;
    }

    return { program: this.program };
  }
  asIndependantSystem(): Fractran | null {
    if (this.program === null) {
      return null;
    }
    return new Fractran(this.program);
  }
  getTransFormLog(): MinskyRegisterMachineToFractranTransformLog | null {
    return this.transformLog;
  }

  private getPrimes(amount: number): number[] {
    let knownPrimes: number[] = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

    if (amount < knownPrimes.length) {
      return knownPrimes.slice(0, amount);
    }

    let primes: number[] = knownPrimes.slice();
    let candidate: number = knownPrimes[knownPrimes.length - 1] + 2;

    while (primes.length < amount) {
      let isPrime: boolean = true;
      for (let prime of primes) {
        if (prime * prime > candidate) {
          break;
        }
        if (candidate % prime === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) {
        primes.push(candidate);
      }
      candidate += 2;
    }
    return primes;
  }
}