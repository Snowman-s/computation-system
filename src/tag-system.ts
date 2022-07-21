/**
 * Letters that make up the word to be processed in the tag system.
 *
 * @remarks In this library, letters are "equal" if the two characters are the same object.
 * Simply having equal "value" does not make them equal characters.
 *
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
      return [...copy];
    }
    toString(): string {
      return copy.map((letter) => letter.value).join("");
    }
  })();
}

/**
 * The information on what changes will occur after the rule is applied
 * @see {@link TagSystemRule}
 */
export type TagSystemRuleOutput =
  | { readonly stop: false; readonly writeWord: TagSystemWord }
  | { readonly stop: true };

/**
 * The tag system's program.
 *
 * @remarks
 * You should use {@link TagSystemRuleSet.builder} to construct this.
 *
 * @remarks
 * For each character used, only one rule must be defined to convert it.
 */
export class TagSystemRuleSet {
  /**
   * Create builder for TagSystemRuleSet.
   * @returns Created builder.
   */
  public static builder() {
    return new TagSystemRuleSetBuilder();
  }

  private readonly rules: Map<TagSystemLetter, TagSystemRuleOutput>;
  private readonly usedLetters: Set<TagSystemLetter>;

  /**
   * Construct TagSystemRuleset with given rules.
   *
   * @remarks
   * This method is used by the library.
   * You must use {@link TagSystemRuleSet.builder}.
   *
   * @param rules list of rule.
   */
  constructor(rules: Map<TagSystemLetter, TagSystemRuleOutput>) {
    const usedLetters = new Set(rules.keys());

    // For each character used, only one rule must be defined to convert it.
    rules.forEach((rule) => {
      if ("writeWord" in rule) {
        rule.writeWord.asLetters().forEach((letter) => {
          if (!usedLetters.has(letter)) throw new Error("Invalid rules.");
        });
      }
    });

    this.rules = new Map(rules);
    this.usedLetters = usedLetters;
  }

  /**
   * Returns what kind of change occurred in the tag system when the given letter.
   * @param firstLetter first character of the word being processed.
   * @returns what indicates kind of change
   */
  public getCandinates(firstLetter: TagSystemLetter): TagSystemRuleOutput {
    const v = this.rules.get(firstLetter);
    if (v === undefined) throw new Error(`Cannot find rule that transform "${firstLetter.value}"`);

    return v;
  }

  /**
   * Returns all letters that this rule uses.
   * @returns set of the letters
   */
  public getAllUsedLetters(): Set<TagSystemLetter> {
    return this.usedLetters;
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
      Array.from(this.rules)
        .map(([firstLetter, out]) => {
          if (out.stop) {
            return `${v(firstLetter)} → STOP`;
          } else {
            return `${v(firstLetter)} → ${out.writeWord}`;
          }
        })
        .join(", ") +
      "]"
    );
  }
}

/**
 * A builder to build the tag system's ruleset.
 *
 * @see {@link TagSystemRuleSet}
 */
export class TagSystemRuleSetBuilder {
  private rules: Map<TagSystemLetter, TagSystemRuleOutput | undefined> = new Map();

  /**
   * Add rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When the first letter of a word is *firstLetter*, add *writeWord* after the word and delete the first *m* letters."
   * *m* is set by {@link TagSystem}.
   *
   * @throws If a rule with the same "firstLetter" has already been added.
   *
   * @param firstLetter
   * @param writeWord
   * @returns This builder, to method chains.
   */
  public add(firstLetter: TagSystemLetter, writeWord: TagSystemLetter[]) {
    if (this.rules.has(firstLetter) && this.rules.get(firstLetter) !== undefined) {
      throw new Error(`The firstLetter(${firstLetter.value}) was already used.`);
    }

    writeWord
      .filter((t) => !this.rules.has(t))
      .forEach((letter) => {
        this.rules.set(letter, undefined);
      });

    this.rules.set(firstLetter, {
      stop: false,
      writeWord: asWord(writeWord),
    });

    return this;
  }

  /**
   * Add STOP rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When the first letter of a word is *firstLetter*, this tag system stops working."
   *
   * @throws If a rule with the same "firstLetter" has already been added.
   *
   * @param firstLetter
   * @returns This builder, to method chains.
   */
  public addStop(firstLetter: TagSystemLetter) {
    if (this.rules.has(firstLetter) && this.rules.get(firstLetter) !== undefined) {
      throw new Error(`The firstLetter(${firstLetter.value}) was already used.`);
    }

    this.rules.set(firstLetter, {
      stop: true,
    });

    return this;
  }

  private hasNotUndefined(
    map: Map<TagSystemLetter, TagSystemRuleOutput | undefined>
  ): map is Map<TagSystemLetter, TagSystemRuleOutput> {
    const errors: TagSystemLetter[] = [];
    map.forEach((out, letter) => {
      if (out === undefined) errors.push(letter);
    });

    if (errors.length > 0) {
      throw new Error(
        `No rules are defined for these letters:[${errors.map((l) => l.value).join(", ")}]`
      );
    }

    return true;
  }

  /**
   * Build the rule-set with the configured rules.
   *
   * @remarks When calling this function, only one rule must be defined for each character. Otherwise, it throws an error.
   *
   * @returns Created rule-set.
   */
  public build() {
    if (this.hasNotUndefined(this.rules)) {
      return new TagSystemRuleSet(this.rules);
    } else {
      //到達不可
      throw new Error();
    }
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
   * @throws when a letters does not contain a letter defined by the conversion rules.
   * @param letters A word being processed.
   */
  public start(letters: TagSystemLetter[]) {
    this.letters = letters;

    const usedLetters = this.ruleSet.getAllUsedLetters();
    const errorLetters = letters.filter((letter) => !usedLetters.has(letter));
    if (errorLetters.length > 0) {
      throw new Error(
        `No rules are defined for these letters:${errorLetters
          .map((letter) => letter.value)
          .join(", ")}`
      );
    }

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

      const candinateRule = this.ruleSet.getCandinates(firstLetter);

      const action = candinateRule;
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
