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

/**
 * Returns whether "variable" occurs free (i.e. unbound) anywhere in "term".
 *
 * @remarks
 * Shared by {@link substitute} (both {@link LambdaCalculus} and {@link DeterministicLambdaCalculus}
 * rely on it to decide when an abstraction's parameter needs alpha-converting) and by nothing else,
 * so it is not exported.
 *
 * @param variable The variable to search for.
 * @param term The term to search.
 * @returns True if "variable" has a free occurrence in "term".
 */
function isFreeIn(variable: LambdaVariable, term: LambdaTerm): boolean {
  switch (term.type) {
    case "variable":
      return term.variable === variable;
    case "abstraction":
      return term.parameter !== variable && isFreeIn(variable, term.body);
    case "application":
      return isFreeIn(variable, term.func) || isFreeIn(variable, term.argument);
  }
}

/**
 * Replaces every occurrence of "oldVar" with "newVar" throughout "term".
 *
 * @remarks
 * Used by {@link substitute} to rename an abstraction's bound parameter (and every occurrence of
 * it in the abstraction's body) before substituting into that body, so that the substitution
 * cannot capture a free variable in the replacement term.
 *
 * @param term The term to rewrite.
 * @param oldVar The bound variable being renamed.
 * @param newVar The fresh variable to rename it to.
 * @returns "term" with every occurrence of "oldVar" replaced by "newVar".
 */
function alphaConvert(term: LambdaTerm, oldVar: LambdaVariable, newVar: LambdaVariable): LambdaTerm {
  switch (term.type) {
    case "variable":
      return term.variable === oldVar ? LambdaVariableTerm(newVar) : term;
    case "abstraction":
      if (term.parameter === oldVar) {
        return LambdaAbstraction(newVar, alphaConvert(term.body, oldVar, newVar));
      } else {
        return LambdaAbstraction(term.parameter, alphaConvert(term.body, oldVar, newVar));
      }
    case "application":
      return LambdaApplication(
        alphaConvert(term.func, oldVar, newVar),
        alphaConvert(term.argument, oldVar, newVar)
      );
  }
}

/**
 * Substitutes "replacement" for every free occurrence of "variable" in "term", alpha-converting
 * bound variables as needed to avoid capturing free variables in "replacement".
 *
 * @remarks
 * Exported because both {@link LambdaCalculus} and {@link DeterministicLambdaCalculus} need it:
 * it is the one piece of reduction logic (capture-avoiding substitution) whose correctness is
 * subtle and whose behavior must be identical regardless of which system's evaluation strategy
 * (full vs. weak) is driving the reduction. The two systems are otherwise independent
 * {@link ComputationSystem} implementations, not related by inheritance, since their "start" and
 * "isStopped" contracts differ.
 *
 * @param term The term to substitute into.
 * @param variable The variable being replaced.
 * @param replacement The term to substitute in place of "variable".
 * @param existingVariableNames The display names of every variable appearing anywhere in the
 *  whole term being reduced this step, used to pick a collision-free name when alpha-converting.
 * @param alphaConversionStrategy Decides which fresh variable to use when alpha-conversion is needed.
 * @returns "term" with the substitution applied.
 */
export function substitute(
  term: LambdaTerm,
  variable: LambdaVariable,
  replacement: LambdaTerm,
  existingVariableNames: ReadonlySet<string>,
  alphaConversionStrategy: AlphaConversionStrategy
): LambdaTerm {
  switch (term.type) {
    case "variable":
      return term.variable === variable ? replacement : term;
    case "abstraction":
      if (term.parameter === variable) {
        return term; // No substitution inside the body of the abstraction
      } else {
        // alpha-convert if the parameter is free in the replacement term
        if (isFreeIn(term.parameter, replacement)) {
          const newParam = alphaConversionStrategy(term.parameter, existingVariableNames);
          const newBody = alphaConvert(term.body, term.parameter, newParam);
          return LambdaAbstraction(
            newParam,
            substitute(newBody, variable, replacement, existingVariableNames, alphaConversionStrategy)
          );
        }
        return LambdaAbstraction(
          term.parameter,
          substitute(term.body, variable, replacement, existingVariableNames, alphaConversionStrategy)
        );
      }
    case "application":
      return LambdaApplication(
        substitute(term.func, variable, replacement, existingVariableNames, alphaConversionStrategy),
        substitute(term.argument, variable, replacement, existingVariableNames, alphaConversionStrategy)
      );
  }
}

/**
 * Collects names rather than variable objects because {@link AlphaConversionStrategy} only
 * needs to avoid display-level collisions, not object-identity ones (see {@link LambdaVariable}).
 *
 * @remarks
 * Exported for the same reason as {@link substitute}: both {@link LambdaCalculus} and
 * {@link DeterministicLambdaCalculus} recompute this once per {@link ComputationSystem.proceed}
 * step, over the whole current term, before delegating to their own (differently-strategized)
 * reduction routine.
 *
 * @param term The term to walk.
 * @returns A set of every distinct variable name ({@link LambdaVariable.value}) appearing in "term".
 */
export function collectVariableNames(term: LambdaTerm): Set<string> {
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
   * Performs one normal-order beta reduction step.
   * @param term The term to reduce.
   * @param existingVariableNames The display names of every variable appearing anywhere in the
   *  whole term being reduced this step (i.e. the term originally passed to this method, before
   *  recursing into subterms). Forwarded unchanged through recursion and into {@link substitute}
   *  so that {@link LambdaCalculus.alphaConversionStrategy} can see the full picture, not just the
   *  subterm currently being visited.
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
          if (!funcResult.stopped) {
            return { term: LambdaApplication(funcResult.term, term.argument), stopped: false };
          }
          const argumentResult = this.betaReduce(term.argument, existingVariableNames);
          return { term: LambdaApplication(funcResult.term, argumentResult.term), stopped: argumentResult.stopped };
        }
      }
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
