import {
  TagSystem,
  TagSystemConfiguration,
  TagSystemLetter,
  TagSystemLetterFrom,
  TagSystemRuleSet,
  TagSystemWord,
} from "./tag-system";
import {
  TMConfiguration,
  TMRuleOutput,
  TMRuleSet,
  TMState,
  TMStateFrom,
  TMSymbol,
  TMSymbolFrom,
  TMTape,
  TuringMachine,
} from "./turing-machine";
import {
  ComputationSystem,
  WriteFirstTMRule,
  WriteFirstTMRuleOutput,
  WriteFirstTMRuleSet,
  WriteFirstTuringMachine,
} from "./computation-system";
import {
  WriteFirstTM2SymbolToTagSystemTransformLog,
  Tag2SystemToTuringMachine218TransformLog,
  TuringMachine2SymbolToWriteFirstTuringMachineTransformLog,
} from "./transform-log-types";

export class Converter {
  /* istanbul ignore next */
  private constructor() {}

  /**
   * @see Yurii Rogozhin. Small universal Turing machines. Theoretical Computer Science, 168(2):215–240, 1996.
   */
  public static tag2SystemToTuringMachine218(): ITransformElement<
    TagSystem,
    TuringMachine,
    Tag2SystemToTuringMachine218TransformLog
  > {
    //Create TMSymbols
    const [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R] = TMSymbolFrom(
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R"
    );
    const [q1, q2] = TMStateFrom("q1", "q2");
    const tmRule = TMRuleSet.builder()
      .state(q1)
      .add(A, R, "L")
      .add(B, E, "R")
      .add(C, R, "L")
      .add(D, A, "R")
      .add(E, D, "L")

      .add(F, H, "R")
      .add(G, J, "R")
      .add(H, F, "L")
      .add(I, F, "R")
      .add(J, I, "L")
      .add(K, L, "L", q2)
      .add(L, I, "L", q2)

      .add(M, B, "L", q2)
      .add(N, O, "R")
      .add(O, P, "L")
      .add(P, Q, "R", q2)
      .addHALT(Q)
      .add(R, C, "R")

      .state(q2)
      .add(A, C, "R")
      .add(B, C, "R")
      .add(C, B, "L")
      .add(D, E, "R")
      .add(E, A, "L")

      .add(F, K, "R", q1)
      .add(G, H, "R")
      .add(H, G, "L")
      .add(I, J, "R")
      .add(J, G, "L")
      .add(K, F, "R", q1)
      .add(L, J, "R")

      .add(M, O, "R")
      .add(N, O, "R")
      .add(O, N, "L")
      .add(P, R, "R")
      .add(Q, R, "L", q1)
      .add(R, M, "L")

      .build();
    const tm = new TuringMachine(C, tmRule, q1);

    const tuple = { ...tm.asTuple() };

    const transformElement = new (class
      implements
        ITransformElement<TagSystem, TuringMachine, Tag2SystemToTuringMachine218TransformLog>
    {
      asTuple(): {
        stateSet: Set<TMState>;
        symbolSet: Set<TMSymbol>;
        blankSymbol: TMSymbol;
        inputSymbolSet: Set<TMSymbol>;
        ruleset: TMRuleSet;
        initState: TMState;
        acceptState: TMState | null;
      } {
        return tuple;
      }
      asIndependantSystem(): TuringMachine {
        return new TuringMachine(
          tuple.blankSymbol,
          tuple.ruleset,
          tuple.initState,
          tuple.acceptState
        );
      }
      private transformTable: Tag2SystemToTuringMachine218TransformLog | null = [];

      private startHead = -1;

      interpretConfigration(real: TMConfiguration | null): TagSystemConfiguration | null {
        if (real === null || this.transformTable === null) return null;

        const tape = real.tape;
        const range = tape.getWrittenRange();

        let letters: TagSystemLetter[] = [];
        let stopped = false;

        if (tape.read(range.left + 1) === R) {
          //Last letter must be STOP.
          letters.push(this.transformTable[this.transformTable.length - 1].letter);
          stopped = true;
        }

        if (!stopped && real.headPosition !== this.startHead) return null;

        let i = range.left;
        for (; i <= this.startHead; i++) {
          if (!stopped) {
            if (tape.read(i) !== A && tape.read(i) !== F && tape.read(i) !== Q) {
              return null;
            }
          }
        }
        //最初のRをskip
        while (tape.read(i) === R) {
          i++;
        }
        for (let oneCount = 0; i <= range.right; i++) {
          const read = tape.read(i);
          if (read === M) {
            const letterCandinate = this.transformTable.find((elm) => elm.N === oneCount)?.letter;
            if (letterCandinate === undefined) {
              return null;
            }
            letters.push(letterCandinate);
            oneCount = 0;
          } else if (read === A) {
            oneCount++;
          } else if (stopped && read === B) {
            continue;
          } else {
            return null;
          }
        }

        return {
          word: new (class implements TagSystemWord {
            asLetters(): TagSystemLetter[] {
              return [...letters];
            }
            toString(): string {
              return letters.map((letter) => letter.value).join("");
            }
          })(),
        };
      }
      interpretInput(
        input: [letters: TagSystemLetter[]]
      ): [word: TMSymbol[], headPosition: number] {
        if (this.transformTable === null) {
          throw new Error("interpretInput() was called before bind() was called.");
        }

        const constTable = this.transformTable;

        const [virtual] = input;
        const firstLettersMapped = virtual
          .map((letter) => {
            const letterData = constTable
              .map<[TagSystemLetter | undefined, number]>((elm, index) => [elm.letter, index])
              .find((letterAndIndex) => letterAndIndex[0] === letter);

            if (letterData === undefined)
              throw new Error(`This system cannot accept "${letter.value}" as input.`);

            const tableElm = constTable[letterData[1]];
            return [...tableElm.charRepresent, M];
          })
          .reduce((a, b) => [...a, ...b]);

        const rules = [...this.transformTable]
          .reverse()
          .map((elm) => elm.outRepresent)
          .reduce((a, b) => [...a, ...b]);

        const word = [...rules, F, F, ...firstLettersMapped];

        this.startHead = rules.length + 1;

        return [word, this.startHead];
      }
      bind(system: SystemTuple<TagSystem>): void {
        if (system.deleteNum !== 2) throw new Error("TagSystem's delete number must be 2.");

        const ruleSet = system.ruleSet;

        // Organize letters and create table
        const rawLetters = Array.from(ruleSet.getAllUsedLetters());

        let stopLetter: TagSystemLetter | null = null;
        let organizedLetters: TagSystemLetter[] = [];
        rawLetters.forEach((v) => {
          const rule = ruleSet.getCandinates(v);
          if (rule.stop) {
            if (stopLetter === null) {
              stopLetter = v;
            }
            return;
          }

          organizedLetters.push(v);
        });

        organizedLetters.sort((a, b) => (a.value > b.value ? 1 : -1));

        if (stopLetter !== null) organizedLetters.push(stopLetter);

        let table: {
          letter: TagSystemLetter | undefined;
          output: TagSystemWord | "STOP" | undefined;
          N: number;
          charRepresent: TMSymbol[] | undefined;
          outRepresent: TMSymbol[] | undefined;
        }[] = organizedLetters.map((letter) => {
          const ruleOut = ruleSet.getCandinates(letter);
          if (ruleOut.stop) {
            //"STOP" should come at the end of the table
            return {
              letter: letter,
              output: "STOP",
              N: -1,
              charRepresent: undefined,
              outRepresent: undefined,
            };
          } else {
            return {
              letter: letter,
              output: ruleOut.writeWord,
              N: -1,
              charRepresent: undefined,
              outRepresent: undefined,
            };
          }
        });

        //Determine charRepresent
        table.forEach((elm, i) => {
          if (i === 0) {
            elm.N = 1;
          } else {
            const beforeRuleOutput = table[i - 1].output;
            /* istanbul ignore next */
            if (beforeRuleOutput === "STOP" || beforeRuleOutput === undefined)
              throw new Error("Internal Error!");

            elm.N = table[i - 1].N + beforeRuleOutput.asLetters().length + 1;
          }

          elm.charRepresent = Array<TMSymbol>(elm.N).fill(A);
        });

        //Determine outputRepresent
        table.forEach((elm) => {
          if (elm.output === "STOP") {
            elm.outRepresent = [Q, Q];
          } else {
            /* istanbul ignore next */
            if (elm.output === undefined) throw new Error("Internal Error!");

            const outputLetters = [...elm.output.asLetters()];
            const outputLettersMapped = outputLetters.reverse().map((mapLetter) => {
              const letterData = table
                .map<[TagSystemLetter | undefined, number]>((elm, index) => [elm.letter, index])
                .find((letterAndIndex) => letterAndIndex[0] === mapLetter);
              /* istanbul ignore next */
              if (letterData === undefined) throw new Error("Internal Error!");
              const ret = table[letterData[1]].charRepresent;
              /* istanbul ignore next */
              if (ret === undefined) throw new Error("Internal Error!");
              return ret;
            });

            const outputLettersConcated = outputLettersMapped
              .map((outputLetterMapped) => {
                return [A, F, ...outputLetterMapped];
              })
              .reduce((a, b) => [...a, ...b])
              .slice(2);

            elm.outRepresent = [F, F, ...outputLettersConcated];
          }
        });

        this.transformTable = table.map((elm) => {
          const { letter, output, N, charRepresent, outRepresent } = elm;
          /* istanbul ignore next */
          if (
            letter === undefined ||
            output === undefined ||
            N === undefined ||
            charRepresent === undefined ||
            outRepresent === undefined
          ) {
            throw new Error("Internal Error!");
          }
          return {
            letter: letter,
            output: output,
            N: N,
            charRepresent: charRepresent,
            outRepresent: outRepresent,
          };
        });
      }

      getTransFormLog(): Tag2SystemToTuringMachine218TransformLog | null {
        return this.transformTable;
      }
    })();

    return transformElement;
  }

