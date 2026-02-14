import {
  TuringMachine,
  TMState,
  TMSymbol,
  TMConfiguration,
  TMRuleSet,
  TMTape,
} from "../turing-machine";
import {
  MinskyRegisterMachine,
  MinskyRegisterMachineConfiguration,
  MinskyRegisterMachineInstruction,
  MinskyRegisterMachineTuple,
} from "../computation-system";
import { ITransformElement } from "../converter";
import { TuringMachine2SymbolToMinskyRegisterMachineTransformLog } from "../transform-log-types";

export class TuringMachine2SymbolToMinskyRegisterMachineTransformElement
  implements
    ITransformElement<
      TuringMachine,
      MinskyRegisterMachine,
      TuringMachine2SymbolToMinskyRegisterMachineTransformLog
    >
{
  transformLog: TuringMachine2SymbolToMinskyRegisterMachineTransformLog | null = null;

  bind(system: {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  }): void {
    let programs: MinskyRegisterMachineInstruction[] = [];
    let instructionNumber = (delta = 0) => programs.length + delta;
    let states: Map<TMState, {
      stateNumber: number;
      instructionNumber: number;
    }> = new Map();
    let stateList: TMState[] = Array.from(system.stateSet);
    stateList.forEach((state, index) => {
      states.set(state, {
        stateNumber: index,
        instructionNumber: -1,
      });
    });
    let symbolList: TMSymbol[] = Array.from(system.symbolSet);
    if (symbolList.length !== 2) {
      throw new Error("This converter only supports 2-symbol Turing Machines.");
    }
    let [symbol0, symbol1] = symbolList;
    if (system.blankSymbol !== symbol0) {
      symbol1 = symbol0;
      symbol0 = system.blankSymbol;
    }

    // レジスタ
    let [A, M, N, Z] = [0, 1, 2, 3];

    let shouldResolveAfterAllStates: (() => void)[] = [];

    for(let s of stateList) {
      const startingInstructionNumber = instructionNumber();
      states.get(s)!.instructionNumber = startingInstructionNumber;
      if (s === system.acceptState) {
        // 受理状態の場合、処理を終了する命令を追加
        programs.push({ type: "HALT" });
        continue;
      }

      // FIXME: to be filled later
      // 0 -> 1 の順
      let firstProgram = { type: "DEC" as const, register: A, nextIfNonZero: -1, nextIfZero: instructionNumber(1) };
      programs.push(firstProgram);

      for(let symbol of [symbol0, symbol1]) {
        if (symbol === symbol1) {
          firstProgram.nextIfNonZero = instructionNumber();
        } 

        let rules = system.ruleset.getCandinates(s, symbol);
        if (rules.length !== 1) {
          throw new Error(`State ${s.value} has ${rules.length} rules for symbol ${symbol.value}, expected exactly 1.`);
        }
        let rule = rules[0];
        if (rule.move === "HALT") {
          programs.push({ type: "HALT" });
          continue;
        } 
        
        // ヘッダが逆方向に動くことで、結果として値が増える方のレジスタ
        let iMN = rule.move === "L" ? N : M;
        // ヘッダがその方向に動くことで、結果として値が減る方のレジスタ
        let dMN = rule.move === "L" ? M : N;

        // z <- 2 * i
        programs.push({ type: "DEC", register: iMN, nextIfNonZero: instructionNumber(1), nextIfZero: instructionNumber(3) });
        programs.push({ type: "INC", register: Z, next: instructionNumber(1) });
        programs.push({ type: "INC", register: Z, next: instructionNumber(-2) });
 
        // z <- z + 1, if we write symbol1
        if (rule.write === symbol1) {
          programs.push({ type: "INC", register: Z, next: instructionNumber(1) });
        }

        // i <- z
        programs.push({ type: "DEC", register: Z, nextIfNonZero: instructionNumber(1), nextIfZero: instructionNumber(2) });
        programs.push({ type: "INC", register: iMN, next: instructionNumber(-1) });

        // z <- d / 2, a <- d の1桁目
        programs.push({ type: "DEC", register: A, nextIfNonZero: instructionNumber(), nextIfZero: instructionNumber(1) });
        programs.push({ type: "DEC", register: dMN, nextIfNonZero: instructionNumber(1), nextIfZero: instructionNumber(4) });
        programs.push({ type: "INC", register: A, next: instructionNumber(1) });
        programs.push({ type: "DEC", register: dMN, nextIfNonZero: instructionNumber(1), nextIfZero: instructionNumber(2) });
        programs.push({ type: "INC", register: Z, next: instructionNumber(-4) });

        // d <- z
        const decInstruction = { type: "DEC" as const, register: Z, nextIfNonZero: instructionNumber(1), nextIfZero: -1 };
        const incInstruction = { type: "INC" as const, register: dMN, next: instructionNumber(-1) };
        programs.push(decInstruction);
        programs.push(incInstruction);

        // 次の状態へ移動 (終わり)
        shouldResolveAfterAllStates.push(() => {
          let nextStateInfo = states.get(rule.nextState);
          if (nextStateInfo === undefined) {
            throw new Error(`Next state ${rule.nextState.value} is not defined.`);
          }
          decInstruction.nextIfZero = nextStateInfo.instructionNumber;
          incInstruction.next = nextStateInfo.instructionNumber;
        });
      }
    }
    
    shouldResolveAfterAllStates.forEach(resolve => resolve());

    this.transformLog = {
      states,
      symbol0,
      symbol1,
      programs,
    };
  }

  interpretConfigration(real: MinskyRegisterMachineConfiguration | null): TMConfiguration | null {
    if (this.transformLog === null) {
      return null;
    }

    if (real === null) {
      return null;
    }

    let nowStatesEntry = Array.from(this.transformLog.states.entries()).find(([_, v]) => v.instructionNumber === real.instructionPointer);

    if (nowStatesEntry === undefined) {
      return null;
    }

    let [nowState, ] = nowStatesEntry;

    // M は左、 N は右, A はヘッド位置
    let [A, M, N, ] = [0, 1, 2, 3].map(r => real.registers[r]);

    let symbols: TMSymbol[] = [];
    while (BigInt(0) < M) {
      if ((M & BigInt(1)) === BigInt(0)) {
        symbols.unshift(this.transformLog.symbol0);
      } else {
        symbols.unshift(this.transformLog.symbol1);
      }
      M = M >> BigInt(1);
    }

    let nSymbols: TMSymbol[] = [];
    while (BigInt(0) < N) {
      if ((N & BigInt(1)) === BigInt(0)) {
        nSymbols.push(this.transformLog.symbol0);
      } else {
        nSymbols.push(this.transformLog.symbol1);
      }
      N = N >> BigInt(1);
    }

    symbols.push(A != BigInt(0) ? this.transformLog.symbol1 : this.transformLog.symbol0);
    symbols = symbols.concat(nSymbols);

    return {
      nowState,
      tape: TMTape.create(symbols, this.transformLog.symbol0).locked(),
      headPosition: 0
    };
  }

  interpretInput(virtual: [word: TMSymbol[], headPosition: number]): { registers: bigint[] } {
    if (this.transformLog === null) {
      throw new Error("Transform log is not available.");
    }

    let [A, M, N, Z] = [0, 0, 0, 0].map(() => BigInt(0));
    let [word, headPosition] = virtual;

    for (let i = 0; i < headPosition; i++) {
      M = M << BigInt(1);
      if (word[i] === this.transformLog.symbol1) {
        M = M + BigInt(1);
      }
    }

    for (let i = word.length - 1; i > headPosition; i--) {
      N = N << BigInt(1);
      if (word[i] === this.transformLog.symbol1) {
        N = N + BigInt(1);
      }
    }

    if (word[headPosition] === this.transformLog.symbol1) {
      A = BigInt(1);
    }

    return {
      registers: [A, M, N, Z],
    }
  }

  asTuple(): MinskyRegisterMachineTuple | null {
    if (this.transformLog === null) {
      return null;
    }

    return {
      numberOfRegisters: 4,
      program: this.transformLog.programs,
    };
  }

  asIndependantSystem(): MinskyRegisterMachine | null {
    if (this.transformLog === null) {
      return null;
    }

    return new MinskyRegisterMachine(4, this.transformLog.programs);
  }

  getTransFormLog(): TuringMachine2SymbolToMinskyRegisterMachineTransformLog | null {
    return this.transformLog;
  }
}
