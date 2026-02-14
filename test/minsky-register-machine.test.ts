import {
  MinskyRegisterMachine,
  MinskyRegisterMachineInstruction,
} from "../src/computation-system";

describe("MinskyRegisterMachine", () => {
  describe("Constructor", () => {
    it("should create a machine with valid parameters", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(2, program);
      expect(machine.numberOfRegisters).toBe(2);
      expect(machine.program).toEqual(program);
    });

    it("should throw error if number of registers is zero or negative", () => {
      const program: MinskyRegisterMachineInstruction[] = [{ type: "HALT" }];
      expect(() => new MinskyRegisterMachine(0, program)).toThrow("Number of registers must be positive");
      expect(() => new MinskyRegisterMachine(-1, program)).toThrow("Number of registers must be positive");
    });

    it("should throw error for invalid register index in INC instruction", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 2, next: 1 },
        { type: "HALT" },
      ];
      expect(() => new MinskyRegisterMachine(2, program)).toThrow("Invalid register index in INC instruction at 0");
    });

    it("should throw error for invalid next index in INC instruction", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 5 },
        { type: "HALT" },
      ];
      expect(() => new MinskyRegisterMachine(2, program)).toThrow("Invalid next instruction index in INC instruction at 0");
    });

    it("should throw error for invalid register index in DEC instruction", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 3, nextIfNonZero: 1, nextIfZero: 1 },
        { type: "HALT" },
      ];
      expect(() => new MinskyRegisterMachine(2, program)).toThrow("Invalid register index in DEC instruction at 0");
    });

    it("should throw error for invalid nextIfNonZero index in DEC instruction", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 0, nextIfNonZero: 10, nextIfZero: 1 },
        { type: "HALT" },
      ];
      expect(() => new MinskyRegisterMachine(2, program)).toThrow("Invalid nextIfNonZero instruction index in DEC instruction at 0");
    });

    it("should throw error for invalid nextIfZero index in DEC instruction", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 0, nextIfNonZero: 1, nextIfZero: 10 },
        { type: "HALT" },
      ];
      expect(() => new MinskyRegisterMachine(2, program)).toThrow("Invalid nextIfZero instruction index in DEC instruction at 0");
    });
  });

  describe("start", () => {
    it("should initialize registers with given values", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(3, program);
      machine.start({ registers: [BigInt(5), BigInt(10), BigInt(0)] });
      
      const config = machine.getConfiguration();
      expect(config.registers).toEqual([BigInt(5), BigInt(10), BigInt(0)]);
      expect(config.instructionPointer).toBe(0);
    });

    it("should throw error if register count does not match", () => {
      const program: MinskyRegisterMachineInstruction[] = [{ type: "HALT" }];
      const machine = new MinskyRegisterMachine(2, program);
      expect(() => machine.start({ registers: [BigInt(1)] })).toThrow("Invalid number of registers");
    });
  });

  describe("INC instruction", () => {
    it("should increment register and move to next instruction", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(2, program);
      machine.start({ registers: [BigInt(0), BigInt(0)] });
      machine.proceed(1);
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(1));
      expect(config.instructionPointer).toBe(1);
    });

    it("should handle multiple increments", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "INC", register: 0, next: 2 },
        { type: "INC", register: 1, next: 3 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(2, program);
      machine.start({ registers: [BigInt(0), BigInt(0)] });
      machine.proceed(3);
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(2));
      expect(config.registers[1]).toBe(BigInt(1));
      expect(config.instructionPointer).toBe(3);
    });
  });

  describe("DEC instruction", () => {
    it("should decrement non-zero register and jump to nextIfNonZero", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 0, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "HALT" },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(1, program);
      machine.start({ registers: [BigInt(5)] });
      machine.proceed(1);
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(4));
      expect(config.instructionPointer).toBe(1);
    });

    it("should not decrement zero register and jump to nextIfZero", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 0, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "HALT" },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(1, program);
      machine.start({ registers: [BigInt(0)] });
      machine.proceed(1);
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(0));
      expect(config.instructionPointer).toBe(2);
    });
  });

  describe("HALT instruction", () => {
    it("should stop execution on HALT", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(1, program);
      machine.start({ registers: [BigInt(0)] });
      machine.proceed(10); // Try to execute 10 steps
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(1)); // Only one increment should happen
      expect(machine.isStopped()).toBe(true);
    });
  });

  describe("Complex programs", () => {
    it("should add two numbers (R0 + R1 -> R0)", () => {
      // Program: Move R1 to R0
      // Loop: DEC R1, if non-zero: INC R0, goto Loop, else HALT
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 1, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "INC", register: 0, next: 0 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(2, program);
      machine.start({ registers: [BigInt(3), BigInt(5)] });
      
      while (!machine.isStopped()) {
        machine.proceed(1);
      }
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(8)); // 3 + 5
      expect(config.registers[1]).toBe(BigInt(0));
    });

    it("should copy register value (R0 -> R1 using R2 as temp)", () => {
      // Copy R0 to R1 using R2 as temporary storage
      const program: MinskyRegisterMachineInstruction[] = [
        // Loop1: Move R0 to R1 and R2
        { type: "DEC", register: 0, nextIfNonZero: 1, nextIfZero: 3 },
        { type: "INC", register: 1, next: 2 },
        { type: "INC", register: 2, next: 0 },
        // Loop2: Move R2 back to R0
        { type: "DEC", register: 2, nextIfNonZero: 4, nextIfZero: 5 },
        { type: "INC", register: 0, next: 3 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(3, program);
      machine.start({ registers: [BigInt(7), BigInt(0), BigInt(0)] });
      
      while (!machine.isStopped()) {
        machine.proceed(1);
      }
      
      const config = machine.getConfiguration();
      expect(config.registers[0]).toBe(BigInt(7));
      expect(config.registers[1]).toBe(BigInt(7));
      expect(config.registers[2]).toBe(BigInt(0));
    });
  });

  describe("isStopped", () => {
    it("should return false when not at HALT", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(1, program);
      machine.start({ registers: [BigInt(0)] });
      expect(machine.isStopped()).toBe(false);
    });

    it("should return true when at HALT", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(1, program);
      machine.start({ registers: [BigInt(0)] });
      machine.proceed(1);
      expect(machine.isStopped()).toBe(true);
    });

    it("should throw error if machine not started", () => {
      const program: MinskyRegisterMachineInstruction[] = [{ type: "HALT" }];
      const machine = new MinskyRegisterMachine(1, program);
      expect(() => machine.isStopped()).toThrow("Machine not started");
    });
  });

  describe("proceed", () => {
    it("should throw error if machine not started", () => {
      const program: MinskyRegisterMachineInstruction[] = [{ type: "HALT" }];
      const machine = new MinskyRegisterMachine(1, program);
      expect(() => machine.proceed(1)).toThrow("Machine not started");
    });
  });

  describe("getConfiguration", () => {
    it("should return current configuration", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(2, program);
      machine.start({ registers: [BigInt(5), BigInt(10)] });
      
      const config = machine.getConfiguration();
      expect(config.registers).toEqual([BigInt(5), BigInt(10)]);
      expect(config.instructionPointer).toBe(0);
    });

    it("should return independent copy of registers", () => {
      const program: MinskyRegisterMachineInstruction[] = [{ type: "HALT" }];
      const machine = new MinskyRegisterMachine(1, program);
      machine.start({ registers: [BigInt(5)] });
      
      const config1 = machine.getConfiguration();
      config1.registers[0] = BigInt(100);
      
      const config2 = machine.getConfiguration();
      expect(config2.registers[0]).toBe(BigInt(5)); // Should not be affected
    });
  });

  describe("asTuple", () => {
    it("should return machine tuple", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(3, program);
      
      const tuple = machine.asTuple();
      expect(tuple.program).toEqual(program);
      expect(tuple.numberOfRegisters).toBe(3);
    });

    it("should return independent copy of program", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine = new MinskyRegisterMachine(1, program);
      
      const tuple = machine.asTuple();
      // Modify the returned program
      (tuple.program as MinskyRegisterMachineInstruction[])[0] = { type: "HALT" };
      
      // Original should not be affected
      expect(machine.program[0].type).toBe("INC");
    });
  });

  describe("clone", () => {
    it("should create independent copy", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "INC", register: 0, next: 1 },
        { type: "HALT" },
      ];
      const machine1 = new MinskyRegisterMachine(2, program);
      machine1.start({ registers: [BigInt(5), BigInt(10)] });
      machine1.proceed(1);
      
      const machine2 = machine1.clone();
      machine2.start({ registers: [BigInt(0), BigInt(0)] });
      machine2.proceed(1);
      
      const config1 = machine1.getConfiguration();
      const config2 = machine2.getConfiguration();
      
      expect(config1.registers[0]).toBe(BigInt(6)); // Original
      expect(config2.registers[0]).toBe(BigInt(1)); // Clone
    });

    it("should have same program and number of registers", () => {
      const program: MinskyRegisterMachineInstruction[] = [
        { type: "DEC", register: 0, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "INC", register: 1, next: 0 },
        { type: "HALT" },
      ];
      const machine1 = new MinskyRegisterMachine(3, program);
      const machine2 = machine1.clone();
      
      expect(machine2.numberOfRegisters).toBe(3);
      expect(machine2.program).toEqual(program);
    });
  });
});
