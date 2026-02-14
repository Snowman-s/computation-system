import {
  TagSystem,
  TagSystemConfiguration,
  TagSystemLetter,
  TagSystemWord,
} from "../tag-system";
import {
  TMConfiguration,
  TMRuleSet,
  TMState,
  TMStateFrom,
  TMSymbol,
  TMSymbolFrom,
  TuringMachine,
} from "../turing-machine";
import { ITransformElement, SystemTuple } from "../converter";
import { Tag2SystemToTuringMachine218TransformLog } from "../transform-log-types";

/**
 * @see Yurii Rogozhin. Small universal Turing machines. Theoretical Computer Science, 168(2):215–240, 1996.
 */
export class Tag2SystemToTuringMachine218TransformElement
  implements ITransformElement<TagSystem, TuringMachine, Tag2SystemToTuringMachine218TransformLog>
{
  private tuple: {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  };
  private transformLog: Tag2SystemToTuringMachine218TransformLog | null = null;
  private startHead = -1;

  // TMSymbols used in the transformation
  private A: TMSymbol;
  private B: TMSymbol;
  private F: TMSymbol;
  private M: TMSymbol;
  private Q: TMSymbol;
  private R: TMSymbol;

  constructor() {
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

    this.tuple = { ...tm.asTuple() };
    this.A = A;
    this.B = B;
    this.F = F;
    this.M = M;
    this.Q = Q;
    this.R = R;
  }

  asTuple(): {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  } {
    return this.tuple;
  }

  asIndependantSystem(): TuringMachine {
    return new TuringMachine(
      this.tuple.blankSymbol,
      this.tuple.ruleset,
      this.tuple.initState,
      this.tuple.acceptState
    );
  }

  interpretConfigration(real: TMConfiguration | null): TagSystemConfiguration | null {
    if (real === null || this.transformLog === null) return null;

    const { transformTable } = this.transformLog;

    const tape = real.tape;
    const range = tape.getWrittenRange();

    let letters: TagSystemLetter[] = [];
    let stopped = false;

    if (tape.read(range.left + 1) === this.R) {
      //Last letter must be STOP.
      letters.push(transformTable[transformTable.length - 1].letter);
      stopped = true;
    }

    if (!stopped && real.headPosition !== this.startHead) return null;

    let i = range.left;
    for (; i <= this.startHead; i++) {
      if (!stopped) {
        if (
          tape.read(i) !== this.A &&
          tape.read(i) !== this.F &&
          tape.read(i) !== this.Q
        ) {
          return null;
        }
      }
    }
    //最初のRをskip
    while (tape.read(i) === this.R) {
      i++;
    }
    for (let oneCount = 0; i <= range.right; i++) {
      const read = tape.read(i);
      if (read === this.M) {
        const letterCandinate = transformTable.find((elm) => elm.N === oneCount)?.letter;
        if (letterCandinate === undefined) {
          return null;
        }
        letters.push(letterCandinate);
        oneCount = 0;
      } else if (read === this.A) {
        oneCount++;
      } else if (stopped && read === this.B) {
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

  interpretInput(input: [letters: TagSystemLetter[]]): [word: TMSymbol[], headPosition: number] {
    if (this.transformLog === null) {
      throw new Error("interpretInput() was called before bind() was called.");
    }

    const constTable = this.transformLog.transformTable;

    const [virtual] = input;
    const firstLettersMapped = virtual
      .map((letter) => {
        const letterData = constTable
          .map<[TagSystemLetter | undefined, number]>((elm, index) => [elm.letter, index])
          .find((letterAndIndex) => letterAndIndex[0] === letter);

        if (letterData === undefined)
          throw new Error(`This system cannot accept "${letter.value}" as input.`);

        const tableElm = constTable[letterData[1]];
        return [...tableElm.charRepresent, this.M];
      })
      .reduce((a, b) => [...a, ...b]);

    const rules = [...this.transformLog.transformTable]
      .reverse()
      .flatMap((elm) => elm.outRepresent);

    const word = [...rules, this.F, this.F, ...firstLettersMapped];

    this.startHead = rules.length + 1;

    return [word, this.startHead];
  }

  bind(system: SystemTuple<TagSystem>): void {
    if (system.deleteNum !== 2) throw new Error("TagSystem's delete number must be 2.");

    const ruleSet = system.ruleSet;

    // Organize letters and create table
    const rawLetters = Array.from(system.letterSet);

    let stopLetter: TagSystemLetter | null = null;
    let organizedLetters: TagSystemLetter[] = [];
    rawLetters.forEach((v) => {
      const rule = ruleSet.getCandinates(v);
      if (rule.stop) {
        if (stopLetter !== null) throw new Error();
        stopLetter = v;
        return;
      }

      organizedLetters.push(v);
    });

    // 各文字の出現頻度を調べる
    const appearTimes: Map<TagSystemLetter, number> = new Map();
    organizedLetters.forEach((letter) => {
      const rule = ruleSet.getCandinates(letter);
      if (rule.stop) throw new Error("Internal Error!");
      rule.writeWord.asLetters().forEach((outLetter) => {
        appearTimes.set(outLetter, (appearTimes.get(outLetter) ?? 0) + 1);
      });
    });

    organizedLetters.sort((a, b) => (appearTimes.get(b) ?? 0) - (appearTimes.get(a) ?? 0));

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

      elm.charRepresent = Array<TMSymbol>(elm.N).fill(this.A);
    });

    //Determine outputRepresent
    table.forEach((elm) => {
      if (elm.output === "STOP") {
        elm.outRepresent = [this.Q, this.Q];
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
            return [this.A, this.F, ...outputLetterMapped];
          })
          .reduce((a, b) => [...a, ...b])
          .slice(2);

        elm.outRepresent = [this.F, this.F, ...outputLettersConcated];
      }
    });

    this.transformLog = {
      transformTable: table.map((elm) => {
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
      }),
    };
  }

  getTransFormLog(): Tag2SystemToTuringMachine218TransformLog | null {
    return this.transformLog;
  }
}