  public static turingMachine2SymbolToWriteFirstTuringMachine(): ITransformElement<
    TuringMachine,
    WriteFirstTuringMachine,
    TuringMachine2SymbolToWriteFirstTuringMachineTransformLog
  > {
    const transformElement = new (class
      implements
        ITransformElement<
          TuringMachine,
          WriteFirstTuringMachine,
          TuringMachine2SymbolToWriteFirstTuringMachineTransformLog
        >
    {
      private transformLog: TuringMachine2SymbolToWriteFirstTuringMachineTransformLog | null = null;

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
      tmSample: WriteFirstTuringMachine | null = null;

      interpretConfigration(real: TMConfiguration | null): TMConfiguration | null {
        if (real === null) return null;
        if (this.transformLog === null) return null;

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
      bind(system: {
        stateSet: Set<TMState>;
        symbolSet: Set<TMSymbol>;
        blankSymbol: TMSymbol;
        inputSymbolSet: Set<TMSymbol>;
        ruleset: TMRuleSet;
        initState: TMState;
        acceptState: TMState | null;
      }): void {
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
          symbols.forEach((symbol) => {
            const candinates = system.ruleset.getCandinates(state, symbol);
            if (candinates.length === 0) return;
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
    })();

    return transformElement;
  }

  /**
   * @see COCKE, John; MINSKY, Marvin. Universality of tag systems with P= 2. Journal of the ACM (JACM), 1964, 11.1: 15-20.
   */
  public static writeFirstTM2SymbolToTagSystem(
    fillRulesAsPossible = false
  ): ITransformElement<
    WriteFirstTuringMachine,
    TagSystem,
    WriteFirstTM2SymbolToTagSystemTransformLog
  > {
    return new (class
      implements
        ITransformElement<
          WriteFirstTuringMachine,
          TagSystem,
          WriteFirstTM2SymbolToTagSystemTransformLog
        >
    {
      tagSystemSample: TagSystem | null = null;
      transformLog: WriteFirstTM2SymbolToTagSystemTransformLog | null = null;

      getTransFormLog(): WriteFirstTM2SymbolToTagSystemTransformLog | null {
        return this.transformLog;
      }
      interpretConfigration(real: TagSystemConfiguration | null): TMConfiguration | null {
        if (real === null) return null;
        if (this.transformLog === null) return null;

        const { word } = real;
        const wordLetters = word.asLetters();

        if (wordLetters.length < 2) return null;

        const useLetterSets = this.transformLog.symbolCorrespondenceTable.filter(
          (elm) => elm.A === wordLetters[0]
        );

        if (useLetterSets.length !== 1) {
          return null;
        }

        const useLetterSet = useLetterSets[0];
        if (wordLetters[1] !== this.transformLog.letterX) {
          return null;
        }

        let i = 2;
        let leftNum = 0;
        let rightNum = 0;
        if (wordLetters.length <= i) return null;
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
          if (wordLetters.length <= i) return null;
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
          leftToSymbols
            .concat([useLetterSet.whichSymbolReadBefore ?? { meaning: "symbol", value: "*" }])
            .concat(rightToSymbols),
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

      bind(system: {
        stateSet: Set<TMState>;
        symbolSet: Set<TMSymbol>;
        blankSymbol: TMSymbol;
        inputSymbolSet: Set<TMSymbol>;
        ruleset: WriteFirstTMRuleSet;
        acceptState: TMState | null;
      }): void {
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

        const mustSetLastReadIndicatorLetterSet = ["A"];

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
              throw new Error();
            }

            return tmoutCandinates[0];
          })();

          // 現在の状態からappendSymbolに移った時どうなるか
          const toLetter = function (char: string, appendSymbol?: 0 | 1, d?: "'") {
            const appendStr = (function () {
              if (appendSymbol === undefined) return index.toString(10);

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
          const toLetter2 = function (char: string, appendSymbol: 0 | 1) {
            const appendStr =
              index.toString(10) +
              (mustSetLastReadIndicatorLetterSet.includes(char)
                ? ".l_" + appendSymbol.toString(10)
                : "");

            let str = char + (appendStr.length === 1 ? "_" + appendStr : "_{" + appendStr + "}");

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
            ruleSetBuilder.addStop(toLetter2("A", 0));
            ruleSetBuilder.addStop(toLetter2("A", 1));
            ruleSetBuilder.add(toLetter("α"), [X]);
            ruleSetBuilder.add(toLetter("B"), [X]);
            ruleSetBuilder.add(toLetter("β"), [X]);
            ruleSetBuilder.add(toLetter("B", undefined, "'"), [X]);
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
            .add(toLetter("B", undefined, "'"), [toLetter("B", undefined), X])
            .add(toLetter("β", undefined, "'"), [toLetter("β", undefined), X]);

          if (tmout.move === "R") {
            if (tmout.write === symbol0) {
              ruleSetBuilder.add(toLetter2("A", 0), [toLetter("C"), X]);
              ruleSetBuilder.add(toLetter2("A", 1), [toLetter("C"), X]);
            } else {
              ruleSetBuilder.add(toLetter2("A", 0), [toLetter("C"), X, toLetter("c"), X]);
              ruleSetBuilder.add(toLetter2("A", 1), [toLetter("C"), X, toLetter("c"), X]);
            }
            ruleSetBuilder
              .add(toLetter("α"), [toLetter("c"), X, toLetter("c"), X])
              .add(toLetter("B"), [toLetter("S")])
              .add(toLetter("β"), [toLetter("s")]);
          } else {
            ruleSetBuilder
              .add(toLetter2("A", 0), [toLetter("A", undefined, "'"), X])
              .add(toLetter2("A", 1), [toLetter("A", undefined, "'"), X])
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
              ruleSetBuilder.add(toLetter("B"), [toLetter("C", undefined, "'"), X]);
            } else {
              ruleSetBuilder.add(toLetter("B"), [
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
    })();
  }
}

export type SystemInput<T extends ComputationSystem> = Parameters<T["start"]>[0];
export type SystemConfigration<T extends ComputationSystem> = Exclude<
  ReturnType<T["getConfiguration"]>,
  null
>;
export type SystemTuple<T extends ComputationSystem> = ReturnType<T["asTuple"]>;

export interface ITransformElement<
  Take extends ComputationSystem,
  As extends ComputationSystem,
  TransformLog
> {
  interpretConfigration(real: SystemConfigration<As> | null): SystemConfigration<Take> | null;
  interpretInput(virtual: SystemInput<Take>): SystemInput<As>;
  bind(system: SystemTuple<Take>): void;
  asTuple(): SystemTuple<As> | null;
  asIndependantSystem(): As | null;
  getTransFormLog(): TransformLog | null;
}

type SystemsAsHierarchyElements<
  S extends ComputationSystem[] | unknown,
  TransformLog extends unknown[]
> = S extends ComputationSystem[]
  ? S["length"] extends 2
    ? [ITransformElement<S[0], S[1], TransformLog[0]>]
    : [
        ITransformElement<S[0], S[1], TransformLog[0]>,
        ...SystemsAsHierarchyElements<Remove1<S>, Remove1<TransformLog>>
      ]
  : [];

export type Remove2<T extends unknown[]> = T extends [infer _, infer _, ...infer Rests]
  ? Rests
  : unknown[];
export type Remove1<T extends unknown[]> = T extends [infer _, ...infer Rests] ? Rests : unknown[];
export type FirstOf<T extends unknown[]> = T extends [infer F, ...infer _] ? F : T[0];
export type LastOf<T extends unknown[]> = T extends [...infer _, infer Last] ? Last : T[0];

export type HierarchyElementAsTransformLog<
  InitElement extends ITransformElement<ComputationSystem, ComputationSystem, unknown>
> = InitElement extends ITransformElement<infer _, infer _, infer TransformLog>
  ? [TransformLog]
  : never;

export function createHierarchy<
  Take extends ComputationSystem,
  As extends ComputationSystem,
  TransformLog
>(
  initWith: ITransformElement<Take, As, TransformLog>
): ITransformHierarchy<[Take, As], [TransformLog]> {
  return new TransformHierarchy<[Take, As], [TransformLog]>([
    initWith,
  ] as SystemsAsHierarchyElements<[Take, As], [TransformLog]>);
}

export interface ITransformHierarchy<
  S extends ComputationSystem[],
  TransformLog extends unknown[]
> {
  start(inputSystem: FirstOf<S>, input: SystemInput<FirstOf<S>>): void;

  proceed(step: number): void;
  stopped(): boolean;
  getConfiguration<N extends number>(system: N): SystemConfigration<S[N]> | null;
  getTuple<N extends number>(system: N): SystemTuple<S[N]> | null;
  asIndependantSystem<N extends number>(system: N): S[N] | null;
  getTransFormLogOf<S extends number>(smallerSystem: S): TransformLog[S] | null;
  appendLastAndNewHierarchy<Add extends ComputationSystem, TransformLogAdd>(
    append: ITransformElement<LastOf<S>, Add, TransformLogAdd>
  ): ITransformHierarchy<[...S, Add], [...TransformLog, TransformLogAdd]>;
}

class TransformHierarchy<S extends ComputationSystem[], TransformLog extends unknown[]>
  implements ITransformHierarchy<S, TransformLog>
{
  private elements: SystemsAsHierarchyElements<S, TransformLog>;
  private baseSystem: LastOf<S> | null = null;
  private inputSystemSample: FirstOf<S> | null = null;

  public constructor(elements: SystemsAsHierarchyElements<S, TransformLog>) {
    this.elements = elements;
  }

  getTransFormLogOf<S extends number>(smallerSystem: S): TransformLog[S] | null {
    return this.inputSystemSample === null ? null : this.elements[smallerSystem].getTransFormLog();
  }

  stopped(): boolean {
    return this.baseSystem !== null && this.baseSystem.isStopped();
  }

  start(inputSystem: FirstOf<S>, input: Parameters<FirstOf<S>["start"]>[0]): void {
    let tuple: ReturnType<ComputationSystem["asTuple"]> = inputSystem.asTuple();

    this.elements.forEach((elm) => {
      elm.bind(tuple);
      tuple = elm.asTuple();
    });

    let inputCopy: Parameters<ComputationSystem["start"]>[0] = input;
    this.elements.forEach((elm) => {
      inputCopy = elm.interpretInput(inputCopy);
    });
    this.baseSystem = this.elements[this.elements.length - 1].asIndependantSystem() as LastOf<S>;
    this.baseSystem.start(inputCopy as any);

    this.inputSystemSample = inputSystem.clone() as FirstOf<S>;
  }

  proceed(step: number): void {
    if (this.baseSystem === null) {
      throw new Error("You must call start() before proceed().");
    }
    this.baseSystem.proceed(step);
  }

  getConfiguration<N extends number>(
    system: N
  ): Exclude<ReturnType<S[N]["getConfiguration"]>, null> | null {
    if (this.baseSystem === null) return null;

    let ret = this.baseSystem.getConfiguration();
    if (system <= this.elements.length - 1) {
      ret = this.elements[this.elements.length - 1].interpretConfigration(ret);
      for (let i = this.elements.length - 2; system <= i; i--) {
        ret = this.elements[i].interpretConfigration(ret);
      }
    }

    return ret as Exclude<ReturnType<S[N]["getConfiguration"]>, null> | null;
  }

  getTuple<N extends number>(system: N): ReturnType<S[N]["asTuple"]> | null {
    let ret: SystemTuple<ComputationSystem> | null;

    if (system === 0) {
      if (this.inputSystemSample === null) {
        ret = null;
      } else {
        ret = this.inputSystemSample.asTuple();
      }
    } else {
      ret = this.elements[system - 1].asTuple();
    }

    return ret as ReturnType<S[N]["asTuple"]> | null;
  }

  asIndependantSystem<N extends number>(system: N): S[N] | null {
    let ret: ComputationSystem | null;

    if (system === 0) {
      if (this.inputSystemSample === null) {
        ret = null;
      } else {
        ret = this.inputSystemSample.clone();
      }
    } else {
      ret = this.elements[system - 1].asIndependantSystem();
    }

    return ret as S[N];
  }

  appendLastAndNewHierarchy<Add extends ComputationSystem, TransformLogAdd>(
    append: ITransformElement<LastOf<S>, Add, TransformLogAdd>
  ): ITransformHierarchy<[...S, Add], [...TransformLog, TransformLogAdd]> {
    const copyelements = [...this.elements];
    copyelements.push(append);
    return new TransformHierarchy<[...S, Add], [...TransformLog, TransformLogAdd]>(
      copyelements as SystemsAsHierarchyElements<[...S, Add], [...TransformLog, TransformLogAdd]>
    );
  }
}
