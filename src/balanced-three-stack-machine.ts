import { ComputationSystem } from "./computation-system";

/**
 * The control of the balanced three-stack machine, which determines which rules can be applied.
 */
export interface ThreeStackControl { readonly value: string; readonly meaning: "control" }
/**
 * A letter stored in the stacks of the balanced three-stack machine.
 */
export interface ThreeStackLetter { readonly value: string; readonly meaning: "letter" }

/**
 * Create ThreeStackControl list with each element of strs as its representation.
 * @param strs List of string representation corresponding to each control that will be created
 * @returns Created control list, whose length is the same as "strs"
 */
export function ThreeStackControlFrom(...strs: string[]): ThreeStackControl[] {
  return strs.map((s) => ({ value: s, meaning: "control" }));
}

/**
 * Create ThreeStackLetter list with each element of strs as its representation.
 * @param strs List of string representation corresponding to each letter that will be created
 * @returns Created letter list, whose length is the same as "strs"
 */
export function ThreeStackLetterFrom(...strs: string[]): ThreeStackLetter[] {
  return strs.map((s) => ({ value: s, meaning: "letter" }));
}

/**
 * A finite word on a stack.
 *
 * @remarks
 * Index 0 is the top of the stack.
 * When used as the content of a stack, it is (conceptually) followed by an infinite sequence of the blank letter.
 */
export type ThreeStackWord = readonly ThreeStackLetter[];

/**
 * Words for each of the three stacks, in the order of stack index 0, 1, 2.
 */
export type ThreeStacks = readonly [ThreeStackWord, ThreeStackWord, ThreeStackWord];

/**
 * A rule of the balanced three-stack machine.
 *
 * @remarks
 * The rule is interpreted as "When the control is *fromControl* and each stack j starts with *pop[j]*,
 * replace the prefix *pop[j]* with *push[j]* on each stack j, and change the control to *toControl*".
 * The tails of the stacks are left unchanged.
 *
 * The rule must be balanced: the sum of the lengths of *pop* equals that of *push*.
 */
export interface BalancedThreeStackRule {
  readonly fromControl: ThreeStackControl;
  readonly pop: ThreeStacks;
  readonly toControl: ThreeStackControl;
  readonly push: ThreeStacks;
}

/**
 * The operation-independent definition of the balanced three-stack machine.
 * @see {@link BalancedThreeStackMachine.asTuple}
 */
export interface BalancedThreeStackMachineTuple {
  readonly controlSet: ReadonlySet<ThreeStackControl>;
  readonly letterSet: ReadonlySet<ThreeStackLetter>;
  readonly blank: ThreeStackLetter;
  readonly rules: readonly BalancedThreeStackRule[];
  readonly initControl: ThreeStackControl;
}

/**
 * The runtime state of the balanced three-stack machine.
 *
 * @remarks
 * Each stack is represented by its finite part with trailing blank letters removed,
 * so that two configurations representing the same infinite stacks are structurally equal.
 */
export interface BalancedThreeStackMachineConfiguration {
  readonly control: ThreeStackControl;
  readonly stacks: ThreeStacks;
}

/**
 * Returns whether one of the two words is a prefix of the other.
 *
 * @remarks
 * Two rules whose prefixes are comparable on every stack can match the same configuration,
 * so this is used to check that the rule sources (or targets) are separated.
 *
 * @param a A word
 * @param b Another word
 * @returns True if a is a prefix of b or b is a prefix of a, false otherwise.
 */
function prefixComparable(a: ThreeStackWord, b: ThreeStackWord): boolean {
  return a.length <= b.length && a.every((letter, index) => letter === b[index]) ||
         b.length <= a.length && b.every((letter, index) => letter === a[index]);
}

/**
 * A stack whose finite part is followed by an infinite sequence of the blank letter.
 *
 * @remarks
 * The top is stored at the end of the internal array so that replacing a prefix costs only its length.
 * The bottom of the internal array is never the blank letter,
 * so that the finite part is always normalized without trimming.
 */
class BlankPaddedStack {
  private readonly letters: ThreeStackLetter[];
  private readonly blank: ThreeStackLetter;

  private constructor(letters: ThreeStackLetter[], blank: ThreeStackLetter) {
    this.letters = letters;
    this.blank = blank;
  }

  /**
   * Create a stack from a word whose index 0 is the top.
   * @param word The finite part of the stack. Trailing blank letters are discarded.
   * @param blank The blank letter that fills the stack beyond its finite part
   * @returns Created stack
   */
  public static from(word: ThreeStackWord, blank: ThreeStackLetter): BlankPaddedStack {
    const stack = new BlankPaddedStack([], blank);
    stack.push(word);
    return stack;
  }

