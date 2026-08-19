import { ComputationSystem } from "./computation-system";

/**
 * A variable used in a {@link LambdaTerm}.
 *
 * @remarks In this library, variables are "equal" if the two objects are the same object.
 * Simply having equal "value" does not make them equal variables. This lets the same
 * displayed name be reused for shadowing (e.g. two binders both named "x") while still
 * being able to tell them apart during substitution.
 */
export interface LambdaVariable { readonly value: string }

/**
 * Create LambdaVariable list with each element of strs as its representation.
 * @param strs List of string representation corresponding to each variable that will be created.
 * @returns Created variable list, whose length is the same as "strs".
 */
export function LambdaVariableFrom(...strs: string[]): LambdaVariable[] {
  return strs.map((str) => ({ value: str }));
}

/**
 * A function that decides which fresh variable to use when alpha-converting an abstraction
 * whose parameter would otherwise capture a free variable being substituted in.
 * @param variable The abstraction's original parameter, which needs to be renamed.
 * @param existingVariableNames The display names ({@link LambdaVariable.value}) of every variable
 *  (bound or free) appearing anywhere in the term currently being reduced, provided so the
 *  strategy can pick a fresh variable whose display name does not collide with one already
 *  visible to a human reading the term. This set is read-only: implementations must not mutate it.
 * @returns The new variable to substitute for "variable" throughout the abstraction's body.
 */
export type AlphaConversionStrategy = (
  variable: LambdaVariable,
  existingVariableNames: ReadonlySet<string>
) => LambdaVariable;

/**
 * The default {@link AlphaConversionStrategy}: appends "'" to the variable's display name,
 * repeating until the result no longer collides with any name in "existingVariableNames".
 * @param variable The abstraction's original parameter, which needs to be renamed.
 * @param existingVariableNames The display names of every variable appearing anywhere in the
 *  term currently being reduced.
 * @returns A freshly created variable whose display name is unique among "existingVariableNames".
 */
export function defaultAlphaConversionStrategy(
  variable: LambdaVariable,
  existingVariableNames: ReadonlySet<string>
): LambdaVariable {
  let newValue = variable.value + "'";
  while (existingVariableNames.has(newValue)) {
    newValue += "'";
  }
  return LambdaVariableFrom(newValue)[0];
}

/**
 * A term of the untyped lambda calculus: a variable, an abstraction (λx.M), or an
 * application (M N).
 *
 * @remarks
 * You should use {@link LambdaVariableTerm}, {@link LambdaAbstraction} and
 * {@link LambdaApplication} to construct this, rather than the object literal directly.
 */
export type LambdaTerm =
  | { readonly type: "variable"; readonly variable: LambdaVariable }
  | { readonly type: "abstraction"; readonly parameter: LambdaVariable; readonly body: LambdaTerm }
  | { readonly type: "application"; readonly func: LambdaTerm; readonly argument: LambdaTerm };

/**
 * Create a LambdaTerm that references the given variable.
 * @param variable The variable to reference.
 * @returns Created term.
 */
export function LambdaVariableTerm(variable: LambdaVariable): LambdaTerm {
  return { type: "variable", variable };
}

/**
 * Create a LambdaTerm representing an abstraction (λparameter.body).
 * @param parameter The variable bound by this abstraction.
 * @param body The term in which "parameter" is bound.
 * @returns Created term.
 */
export function LambdaAbstraction(parameter: LambdaVariable, body: LambdaTerm): LambdaTerm {
  return { type: "abstraction", parameter, body };
}

/**
 * Create a LambdaTerm representing an application (func argument).
 * @param func The term being applied.
 * @param argument The term func is applied to.
 * @returns Created term.
 */
export function LambdaApplication(func: LambdaTerm, argument: LambdaTerm): LambdaTerm {
  return { type: "application", func, argument };
}

/**
 * Returns a string representation of the given term, e.g. "λx.x" or "(f x)".
 * @param term The term to render.
 * @returns String representation of term.
 */
