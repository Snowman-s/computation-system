import {
  WriteFirstTMRule,
  TagSystemLetter,
  TagSystemWord,
  TMRuleOutput,
  TMState,
  TMSymbol,
} from "./computation-system";

export type Tag2SystemToTuringMachine218TransformLog = {
  transformTable: {
    readonly letter: TagSystemLetter;
    readonly output: TagSystemWord | "STOP";
    readonly N: number;
    readonly charRepresent: TMSymbol[];
    readonly outRepresent: TMSymbol[];
  }[];
};

export type TuringMachine2SymbolToWriteFirstTuringMachineTransformLog = {
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
};

export type WriteFirstTM2SymbolToTagSystemTransformLog = {
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
};

export type TuringMachineTo2SymbolTransformLog = {
  l: number;
  blank: { original: TMSymbol; to: TMSymbol[] };
  symbolCorrespondenceTable: { original: TMSymbol; to: TMSymbol[] }[];
  stateCorrespondenceTable: { original: TMState; to: TMState }[];
};