  /**
   * Returns whether the stack starts with the given prefix.
   *
   * @remarks
   * A prefix longer than the finite part can still match, since the positions beyond it are blank
   * (e.g. "★b" in rule (10) of the paper).
   *
   * @param prefix The prefix to test, whose index 0 is the top
   * @returns True if the stack starts with the prefix, false otherwise.
   */
  public startsWith(prefix: ThreeStackWord): boolean {
    const top = this.letters.length - 1;
    for (let i = 0; i < prefix.length; i++) {
      const letter = top - i >= 0 ? this.letters[top - i] : this.blank;
      if (letter !== prefix[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Removes n letters from the top.
   *
   * @remarks
   * Letters beyond the finite part are regarded as blank letters consumed from the infinite tail.
   *
   * @param n Number of letters to remove
   */
  public drop(n: number): void {
    this.letters.length = Math.max(0, this.letters.length - n);
  }

  /**
   * Pushes a word onto the top.
   * @param word The word to push, whose index 0 becomes the new top
   */
  public push(word: ThreeStackWord): void {
    for (let i = word.length - 1; i >= 0; i--) {
      // A blank pushed onto an empty stack is indistinguishable from the infinite blank tail,
      // so it is discarded to keep the bottom of the array non-blank.
      if (this.letters.length === 0 && word[i] === this.blank) {
        continue;
      }
      this.letters.push(word[i]);
    }
  }

  /**
   * Returns the finite part of the stack.
   * @returns The word whose index 0 is the top, without trailing blank letters
   */
  public toWord(): ThreeStackWord {
    return [...this.letters].reverse();
  }
}

/**
 * A object for simulate the balanced three-stack machine.
 *
 * @remarks
 * Every rule replaces finite prefixes of three stacks while preserving the sum of their lengths.
 * If every stack letter is chosen uniformly at random, stacks starting with prefixes of total length n
 * occur with probability |letters|^(-n), so this balance means that every rule maps the configurations it applies to
 * onto configurations of exactly the same probability: no rule compresses or expands the configuration space.
 * The families of rule sources and of rule targets are each required to be pairwise separated,
 * so the machine is deterministic and each step is injective.
 * The machine stops when no rule is applicable.
 *
 * @see OpenAI. Incompressible Box Transport and Finite Computation. preprint, 2026. (Section 4)
 */
export class BalancedThreeStackMachine implements ComputationSystem {
  private control: ThreeStackControl | null = null;
  private stacks: [BlankPaddedStack, BlankPaddedStack, BlankPaddedStack] | null = null;

  private tuple: BalancedThreeStackMachineTuple;
  private ruleCache = new Map<ThreeStackControl, BalancedThreeStackRule[]>();

  /**
   * Initialize machine with given arguments.
   *
   * @param blank A blank letter. Each stack is (conceptually) followed by an infinite sequence of this letter.
   * @param rules Rules that determine how the stacks are rewritten.
   * @param initControl Control of the machine when it starts.
   * @throws {Error} If a rule is not balanced.
   * @throws {Error} If two rules with the same *fromControl* have sources that are not separated (comparable prefixes on all three stacks).
   * @throws {Error} If two rules with the same *toControl* have targets that are not separated (comparable prefixes on all three stacks).
   */
  constructor(blank: ThreeStackLetter, rules: BalancedThreeStackRule[], initControl: ThreeStackControl) {
    const controlSet = new Set<ThreeStackControl>([initControl]);
    const letterSet = new Set<ThreeStackLetter>([blank]);
    for (const rule of rules) {
      this.ruleCache.set(rule.fromControl, [...(this.ruleCache.get(rule.fromControl) ?? []), rule]);

      controlSet.add(rule.fromControl);
      controlSet.add(rule.toControl);
      for (const stack of rule.pop) {
        for (const letter of stack) {
          letterSet.add(letter);
        }
      }
      for (const stack of rule.push) {
        for (const letter of stack) {
          letterSet.add(letter);
        }
      }
      // An unbalanced rule would compress or expand the configuration space,
      // which the construction of the paper (Section 4) does not allow.
      const popLength = rule.pop[0].length + rule.pop[1].length + rule.pop[2].length;
      const pushLength = rule.push[0].length + rule.push[1].length + rule.push[2].length;
      if (popLength !== pushLength) {
        throw new Error(`Rule is not balanced: ${rule.fromControl.value} -> ${rule.toControl.value}`);
      }
    }
    // Rules with different controls never match the same configuration, so only pairs sharing a control are checked.
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        if (rules[i].fromControl === rules[j].fromControl) {
          // Unless the pops differ on at least one stack, both rules can match the same configuration,
          // and the machine is not deterministic.
          if (prefixComparable(rules[i].pop[0], rules[j].pop[0]) &&
              prefixComparable(rules[i].pop[1], rules[j].pop[1]) &&
              prefixComparable(rules[i].pop[2], rules[j].pop[2])) {
            throw new Error(`Rules with the same source are not separated: ${rules[i].fromControl.value}`);
          }
        }
        if (rules[i].toControl === rules[j].toControl) {
          // Unless the pushes differ on at least one stack, two configurations can be mapped to the same one,
          // so the machine cannot be run backward deterministically, as the paper (Section 4) requires.
          if (prefixComparable(rules[i].push[0], rules[j].push[0]) &&
              prefixComparable(rules[i].push[1], rules[j].push[1]) &&
              prefixComparable(rules[i].push[2], rules[j].push[2])) {
            throw new Error(`Rules with the same target are not separated: ${rules[i].toControl.value}`);
          }
        }
      }
    }

    this.tuple = {
      controlSet,
      letterSet,
      blank,
      rules: [...rules],
      initControl
    };
  }

  /**
   * Initiates processing for given stacks.
   *
   * @remarks
   * The control is set to the initial control.
   *
   * @param input Finite parts of the three stacks. Each is followed by an infinite sequence of the blank letter.
   */
  public start(input: ThreeStacks): void {
    this.control = this.tuple.initControl;
    this.stacks = [
      BlankPaddedStack.from(input[0], this.tuple.blank),
      BlankPaddedStack.from(input[1], this.tuple.blank),
      BlankPaddedStack.from(input[2], this.tuple.blank),
    ];
  }

  /**
   * Proceeds with this machine. This method must be called after {@link BalancedThreeStackMachine.start} called, or get an error.
   *
   * @remarks
   * One "step" is an application of one rule.
   * This method does not change the machine status if {@link BalancedThreeStackMachine.isStopped} is true.
   *
   * @param step Non-negative integer indicating how many steps to advance this machine.
   * @throws {Error} If step < 0, or if {@link BalancedThreeStackMachine.start} has not been called.
   */
  public proceed(step = 1): void {
    if (step < 0) {
      throw new Error("step must be non-negative");
    }
    if (this.control === null || this.stacks === null) {
      throw new Error("Machine has not been started");
    }
    for (let i = 0; i < step; i++) {
      const rule = this.findApplicableRule();
      if (rule === null) {
        break;
      }
      this.control = rule.toControl;
      for (let j = 0; j < 3; j++) {
        this.stacks[j].drop(rule.pop[j].length);
        this.stacks[j].push(rule.push[j]);
      }
    }
  }

  /**
   * Returns whether this machine is stopped.
   *
   * @returns True if no rule is applicable to the current configuration, false otherwise (including before {@link BalancedThreeStackMachine.start} is called).
   */
  public isStopped(): boolean {
    if (this.control === null || this.stacks === null) {
      return false;
    }
    return this.findApplicableRule() === null;
  }

  /**
   * Returns configuration(current status) of this machine.
   *
   * @returns Current status of this machine if {@link BalancedThreeStackMachine.start} was called, null otherwise.
   * Each stack has its trailing blank letters removed.
   */
  public getConfiguration(): BalancedThreeStackMachineConfiguration | null {
    if (this.control === null || this.stacks === null) {
      return null;
    }
    return {
      control: this.control,
      stacks: [this.stacks[0].toWord(), this.stacks[1].toWord(), this.stacks[2].toWord()],
    };
  }

  /**
   * Returns a tuple representation of this machine.
   *
   * @remarks
   * - controlSet - All controls used by the rules and the initial control.
   * - letterSet - All letters used by the rules and the blank letter.
   * - blank - The blank letter.
   * - rules - Rules used by this machine.
   * - initControl - The control of this machine when it starts.
   *
   * @returns a tuple representation of this machine.
   */
  public asTuple(): BalancedThreeStackMachineTuple {
    return this.tuple;
  }

  /**
   * Creates a copy of this machine with the same definition, which is not started.
   * @returns A new BalancedThreeStackMachine instance.
   */
  public clone(): BalancedThreeStackMachine {
    return new BalancedThreeStackMachine(
      this.tuple.blank, 
      // The constructor copies the array, so casting away readonly never lets the clone mutate this machine's rules.
      this.tuple.rules as BalancedThreeStackRule[], 
      this.tuple.initControl
    );
  }

  /**
   * Finds the rule applicable to the current configuration.
   * (Assume that {@link BalancedThreeStackMachine.start} has been called.)
   * 
   * @remarks
   * Since the sources are separated, at most one rule is applicable.
   *
   * @returns The applicable rule, or null if there is none.
   */
  private findApplicableRule(): BalancedThreeStackRule | null {
    for (const rule of this.ruleCache.get(this.control!) ?? []) {
      if (this.stacks![0].startsWith(rule.pop[0]) &&
          this.stacks![1].startsWith(rule.pop[1]) &&
          this.stacks![2].startsWith(rule.pop[2])) {
        return rule;
      }
    }
    return null;
  }
}
