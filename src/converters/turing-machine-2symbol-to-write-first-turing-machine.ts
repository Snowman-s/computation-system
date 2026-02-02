import {
  TMConfiguration,
  TMRuleOutput,
  TMRuleSet,
  TMState,
  TMStateFrom,
  TMSymbol,
  TuringMachine,
} from "../turing-machine";
import {
  WriteFirstTMRule,
  WriteFirstTMRuleSet,
  WriteFirstTuringMachine,
} from "../write-first-turing-machine";
import { ITransformElement, SystemTuple } from "../converter";
import { TuringMachine2SymbolToWriteFirstTuringMachineTransformLog } from "../transform-log-types";

export class TuringMachine2SymbolToWriteFirstTuringMachineTransformElement
  implements
    ITransformElement<
      TuringMachine,
      WriteFirstTuringMachine,
      TuringMachine2SymbolToWriteFirstTuringMachineTransformLog
    >
{
  private transformLog: TuringMachine2SymbolToWriteFirstTuringMachineTransformLog | null = null;
  private tmSample: WriteFirstTuringMachine | null = null;

  getTransFormLog(): TuringMachine2SymbolToWriteFirstTuringMachineTransformLog | null {
    return this.transformLog;
  }

  asTuple(): {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: WriteFirstTMRuleSet;
    acceptState: TMState | null;
  } | null {
    return this.tmSample === null ? null : this.tmSample.asTuple();
  }

  asIndependantSystem(): WriteFirstTuringMachine | null {
    return this.tmSample === null ? null : this.tmSample.clone();
  }

  interpretConfigration(real: TMConfiguration | null): TMConfiguration | null {
    if (real === null || this.transformLog === null) return null;

    const state = this.transformLog.stateCorrespondenceTable.filter(
      (elm) => elm.writeTMState === real.nowState
    )[0].tmState;

    return { nowState: state, tape: real.tape, headPosition: real.headPosition };
  }

  interpretInput(
    virtual: [word: TMSymbol[], headPosition: number]
  ): [word: TMSymbol[], headPosition: number, state: TMState] {
    if (this.transformLog === null) throw new Error();

    const firstStateCandinates = this.transformLog.initStateCandinates.filter(
      (elm) => elm.firstSymbol == virtual[0][virtual[1]]
    );

    if (firstStateCandinates.length !== 1) throw new Error();

    return [virtual[0], virtual[1], firstStateCandinates[0].state];
  }

  bind(system: SystemTuple<TuringMachine>): void {
    const symbols = [...system.symbolSet];
    if (2 < symbols.length) {
      throw new Error();
    }
    const states = [...system.stateSet];

    const newStatePool: [state: TMState, symbol: TMSymbol, created: TMState][] = [];
    let acceptStateCopy: TMState | null = null;
    const concatStrAndNew = function (state: TMState, symbol: TMSymbol) {
      const duplicated =
        state === system.acceptState
          ? newStatePool.filter((elm) => elm[0] === state)
          : newStatePool.filter((elm) => elm[0] === state && elm[1] === symbol);

      if (duplicated.length === 0) {
        const [ret] = TMStateFrom(
          state === system.acceptState ? state.value : state.value + "-" + symbol.value
        );
        if (state === system.acceptState) {
          acceptStateCopy = ret;
        }
        newStatePool.push([state, symbol, ret]);
        return ret;
      } else {
        return duplicated[0][2];
      }
    };

    const transformTable: {
      originalRule: {
        state: TMState;
        read: TMSymbol;
        out: TMRuleOutput;
      };
      transformedRule: WriteFirstTMRule;
    }[] = [];

    const ruleSetBuilder = WriteFirstTMRuleSet.builder();
    states.forEach((state) => {
      if (state === system.acceptState) return;

      symbols.forEach((symbol) => {
        const candinates = system.ruleset.getCandinates(state, symbol);
        if (candinates.length === 0) return;
        if (candinates.length !== 1)
          console.error(`warn: too many rules found for (${state.value}, ${symbol.value}).`);
        candinates.forEach((candinate) => {
          if (candinate.move !== "HALT") {
            ruleSetBuilder
              .state(concatStrAndNew(state, symbol), candinate.write, candinate.move)
              .add(symbols[0], concatStrAndNew(candinate.nextState, symbols[0]))
              .add(symbols[1], concatStrAndNew(candinate.nextState, symbols[1]));

            transformTable.push({
              originalRule: {
                state: state,
                read: symbol,
                out: candinate,
              },
              transformedRule: {
                nowState: concatStrAndNew(state, symbol),
                out: {
                  write: candinate.write,
                  move: candinate.move,
                  changeStates: [
                    {
                      read: symbols[0],
                      thenGoTo: concatStrAndNew(candinate.nextState, symbols[0]),
                    },
                    {
                      read: symbols[1],
                      thenGoTo: concatStrAndNew(candinate.nextState, symbols[1]),
                    },
                  ],
                },
              },
            });
          }
        });
      });
    });

    this.tmSample = new WriteFirstTuringMachine(
      system.blankSymbol,
      ruleSetBuilder.build(),
      acceptStateCopy
    );

    this.transformLog = {
      symbol0: symbols[0],
      symbol1: symbols[1],
      initStateCandinates: symbols.map((symbol) => {
        return {
          firstSymbol: symbol,
          state: concatStrAndNew(system.initState, symbol),
        };
      }),
      stateCorrespondenceTable: newStatePool.map((elm) => {
        const [state, _, created] = elm;
        return { tmState: state, writeTMState: created };
      }),
      ruleTable: transformTable,
    };
  }
}
