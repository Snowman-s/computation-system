import { ComputationSystem } from "./computation-system";

export type MinskyRegisterMachineInstruction = 
    | { type: "INC"; register: number; next: number }
    | { type: "DEC"; register: number; nextIfNonZero: number; nextIfZero: number }
    | { type: "HALT" };

export type MinskyRegisterMachineTuple = {
    readonly program: readonly MinskyRegisterMachineInstruction[];
    readonly numberOfRegisters: number;
}

export type MinskyRegisterMachineConfiguration = {
    readonly registers: bigint[];
    readonly instructionPointer: number;
}

export class MinskyRegisterMachine implements ComputationSystem {
    numberOfRegisters: number;
    registers: bigint[] = [];
    program: MinskyRegisterMachineInstruction[] = [];
    instructionPointer: number = 0;

    public constructor(n: number, program: MinskyRegisterMachineInstruction[]) {
        if (n <= 0) {
            throw new Error("Number of registers must be positive");
        }

        this.numberOfRegisters = n;
        this.program = program;
        //start 時点で初期化するのでここでは不要
        //this.registers = new Array<bigint>(n).fill(BigInt(0));

        // check program validity
        let programLength = program.length;
        for (let i = 0; i < programLength; i++) {
            let instr = program[i];
            switch (instr.type) {
                case "INC":
                    if (instr.register < 0 || instr.register >= n) {
                        throw new Error(`Invalid register index in INC instruction at ${i}`);
                    }
                    if (instr.next < 0 || instr.next >= programLength) {
                        throw new Error(`Invalid next instruction index in INC instruction at ${i}`);
                    }
                    break;
                case "DEC":
                    if (instr.register < 0 || instr.register >= n) {
                        throw new Error(`Invalid register index in DEC instruction at ${i}`);
                    }
                    if (instr.nextIfNonZero < 0 || instr.nextIfNonZero >= programLength) {
                        throw new Error(`Invalid nextIfNonZero instruction index in DEC instruction at ${i}`);
                    }
                    if (instr.nextIfZero < 0 || instr.nextIfZero >= programLength) {
                        throw new Error(`Invalid nextIfZero instruction index in DEC instruction at ${i}`);
                    }
                    break;
                case "HALT":
                    // No validation needed for HALT
                    break;
                default:
                    throw new Error(`Unknown instruction type at ${i}`);
            }
        }
    }

    getConfiguration(): MinskyRegisterMachineConfiguration {
        return {
            registers: [...this.registers],
            instructionPointer: this.instructionPointer
        };
    }
    asTuple(): MinskyRegisterMachineTuple {
        return {
            program: [...this.program],
            numberOfRegisters: this.numberOfRegisters
        };
    }
    start(args: {registers: bigint[]}): void {
        if (args.registers.length !== this.numberOfRegisters) {
            throw new Error("Invalid number of registers");
        }
        this.registers = [...args.registers];
        this.instructionPointer = 0;
    }
    proceed(step: number): void {
        if (this.registers.length === 0) {
            throw new Error("Machine not started");
        }

        for (let s = 0; s < step; s++) {
            let targetProgram = this.program[this.instructionPointer];
            switch (targetProgram.type) {
                case "INC":
                    this.registers[targetProgram.register]++;
                    this.instructionPointer = targetProgram.next;
                    break;
                case "DEC":
                    if (this.registers[targetProgram.register] > BigInt(0)) {
                        this.registers[targetProgram.register]--;
                        this.instructionPointer = targetProgram.nextIfNonZero;
                    } else {
                        this.instructionPointer = targetProgram.nextIfZero;
                    }
                    break;
                case "HALT":
                    return;
                default:
                    throw new Error(`Unknown instruction type at ${this.instructionPointer}`);
            }
        }
    }
    isStopped(): boolean {
        if (this.registers.length === 0) {
            throw new Error("Machine not started");
        }

        return this.program[this.instructionPointer].type === "HALT";
    }
    clone(): MinskyRegisterMachine {
        return new MinskyRegisterMachine(this.numberOfRegisters, [...this.program]);
    }    
}