export function lambdaTermToString(term: LambdaTerm): string {
  switch (term.type) {
    case "variable":
      return term.variable.value;
    case "abstraction":
      return `λ${term.parameter.value}.${lambdaTermToString(term.body)}`;
    case "application":
      return `(${lambdaTermToString(term.func)} ${lambdaTermToString(term.argument)})`;
  }
}

export interface LambdaCalculusConfiguration { term: LambdaTerm }

/**
 * A object for simulate the untyped lambda calculus.
 *
 * @remarks
 * Reduction proceeds by normal-order (leftmost-outermost) beta reduction: at each step,
 * the leftmost redex that is not inside the body of another redex's abstraction is reduced.
 * This strategy reaches a beta-normal form whenever one exists, by the standardization theorem.
 */
export class LambdaCalculus implements ComputationSystem {
  private term: LambdaTerm | null = null;

  /**
   * @param alphaConversionStrategy Decides which fresh variable to use whenever a substitution
   *  needs to alpha-convert an abstraction to avoid variable capture. Defaults to
   *  {@link defaultAlphaConversionStrategy}.
   */
  public constructor(
    private readonly alphaConversionStrategy: AlphaConversionStrategy = defaultAlphaConversionStrategy
  ) {}

  /**
   * Initiates processing for a given term.
   * @param term The term to reduce.
   */
  public start(term: LambdaTerm): void {
    this.term = term;
  }

  /**
   * Proceeds with this system. This method must be called after {@link LambdaCalculus.start} called, or get an error,
   *
   * @remarks
   * One "step" is one normal-order beta reduction of the leftmost-outermost redex.
   * @remarks
   * This method does not change the machine status, if {@link LambdaCalculus.isStopped} is true.
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
      const existingVariableNames = this.collectVariableNames(currentTerm);
      const { term, stopped } = this.betaReduce(currentTerm, existingVariableNames);
      currentTerm = term;
      if (stopped) {
        break;
      }
    }
    this.term = currentTerm;
  }

  /**
   * Performs one normal-order beta reduction step.
   * @param term The term to reduce.
   * @param existingVariableNames The display names of every variable appearing anywhere in the
   *  whole term being reduced this step (i.e. the term originally passed to this method, before
   *  recursing into subterms). Forwarded unchanged through recursion and into
   *  {@link LambdaCalculus.substitute} so that {@link LambdaCalculus.alphaConversionStrategy} can
   *  see the full picture, not just the subterm currently being visited.
   * @returns The term after performing at most one reduction, and whether it was already in
   *  beta-normal form (in which case "term" is returned unchanged).
   */
  private betaReduce(
    term: LambdaTerm,
    existingVariableNames: ReadonlySet<string>
  ): { term: LambdaTerm, stopped: boolean } {
    switch (term.type) {
      case "variable":
        return { term, stopped: true };
      case "abstraction":
        const bodyResult = this.betaReduce(term.body, existingVariableNames);
        return { term: LambdaAbstraction(term.parameter, bodyResult.term), stopped: bodyResult.stopped };
      case "application":
        if (term.func.type === "abstraction") {
          // Perform beta reduction
          const substitutedBody = this.substitute(
            term.func.body,
            term.func.parameter,
            term.argument,
            existingVariableNames
          );
          return { term: substitutedBody, stopped: false };
        } else {
          const funcResult = this.betaReduce(term.func, existingVariableNames);
          if (!funcResult.stopped) {
            return { term: LambdaApplication(funcResult.term, term.argument), stopped: false };
          }
          const argumentResult = this.betaReduce(term.argument, existingVariableNames);
          return { term: LambdaApplication(funcResult.term, argumentResult.term), stopped: argumentResult.stopped };
        }
      }
  }

