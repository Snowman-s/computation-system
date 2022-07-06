/**
 * Letters that make up the word to be processed in the tag system.
 */
export type TagSystemLetter = { readonly value: string };

/**
 * Create TagSystemLetter list with each element of strs as its representation.
 * @param strs List of string representation corresponding to each letter that will be created.
 * @returns Created letter list, whose length is the same as "strs".
 */
export function TagSystemLetterFrom(...strs: string[]): TagSystemLetter[] {
  return strs.map((str) => {
    return {
      value: str,
    };
  });
}

/**
 * The "sequence of letters" used by the tag system.
 */
export interface TagSystemWord {
  /**
   * Returns letter sequence representation of this word.
   */
  asLetters(): TagSystemLetter[];
  /**
   * Returns string representation of this word.
   */
  toString(): string;
}

function asWord(letters: TagSystemLetter[]) {
  const copy = [...letters];

  return new (class implements TagSystemWord {
    asLetters(): TagSystemLetter[] {
      return copy;
    }
    toString(): string {
      return copy.map((letter) => letter.value).join("");
    }
  })();
}

/**
 * Rules for tag system behavior.
 */
export type TagSystemRule = {
  readonly firstLetter: TagSystemLetter;
  readonly out: TagSystemRuleOutput;
};

/**
 * The information on what changes will occur after the rule is applied
 * @see {@link TagSystemRule}
 */
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
    const aLetter = a.asLetters();
    const bLetter = b.asLetters();

    if (aLetter.length !== bLetter.length) return false;

    const diff = aLetter.filter((letter, index) => {
      return letter.value !== bLetter[index].value;
    });

    return diff.length === 0;
  }
}

/**
 * The tag system's program.
 *
 * @remarks
 * You should use {@link TagSystemRuleSet.builder} to construct this.
 */
export class TagSystemRuleSet {
  /**
   * Create builder for TagSystemRuleSet.
   * @returns Created builder.
   */
  public static builder() {
    return new TagSystemRuleSetBuilder();
  }

  private readonly rules: TagSystemRule[] = [];

  /**
   * Construct TagSystemRuleset with given rules.
   *
   * @remarks
   * This method is used by the library.
   * Usually, users should use {@link TagSystemRuleSet.builder}.
   *
   * @param rules list of rule.
   */
  constructor(rules: TagSystemRule[]) {
    this.rules = [...rules];
  }

  /**
   * Returns what kind of change occurred in the tag system when the given letter.
   * @param firstLetter first character of the word being processed.
   * @returns list of what indicates kind of change
   */
  public getCandinates(firstLetter: TagSystemLetter) {
    return this.rules.filter((rule) => rule.firstLetter === firstLetter).map((rule) => rule.out);
  }

  /**
   * Returns all letters that this rule uses.
   * @returns list of the letters
   */
  public getAllUsedLetters() {
    const letters: TagSystemLetter[] = [];

    this.rules.forEach((rule) => {
      if (letters.filter((l) => l.value === rule.firstLetter.value).length === 0) {
        letters.push(rule.firstLetter);
      }
      if (!rule.out.stop) {
        rule.out.writeWord.asLetters().forEach((letter) => {
          if (letters.filter((l) => l.value === letter.value).length === 0) {
            letters.push(letter);
          }
        });
      }
    });

    return letters;
  }

  /**
   * Returns string representation of this ruleset.
   * @returns string representation of this ruleset
   */
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

/**
 * A builder to build the tag system's ruleset.
 * @see {@link TagSystemRuleSet}
 */
export class TagSystemRuleSetBuilder {
  private rules: TagSystemRule[] = [];

  /**
   * Add rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When the first letter of a word is *firstLetter*, add *writeWord* after the word and delete the first *m* letters."
   * *m* is set by {@link TagSystem}.
   *
   * @param firstLetter
   * @param writeWord
   * @returns This builder, to method chains.
   */
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

  /**
   * Add STOP rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When the first letter of a word is *firstLetter*, this tag system stops working."
   *
   * @param firstLetter
   * @returns This builder, to method chains.
   */
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

  /**
   * Build the rule-set with the configured rules.
   * @returns Created rule-set.
   */
  public build() {
    return new TagSystemRuleSet(this.rules);
  }
}

/**
 * A object for simulate the tag system.
 */
export class TagSystem {
  private readonly deleteNum: number;
  private readonly ruleSet: TagSystemRuleSet;
  private letters: TagSystemLetter[] | null = null;
  private stop: boolean = false;

  /**
   * Initialize machine with given arguments.
   * @param deleteNum An integer indicating how many of the first letters of the word are to be deleted. Must be > 0.
   * @param ruleSet Rules that determine how the tag system moves.
   */
  constructor(deleteNum: number, ruleSet: TagSystemRuleSet) {
    if (deleteNum <= 0) throw new Error(`deleteNum must be > 0, but was ${deleteNum}.`);
    this.deleteNum = deleteNum;
    this.ruleSet = ruleSet;
  }

  /**
   * Initiates processing for letters.
   * @param letters A word being processed.
   */
  public start(letters: TagSystemLetter[]) {
    this.letters = letters;
    this.stop = false;
  }

  /**
   * Proceeds with this system. This method must be called after {@link TagSystem.start} called, or get an error,
   *
   * @remarks
   * One "step" is a sequence of reading the first letter, adding a sequence of letters to the end of a word, and erasing m letters.
   * @remarks
   * This method does not change the machine status, if {@link TagSystem.isStopped} is true.
   *
   * @param step Non-negative integer indicating how many steps to advance this system.
   */
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
      action.writeWord.asLetters().forEach((letter) => letters.push(letter));
    }
  }

  /**
   * Returns whether this system is stoped.
   *
   * @returns True if this machine is stoped, false otherwise.
   */
  public isStopped() {
    return this.stop;
  }

  /**
   * Returns a tuple representation of this system.
   *
   * @remarks
   * A Turing machine is represented as follows:
   * - deleteNum - The number of letters to be deleted from a word.
   * - letterSet - List of all letters this system uses.
   * - ruleSet - List of rules used by this system.
   *
   * @returns a tuple representation of this machine.
   */
  public asTuple() {
    return {
      deleteNum: this.deleteNum,
      letterSet: this.ruleSet.getAllUsedLetters(),
      ruleSet: this.ruleSet,
    };
  }

  /**
   * Returns currently processing words.
   * @returns Currently processing words.
   */
  public getNowWord() {
    if (this.letters === null) return null;

    return asWord(this.letters);
  }

  /**
   * Returns string representation of this system.
   * @returns String representation of this system.
   */
  public toString() {
    return `[ruleset=${this.ruleSet}]`;
  }
}
