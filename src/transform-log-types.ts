import {
  MoveFirstTMRule,
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

export type TuringMachine2SymbolToMoveFirstTuringMachineTransformLog = {
  readonly symbol0: TMSymbol;
  readonly symbol1: TMSymbol;

  readonly ruleTable: {
    readonly originalRule: {
      readonly state: TMState;
      readonly read: TMSymbol;
      readonly out: TMRuleOutput;
    };
    readonly transformedRule: MoveFirstTMRule;
  }[];
};

export type MoveFirstTM2SymbolToTagSystemTransformLog = {
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
