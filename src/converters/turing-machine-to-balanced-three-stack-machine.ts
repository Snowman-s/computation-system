import {
  TMConfiguration,
  TMRule,
  TMState,
  TMSymbol,
  TMTape,
  TuringMachine,
} from "../turing-machine";
import {
  BalancedThreeStackMachine,
  BalancedThreeStackMachineConfiguration,
  BalancedThreeStackMachineTuple,
  BalancedThreeStackRule,
  ThreeStackControl,
  ThreeStackControlFrom,
  ThreeStackLetter,
  ThreeStackLetterFrom,
  ThreeStacks,
  ThreeStackWord,
} from "../balanced-three-stack-machine";
import { ITransformElement, SystemTuple } from "../converter";
import { TuringMachineToBalancedThreeStackMachineTransformLog } from "../transform-log-types";

/**
 * The letters representing one tape symbol on the stacks.
 * @see {@link TuringMachineToBalancedThreeStackMachineTransformLog.symbolCorrespondenceTable}
 */
interface SymbolLetters {
  readonly letter: ThreeStackLetter;
  readonly marked: ThreeStackLetter;
}

/**
 * The four controls of one state.
 * @see {@link TuringMachineToBalancedThreeStackMachineTransformLog.stateCorrespondenceTable}
 */
interface StateControls {
  readonly A: ThreeStackControl;
  readonly S: ThreeStackControl;
  readonly T: ThreeStackControl;
  readonly D: ThreeStackControl;
}

/**
 * One row of {@link TuringMachineToBalancedThreeStackMachineTransformLog.recordTable}.
 */
type RecordEntry = TuringMachineToBalancedThreeStackMachineTransformLog["recordTable"][number];

/**
 * Writes a rule in the notation of the paper, (fromControl; pop) → (toControl; push).
 */
function rule(
  fromControl: ThreeStackControl,
  pop: ThreeStacks,
  toControl: ThreeStackControl,
  push: ThreeStacks
): BalancedThreeStackRule {
  return { fromControl, pop, toControl, push };
}

/**
 * The empty word (ε in the paper).
 */
const E: ThreeStackWord = [];

/**
 * Transforms a {@link TuringMachine} into a {@link BalancedThreeStackMachine} that simulates it,
 * following the construction in the proof of Theorem 4.1 of the paper.
 *
 * @remarks
 * The three stacks are L, R and J of the paper:
 * - L (index 0) - The cells strictly left of the head, nearest first.
 * - R (index 1) - The head cell and the finite right block, followed by the boundary letter (★).
 * - J (index 2) - The records of the executed rules, newest first.
 *
 * A configuration of the Turing machine in state q corresponds to the control A_q (a "checkpoint").
 * To keep every rule balanced, each step of the Turing machine takes one blank from beyond the boundary,
 * moves it onto J, and replaces it with a record letter identifying the executed rule.
 * This needs a scan of the right block, so one step of the Turing machine takes 2m+2 rules,
 * where m is the number of cells on R before the boundary.
 *
 * As in the paper, the machine is normalized so that the only terminal control (without outgoing rules) is A_h,
 * a fresh control not tied to any state of the Turing machine.
 * Moving into the accept state, a "HALT" rule, and an undefined (state, symbol) pair all lead to A_h;
 * the latter two by a stationary step that keeps the head cell.
 * The state of the Turing machine at A_h is recovered from the record on top of J,
 * which identifies the rule that led there.
 *
 * @see OpenAI. Incompressible Box Transport and Finite Computation. preprint, 2026. (Section 4)
 */
