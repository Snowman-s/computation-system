export type TagSystemLetter = { readonly value: string };

export function TagSystemLetterFrom(...strs: string[]): TagSystemLetter[] {
  return strs.map((str) => {
    return {
      value: str,
    };
  });
}

export interface TagSystemWord {
  getLetters(): TagSystemLetter[];

  toString(): string;
}

function asWord(letters: TagSystemLetter[]) {
  const copy = [...letters];

  return new (class implements TagSystemWord {
    getLetters(): TagSystemLetter[] {
      return copy;
    }
    toString(): string {
      return copy.map((letter) => letter.value).join("");
    }
  })();
}

export type TagSystemRule = {
  readonly firstLetter: TagSystemLetter;
  readonly out: TagSystemRuleOutput;
};
export type TagSystemRuleOutput =
  | { readonly stop: false; readonly writeWord: TagSystemWord }
  | { readonly stop: true };

class TagSystemEquality {
  static ruleEquals(a: TagSystemRule, b: TagSystemRule) {
    if (a.out.stop) {
      return a.firstLetter === b.firstLetter && a.out.stop === b.out.stop;
    } else {
      if (a.out.stop !== b.out.stop) return false;
      return a.firstLetter === b.firstLetter && this.wordEquals(a.out.writeWord, b.out.writeWord);
    }
  }

  static wordEquals(a: TagSystemWord, b: TagSystemWord) {
    const aLetter = a.getLetters();
    const bLetter = b.getLetters();

    if (aLetter.length !== bLetter.length) return false;

    const diff = aLetter.filter((letter, index) => {
      return letter.value !== bLetter[index].value;
    });

    return diff.length === 0;
  }
}

export class TagSystemRuleSet {
  public static builder() {
    return new TagSystemRuleSetBuilder();
  }

  private readonly rules: TagSystemRule[] = [];

  constructor(rules: TagSystemRule[]) {
    this.rules = [...rules];
  }

  public getCandinates(firstLetter: TagSystemLetter) {
    return this.rules.filter((rule) => rule.firstLetter === firstLetter).map((rule) => rule.out);
  }

  public getAllUsedLetters() {
    const letters: TagSystemLetter[] = [];

    this.rules.forEach((rule) => {
      if (letters.filter((l) => l.value === rule.firstLetter.value).length === 0) {
        letters.push(rule.firstLetter);
      }
      if (!rule.out.stop) {
        rule.out.writeWord.getLetters().forEach((letter) => {
          if (letters.filter((l) => l.value === letter.value).length === 0) {
            letters.push(letter);
          }
        });
      }
    });

    return letters;
  }

  public toString() {
    let v = function <T>(k: { value: T }) {
      return k.value;
    };
    return (
      "[" +
      this.rules
        .map((rule) => {
          if (rule.out.stop) {
            return `${v(rule.firstLetter)} → STOP`;
          } else {
            return `${v(rule.firstLetter)} → ${rule.out.writeWord}`;
          }
        })
        .join(", ") +
      "]"
    );
  }
}

export class TagSystemRuleSetBuilder {
  private rules: TagSystemRule[] = [];

  public add(firstLetter: TagSystemLetter, writeWord: TagSystemLetter[]) {
    const e: TagSystemRule = {
      firstLetter: firstLetter,
      out: {
        stop: false,
        writeWord: asWord(writeWord),
      },
    };

    if (this.rules.filter((a) => TagSystemEquality.ruleEquals(a, e)).length === 0) {
      this.rules.push(e);
    }

    return this;
  }

  public addStop(firstLetter: TagSystemLetter) {
    const e: TagSystemRule = {
      firstLetter: firstLetter,
      out: {
        stop: true,
      },
    };

    if (this.rules.filter((a) => TagSystemEquality.ruleEquals(a, e)).length === 0) {
      this.rules.push(e);
    }

    return this;
  }

  public build() {
    return new TagSystemRuleSet(this.rules);
  }
}

export class TagSystem {
  private readonly deleteNum: number;
  private readonly ruleSet: TagSystemRuleSet;
  private letters: TagSystemLetter[] | null = null;
  private stop: boolean = false;

  constructor(deleteNum: number, ruleSet: TagSystemRuleSet) {
    if (deleteNum <= 0) throw new Error(`deleteNum must be > 0, but was ${deleteNum}.`);
    this.deleteNum = deleteNum;
    this.ruleSet = ruleSet;
  }

  public start(letters: TagSystemLetter[]) {
    this.letters = letters;
    this.stop = false;
  }

  public proceed(step = 1) {
    if (step < 0) {
      throw new Error('"step" must be >= 0.');
    }

    if (this.letters === null) {
      throw new Error("You must call start() before proceed().");
    }
    for (let i = 0; i < step; i++) {
      if (this.isStopped()) return;
      if (this.letters.length < this.deleteNum) {
        this.stop = true;
        return;
      }

      const firstLetter = this.letters[0];

      const candinateRules = this.ruleSet.getCandinates(firstLetter);

      if (candinateRules.length > 1) {
        throw new Error(`Many rules corresponding to {${firstLetter.value}} are defined.`);
      } else if (candinateRules.length == 0) {
        throw new Error(`The rule corresponding to {${firstLetter.value}} is not defined.`);
      }

      const action = candinateRules[0];
      if (action.stop) {
        this.stop = true;
        break;
      }

      //ストップ命令でないので、文字を消す
      this.letters.splice(0, this.deleteNum);
      const letters = this.letters;
      action.writeWord.getLetters().forEach((letter) => letters.push(letter));
    }
  }

  public isStopped() {
    return this.stop;
  }

  public asTuple() {
    return {
      deleteNum: this.deleteNum,
      letterSet: this.ruleSet.getAllUsedLetters(),
      ruleSet: this.ruleSet,
    };
  }

  public getNowWord() {
    if (this.letters === null) return null;

    return asWord(this.letters);
  }

  public toString() {
    return `[ruleset=${this.ruleSet}]`;
  }
}
