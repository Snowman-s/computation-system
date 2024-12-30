// この似通った二つを適切に区別する為、meaningを定義

import { ComputationSystem } from "./computation-system";

/**
 * The turing machine's "state", or in other words, what determines which rules are executed.
 */
export type TMState = { readonly value: string; readonly meaning: "state" };
/**
 * The turing machine's symbols on the tape.
 */
export type TMSymbol = { readonly value: string; readonly meaning: "symbol" };

/**
 * Create TMState list with each element of strs as its representation.
 * @param strs List of string representation corresponding to each state that will be created
 * @returns Created state list, whose length is the same as "strs"
 */
export function TMStateFrom(...strs: string[]): TMState[] {
  return strs.map((str) => {
    return {
      value: str,
      meaning: "state",
    };
  });
}

/**
 * Create TMSymbol list with each element of strs as its representation.
 * @param strs List of string representation corresponding to each symbol that will be created
 * @returns Created symbol list, whose length is the same as "strs"
 */
export function TMSymbolFrom(...strs: string[]): TMSymbol[] {
  return strs.map((str) => {
    return {
      value: str,
      meaning: "symbol",
    };
  });
}

/**
 * Movement of the head of the Turing machine.
 * @remarks "L" means left, "R" means right.
 */
export type TMMove = "L" | "R";

/**
 * The information on what changes will occur after the rule is applied
 * @see {@link TMRule}
 */
export type TMRuleOutput =
  | { readonly write: TMSymbol; readonly move: TMMove; readonly nextState: TMState }
  | { readonly move: "HALT" };

/**
 * What indicates the operation of the head of a Turing machine
 * @see {@link TMRuleSet}
 */
export type TMRule = {
  readonly nowState: TMState;
  readonly read: TMSymbol;
  readonly out: TMRuleOutput;
};

export type TMConfiguration = {
  nowState: TMState;
  tape: ILockedTMTape;
  headPosition: number;
};

class TMEquality {
  static ruleEquals(a: TMRule, b: TMRule) {
    if (a.out.move === "HALT") {
      return a.nowState === b.nowState && a.read === b.read && a.out.move === b.out.move;
    } else {
      if (a.out.move !== b.out.move) return false;
      return (
        a.nowState === b.nowState &&
        a.read === b.read &&
        a.out.nextState == b.out.nextState &&
        a.out.write == b.out.write
      );
    }
  }
}

/**
 * The turing machine's program.
 *
 * @remarks
 * You should use {@link TMRuleSet.builder} to construct this.
 */
export class TMRuleSet {
  /**
   * Create builder for TMRuleSet.
   * @returns created builder
   */
  public static builder() {
    return new TMRuleSetBuilder();
  }

  private readonly rules: TMRule[] = [];

  /**
   * Construct TMRuleset with given rules.
   *
   * @remarks
   * This method is used by the library.
   * Usually, users should use {@link TMRuleSet.builder}.
   *
   * @param rules list of rule
   */
  constructor(rules: TMRule[]) {
    this.rules = [...rules];
  }

  /**
   * Returns what kind of change occurred in the Turing machine when the given state and the symbol read.
   * @param state now turing machine's state
   * @param nowSymbol symbol read on the turing machine
   * @returns list of what indicates kind of change
   */
  public getCandinates(state: TMState, nowSymbol: TMSymbol) {
    return this.rules
      .filter((rule) => rule.nowState == state && rule.read == nowSymbol)
      .map((rule) => rule.out);
  }

  /**
   * Returns all symbols that this rule uses.
   * @returns list of the symbols
   */
  public getAllUsedSymbols() {
    const symbols = new Set<TMSymbol>();

    this.rules.forEach((rule) => {
      symbols.add(rule.read);
      if (rule.out.move !== "HALT") {
        symbols.add(rule.out.write);
      }
    });

    return symbols;
  }