  /**
   * Substitutes "replacement" for every free occurrence of "variable" in "term", alpha-converting
   * bound variables as needed to avoid capturing free variables in "replacement".
   * @param term The term to substitute into.
   * @param variable The variable being replaced.
   * @param replacement The term to substitute in place of "variable".
   * @param existingVariableNames The display names of every variable appearing anywhere in the
   *  whole term being reduced this step; see {@link LambdaCalculus.betaReduce}.
   * @returns "term" with the substitution applied.
   */
  private substitute(
    term: LambdaTerm,
    variable: LambdaVariable,
    replacement: LambdaTerm,
    existingVariableNames: ReadonlySet<string>
  ): LambdaTerm {
    switch (term.type) {
      case "variable":
        return term.variable === variable ? replacement : term;
      case "abstraction":
        if (term.parameter === variable) {
          return term; // No substitution inside the body of the abstraction
        } else {
          // alpha-convert if the parameter is free in the replacement term
          if (this.isFreeIn(term.parameter, replacement)) {
            const newParam = this.alphaConversionStrategy(term.parameter, existingVariableNames);
            const newBody = this.alphaConvert(term.body, term.parameter, newParam);
            return LambdaAbstraction(
              newParam,
              this.substitute(newBody, variable, replacement, existingVariableNames)
            );
          }
          return LambdaAbstraction(
            term.parameter,
            this.substitute(term.body, variable, replacement, existingVariableNames)
          );
        }
      case "application":
        return LambdaApplication(
          this.substitute(term.func, variable, replacement, existingVariableNames),
          this.substitute(term.argument, variable, replacement, existingVariableNames)
        );
    }
  }

  private alphaConvert(term: LambdaTerm, oldVar: LambdaVariable, newVar: LambdaVariable): LambdaTerm {
    switch (term.type) {
      case "variable":
        return term.variable === oldVar ? LambdaVariableTerm(newVar) : term;
      case "abstraction":
        if (term.parameter === oldVar) {
          return LambdaAbstraction(newVar, this.alphaConvert(term.body, oldVar, newVar));
        } else {
          return LambdaAbstraction(term.parameter, this.alphaConvert(term.body, oldVar, newVar));
        }
      case "application":
        return LambdaApplication(
          this.alphaConvert(term.func, oldVar, newVar),
          this.alphaConvert(term.argument, oldVar, newVar)
        );
    }
  }

  private isFreeIn(variable: LambdaVariable, term: LambdaTerm): boolean {
    switch (term.type) {
      case "variable":
        return term.variable === variable;
      case "abstraction":
        return term.parameter !== variable && this.isFreeIn(variable, term.body);
      case "application":
        return this.isFreeIn(variable, term.func) || this.isFreeIn(variable, term.argument);
    }
  }

  /**
   * Collects names rather than variable objects because {@link AlphaConversionStrategy} only
   * needs to avoid display-level collisions, not object-identity ones (see {@link LambdaVariable}).
   * @param term The term to walk.
   * @returns A set of every distinct variable name ({@link LambdaVariable.value}) appearing in "term".
   */
  private collectVariableNames(term: LambdaTerm): Set<string> {
    const names = new Set<string>();
    const visit = (t: LambdaTerm) => {
      switch (t.type) {
        case "variable":
          names.add(t.variable.value);
          break;
        case "abstraction":
          names.add(t.parameter.value);
          visit(t.body);
          break;
        case "application":
          visit(t.func);
          visit(t.argument);
          break;
      }
    };
    visit(term);
    return names;
  }

  /**
   * Returns whether this system is stopped, i.e. the current term is in beta-normal form
   * (contains no redex).
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
        return this._isStopped(term.body);
      case "application":
        if (term.func.type === "abstraction") {
          return false; // Redex found
        }
        return this._isStopped(term.func) && this._isStopped(term.argument);
    }
  }

  /**
   * Returns configuration(current status) of this machine.
   *
   * @remarks
   * A lambda calculus's configuration is represented as follows:
   * - term - The term currently being reduced.
   *
   * @returns Current status of this machine if {@link LambdaCalculus.start} was called, null otherwise.
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
   * The untyped lambda calculus has no instance-specific rules or parameters, so this
   * always returns an empty object.
   *
   * @returns a tuple representation of this machine.
   */
  public asTuple(): Record<string, never> {
    return {};
  }

  public clone(): LambdaCalculus {
    return new LambdaCalculus(this.alphaConversionStrategy);
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
