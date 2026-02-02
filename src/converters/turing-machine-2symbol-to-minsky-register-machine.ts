import {
  TuringMachine,
  TMState,
  TMSymbol,
  TMConfiguration,
  TMRuleSet,
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
  turingMachineSample: TuringMachine | null = null;

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

    // 処理の流れ
    //

    throw new Error("Method not implemented.");
  }

  interpretConfigration(real: MinskyRegisterMachineConfiguration | null): TMConfiguration | null {
    throw new Error("Method not implemented.");
  }

  interpretInput(virtual: [word: TMSymbol[], headPosition: number]): { registers: bigint[] } {
    throw new Error("Method not implemented.");
  }

  asTuple(): MinskyRegisterMachineTuple | null {
    throw new Error("Method not implemented.");
  }

  asIndependantSystem(): MinskyRegisterMachine | null {
    throw new Error("Method not implemented.");
  }

  getTransFormLog(): TuringMachine2SymbolToMinskyRegisterMachineTransformLog | null {
    throw new Error("Method not implemented.");
  }
}
