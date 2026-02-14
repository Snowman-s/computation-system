import { ComputationSystem } from "./computation-system";

/**
 * Instructions for the Minsky Register Machine.
 * INC increments a register and moves to the next instruction.
 * DEC decrements a register if non-zero and branches accordingly.
 * HALT stops the computation.
 */
export type MinskyRegisterMachineInstruction = 
    | { type: "INC"; register: number; next: number }
    | { type: "DEC"; register: number; nextIfNonZero: number; nextIfZero: number }
    | { type: "HALT" };

/**
 * Represents a Minsky Register Machine program as a tuple containing the program and number of registers.
 */
export type MinskyRegisterMachineTuple = {
    readonly program: readonly MinskyRegisterMachineInstruction[];
    readonly numberOfRegisters: number;
}

/**
 * Represents the current configuration of a Minsky Register Machine computation.
 */
export type MinskyRegisterMachineConfiguration = {
    readonly registers: bigint[];
    readonly instructionPointer: number;
}

/**
 * Implements the Minsky Register Machine, a Turing-complete computation model
 * that operates on a finite number of registers containing non-negative integers.
 * Programs consist of increment, decrement-and-branch, and halt instructions.
 */
export class MinskyRegisterMachine implements ComputationSystem {
    numberOfRegisters: number;
    registers: bigint[] = [];
    program: MinskyRegisterMachineInstruction[] = [];
    instructionPointer: number = 0;

    /**
     * Creates a new Minsky Register Machine with the specified number of registers and program.
     * Validates that all register indices and instruction pointers in the program are within bounds.
     * 
     * @param n - The number of registers (must be positive)
     * @param program - The list of instructions for the machine
     * @throws {Error} If the number of registers is not positive or if the program contains invalid instructions
     */
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

    /**
     * Gets the current configuration of the machine.
     * 
     * @returns The current configuration containing register values and instruction pointer
     */
    getConfiguration(): MinskyRegisterMachineConfiguration {
        return {
            registers: [...this.registers],
            instructionPointer: this.instructionPointer
        };
    }
    
    /**
     * Returns the machine program as a tuple.
     * 
     * @returns A tuple containing the program and number of registers
     */
    asTuple(): MinskyRegisterMachineTuple {
        return {
            program: [...this.program],
            numberOfRegisters: this.numberOfRegisters
        };
    }
    
    /**
     * Starts the machine with the specified initial register values.
     * The instruction pointer is set to 0.
     * 
     * @param args - Object containing the initial register values as bigints
     * @throws {Error} If the number of registers provided does not match the machine's register count
     */
    start(args: {registers: bigint[]}): void {
        if (args.registers.length !== this.numberOfRegisters) {
            throw new Error("Invalid number of registers");
        }
        this.registers = [...args.registers];
        this.instructionPointer = 0;
    }
    
    /**
     * Executes the specified number of computation steps.
     * Stops early if a HALT instruction is encountered.
     * 
     * @param step - The number of steps to execute
     * @throws {Error} If the machine has not been started or encounters an unknown instruction
     */
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
    
    /**
     * Checks if the computation has halted.
     * 
     * @returns True if the current instruction is HALT, false otherwise
     * @throws {Error} If the machine has not been started
     */
    isStopped(): boolean {
        if (this.registers.length === 0) {
            throw new Error("Machine not started");
        }

        return this.program[this.instructionPointer].type === "HALT";
    }
    
    /**
     * Creates a copy of this Minsky Register Machine.
     * The copy has the same program and register count, but registers are not initialized.
     * 
     * @returns A new MinskyRegisterMachine instance with the same program
     */
    clone(): MinskyRegisterMachine {
        return new MinskyRegisterMachine(this.numberOfRegisters, [...this.program]);
    }    
}