  /**
   * Returns all states that this rule uses.
   * @returns list of the states
   */
  public getAllUsedStates() {
    const states = new Set<TMState>();

    this.rules.forEach((rule) => {
      states.add(rule.nowState);
      if (rule.out.move !== "HALT") {
        states.add(rule.out.nextState);
      }
    });

    return states;
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
          if (rule.out.move === "HALT") {
            return `${v(rule.nowState)} ${v(rule.read)}  ―`;
          } else {
            return `${v(rule.nowState)} ${v(rule.read)}${v(rule.out.write)} ${rule.out.move[0]}${v(
              rule.out.nextState
            )}`;
          }
        })
        .join(", ") +
      "]"
    );
  }
}

/**
 * A builder to build the turing machine's ruleset.
 * @see {@link TMRuleSet}
 */
export class TMRuleSetBuilder {
  private nowBuildingState: TMState | null = null;
  private rules: TMRule[] = [];

  /**
   * Sets which states the rules to be added are related to.
   *
   * @see {@link TMRuleSetBuilder.add}
   *
   * @param state The state the rules to be added are related to.
   * @returns This builder, to method chains.
   */
  public state(state: TMState) {
    this.nowBuildingState = state;
    return this;
  }

  /**
   * Add rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When read *read* symbol at *state* then change state to *nextState*, write *write* symbol on same location, and move head to *move*".
   * *state* is set by {@link TMRuleSetBuilder.state}.
   *
   * @param read
   * @param write
   * @param move
   * @param nextState
   * @returns This builder, to method chains.
   */
  public add(read: TMSymbol, write: TMSymbol, move: TMMove, nextState?: TMState) {
    if (this.nowBuildingState == null) {
      throw new Error("You must specify to what TMState this rule is bounded, using state().");
    }

    const e = {
      nowState: this.nowBuildingState,
      read: read,
      out: {
        write: write,
        move: move,
        nextState: nextState ?? this.nowBuildingState,
      },
    };

    if (this.rules.filter((a) => TMEquality.ruleEquals(a, e)).length === 0) {
      this.rules.push(e);
    }

    return this;
  }

  /**
   * Add HALT rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When read *read* symbol at *state* then stop the machine".
   * *state* is set by {@link TMRuleSetBuilder.state}.
   *
   * @param read
   * @returns This builder, to method chains.
   */
  public addHALT(read: TMSymbol) {
    if (this.nowBuildingState == null) {
      throw new Error("You must specify to what TMState this rule is bounded, using state().");
    }

    const e: TMRule = {
      nowState: this.nowBuildingState,
      read: read,
      out: {
        move: "HALT",
      },
    };

    if (this.rules.filter((a) => TMEquality.ruleEquals(a, e)).length === 0) {
      this.rules.push(e);
    }

    return this;
  }

  /**
   * Build the rule-set with the configured rules.
   * @returns Created rule-set.
   */
  public build() {
    return new TMRuleSet(this.rules);
  }
}

/**
 * The tape of the turing machine.
 *
 * @remarks
 * This class is used by the library.
 * Usually, users don't needs to use this.
 */
export class TMTape {
  private readonly data: Map<number, TMSymbol>;
  private readonly blank: TMSymbol;

  private minIndex: number;
  private maxIndex: number;

  private constructor(
    data: Map<number, TMSymbol>,
    blank: TMSymbol,
    minIndex: number,
    maxIndex: number
  ) {
    this.data = data;
    this.blank = blank;
    this.minIndex = minIndex;
    this.maxIndex = maxIndex;
  }

  public static create(symbols: TMSymbol[], blank: TMSymbol, startOn = 0) {
    const tapeData = new Map<number, TMSymbol>();
    symbols.forEach((symbol, i) => {
      tapeData.set(i, symbol);
    });
    return new TMTape(tapeData, blank, startOn, startOn + tapeData.size - 1);
  }

