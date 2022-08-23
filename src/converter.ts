import { TagSystem, TagSystemConfiguration, TagSystemLetter, TagSystemWord } from "./tag-system";
import {
  TMConfiguration,
  TMRuleSet,
  TMState,
  TMStateFrom,
  TMSymbol,
  TMSymbolFrom,
  TuringMachine,
} from "./turing-machine";

export class Converter {
  private constructor() {}

  public static tag2SystemToTuringMachine218<
    S extends [...ComputationSystem[], TagSystem] = [TagSystem]
  >(hierarchy: ITransformHierarchy<S>): ITransformHierarchy<[...S, TuringMachine]> {
    let result = this._tag2SystemToTuringMachine218();

    return hierarchy.appendLastAndNewHierarchy<TuringMachine>(result[0], result[1]);
  }

  public static tag2SystemToTuringMachine218New(): ITransformHierarchy<[TagSystem, TuringMachine]> {
    let result = this._tag2SystemToTuringMachine218();

    return new TransformHierarchy<[TagSystem, TuringMachine]>([result[0]], result[1]);
  }

  //https://www.sciencedirect.com/science/article/pii/S0304397596000771
  private static _tag2SystemToTuringMachine218(): [
    ITransformElement<TagSystem, TuringMachine>,
    TuringMachine
  ] {
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

    const transformElement = new (class implements ITransformElement<TagSystem, TuringMachine> {
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
      private transformTable: [
        letter: TagSystemLetter,
        output: TagSystemWord | "STOP",
        N: number,
        charRepresent: TMSymbol[],
        outRepresent: TMSymbol[]
      ][] = [];

      private startHead = -1;

      interpretConfigration(real: TMConfiguration | null): TagSystemConfiguration | null {
        if (real === null) return null;

        const tape = real.tape;
        const range = tape.getWrittenRange();

        let letters: TagSystemLetter[] = [];
        let stopped = false;
        if (tape.read(range.left + 1) === R) {
          //Last letter must be STOP.
          letters.push(this.transformTable[this.transformTable.length - 1][0]);
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
            const letterCandinate = this.transformTable.find((elm) => elm[2] === oneCount)?.[0];
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
        const [virtual] = input;
        const firstLettersMapped = virtual
          .map((letter) => {
            const letterData = this.transformTable
              .map<[TagSystemLetter | undefined, number]>((elm, index) => [elm[0], index])
              .find((letterAndIndex) => letterAndIndex[0] === letter);

            if (letterData === undefined)
              throw new Error(`This system cannot accept "${letter.value}" as input.`);

            const tableElm = this.transformTable[letterData[1]];
            return [...tableElm[3], M];
          })
          .reduce((a, b) => [...a, ...b]);

        const rules = [...this.transformTable]
          .reverse()
          .map((elm) => elm[4])
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
        if (stopLetter !== null) organizedLetters.push(stopLetter);

        let table: [
          letter: TagSystemLetter | undefined,
          output: TagSystemWord | "STOP" | undefined,
          N: number,
          charRepresent: TMSymbol[] | undefined,
          outRepresent: TMSymbol[] | undefined
        ][] = organizedLetters.map((letter) => {
          const ruleOut = ruleSet.getCandinates(letter);
          if (ruleOut.stop) {
            //"STOP" should come at the end of the table
            return [letter, "STOP", -1, undefined, undefined];
          } else {
            return [letter, ruleOut.writeWord, -1, undefined, undefined];
          }
        });

        //Determine charRepresent
        table.forEach((elm, i) => {
          if (i === 0) {
            elm[2] = 1;
          } else {
            const beforeRuleOutput = table[i - 1][1];
            //should not be happend
            if (beforeRuleOutput === "STOP" || beforeRuleOutput === undefined)
              throw new Error("Internal Error!");

            elm[2] = table[i - 1][2] + beforeRuleOutput.asLetters().length + 1;
          }

          elm[3] = Array<TMSymbol>(elm[2]).fill(A);
        });

        //Determine outputRepresent
        table.forEach((elm) => {
          if (elm[1] === "STOP") {
            elm[4] = [Q, Q];
          } else {
            if (elm[1] === undefined) throw new Error("Internal Error!");

            const outputLetters = [...elm[1].asLetters()];
            const outputLettersMapped = outputLetters.reverse().map((mapLetter) => {
              const letterData = table
                .map<[TagSystemLetter | undefined, number]>((elm, index) => [elm[0], index])
                .find((letterAndIndex) => letterAndIndex[0] === mapLetter);
              if (letterData === undefined) throw new Error("Internal Error!");
              const ret = table[letterData[1]][3];
              if (ret === undefined) throw new Error("Internal Error!");
              return ret;
            });

            const outputLettersConcated = outputLettersMapped
              .map((outputLetterMapped) => {
                return [A, F, ...outputLetterMapped];
              })
              .reduce((a, b) => [...a, ...b])
              .slice(2);

            elm[4] = [F, F, ...outputLettersConcated];
          }
        });

        this.transformTable = table.map((elm) => {
          const [a, b, c, d, e] = elm;
          if (
            a === undefined ||
            b === undefined ||
            c === undefined ||
            d === undefined ||
            e === undefined
          ) {
            throw new Error("Internal Error!");
          }
          return [a, b, c, d, e];
        });
      }
    })();

    return [transformElement, tm];
  }
}

export type ComputationSystem = TuringMachine | TagSystem;
export type SystemInput<T extends ComputationSystem> = Parameters<T["start"]>[0];
export type SystemConfigration<T extends ComputationSystem> = Exclude<
  ReturnType<T["getConfiguration"]>,
  null
>;
export type SystemTuple<T extends ComputationSystem> = ReturnType<T["asTuple"]>;

export interface ITransformElement<Take extends ComputationSystem, As extends ComputationSystem> {
  interpretConfigration(real: SystemConfigration<As> | null): SystemConfigration<Take> | null;
  interpretInput(virtual: SystemInput<Take>): SystemInput<As>;
  bind(system: SystemTuple<Take>): void;
  asTuple(): SystemTuple<As>;
  asIndependantSystem(): As;
}

type SystemsAsHierarchyElements<S extends ComputationSystem[] | unknown> =
  S extends ComputationSystem[]
    ? S["length"] extends 2
      ? [ITransformElement<S[0], S[1]>]
      : [ITransformElement<S[0], S[1]>, ...SystemsAsHierarchyElements<Remove1<S>>]
    : [];

export type Remove2<T extends unknown[]> = T extends [infer _, infer _, ...infer Rests]
  ? Rests
  : unknown[];
export type Remove1<T extends unknown[]> = T extends [infer _, ...infer Rests] ? Rests : unknown[];
export type FirstOf<T extends unknown[]> = T extends [infer F, ...infer _] ? F : T[0];
export type LastOf<T extends unknown[]> = T extends [...infer _, infer Last] ? Last : T[0];

export interface ITransformHierarchy<S extends ComputationSystem[]> {
  start(inputSystem: FirstOf<S>, input: SystemInput<FirstOf<S>>): void;

