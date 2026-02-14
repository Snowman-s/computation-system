import {
  TagSystem,
  TagSystemConfiguration,
  TagSystemLetter,
  TagSystemLetterFrom,
  TagSystemRuleSet,
} from "../tag-system";
import {
  TMConfiguration,
  TMState,
  TMSymbol,
  TMTape,
} from "../turing-machine";
import {
  WriteFirstTMRuleOutput,
  WriteFirstTuringMachine,
} from "../write-first-turing-machine";
import { ITransformElement, SystemTuple } from "../converter";
import { WriteFirstTM2SymbolToTagSystemTransformLog } from "../transform-log-types";

/**
 * @see COCKE, John; MINSKY, Marvin. Universality of tag systems with P= 2. Journal of the ACM (JACM), 1964, 11.1: 15-20.
 */
export class WriteFirstTM2SymbolToTagSystemTransformElement
  implements
    ITransformElement<
      WriteFirstTuringMachine,
      TagSystem,
      WriteFirstTM2SymbolToTagSystemTransformLog
    >
{
  private tagSystemSample: TagSystem | null = null;
  private transformLog: WriteFirstTM2SymbolToTagSystemTransformLog | null = null;
  private fillRulesAsPossible: boolean;

  constructor(fillRulesAsPossible = false) {
    this.fillRulesAsPossible = fillRulesAsPossible;
  }

  getTransFormLog(): WriteFirstTM2SymbolToTagSystemTransformLog | null {
    return this.transformLog;
  }

  interpretConfigration(real: TagSystemConfiguration | null): TMConfiguration | null {
    if (real === null) return null;
    if (this.transformLog === null) return null;

    const { word } = real;
    const wordLetters = word.asLetters();

    if (wordLetters.length < 2) return null;

    const useLetterSet = this.transformLog.symbolCorrespondenceTable.find(
      (elm) =>
        elm.A === wordLetters[0] &&
        wordLetters.map((letter) => elm.B === letter).reduce((a, b) => a || b, false)
    );

    if (useLetterSet === undefined) return null;

    if (wordLetters[1] !== this.transformLog.letterX) {
      return null;
    }

    let i = 2;
    let leftNum = 0;
    let rightNum = 0;
    while (wordLetters[i] !== useLetterSet.B) {
      if (wordLetters.length <= i) return null;
      const theLetter = wordLetters[i];
      if (theLetter !== useLetterSet.alpha) return null;
      i++;
      if (wordLetters.length <= i) return null;
      const theLetter2 = wordLetters[i];
      if (theLetter2 !== this.transformLog.letterX) return null;
      leftNum++;
      i++;
    }
    if (wordLetters.length <= i + 1) return null;
    if (wordLetters[i + 1] !== this.transformLog.letterX) return null;
    i += 2;
    while (i < wordLetters.length) {
      const theLetter = wordLetters[i];
      if (theLetter !== useLetterSet.beta) return null;
      i++;
      if (wordLetters.length <= i) return null;
      const theLetter2 = wordLetters[i];
      if (theLetter2 !== this.transformLog.letterX) return null;
      rightNum++;
      i++;
    }

    const { symbol0, symbol1 } = this.transformLog;
    const leftToSymbols = [...leftNum.toString(2)].map((t) => (t === "0" ? symbol0 : symbol1));
    const rightToSymbols = [...rightNum.toString(2)]
      .reverse()
      .map((t) => (t === "0" ? symbol0 : symbol1));

    const tape = TMTape.create(
      leftToSymbols.concat([useLetterSet.whichSymbolReadBefore]).concat(rightToSymbols),
      this.transformLog.symbol0
    ).locked();

    return {
      tape: tape,
      nowState: useLetterSet.state,
      headPosition: leftToSymbols.length,
    };
  }

  interpretInput(
    virtual: [word: TMSymbol[], headPosition: number, state: TMState]
  ): [letters: TagSystemLetter[]] {
    if (this.transformLog === null) throw new Error();

    const [word, headPosition, state] = virtual;
    const { letterX, symbol0, symbolCorrespondenceTable } = {
      ...this.transformLog,
    };

    const left = word.slice(0, headPosition).reverse();
    const right = word.slice(headPosition + 1);

    const leftNum = left
      .map((elm, index) => {
        return elm === symbol0 ? 0 : Math.pow(2, index);
      })
      .reduce((a, b) => a + b, 0);
    const rightNum = right
      .map((elm, index) => {
        return elm === symbol0 ? 0 : Math.pow(2, index);
      })
      .reduce((a, b) => a + b, 0);

    const nowHeadSymbol = word[headPosition];
    const usingLetters = symbolCorrespondenceTable.filter(
      (value) => value.state === state && value.whichSymbolReadBefore === nowHeadSymbol
    );
    if (usingLetters.length === 0)
      throw new Error(`state "${state}", was not passed to bind().`);

    const usingLetter = usingLetters[0];

    const ret = [usingLetter.A, letterX]
      .concat(new Array(leftNum).fill([usingLetter.alpha, letterX]).flat())
      .concat([usingLetter.B, letterX])
      .concat(new Array(rightNum).fill([usingLetter.beta, letterX]).flat());

    return [ret];
  }

  bind(system: SystemTuple<WriteFirstTuringMachine>): void {
    const { stateSet, symbolSet, blankSymbol, ruleset, acceptState } = system;

    const [symbol0, symbol1]: TMSymbol[] = (function () {
      if (symbolSet.size !== 2) {
        throw new Error();
      }

      const array = [...symbolSet];
      if (array[0] === blankSymbol) {
        return array;
      } else {
        return [array[1], array[0]];
      }
    })();

    const states = [...stateSet];

    const [X] = TagSystemLetterFrom("x");
    const ruleSetBuilder = TagSystemRuleSet.builder().add(X, [X]);

    const symbolCorrespondenceTable: WriteFirstTM2SymbolToTagSystemTransformLog["symbolCorrespondenceTable"] =
      [];

    const lettersPool: TagSystemLetter[] = [];

    const mustSetLastReadIndicatorLetterSet = ["B"];

    const fillRulesAsPossible = this.fillRulesAsPossible;

    states.forEach((state, index) => {
      const tmout = (function () {
        const tmoutCandinates = ruleset.getCandinates(state);

        if (state !== acceptState && tmoutCandinates.length == 0) {
          if (!fillRulesAsPossible) throw new Error();

          const ret: WriteFirstTMRuleOutput = {
            write: symbol0,
            move: "L",
            changeStates: [
              {
                read: symbol0,
                thenGoTo: state,
              },
              {
                read: symbol1,
                thenGoTo: state,
              },
            ],
          };

          return ret;
        } else if (tmoutCandinates.length > 1) {
          throw new Error(
            `Too much rules for "${state.value}" is defined: ${tmoutCandinates.map(
              (candinate) => {
                return `"${state.value} => ${candinate.write.value}, ${candinate.move}"`;
              }
            )}`
          );
        }

        return tmoutCandinates[0];
      })();

      // 現在の状態からappendSymbolに移った時どうなるか
      const toLetter = function (char: string, appendSymbol?: 0 | 1, d?: "'") {
        const appendStr = (function () {
          if (appendSymbol === undefined) {
            if (mustSetLastReadIndicatorLetterSet.includes(char))
              throw new Error("Internal Error!");
            return index.toString(10);
          }

          const merge =
            (d !== "'" && ["A", "α", "B", "β"].findIndex((c) => c === char) !== -1) ||
            (d === "'" && ["B", "β"].findIndex((c) => c === char) !== -1);

          if (merge) {
            const symbolI0s = tmout.changeStates.filter(
              (changeState) => changeState.read === symbol0
            );
            const symbolI1s = tmout.changeStates.filter(
              (changeState) => changeState.read === symbol1
            );

            if (symbolI0s.length !== 1) {
              throw new Error();
            }
            if (symbolI1s.length !== 1) {
              throw new Error();
            }

            const stateI0 = symbolI0s[0].thenGoTo;
            const stateI1 = symbolI1s[0].thenGoTo;

            if (stateI0 === "HALT" || stateI1 === "HALT") {
              throw new Error();
            }

            return (
              (appendSymbol === 0
                ? states.findIndex((t) => t === stateI0).toString(10)
                : states.findIndex((t) => t === stateI1).toString(10)) +
              (mustSetLastReadIndicatorLetterSet.includes(char) ? ".l_" + appendSymbol : "")
            );
          } else {
            return index.toString(10) + (appendSymbol === 0 ? symbol0.value : symbol1.value);
          }
        })();

        const str = (function () {
          let ret = char + (appendStr.length === 1 ? "_" + appendStr : "_{" + appendStr + "}");
          return d ? "{" + ret + "}" + d : ret;
        })();

        const mayTheLetter = lettersPool.find((letter) => letter.value === str);
        if (mayTheLetter !== undefined) {
          return mayTheLetter;
        }

        const [newLetter] = TagSystemLetterFrom(str);
        lettersPool.push(newLetter);
        return newLetter;
      };

      // 前の状態からappendSymbolによって現在の状態に移った時どうなるか
      const toLetter2 = function (char: string, appendSymbol: 0 | 1, d?: "'") {
        const appendStr =
          index.toString(10) +
          (mustSetLastReadIndicatorLetterSet.includes(char)
            ? ".l_" + appendSymbol.toString(10)
            : "");

        let str = char + (appendStr.length === 1 ? "_" + appendStr : "_{" + appendStr + "}");

        if (d === "'") str = "{" + str + "}" + d;

        const mayTheLetter = lettersPool.find((letter) => letter.value === str);
        if (mayTheLetter !== undefined) {
          return mayTheLetter;
        }

        const [newLetter] = TagSystemLetterFrom(str);
        lettersPool.push(newLetter);
        return newLetter;
      };

      symbolCorrespondenceTable.push({
        state: state,
        whichSymbolReadBefore: symbol0,
        A: toLetter2("A", 0),
        B: toLetter2("B", 0),
        alpha: toLetter2("α", 0),
        beta: toLetter2("β", 0),
      });

      symbolCorrespondenceTable.push({
        state: state,
        whichSymbolReadBefore: symbol1,
        A: toLetter2("A", 1),
        B: toLetter2("B", 1),
        alpha: toLetter2("α", 1),
        beta: toLetter2("β", 1),
      });

      if (acceptState === state) {
        ruleSetBuilder.addStop(toLetter("A"));
        ruleSetBuilder.add(toLetter("α"), [X]);
        ruleSetBuilder.add(toLetter2("B", 0), [X]);
        ruleSetBuilder.add(toLetter2("B", 1), [X]);
        ruleSetBuilder.add(toLetter("β"), [X]);
        ruleSetBuilder.add(toLetter2("B", 0, "'"), [toLetter2("B", 0), X]);
        ruleSetBuilder.add(toLetter2("B", 1, "'"), [toLetter2("B", 1), X]);
        ruleSetBuilder.add(toLetter("β", undefined, "'"), [X]);
        return;
      }

      ruleSetBuilder
        .add(toLetter("C"), [toLetter("D", 1), toLetter("D", 0)])
        .add(toLetter("c"), [toLetter("d", 1), toLetter("d", 0)])
        .add(toLetter("S"), [toLetter("T", 1), toLetter("T", 0)])
        .add(toLetter("s"), [toLetter("t", 1), toLetter("t", 0)])
        .add(toLetter("D", 0), [X, toLetter("A", 0), X])
        .add(toLetter("d", 0), [toLetter("α", 0), X])
        .add(toLetter("T", 0), [toLetter("B", 0), X])
        .add(toLetter("t", 0), [toLetter("β", 0), X])
        .add(toLetter("D", 1), [toLetter("A", 1), X])
        .add(toLetter("d", 1), [toLetter("α", 1), X])
        .add(toLetter("T", 1), [toLetter("B", 1), X])
        .add(toLetter("t", 1), [toLetter("β", 1), X])

        .add(toLetter("C", undefined, "'"), [toLetter("D", 1, "'"), toLetter("D", 0, "'")])
        .add(toLetter("c", undefined, "'"), [toLetter("d", 1, "'"), toLetter("d", 0, "'")])
        .add(toLetter("S", undefined, "'"), [toLetter("T", 1, "'"), toLetter("T", 0, "'")])
        .add(toLetter("s", undefined, "'"), [toLetter("t", 1, "'"), toLetter("t", 0, "'")])
        .add(toLetter("D", 0, "'"), [X, toLetter("B", 0, "'"), X])
        .add(toLetter("d", 0, "'"), [toLetter("β", 0, "'"), X])
        .add(toLetter("T", 0, "'"), [toLetter("A", 0), X])
        .add(toLetter("t", 0, "'"), [toLetter("α", 0), X])
        .add(toLetter("D", 1, "'"), [toLetter("B", 1, "'"), X])
        .add(toLetter("d", 1, "'"), [toLetter("β", 1, "'"), X])
        .add(toLetter("T", 1, "'"), [toLetter("A", 1), X])
        .add(toLetter("t", 1, "'"), [toLetter("α", 1), X])

        .add(toLetter2("B", 0, "'"), [toLetter2("B", 0), X])
        .add(toLetter2("B", 1, "'"), [toLetter2("B", 1), X])
        .add(toLetter("β", undefined, "'"), [toLetter("β", undefined), X]);

      if (tmout.move === "R") {
        if (tmout.write === symbol0) {
          ruleSetBuilder.add(toLetter("A"), [toLetter("C"), X]);
        } else {
          ruleSetBuilder.add(toLetter("A"), [toLetter("C"), X, toLetter("c"), X]);
        }
        ruleSetBuilder
          .add(toLetter("α"), [toLetter("c"), X, toLetter("c"), X])
          .add(toLetter2("B", 0), [toLetter("S")])
          .add(toLetter2("B", 1), [toLetter("S")])
          .add(toLetter("β"), [toLetter("s")]);
      } else {
        ruleSetBuilder
          .add(toLetter("A"), [toLetter("A", undefined, "'"), X])
          .add(toLetter("α"), [toLetter("α", undefined, "'"), X])
          .add(toLetter("A", undefined, "'"), [toLetter("S", undefined, "'")])
          .add(toLetter("α", undefined, "'"), [toLetter("s", undefined, "'")])
          .add(toLetter("β"), [
            toLetter("c", undefined, "'"),
            X,
            toLetter("c", undefined, "'"),
            X,
          ]);

        if (tmout.write === symbol0) {
          ruleSetBuilder
            .add(toLetter2("B", 0), [toLetter("C", undefined, "'"), X])
            .add(toLetter2("B", 1), [toLetter("C", undefined, "'"), X]);
        } else {
          ruleSetBuilder
            .add(toLetter2("B", 0), [
              toLetter("C", undefined, "'"),
              X,
              toLetter("c", undefined, "'"),
              X,
            ])
            .add(toLetter2("B", 1), [
              toLetter("C", undefined, "'"),
              X,
              toLetter("c", undefined, "'"),
              X,
            ]);
        }
      }
    });

    const tagSystemRuleSet = ruleSetBuilder.build();

    this.tagSystemSample = new TagSystem(2, tagSystemRuleSet);
    this.transformLog = {
      letterX: X,
      symbol0: symbol0,
      symbol1: symbol1,
      symbolCorrespondenceTable: symbolCorrespondenceTable,
    };
  }

  asTuple(): {
    deleteNum: number;
    letterSet: Set<TagSystemLetter>;
    ruleSet: TagSystemRuleSet;
  } | null {
    return this.tagSystemSample === null ? null : this.tagSystemSample.asTuple();
  }

  asIndependantSystem(): TagSystem | null {
    return this.tagSystemSample === null ? null : this.tagSystemSample.clone();
  }
}
