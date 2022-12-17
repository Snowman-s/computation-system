import {
  WriteFirstTMRule,
  TagSystemLetter,
  TagSystemWord,
  TMRuleOutput,
  TMState,
  TMSymbol,
} from "./computation-system";

export type Tag2SystemToTuringMachine218TransformLog = {
  readonly letter: TagSystemLetter;
  readonly output: TagSystemWord | "STOP";
  readonly N: number;
  readonly charRepresent: TMSymbol[];
  readonly outRepresent: TMSymbol[];
}[];

export type TuringMachine2SymbolToWriteFirstTuringMachineTransformLog = {
  readonly symbol0: TMSymbol;
  readonly symbol1: TMSymbol;

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
  initState: TMState;
  symbolCorrespondenceTable: {
    state: TMState;
    A: TagSystemLetter;
    B: TagSystemLetter;
    alpha: TagSystemLetter;
    beta: TagSystemLetter;
  }[];
};