  proceed(step: number): void;
  stopped(): boolean;
  getConfiguration<N extends number>(system: N): SystemConfigration<S[N]> | null;
  getTuple<N extends number>(system: N): SystemTuple<S[N]> | null;
  asIndependantSystem<N extends number>(system: N): S[N] | null;
  appendLastAndNewHierarchy<Add extends ComputationSystem>(
    append: ITransformElement<LastOf<S>, Add>,
    newBase: Add
  ): ITransformHierarchy<[...S, Add]>;
}

export class TransformHierarchy<S extends ComputationSystem[]> implements ITransformHierarchy<S> {
  private elements: SystemsAsHierarchyElements<S>;
  private baseSystem: LastOf<S>;
  private inputSystemSample: FirstOf<S> | null = null;

  public constructor(elements: SystemsAsHierarchyElements<S>, baseSystem: LastOf<S>) {
    this.elements = elements;
    this.baseSystem = baseSystem.clone() as LastOf<S>;
  }

  stopped(): boolean {
    return this.baseSystem.isStopped();
  }

  start(inputSystem: FirstOf<S>, input: Parameters<FirstOf<S>["start"]>[0]): void {
    this.inputSystemSample = inputSystem.clone() as FirstOf<S>;

    let tuple: ReturnType<ComputationSystem["asTuple"]> = inputSystem.asTuple();

    this.elements.forEach((elm) => {
      elm.bind(tuple);
      tuple = elm.asTuple();
    });

    let inputCopy: Parameters<ComputationSystem["start"]>[0] = input;
    this.elements.forEach((elm) => {
      inputCopy = elm.interpretInput(inputCopy);
    });
    this.baseSystem.start(inputCopy as any);
  }

  proceed(step: number): void {
    this.baseSystem.proceed(step);
  }

  getConfiguration<N extends number>(
    system: N
  ): Exclude<ReturnType<S[N]["getConfiguration"]>, null> | null {
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

  appendLastAndNewHierarchy<Add extends ComputationSystem>(
    append: ITransformElement<LastOf<S>, Add>,
    newBase: Add
  ): ITransformHierarchy<[...S, Add]> {
    const copyelements = [...this.elements];
    copyelements.push(append);
    return new TransformHierarchy<[...S, Add]>(
      copyelements as SystemsAsHierarchyElements<[...S, Add]>,
      newBase as LastOf<[...S, Add]>
    );
  }
}
