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

    const factors = real.input.factors
    // 命令に対応する素数が高々一つあり、それ以外はすべてレジスタに対応する素数である
    const registers: bigint[] = new Array(this.transformLog.primeCorrespondenceTable.filter(item => item.type === "register").length).fill(0).map(() => BigInt(0));
    let instructionPointer = -1;

    for (const factor of factors) {
      const correspondence = this.transformLog.primeCorrespondenceTable.find(item => item.prime === factor.base);
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

    return new FractranNumber(
      virtual.registers.map((value, index) => {
        if (value > Number.MAX_SAFE_INTEGER) {
          throw new Error(`Register ${index} value exceeds safe integer range`);
        }
        return {
          base: this.transformLog!.primeCorrespondenceTable.find(item =>
            item.type === "register" && item.registerIndex === index)!.prime,
          exponent: Number(value),
        };
      }).concat([{ 
        base: this.transformLog.primeCorrespondenceTable.find(item => item.type === "instruction" && item.instructionIndex === 0)!.prime, 
        exponent: 1 
      }])
    );
  }
  bind(system: MinskyRegisterMachineTuple): void {
    const log: MinskyRegisterMachineToFractranTransformLog = {
      primeCorrespondenceTable: []
    };

    const primes = this.getPrimes(system.numberOfRegisters + system.program.length);

    const registers: {
      readonly type: "register";
      readonly registerIndex: number;
      readonly prime: number;
    }[] = new Array(system.numberOfRegisters).fill(0).map((_, index) => ({
      type: "register" as const,
      registerIndex: index,
      prime: primes[index],
    }));

    const instructions: {
      readonly type: "instruction";
      readonly instructionIndex: number;
      readonly prime: number;
      readonly fracs: FractranFraction[];
    }[] = new Array(system.program.length).fill(0).map((_, index) => {
      const instructionFracs: FractranFraction[] = [];
      const instruction = system.program[index];

      switch (instruction.type) {
        case "INC":
          instructionFracs.push(FractranFraction.fromFractranNumbers(
            new FractranNumber([
              {
                base: primes[instruction.register],
                exponent: 1,
              },
              {
                base: primes[system.numberOfRegisters + instruction.next],
                exponent: 1,
              }
            ]),
            new FractranNumber([{
              base: primes[system.numberOfRegisters + index],
              exponent: 1,
            }])
          ));
          break;
        case "DEC":
          instructionFracs.push(FractranFraction.fromFractranNumbers(
            new FractranNumber([{ base: primes[system.numberOfRegisters + instruction.nextIfNonZero], exponent: 1 }]),
            new FractranNumber([
              { base: primes[system.numberOfRegisters + index], exponent: 1 },
              { base: primes[instruction.register], exponent: 1 }
            ])
          ));
          instructionFracs.push(FractranFraction.fromFractranNumbers(
            new FractranNumber([{ base: primes[system.numberOfRegisters + instruction.nextIfZero], exponent: 1 }]),
            new FractranNumber([{ base: primes[system.numberOfRegisters + index], exponent: 1 }])
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
    for (const instr of instructions) {
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
    const knownPrimes: number[] = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

    if (amount < knownPrimes.length) {
      return knownPrimes.slice(0, amount);
    }

    const primes: number[] = knownPrimes.slice();
    let candidate: number = knownPrimes[knownPrimes.length - 1] + 2;

    while (primes.length < amount) {
      let isPrime = true;
      for (const prime of primes) {
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