import { ComputationSystem } from "./computation-system";
import {
  AlphaConversionStrategy,
  LambdaApplication,
  LambdaCalculusConfiguration,
  LambdaTerm,
  collectVariableNames,
  defaultAlphaConversionStrategy,
  lambdaTermToString,
  substitute,
} from "./lambda-calculus";

/**
 * Returns whether "term" belongs to the deterministic lambda calculus $\Lambda_{\mathtt{det}}$:
 * every application's argument (the right-hand subterm) must itself be a value (a variable or
 * an abstraction), recursively, everywhere in "term" — including inside abstraction bodies that
 * {@link DeterministicLambdaCalculus}'s weak evaluation will never reduce into. The grammar is a
 * static well-formedness property of the whole term, independent of which parts evaluation will
 * ever visit.
 *
 * @see U. Dal Lago and B. Accattoli, "Encoding Turing Machines into the Deterministic λ-Calculus,"
 *  arXiv:1711.10078, 2017, Section 2.
 *
 * @param term The term to check.
 * @returns True if every application in "term" (at any depth) applies to a value.
 */
export function isDeterministicLambdaTerm(term: LambdaTerm): boolean {
  switch (term.type) {
    case "variable":
      return true;
    case "abstraction":
      return isDeterministicLambdaTerm(term.body);
    case "application":
      return (
        (term.argument.type === "variable" ||
          term.argument.type === "abstraction") &&
        isDeterministicLambdaTerm(term.func) &&
        isDeterministicLambdaTerm(term.argument)
      );
  }
}

/**
 * A object for simulating the deterministic lambda calculus $\Lambda_{\mathtt{det}}$: the
 * fragment of the untyped lambda calculus in which every application's argument must be a value,
 * and evaluation is weak (it never reduces inside an abstraction's body).
 *
 * @remarks
 * Under these two restrictions, every term has at most one redex (see {@link isDeterministicLambdaTerm}
 * for the grammar this relies on), so reduction is deterministic regardless of which redex a
 * particular strategy would otherwise choose.
 *
 * @remarks
 * This system is deliberately not a subclass of {@link LambdaCalculus}: the two disagree on the
 * contract of "start" (this system additionally rejects terms outside $\Lambda_{\mathtt{det}}$)
 * and of "isStopped" (this system's weak-normal form can still contain redexes, nested inside
 * abstraction bodies, that {@link LambdaCalculus} would keep reducing) — making them {@link ComputationSystem}
 * implementations, not one another's subtype. They share only the capture-avoiding substitution
 * logic, reused via {@link substitute} and {@link collectVariableNames}.
 *
 * @see U. Dal Lago and B. Accattoli, "Encoding Turing Machines into the Deterministic λ-Calculus,"
 *  arXiv:1711.10078, 2017, Section 2.
 */
export class DeterministicLambdaCalculus implements ComputationSystem {
  private term: LambdaTerm | null = null;

  /**
   * @param alphaConversionStrategy Decides which fresh variable to use whenever a substitution
   *  needs to alpha-convert an abstraction to avoid variable capture. Defaults to
   *  {@link defaultAlphaConversionStrategy}.
   */
  public constructor(
    private readonly alphaConversionStrategy: AlphaConversionStrategy = defaultAlphaConversionStrategy
  ) {
  }

  /**
   * Initiates processing for a given term.
   *
   * @remarks
   * Unlike {@link LambdaCalculus.start}, this rejects "term" outright if it does not belong to
   * $\Lambda_{\mathtt{det}}$ (see {@link isDeterministicLambdaTerm}): this system's determinism
   * guarantee depends on that grammar, so a violation is caught at the boundary rather than
   * silently producing an ambiguous reduction later.
   *
   * @param term The term to reduce. Must satisfy {@link isDeterministicLambdaTerm}.
   * @throws {Error} If "term" does not belong to $\Lambda_{\mathtt{det}}$.
   */
  public start(term: LambdaTerm): void {
    if (!isDeterministicLambdaTerm(term)) {
      throw new Error(
        `Term ${lambdaTermToString(term)} is not a valid deterministic lambda term.`
      );
    }
    this.term = term;
  }

