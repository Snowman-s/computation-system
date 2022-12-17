import {
  ComputationSystem,
  TMConfiguration,
  TMMove,
  TMState,
  TMSymbol,
  TMTape,
} from "./computation-system";

export type WriteFirstTMRuleOutput = {
  readonly write: TMSymbol;
  readonly move: TMMove;
  readonly changeStates: readonly {
    readonly read: TMSymbol;
    readonly thenGoTo: TMState | "HALT";
  }[];
};

export type WriteFirstTMRule = {
  readonly nowState: TMState;
  readonly out: WriteFirstTMRuleOutput;
};

/**
 * The Write-First Turing Machine's program.
 *
 * @remarks
 * You should use {@link WriteFirstTMRuleSet.builder} to construct this.
 */
export class WriteFirstTMRuleSet {
  /**
   * Create builder for WriteFirstTMRuleSet.
   * @returns created builder
   */
  public static builder() {
    return new WriteFirstTMRuleSetBuilder();
  }

  private readonly rules: WriteFirstTMRule[] = [];

  /**
   * Construct TMRuleset with given rules.
   *
   * @remarks
   * This method is used by the library.
   * Usually, users should use {@link WriteFirstTMRuleSet.builder}.
   *
   * @param rules list of rule
   */
  constructor(rules: WriteFirstTMRule[]) {
    this.rules = [...rules];
  }

  /**
   * Returns what kind of change occurred in the Turing machine when the given state.
   * @param state now turing machine's state
   * @returns list of what indicates kind of change
   */
  public getCandinates(state: TMState) {
    return this.rules.filter((rule) => rule.nowState == state).map((rule) => rule.out);
  }

  /**
   * Returns all symbols that this rule uses.
   * @returns list of the symbols
   */
  public getAllUsedSymbols() {
    const symbols = new Set<TMSymbol>();

    this.rules.forEach((rule) => {
      symbols.add(rule.out.write);
      rule.out.changeStates.forEach((changeState) => {
        symbols.add(changeState.read);
      });
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
      rule.out.changeStates.forEach((changeState) => {
        if (changeState.thenGoTo !== "HALT") {
          states.add(changeState.thenGoTo);
        }
      });
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
          return `${v(rule.nowState)} ${v(rule.out.write)}${rule.out.move}${
            "[" +
            rule.out.changeStates
              .map((changeState) =>
                [
                  v(changeState.read),
                  changeState.thenGoTo === "HALT" ? "-" : v(changeState.thenGoTo),
                ].join(":")
              )
              .join(", ") +
            "]"
          }`;
        })
        .join(", ") +
      "]"
    );
  }
}

/**
 * A builder to build the Write-First Turing Machine's ruleset.
 * @see {@link WriteFirstTMRuleSet}
 */
export class WriteFirstTMRuleSetBuilder {
  private nowBuildingInfo: { nowState: TMState; write: TMSymbol; move: TMMove } | null = null;
  private rules: {
    nowState: TMState;
    out: {
      write: TMSymbol;
      move: TMMove;
      changeStates: {
        read: TMSymbol;
        thenGoTo: TMState | "HALT";
      }[];
    };
  }[] = [];

  /**
   * Sets which states the rules to be added are related to.
   *
   * @see {@link WriteFirstTMRuleSetBuilder.add}
   *
   * @param state The state the rules to be added are related to.
   * @param write
   * @param move
   * @returns This builder, to method chains.
   */
  public state(state: TMState, write: TMSymbol, move: TMMove) {
    this.nowBuildingInfo = { nowState: state, write: write, move: move };
    return this;
  }

  /**
   * Add rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When it is at *state* then write *write* symbol, and move head to *move*. Next, read symbol that location, then it's *read*, change state to *nextState*.
   * *state*, *write* and *move* is set by {@link WriteFirstTMRuleSetBuilder.state}.
   *
   * @param read
   * @param nextState
   * @returns This builder, to method chains.
   */
  public add(read: TMSymbol, nextState: TMState) {
    if (this.nowBuildingInfo == null) {
      throw new Error("You must specify to what TMState this rule is bounded, using state().");
    }

    const lambdaNowBuildingInfo = this.nowBuildingInfo;
    const willBindRules = this.rules.filter(
      (a) =>
        a.nowState === lambdaNowBuildingInfo.nowState &&
        a.out.move === lambdaNowBuildingInfo.move &&
        a.out.write === lambdaNowBuildingInfo.write
    );

    if (willBindRules.length === 0) {
      this.rules.push({
        nowState: this.nowBuildingInfo.nowState,
        out: {
          move: this.nowBuildingInfo.move,
          write: this.nowBuildingInfo.write,
          changeStates: [
            {
              read: read,
              thenGoTo: nextState,
            },
          ],
        },
      });
    } else {
      if (
        willBindRules[0].out.changeStates.filter(
          (changeState) => changeState.read === read && changeState.thenGoTo === nextState
        ).length === 0
      ) {
        willBindRules[0].out.changeStates.push({
          read: read,
          thenGoTo: nextState,
        });
      }
    }

    return this;
  }

