import {
  WriteFirstTMRule,
  TagSystemLetter,
  TagSystemWord,
  TMRuleOutput,
  TMState,
  TMSymbol,
  MinskyRegisterMachineInstruction,
  FractranFraction,
  TMRule,
  ThreeStackControl,
  ThreeStackLetter,
} from "./computation-system";

export interface Tag2SystemToTuringMachine218TransformLog {
  transformTable: {
    readonly letter: TagSystemLetter;
    readonly output: TagSystemWord | "STOP";
    readonly N: number;
    readonly charRepresent: TMSymbol[];
    readonly outRepresent: TMSymbol[];
  }[];
}

export interface TuringMachine2SymbolToWriteFirstTuringMachineTransformLog {
  readonly symbol0: TMSymbol;
  readonly symbol1: TMSymbol;
  readonly initStateCandinates: readonly {
    readonly firstSymbol: TMSymbol;
    readonly state: TMState;
  }[];

  readonly stateCorrespondenceTable: readonly {
    readonly tmState: TMState;
    readonly writeTMState: TMState;
  }[];

  readonly ruleTable: {
    readonly originalRule: {
      readonly state: TMState;
      readonly read: TMSymbol;
      readonly out: TMRuleOutput;
    };
    readonly transformedRule: WriteFirstTMRule;
  }[];
}

export interface WriteFirstTM2SymbolToTagSystemTransformLog {
  letterX: TagSystemLetter;
  symbol0: TMSymbol;
  symbol1: TMSymbol;
  symbolCorrespondenceTable: {
    state: TMState;
    whichSymbolReadBefore: TMSymbol;
    A: TagSystemLetter;
    B: TagSystemLetter;
    alpha: TagSystemLetter;
    beta: TagSystemLetter;
  }[];
}

export interface TuringMachineTo2SymbolTransformLog {
  l: number;
  blank: { original: TMSymbol; to: TMSymbol[] };
  symbolCorrespondenceTable: { original: TMSymbol; to: TMSymbol[] }[];
  stateCorrespondenceTable: { original: TMState; to: TMState }[];
}

export interface TuringMachine2SymbolToMinskyRegisterMachineTransformLog {
  states: Map<TMState, {
    stateNumber: number;
    instructionNumber: number;
  }>;
  symbol0: TMSymbol;
  symbol1: TMSymbol;
  programs: MinskyRegisterMachineInstruction[];
}

export interface MinskyRegisterMachineToFractranTransformLog {
  primeCorrespondenceTable: ({
    readonly type: "register";
    readonly registerIndex: number;
    readonly prime: number;
  } | {
    readonly type: "instruction";
    readonly instructionIndex: number;
    readonly prime: number;
    readonly fracs: FractranFraction[];
  })[];
}

export interface TuringMachineToDeterministicLambdaCalculusTransformLog {
  readonly symbolCorrespondenceTable: readonly {
    readonly symbol: TMSymbol;
    readonly index: number;
  }[];
  readonly stateCorrespondenceTable: readonly {
    readonly state: TMState;
    readonly index: number;
  }[];
}

/**
 * The correspondence table produced by {@link TuringMachineToBalancedThreeStackMachineTransformElement}.
 *
 * @remarks
 * Names of the controls (A, S, T, D) follow Section 4 of the paper cited by the converter.
 */
export interface TuringMachineToBalancedThreeStackMachineTransformLog {
  /**
   * The boundary letter (★ in the paper) placed right after the finite right block of the tape on the right stack.
   * Blanks beyond it are supplied to the history stack.
   */
  readonly boundary: ThreeStackLetter;
  /**
   * The only terminal control (A_h in the paper), which every halting computation reaches.
   * It is not tied to any state; the halting state is recovered from the record on top of the history stack.
   */
  readonly halt: ThreeStackControl;
  /**
   * For each tape symbol, the letter representing it on the stacks
   * and its marked version (ā in the paper), which remembers the head cell while the right stack is scanned.
   */
  readonly symbolCorrespondenceTable: readonly {
    readonly symbol: TMSymbol;
    readonly letter: ThreeStackLetter;
    readonly marked: ThreeStackLetter;
  }[];
  /**
   * For each state q other than the accept state (which is replaced by "halt"), the four controls of the paper.
   * - A - Checkpoint: the stacks represent a configuration of the Turing machine in state q.
   * - S - Moves the right block onto the left stack, to reach the boundary.
   * - T - Moves the right block back onto the right stack, after taking a blank for the history.
   * - D - Executes the rule of q, replacing the taken blank with a record.
   */
  readonly stateCorrespondenceTable: readonly {
    readonly state: TMState;
    readonly A: ThreeStackControl;
    readonly S: ThreeStackControl;
    readonly T: ThreeStackControl;
    readonly D: ThreeStackControl;
  }[];
  /**
   * The record letter (κ in the paper) pushed onto the history stack by each row of rule (13).
   * "rule" is the executed rule, or a synthesized "HALT" rule for an undefined (state, symbol) pair.
   * "branch" is what is popped from L or R in addition to the head cell,
   * which selects the row among the rows built from the same rule (a "branch" in the paper):
   * - symbol - The top of L for a left move, or the cell after the head cell on R for a right move.
   * - boundary - The boundary after the head cell on R, for a right move from the last cell of the right block.
   * - null - The "HALT" row, which pops nothing more.
   *
   * It is not the neighboring cell on the tape: "symbol" with the blank and "boundary" both have a blank cell there.
   */
  readonly recordTable: readonly {
    readonly rule: TMRule;
    readonly branch:
      | { readonly type: "symbol"; readonly symbol: TMSymbol }
      | { readonly type: "boundary" }
      | null;
    readonly record: ThreeStackLetter;
  }[];
}