export class TuringMachineToBalancedThreeStackMachineTransformElement
  implements
    ITransformElement<
      TuringMachine,
      BalancedThreeStackMachine,
      TuringMachineToBalancedThreeStackMachineTransformLog
    >
{
  private transformLog: TuringMachineToBalancedThreeStackMachineTransformLog | null = null;
  private machineSample: BalancedThreeStackMachine | null = null;

  /**
   * The letters of each tape symbol, kept as a map so that the rule builders and interpretInput can look them up directly.
   */
  private symbolLetters: Map<TMSymbol, SymbolLetters> | null = null;
  /**
   * The controls of each state other than the accept state, kept as a map so that the rule builders can look them up directly.
   */
  private stateControls: Map<TMState, StateControls> | null = null;
  /**
   * The only terminal control (A_h).
   */
  private halt: ThreeStackControl | null = null;
  /**
   * The boundary letter (★).
   */
  private boundary: ThreeStackLetter | null = null;
  /**
   * The tuple of the bound Turing machine, kept for the blank symbol, the accept state and the initial state
   * needed after bind (by the rule builders, interpretInput and interpretConfigration).
   */
  private system: SystemTuple<TuringMachine> | null = null;
  /**
   * The tape symbol of each unmarked letter, so that interpretConfigration can decode a stack per letter.
   * Marked letters are left out: they never appear at a checkpoint,
   * so a configuration containing one is rejected instead of being read as an ordinary cell.
   */
  private letterSymbols: Map<ThreeStackLetter, TMSymbol> | null = null;
  /**
   * The state of each checkpoint control A_q, so that interpretConfigration can decode the control.
   */
  private checkpointStates: Map<ThreeStackControl, TMState> | null = null;
  /**
   * The row of the record table for each record letter κ, so that interpretConfigration can decode the top of J at A_h.
   */
  private recordEntries: Map<ThreeStackLetter, RecordEntry> | null = null;

  /**
   * Binds this converter to a source machine's tuple, building the rules (8)–(13) of the paper,
   * the simulating machine and the correspondence tables.
   *
   * @remarks
   * Controls (A, S, T, D) are created for every state other than the accept state, which is replaced by A_h.
   * The rules (8)–(12) are generated for every such state and every symbol,
   * and rule (13) for every (state, symbol) pair of them.
   * An undefined pair is given a synthesized rule { nowState: q, read: a, out: { move: "HALT" } },
   * so that every control other than A_h has an outgoing rule for every symbol on the head cell.
   *
   * The initial control is A_h if "system.initState" is the accept state, and A of "system.initState" otherwise.
   * The blank letter is the letter of "system.blankSymbol".
   *
   * @param system The tuple of the source Turing machine.
   * @throws {Error} If some (state, symbol) pair other than the accept state has two or more rules,
   *  since the sources of the simulating machine would not be separated.
   */
  bind(system: SystemTuple<TuringMachine>): void {
    const workingStates = [...system.stateSet].filter((state) => state !== system.acceptState);

    // Validated before any field is overwritten, so that a failed bind leaves the previous binding intact.
    const tmRules: TMRule[] = [];
    for (const state of workingStates) {
      for (const symbol of system.symbolSet) {
        const candidates = system.ruleset.getCandinates(state, symbol);
        if (candidates.length > 1) {
          throw new Error(`Multiple rules for state ${state.value} and symbol ${symbol.value}`);
        }
        tmRules.push({ nowState: state, read: symbol, out: candidates[0] ?? { move: "HALT" } });
      }
    }

    this.system = system;
    [this.boundary] = ThreeStackLetterFrom("★");
    [this.halt] = ThreeStackControlFrom("A_h");

    this.symbolLetters = new Map();
    this.letterSymbols = new Map();
    for (const symbol of system.symbolSet) {
      const [letter, marked] = ThreeStackLetterFrom(symbol.value, `${symbol.value}'`);
      this.symbolLetters.set(symbol, { letter, marked });
      this.letterSymbols.set(letter, symbol);
    }

    this.stateControls = new Map();
    this.checkpointStates = new Map();
    for (const state of workingStates) {
      const [A, S, T, D] = ThreeStackControlFrom(
        `A_${state.value}`,
        `S_${state.value}`,
        `T_${state.value}`,
        `D_${state.value}`
      );
      this.stateControls.set(state, { A, S, T, D });
      this.checkpointStates.set(A, state);
    }

    const rules: BalancedThreeStackRule[] = [];
    const records: RecordEntry[] = [];
    for (const state of workingStates) {
      rules.push(...this.buildPreparationRules(state));
    }
    for (const tmRule of tmRules) {
      const built = this.buildTransitionRules(tmRule);
      rules.push(...built.rules);
      records.push(...built.records);
    }
    this.recordEntries = new Map(records.map((entry) => [entry.record, entry]));

    this.machineSample = new BalancedThreeStackMachine(
      this.symbolLetters.get(system.blankSymbol)!.letter,
      rules,
      system.initState === system.acceptState ? this.halt : this.stateControls.get(system.initState)!.A
    );

    this.transformLog = {
      boundary: this.boundary,
      halt: this.halt,
      symbolCorrespondenceTable: [...this.symbolLetters].map(([symbol, { letter, marked }]) => ({
        symbol,
        letter,
        marked,
      })),
      stateCorrespondenceTable: [...this.stateControls].map(([state, controls]) => ({ state, ...controls })),
      recordTable: records,
    };
  }

  /**
   * Converts an input of the Turing machine into the initial stacks.
   *
   * @remarks
   * The cells from min(0, headPosition) to max(word.length - 1, headPosition) are expanded, filling the gap with blanks,
   * so that the head cell is always on R (the invariant m ≥ 1 of the paper) even if "headPosition" is out of "word".
   * - L - The expanded cells strictly left of the head, in reverse order.
   * - R - The expanded cells from the head to the end, followed by the boundary letter.
   * - J - Empty.
   *
   * @param virtual The word and the head position, as given to {@link TuringMachine.start}.
   * @returns The stacks to give to {@link BalancedThreeStackMachine.start}.
   * @throws {Error} If this converter is not bound, or "word" contains a symbol not in the bound machine's symbol set.
   */
  interpretInput(virtual: [word: TMSymbol[], headPosition: number]): ThreeStacks {
    if (this.system === null || this.symbolLetters === null || this.boundary === null) {
      throw new Error("This converter is not bound.");
    }
    const [word, headPosition] = virtual;

    const left: ThreeStackLetter[] = [];
    const right: ThreeStackLetter[] = [];

    const minIndex = Math.min(0, headPosition);
    const maxIndex = Math.max(word.length - 1, headPosition);

    for (let i = minIndex; i <= maxIndex; i++) {
      const symbol = word[i] ?? this.system.blankSymbol;
      const letters = this.symbolLetters.get(symbol);
      if (letters === undefined) {
        throw new Error(`Symbol ${symbol.value} not in the bound Turing machine's symbol set`);
      }
      if (i < headPosition) {
        // The top of L (index 0) must be the cell nearest to the head.
        left.unshift(letters.letter);
      } else {
        right.push(letters.letter);
      }
    }

    right.push(this.boundary);

    return [left, right, []];
  }

  /**
   * Recovers a {@link TMConfiguration} from a configuration of the simulating machine, if it is at a checkpoint.
   *
   * @remarks
   * Only the controls A_q and A_h are checkpoints; for S_q, T_q and D_q (in the middle of one step) this returns null,
   * mirroring {@link TuringMachineToDeterministicLambdaCalculusTransformElement.interpretConfigration}.
   *
   * At A_h, the state is determined by the record on top of J:
   * "rule.nowState" for a "HALT" row (the Turing machine does not change its state when halting),
   * and "rule.out.nextState" (the accept state) for a moving row.
   * If J is empty, the machine has not moved since it started at A_h, so the state is the initial state.
   *
   * The tape is reverse(L) followed by the letters of R before the boundary, and "headPosition" is the length of L.
   * This is a coordinate system local to the configuration, not the original absolute one:
   * the trailing blanks of L are removed by the normalization of {@link BalancedThreeStackMachine.getConfiguration},
   * and the initial offset of the head is not kept on the stacks.
   *
   * @param real The current configuration of the simulating machine, or null if it has not started.
   * @returns The corresponding configuration, or null if "real" is null, this converter is not bound,
   *  the control is not a checkpoint, or the top of J at A_h is not a record.
   */
  interpretConfigration(real: BalancedThreeStackMachineConfiguration | null): TMConfiguration | null {
    if (
      real === null ||
      this.system === null ||
      this.letterSymbols === null ||
      this.checkpointStates === null ||
      this.recordEntries === null
    ) {
      return null;
    }

    const { control, stacks } = real;

    let nowState: TMState | undefined;
    if (control === this.halt) {
      const record = stacks[2][0];
      if (record === undefined) {
        nowState = this.system.initState;
      } else {
        const rule = this.recordEntries.get(record)?.rule;
        nowState = rule?.out.move === "HALT" ? rule.nowState : rule?.out.nextState;
      }
    } else {
      nowState = this.checkpointStates.get(control);
    }
    if (nowState === undefined) {
      return null;
    }

    const right = stacks[1];
    const boundaryIndex = right.indexOf(this.boundary!);
    if (boundaryIndex === -1) {
      return null;
    }
    const cells = [...stacks[0].slice().reverse(), ...right.slice(0, boundaryIndex)];
    const tape: TMSymbol[] = [];
    for (const letter of cells) {
      const symbol = this.letterSymbols.get(letter);
      if (symbol === undefined) {
        return null;
      }
      tape.push(symbol);
    }

    return {
      nowState,
      tape: TMTape.create(tape, this.system.blankSymbol).locked(),
      headPosition: stacks[0].length,
    };
  }

  /**
   * @returns The tuple of the simulating machine, or null if this converter is not bound.
   */
  asTuple(): BalancedThreeStackMachineTuple | null {
    return this.machineSample?.asTuple() ?? null;
  }

  /**
   * @returns A new (not started) copy of the simulating machine, or null if this converter is not bound.
   */
  asIndependantSystem(): BalancedThreeStackMachine | null {
    return this.machineSample?.clone() ?? null;
  }

  /**
   * @returns The correspondence table, or null if this converter is not bound.
   */
  getTransFormLog(): TuringMachineToBalancedThreeStackMachineTransformLog | null {
    return this.transformLog;
  }

  /**
   * Builds the preparation rules (8)–(12) of one state, which move a blank from beyond the boundary onto J
   * and restore L and R. (Assume that {@link TuringMachineToBalancedThreeStackMachineTransformElement.symbolLetters},
   * {@link TuringMachineToBalancedThreeStackMachineTransformElement.stateControls} and
   * {@link TuringMachineToBalancedThreeStackMachineTransformElement.boundary} are set.)
   *
   * @remarks
   * With b the blank letter, ★ the boundary, c ranging over all tape symbols and c̄ the marked letter of c:
   * - (8)  (A_q; ε, c, ε) → (S_q; c̄, ε, ε)
   * - (9)  (S_q; ε, c, ε) → (S_q; c, ε, ε)
   * - (10) (S_q; ε, ★b, ε) → (T_q; ε, ★, b)
   * - (11) (T_q; c, ε, ε) → (T_q; ε, c, ε)
   * - (12) (T_q; c̄, ε, ε) → (D_q; ε, c, ε)
   *
   * The head cell is marked by (8) so that the scan back by (11) stops exactly there, at (12).
   *
   * @param state The state whose rules are built. Must not be the accept state.
   * @returns The rules (in no particular order, since the machine selects a rule by matching, not by order).
   */
  private buildPreparationRules(state: TMState): BalancedThreeStackRule[] {
    const { A, S, T, D } = this.stateControls!.get(state)!;
    const star = this.boundary!;
    const b = this.symbolLetters!.get(this.system!.blankSymbol)!.letter;

    const rules = [
      rule(S, [E, [star, b], E], T, [E, [star], [b]]), // (10)
    ];
    for (const { letter: c, marked: cBar } of this.symbolLetters!.values()) {
      rules.push(
        rule(A, [E, [c], E], S, [[cBar], E, E]), // (8)
        rule(S, [E, [c], E], S, [[c], E, E]), // (9)
        rule(T, [[c], E, E], T, [E, [c], E]), // (11)
        rule(T, [[cBar], E, E], D, [E, [c], E]) // (12)
      );
    }
    return rules;
  }

  /**
   * Builds the rows of rule (13) for one rule δ(q, a), each with a fresh record letter κ.
   * (Assume the same fields as {@link TuringMachineToBalancedThreeStackMachineTransformElement.buildPreparationRules}
   * and {@link TuringMachineToBalancedThreeStackMachineTransformElement.halt} are set.)
   *
   * @remarks
   * With b the blank letter, ★ the boundary, c ranging over all tape symbols, and δ(q, a) = (q', d, move):
   * - "L": (D_q; c, a, b) → (X; ε, cd, κ)
   * - "R": (D_q; ε, ac, b) → (X; d, c, κ)
   * - "R": (D_q; ε, a★b, b) → (X; d, b★, κ)  (exposes a blank so that R keeps at least one cell)
   * - "HALT": (D_q; ε, a, b) → (A_h; ε, a, κ)  (the stationary row σ = 0 of the paper, keeping the head cell)
   *
   * X is A_h if q' is the accept state, and A_q' otherwise.
   * Every row has its own κ, so that the targets sharing a control are separated by the top of J.
   * The "branch" of the record is the symbol c, the boundary for the row with ★, and null for the "HALT" row.
   *
   * @param tmRule A rule of the Turing machine, or a synthesized "HALT" rule for an undefined (state, symbol) pair.
   *  Its "nowState" must not be the accept state.
   * @returns The rows and the records pushed by them (one entry per row, in the same order).
   */
  private buildTransitionRules(tmRule: TMRule): { rules: BalancedThreeStackRule[]; records: RecordEntry[] } {
    const { nowState: q, read, out } = tmRule;
    const { D } = this.stateControls!.get(q)!;
    const a = this.symbolLetters!.get(read)!.letter;
    const b = this.symbolLetters!.get(this.system!.blankSymbol)!.letter;
    const star = this.boundary!;

    const rules: BalancedThreeStackRule[] = [];
    const records: RecordEntry[] = [];
    // The same κ must be used for the row and its record, so that interpretConfigration can find the row from J.
    const addRow = (branch: RecordEntry["branch"], build: (kappa: ThreeStackLetter) => BalancedThreeStackRule) => {
      const branchLabel = branch === null ? "" : branch.type === "boundary" ? star.value : branch.symbol.value;
      const [kappa] = ThreeStackLetterFrom(`κ[${q.value},${read.value},${branchLabel}]`);
      rules.push(build(kappa));
      records.push({ rule: tmRule, branch, record: kappa });
    };

    if (out.move === "HALT") {
      addRow(null, (kappa) => rule(D, [E, [a], [b]], this.halt!, [E, [a], [kappa]]));
      return { rules, records };
    }

    const d = this.symbolLetters!.get(out.write)!.letter;
    const X = out.nextState === this.system!.acceptState ? this.halt! : this.stateControls!.get(out.nextState)!.A;
    for (const [symbol, { letter: c }] of this.symbolLetters!) {
      const branch = { type: "symbol", symbol } as const;
      if (out.move === "L") {
        addRow(branch, (kappa) => rule(D, [[c], [a], [b]], X, [E, [c, d], [kappa]]));
      } else {
        addRow(branch, (kappa) => rule(D, [E, [a, c], [b]], X, [[d], [c], [kappa]]));
      }
    }
    if (out.move === "R") {
      addRow({ type: "boundary" }, (kappa) => rule(D, [E, [a, star, b], [b]], X, [[d], [b, star], [kappa]]));
    }
    return { rules, records };
  }
}