  public read(n: number): TMSymbol {
    return this.data.has(n) ? this.data.get(n)!! : this.blank;
  }

  public write(n: number, symbol: TMSymbol) {
    this.minIndex = Math.min(n, this.minIndex);
    this.maxIndex = Math.max(n, this.maxIndex);

    return this.data.set(n, symbol);
  }

  public clone(): TMTape {
    return new TMTape(new Map(this.data), this.blank, this.minIndex, this.maxIndex);
  }

  /**
   * @returns A copy of this tape that cannot be modified.
   */
  public locked(): ILockedTMTape {
    const clone = this.clone();

    return new (class implements ILockedTMTape {
      read(n: number): TMSymbol {
        return clone.read(n);
      }
      toString(): string {
        return clone.toString();
      }
      getWrittenRange(): { left: number; right: number } {
        return { left: clone.minIndex, right: clone.maxIndex };
      }
    })();
  }

  public toString() {
    let str = "…" + this.blank.value;
    for (let index = this.minIndex; index <= this.maxIndex; index++) {
      str += this.data.get(index)?.value ?? this.blank.value;
    }

    return str + this.blank.value + "…";
  }
}

/**
 * Immutable tape informaiton to refer.
 */
export interface ILockedTMTape {
  /**
   * Returns *n*th symbol of the tape.
   * @param n Index of tape. Can be < 0.
   * @returns If written something on *n*th location, return it. If not, return blank symbol, specified by the machine.
   */
  read(n: number): TMSymbol;

  getWrittenRange(): { left: number; right: number };
  /**
   * Returns string representation of this tape.
   * @returns String representation of this tape.
   */
  toString(): string;
}

/**
 * A object for simulate the turing machine.
 */
export class TuringMachine implements ComputationSystem {
  private readonly blank: TMSymbol;
  private readonly ruleset: TMRuleSet;
  private readonly initState: TMState;
  private readonly acceptState: TMState | null;

  private nowState: TMState | null = null;

  private initialWord: TMSymbol[] | null = null;
  private tape: TMTape | null = null;
  private headPosition = 0;

  private halt = false;

  /**
   * Initialize machine with given arguments.
   * @param blank A blank symbol. Both ends of the tape are (conceptually) initialized by an infinite sequence of this symbol.
   * @param ruleset Rules that determine how the head of the machine moves.
   * @param initState State of the machine when it starts to move.
   * @param acceptState State of the machine when the word is accepted.
   */
  constructor(
    blank: TMSymbol,
    ruleset: TMRuleSet,
    initState: TMState,
    acceptState: TMState | null = null
  ) {
    this.blank = blank;
    this.ruleset = ruleset;
    this.initState = initState;
    this.acceptState = acceptState;
  }

  /**
   * Get the word when this machine starts the process.
   * @returns Returns the initial-word if {@link TuringMachine.start} was called, If not, return null.
   */
  public getInitialWord(): TMSymbol[] | null {
    return this.initialWord;
  }

  /**
   * Initiates processing for a given word.
   * @param word A word being processed.
   * @param headPosition Relative position of the head at the start of processing.
   * For Instance, "3" means to start from word[3], and "-1" means to start from the blank symbol to the left of the word.
   */
  public start(input: [word: TMSymbol[], headPosition: number]) {
    const [word, headPosition] = input;

    this.initialWord = [...word];
    this.tape = TMTape.create(word, this.blank);
    this.headPosition = headPosition;
    this.nowState = this.initState;
    this.halt = false;
  }