  /**
   * Proceeds with this system. This method must be called after {@link DeterministicLambdaCalculus.start} called, or get an error,
   *
   * @remarks
   * One "step" is one weak beta reduction: the unique redex reachable from the root without
   * descending into an abstraction's body, if one exists (see {@link DeterministicLambdaCalculus.betaReduce}).
   * @remarks
   * This method does not change the machine status, if {@link DeterministicLambdaCalculus.isStopped} is true.
   *
   * @param step Non-negative integer indicating how many steps to advance this system.
   */
  public proceed(step: number): void {
    if (this.term === null) {
      throw new Error("Machine not started");
    }
    if (step < 0) {
      throw new Error("Step must be non-negative");
    }

    let currentTerm = this.term;
    for (let i = 0; i < step; i++) {
      const existingVariableNames = collectVariableNames(currentTerm);
      const { term, stopped } = this.betaReduce(currentTerm, existingVariableNames);
      currentTerm = term;
      if (stopped) {
        break;
      }
    }
    this.term = currentTerm;
  }

  /**
   * Performs one weak beta reduction step.
   *
   * @remarks
   * Unlike {@link LambdaCalculus.betaReduce}, the "abstraction" case never recurses into the
   * body: weak evaluation contexts are generated by $E ::= \langle\cdot\rangle \mid Ev$, which has
   * no case for entering a binder. Consequently an application's argument is also never reduced
   * here — under $\Lambda_{\mathtt{det}}$'s grammar it is already a value, so there would be
   * nothing to do even if the context grammar allowed it.
   *
   * @param term The term to reduce.
   * @param existingVariableNames The display names of every variable appearing anywhere in the
   *  whole term being reduced this step, forwarded into {@link substitute}; see
   *  {@link LambdaCalculus.betaReduce} for why the whole-term scope matters.
   * @returns The term after performing at most one reduction, and whether it was already in
   *  weak-normal form (in which case "term" is returned unchanged).
   */
  private betaReduce(
    term: LambdaTerm,
    existingVariableNames: ReadonlySet<string>
  ): { term: LambdaTerm, stopped: boolean } {
    switch (term.type) {
      case "variable":
        return { term, stopped: true };
      case "abstraction":
        // Weak evaluation never descends into an abstraction's body: this term is already a value.
        return { term, stopped: true };
      case "application":
        if (term.func.type === "abstraction") {
          // Perform beta reduction
          const substitutedBody = substitute(
            term.func.body,
            term.func.parameter,
            term.argument,
            existingVariableNames,
            this.alphaConversionStrategy
          );
          return { term: substitutedBody, stopped: false };
        } else {
          const funcResult = this.betaReduce(term.func, existingVariableNames);
          return { term: LambdaApplication(funcResult.term, term.argument), stopped: funcResult.stopped };
        }
    }
  }

  /**
   * Returns whether this system is stopped, i.e. the current term is in weak-normal form (no
   * redex is reachable from the root without descending into an abstraction's body).
   *
   * @remarks
   * A weak-normal form may still contain redexes nested inside abstraction bodies; those will
   * never be reduced by this system. See {@link DeterministicLambdaCalculus.betaReduce}.
   *
   * @returns True if this machine is stopped, false otherwise.
   */
  public isStopped(): boolean {
    if (this.term === null) {
      throw new Error("Machine not started");
    }
    return this._isStopped(this.term);
  }

  private _isStopped(term: LambdaTerm): boolean {
    switch (term.type) {
      case "variable":
        return true;
      case "abstraction":
        // A bare abstraction is always a value: weak evaluation never looks inside it.
        return true;
      case "application":
        if (term.func.type === "abstraction") {
          return false; // Redex found
        }
        return this._isStopped(term.func);
    }
  }

  /**
   * Returns configuration(current status) of this machine.
   *
   * @remarks
   * A deterministic lambda calculus's configuration is represented as follows:
   * - term - The term currently being reduced.
   *
   * @returns Current status of this machine if {@link DeterministicLambdaCalculus.start} was called, null otherwise.
   */
  public getConfiguration(): LambdaCalculusConfiguration | null {
    if (this.term === null) {
      return null;
    }
    return { term: this.term };
  }

  /**
   * Returns a tuple representation of this system.
   *
   * @remarks
   * $\Lambda_{\mathtt{det}}$ has no instance-specific rules or parameters, so this always
   * returns an empty object.
   *
   * @returns a tuple representation of this machine.
   */
  public asTuple(): Record<string, never> {
    return {};
  }

  public clone(): DeterministicLambdaCalculus {
    return new DeterministicLambdaCalculus(this.alphaConversionStrategy);
  }

  /**
   * Returns string representation of this system.
   * @returns String representation of this system.
   */
  public toString(): string {
    if (this.term === null) {
      return "No term to display";
    }
    return lambdaTermToString(this.term);
  }
}