  /**
   * Add HALT rule to this builder.
   *
   * @remarks
   * The rule is interpreted as "When it is at *state* then write *write* symbol, and move head to *move*. Next, read symbol that location, then it's *read*, stop the machine.
   * *state*, *write* and *move* is set by {@link WriteFirstTMRuleSetBuilder.state}.
   *
   * @param read
   * @returns This builder, to method chains.
   */
  public addHALT(read: TMSymbol) {
    if (this.nowBuildingInfo == null) {
      throw new Error("You must specify to what TMState this rule is bounded, using state().");
    }

    const lambdaNowBuildingInfo = this.nowBuildingInfo;
    const willBindRules = this.rules.filter(
      (a) =>
        a.nowState === lambdaNowBuildingInfo.nowState &&
        a.out.move === lambdaNowBuildingInfo.move &&
        a.out.write === lambdaNowBuildingInfo.write
    );

    if (willBindRules.length === 0) {
      this.rules.push({
        nowState: this.nowBuildingInfo.nowState,
        out: {
          move: this.nowBuildingInfo.move,
          write: this.nowBuildingInfo.write,
          changeStates: [
            {
              read: read,
              thenGoTo: "HALT",
            },
          ],
        },
      });
    } else {
      if (
        willBindRules[0].out.changeStates.filter(
          (changeState) => changeState.read === read && changeState.thenGoTo === "HALT"
        ).length === 0
      ) {
        willBindRules[0].out.changeStates.push({
          read: read,
          thenGoTo: "HALT",
        });
      }
    }

    return this;
  }

  /**
   * Build the rule-set with the configured rules.
   * @returns Created rule-set.
   */
  public build() {
    return new WriteFirstTMRuleSet(this.rules);
  }
}

/**
 * A object for simulate the turing machine, but the machine will write symbol before read the tape.
 */
export class WriteFirstTuringMachine implements ComputationSystem {
  private readonly blank: TMSymbol;
  private readonly ruleset: WriteFirstTMRuleSet;
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
    ruleset: WriteFirstTMRuleSet,
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
   * @returns Returns the initial-word if {@link WriteFirstTuringMachine.start} was called, If not, return null.
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
   * Proceeds with this machine. This method must be called after {@link WriteFirstTuringMachine.start} called, or get an error,
   *
   * @remarks
   * One "step" is a series of processes that writes the symbol, moves the head, reads a symbol, and changes its state.
   * @remarks
   * This method does not change the machine status, if {@link WriteFirstTuringMachine.isAccepted} or {@link WriteFirstTuringMachine.isHalted} is true.
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

      const candinateRules = this.ruleset.getCandinates(this.nowState!);

      if (candinateRules.length > 1) {
        throw new Error(`Many rules corresponding to {${this.nowState.value}} are defined.`);
      } else if (candinateRules.length == 0) {
        throw new Error(`The rule corresponding to {${this.nowState.value}} is not defined.`);
      }

      const action = candinateRules[0];

      this.tape.write(this.headPosition, action.write);
      switch (action.move) {
        case "L":
          this.headPosition--;
          break;
        case "R":
          this.headPosition++;
          break;
      }

      const read = this.tape.read(this.headPosition);
      const candinateStates = action.changeStates.filter(
        (changeState) => changeState.read === read
      );

      if (candinateStates.length > 1) {
        throw new Error(
          `Many rules corresponding to {${this.nowState.value}, ${read.value}} are defined.`
        );
      } else if (candinateStates.length == 0) {
        throw new Error(
          `The rule corresponding to {${this.nowState.value}, ${read.value}} is not defined.`
        );
      }

      const changeTo = candinateStates[0].thenGoTo;

      if (changeTo === "HALT") {
        this.halt = true;
      } else {
        this.nowState = changeTo;
      }
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
   * The machine will stop if {@link WriteFirstTuringMachine.isAccepted} is true, but it is not treated as "halt".
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
   * @returns Current status of this machine if {@link WriteFirstTuringMachine.start} was called, false otherwise.
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

  public clone(): WriteFirstTuringMachine {
    return new WriteFirstTuringMachine(this.blank, this.ruleset, this.initState, this.acceptState);
  }

  /**
   * Returns string representation of this machine.
   * @returns String representation of this machine.
   */
  public toString() {
    return `[blank=${this.blank.value},ruleset=${this.ruleset},init=${this.initState.value},acc=${this.acceptState?.value}]`;
  }
}