  /**
   * Proceeds with this machine. This method must be called after {@link TuringMachine.start} called, or get an error,
   *
   * @remarks
   * One "step" is a series of processes that reads a symbol, changes its state, writes the symbol, and moves the head.
   * @remarks
   * This method does not change the machine status, if {@link TuringMachine.isAccepted} or {@link TuringMachine.isHalted} is true.
   *
   * @param step Non-negative integer indicating how many steps to advance this machine.
   */
  public proceed(step = 1) {
    if (step < 0) {
      throw new Error('"step" must be >= 0.');
    }

    if (this.nowState == null || this.tape == null) {
      throw new Error("You must call start() before proceed().");
    }

    for (let i = 0; i < step; i++) {
      if (this.isAccepted()) return;
      if (this.isHalted()) return;

      const readSymbol = this.tape.read(this.headPosition);
      const candinateRules = this.ruleset.getCandinates(this.nowState, readSymbol);

      if (candinateRules.length > 1) {
        throw new Error(
          `Many rules corresponding to {${this.nowState.value}, ${readSymbol.value}} are defined.`
        );
      } else if (candinateRules.length == 0) {
        throw new Error(
          `The rule corresponding to {${this.nowState.value}, ${readSymbol.value}} is not defined.`
        );
      }

      const action = candinateRules[0];
      if (action.move === "HALT") {
        this.halt = true;
        break;
      }

      this.tape.write(this.headPosition, action.write);
      switch (action.move) {
        case "L":
          this.headPosition--;
          break;
        case "R":
          this.headPosition++;
          break;
      }

      this.nowState = action.nextState;
    }
  }

  /**
   * Returns whether this machine is in the accepted state.
   *
   * @returns True if this machine is in the accepted state, false otherwise.
   */
  public isAccepted() {
    return this.nowState == this.acceptState;
  }

  /**
   * Returns whether this machine is halted.
   *
   * @remarks
   * The machine will stop if {@link TuringMachine.isAccepted} is true, but it is not treated as "halt".
   *
   * @returns True if this machine is halted, false otherwise.
   */
  public isHalted() {
    return this.halt;
  }

  public isStopped() {
    return this.halt || this.isAccepted();
  }

  /**
   * Returns a tuple representation of this machine.
   *
   * @remarks
   * A Turing machine is represented as follows:
   * - stateSet - List of all states this machine uses.
   * - symbolSet - List of all symbols this machine uses.
   * - blankSymbol - A blank symbol.
   * - inputSymbolSet - List of all symbols that can be used for words processed by this machine. (In this implementation, it is exactly the same as symbolSet.)
   * - ruleSet - List of rules used by this machine.
   * - initState - The state of this machine when it starts.
   * - acceptState - The state when this machine accepts a word.
   *
   * @returns a tuple representation of this machine.
   */
  public asTuple() {
    const states = this.ruleset.getAllUsedStates();
    states.add(this.initState);
    if (this.acceptState !== null) states.add(this.acceptState);

    const symbols = this.ruleset.getAllUsedSymbols();
    symbols.add(this.blank);

    return {
      stateSet: states,
      symbolSet: symbols,
      blankSymbol: this.blank,
      inputSymbolSet: new Set(symbols),
      ruleset: this.ruleset,
      initState: this.initState,
      acceptState: this.acceptState,
    };
  }

  /**
   * Returns configuration(current status) of this machine.
   *
   * @remarks
   * A turing machine's configuration is represented as follows:
   * - nowState - This machine's now state.
   * - tape - Symbols on tape for this machine.
   * - headPosition - Relative position of this machine's current head.
   *
   * @returns Current status of this machine if {@link TuringMachine.start} was called, null otherwise.
   */
  public getConfiguration(): TMConfiguration | null {
    if (this.tape === null || this.nowState === null) {
      return null;
    } else {
      return {
        nowState: this.nowState,
        tape: this.tape.locked(),
        headPosition: this.headPosition,
      };
    }
  }

  public clone(): TuringMachine {
    return new TuringMachine(this.blank, this.ruleset, this.initState, this.acceptState);
  }

  /**
   * Returns string representation of this machine.
   * @returns String representation of this machine.
   */
  public toString() {
    return `[blank=${this.blank.value},ruleset=${this.ruleset},init=${this.initState.value},acc=${this.acceptState?.value}]`;
  }
}
