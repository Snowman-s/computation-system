import {
  TuringMachine,
  TMState,
  TMSymbol,
  TMConfiguration,
  TMRuleSet,
  TMStateFrom,
  TMSymbolFrom,
  TMTape,
} from "../turing-machine";
import { ITransformElement } from "../converter";
import { TuringMachineTo2SymbolTransformLog } from "../transform-log-types";

export class TuringMachineTo2SymbolTransformElement
  implements ITransformElement<TuringMachine, TuringMachine, TuringMachineTo2SymbolTransformLog>
{
  turingMachineSample: TuringMachine | null = null;
  transformLog: TuringMachineTo2SymbolTransformLog | null = null;

  interpretConfigration(real: TMConfiguration | null): TMConfiguration | null {
    if (real === null || this.transformLog === null) return null;

    const { tape, nowState, headPosition } = real;
    const { l, symbolCorrespondenceTable, stateCorrespondenceTable } = this.transformLog;

    const virtualState = stateCorrespondenceTable.find((row) => row.to === nowState);
    if (virtualState === undefined) return null;

    const { left, right } = tape.getWrittenRange();
    const adjustedLeft = left - ((l - ((headPosition - left) % l)) % l);

    const interpretedSymbols: TMSymbol[] = [];
    let realTmpSymbols: TMSymbol[] = [];
    for (
      let tapeIndex = adjustedLeft;
      tapeIndex <= right || (tapeIndex - headPosition) % l !== 0;
      tapeIndex++
    ) {
      realTmpSymbols.push(tape.read(tapeIndex));

      if (realTmpSymbols.length === l) {
        const found = symbolCorrespondenceTable.find((row) =>
          row.to
            .map((row2, index) => row2 === realTmpSymbols[index])
            .reduce((a, b) => a && b, true)
        );
        if (found === undefined) return null;

        interpretedSymbols.push(found.original);
        realTmpSymbols = [];
      }
    }

    return {
      nowState: virtualState.original,
      headPosition: Math.round(headPosition / l),
      tape: TMTape.create(interpretedSymbols, this.transformLog.blank.original).locked(),
    };
  }

  interpretInput(
    virtual: [word: TMSymbol[], headPosition: number]
  ): [word: TMSymbol[], headPosition: number] {
    if (this.transformLog === null) throw new Error();

    const [word, headPosition] = virtual;
    const { l, symbolCorrespondenceTable } = this.transformLog;

    const tape = word.flatMap((symbol) => {
      const found = symbolCorrespondenceTable.find((row) => row.original === symbol);
      if (found === undefined) throw new Error();

      return found.to;
    });

    return [tape, headPosition * l];
  }

  bind(system: {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  }): void {
    const { stateSet, symbolSet, blankSymbol, ruleset, initState, acceptState } = system;

    if (symbolSet.size <= 2) throw new Error();

    const [symbol0, symbol1] = TMSymbolFrom("0", "1");

    const statePool: TMState[] = [];

    const toNewStateTLR = function (
      letter: string,
      originalState: TMState,
      originalSymbols: string[]
    ) {
      const joined = originalSymbols.join(",");
      const str =
        letter + "_{" + originalState.value + (joined.length === 0 ? "" : "," + joined) + "}";
      const intersect = statePool.find((state) => state.value === str);
      if (intersect === undefined) {
        const [newState] = TMStateFrom(str);
        statePool.push(newState);
        return newState;
      } else {
        return intersect;
      }
    };

    const toNewStateUV = function (letter: string, originalState: TMState, count: number) {
      const str = letter + "_{" + originalState.value + "," + count.toString(10) + "}";
      const intersect = statePool.find((state) => state.value === str);
      if (intersect === undefined) {
        const [newState] = TMStateFrom(str);
        statePool.push(newState);
        return newState;
      } else {
        return intersect;
      }
    };

    const states = [...stateSet].sort((a, b) => (a.value > b.value ? 1 : -1));
    const symbols = [blankSymbol].concat(
      [...symbolSet]
        .filter((symbol) => symbol !== blankSymbol)
        .sort((a, b) => (a.value > b.value ? 1 : -1))
    );
    const l = (symbols.length - 1).toString(2).length;

    const builder = TMRuleSet.builder();
    for (const S of states) {
      builder
        .state(toNewStateTLR("T", S, []))
        .add(symbol0, symbol0, "R", toNewStateTLR("T", S, ["0"]))
        .add(symbol1, symbol1, "R", toNewStateTLR("T", S, ["1"]))
        .state(toNewStateTLR("L", S, ["0"]))
        .add(symbol0, symbol0, "L", toNewStateUV("V", S, 1))
        .add(symbol1, symbol0, "L", toNewStateUV("V", S, 1))
        .state(toNewStateTLR("L", S, ["1"]))
        .add(symbol0, symbol1, "L", toNewStateUV("V", S, 1))
        .add(symbol1, symbol1, "L", toNewStateUV("V", S, 1))
        .state(toNewStateTLR("R", S, ["0"]))
        .add(symbol0, symbol0, "R", toNewStateUV("U", S, 1))
        .add(symbol1, symbol0, "R", toNewStateUV("U", S, 1))
        .state(toNewStateTLR("R", S, ["1"]))
        .add(symbol0, symbol1, "R", toNewStateUV("U", S, 1))
        .add(symbol1, symbol1, "R", toNewStateUV("U", S, 1));

      for (let s = 2; s <= 2 ** (l - 1) - 1; s++) {
        // これで全てのシンボルの組み合わせが網羅できたことになる(長さ0と、長さ*l-1*の状態のルールを除く)：
        const splited_s = s.toString(2).split("").slice(1);

        builder
          .state(toNewStateTLR("T", S, splited_s))
          .add(symbol0, symbol0, "R", toNewStateTLR("T", S, splited_s.concat(["0"])))
          .add(symbol1, symbol1, "R", toNewStateTLR("T", S, splited_s.concat(["1"])))
          .state(toNewStateTLR("L", S, splited_s.concat(["0"])))
          .add(symbol0, symbol0, "L", toNewStateTLR("L", S, splited_s))
          .add(symbol1, symbol0, "L", toNewStateTLR("L", S, splited_s))
          .state(toNewStateTLR("L", S, splited_s.concat(["1"])))
          .add(symbol0, symbol1, "L", toNewStateTLR("L", S, splited_s))
          .add(symbol1, symbol1, "L", toNewStateTLR("L", S, splited_s))
          .state(toNewStateTLR("R", S, splited_s.concat(["0"])))
          .add(symbol0, symbol0, "L", toNewStateTLR("R", S, splited_s))
          .add(symbol1, symbol0, "L", toNewStateTLR("L", S, splited_s))
          .state(toNewStateTLR("R", S, splited_s.concat(["1"])))
          .add(symbol0, symbol1, "L", toNewStateTLR("R", S, splited_s))
          .add(symbol1, symbol1, "L", toNewStateTLR("R", S, splited_s));
      }

      for (let s = 2 ** (l - 1); s <= 2 ** l - 1; s++) {
        // これで全ての*l-1の長さの*シンボルの組み合わせが網羅できたことになる：
        const splited_s = s.toString(2).split("").slice(1);

        builder.state(toNewStateTLR("T", S, splited_s));

        // 各シンボルについて、そのシンボルはあるのだろうか？
        const symbolIndex0 = parseInt(splited_s.join("") + "0", 2)!;

        if (symbolIndex0 <= symbols.length - 1) {
          const candinates = ruleset.getCandinates(S, symbols[symbolIndex0]);

          if (candinates.length > 1) throw new Error();
          else if (candinates.length === 1) {
            const rule = candinates[0];
            if (rule.move === "HALT") {
              builder.addHALT(symbol0);
            } else {
              const writeSymbol = symbols.findIndex((symbol) => symbol === rule.write);
              const splitedSymbol = writeSymbol.toString(2).split("");
              const filledSymbol = new Array<string>(l - splitedSymbol.length)
                .fill("0")
                .concat(splitedSymbol);

              builder.add(
                symbol0,
                filledSymbol[filledSymbol.length - 1] === "0" ? symbol0 : symbol1,
                "L",
                toNewStateTLR(rule.move, rule.nextState, filledSymbol.slice(0, -1))
              );
            }
          }
        }

        const symbolIndex1 = parseInt(splited_s.join("") + "1", 2)!;
        if (symbolIndex1 <= symbols.length - 1) {
          const candinates = ruleset.getCandinates(S, symbols[symbolIndex1]);
          if (candinates.length > 1) throw new Error();
          else if (candinates.length === 1) {
            const rule = candinates[0];
            if (rule.move === "HALT") {
              builder.addHALT(symbol1);
            } else {
              const writeSymbol = symbols.findIndex((symbol) => symbol === rule.write);
              const splitedSymbol = writeSymbol.toString(2).split("");
              const filledSymbol = new Array<string>(l - splitedSymbol.length)
                .fill("0")
                .concat(splitedSymbol);
              builder.add(
                symbol1,
                filledSymbol[filledSymbol.length - 1] === "0" ? symbol0 : symbol1,
                "L",
                toNewStateTLR(rule.move, rule.nextState, filledSymbol.slice(0, -1))
              );
            }
          }
        }
      }

      // U, V -> T
      builder
        .state(toNewStateUV("U", S, l - 1))
        .add(symbol0, symbol0, "R", toNewStateTLR("T", S, []))
        .add(symbol1, symbol1, "R", toNewStateTLR("T", S, []))
        .state(toNewStateUV("V", S, l - 1))
        .add(symbol0, symbol0, "L", toNewStateTLR("T", S, []))
        .add(symbol1, symbol1, "L", toNewStateTLR("T", S, []));
      for (let s = 1; s <= l - 2; s++) {
        builder
          .state(toNewStateUV("U", S, s))
          .add(symbol0, symbol0, "R", toNewStateUV("U", S, s + 1))
          .add(symbol1, symbol1, "R", toNewStateUV("U", S, s + 1))
          .state(toNewStateUV("V", S, s))
          .add(symbol0, symbol0, "L", toNewStateUV("V", S, s + 1))
          .add(symbol1, symbol1, "L", toNewStateUV("V", S, s + 1));
      }
    }

    this.turingMachineSample = new TuringMachine(
      symbol0,
      builder.build(),
      toNewStateTLR("T", initState, []),
      acceptState === null ? null : toNewStateTLR("T", acceptState, [])
    );

    this.transformLog = {
      l: l,
      symbolCorrespondenceTable: symbols.map((symbol, index) => {
        const splitedIndex = index
          .toString(2)
          .split("")
          .map((str) => (str === "0" ? symbol0 : symbol1));
        return {
          original: symbol,
          to: new Array<TMSymbol>(l - splitedIndex.length).fill(symbol0).concat(splitedIndex),
        };
      }),
      blank: { original: blankSymbol, to: new Array(l).fill(symbol0) },
      stateCorrespondenceTable: states.map((state) => {
        return { original: state, to: toNewStateTLR("T", state, []) };
      }),
    };
  }

  asTuple(): {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  } | null {
    return this.turingMachineSample === null ? null : this.turingMachineSample.asTuple();
  }

  asIndependantSystem(): TuringMachine | null {
    return this.turingMachineSample === null ? null : this.turingMachineSample.clone();
  }

  getTransFormLog(): TuringMachineTo2SymbolTransformLog | null {
    return this.transformLog;
  }
}
