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

/**
 * A single lexical token produced by {@link tokenizeLambdaTerm}, consumed by
 * {@link parseApplicationTokens} / {@link parseAtomTokens}.
 *
 * @remarks
 * "λ" and "\" both tokenize to "lambda" (see {@link parseLambdaTerm} for why); the parser never
 * needs to know which spelling was used.
 */
type LambdaToken =
  | { readonly kind: "lambda" }
  | { readonly kind: "dot" }
  | { readonly kind: "lparen" }
  | { readonly kind: "rparen" }
  | { readonly kind: "ident"; readonly name: string };

/**
 * Splits "source" into a flat list of {@link LambdaToken}s for
 * {@link parseApplicationTokens} / {@link parseAtomTokens} to consume.
 *
 * @remarks
 * Whitespace is dropped here rather than kept as a token: it is never significant beyond acting
 * as an application-argument separator, and that separation is already implied by two adjacent
 * atom tokens with no explicit combinator between them, so no grammar rule needs to inspect how
 * much whitespace (if any) actually appeared.
 *
 * @param source The lambda-term source text, as accepted by {@link parseLambdaTerm}.
 * @returns The tokens found in "source", in order.
 * @throws {Error} If "source" contains a character that cannot start any token (i.e. is not
 *  whitespace, "λ", "\", ".", "(", ")", or a valid identifier character
 *  "/[A-Za-z_][A-Za-z0-9_']*​/").
 */
function tokenizeLambdaTerm(source: string): LambdaToken[] {
  const identPattern = /[A-Za-z_][A-Za-z0-9_']*/y;
  const tokens: LambdaToken[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "λ" || ch === "\\") {
      tokens.push({ kind: "lambda" });
      i++;
      continue;
    }
    if (ch === ".") {
      tokens.push({ kind: "dot" });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    identPattern.lastIndex = i;
    const match = identPattern.exec(source);
    if (match !== null) {
      tokens.push({ kind: "ident", name: match[0] });
      i += match[0].length;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" at position ${i} in lambda term source "${source}".`);
  }
  return tokens;
}

/** Whether "token" can begin an "atom" (see {@link parseLambdaTerm}), i.e. can start a new application argument. */
function tokenStartsAtom(token: LambdaToken): boolean {
  return token.kind === "ident" || token.kind === "lambda" || token.kind === "lparen";
}

/**
 * What a name in {@link parseLambdaTerm}'s "bindings" argument may resolve to: either an existing
 * variable to link an identifier (or, per {@link isLambdaTerm}, a matching abstraction parameter) to,
 * or a whole term to splice in verbatim wherever that name appears as a plain identifier.
 */
type LambdaTermBinding = LambdaVariable | LambdaTerm;

/**
 * Distinguishes the two cases of {@link LambdaTermBinding}: a {@link LambdaTerm} always carries a
 * "type" discriminant field, which a bare {@link LambdaVariable} never has.
 *
 * @param binding The binding to classify.
 * @returns True if "binding" is a term to splice in, false if it is a variable to link to.
 */
function isLambdaTerm(binding: LambdaTermBinding): binding is LambdaTerm {
  return "type" in binding;
}

/**
 * Parses the "application" grammar rule (see {@link parseLambdaTerm}) starting at "pos": one atom
 * followed by zero or more further atoms, left-associated into nested {@link LambdaApplication}s.
 *
 * @remarks
 * "term := application" in the grammar (there is no separate case for a bare, non-applied term),
 * so this doubles as the entry point for anywhere the grammar says "term", including
 * {@link parseLambdaTerm} itself and an abstraction's body.
 *
 * @param tokens The full token list, as produced by {@link tokenizeLambdaTerm}.
 * @param pos The index, into "tokens", to start parsing from.
 * @param scope Every name currently bound by an enclosing abstraction, mapped to the
 *  {@link LambdaVariable} it resolves to. Passed through unchanged to every atom parsed here.
 * @param bindingCache Every name resolved so far during this call to {@link parseLambdaTerm} that
 *  is not in "scope", mapped to the {@link LambdaTermBinding} it was resolved to: either a
 *  caller-supplied entry from "bindings" (variable or term, see {@link parseLambdaTerm}), or a
 *  freshly allocated free variable. Mutated in place by nested atom parsing so repeated occurrences
 *  of the same undeclared free name, anywhere in "source", resolve to the same object.
 * @returns The parsed term, and the index of the first unconsumed token.
 * @throws {Error} If "pos" is not the start of at least one atom (e.g. "pos" is already at
 *  "tokens.length", at ")", or at ".").
 */
function parseApplicationTokens(
  tokens: LambdaToken[],
  pos: number,
  scope: ReadonlyMap<string, LambdaVariable>,
  bindingCache: Map<string, LambdaTermBinding>
): { term: LambdaTerm; pos: number } {
  let { term, pos: nextPos } = parseAtomTokens(tokens, pos, scope, bindingCache);
  while (nextPos < tokens.length && tokenStartsAtom(tokens[nextPos])) {
    const argument = parseAtomTokens(tokens, nextPos, scope, bindingCache);
    term = LambdaApplication(term, argument.term);
    nextPos = argument.pos;
  }
  return { term, pos: nextPos };
}

/**
 * Parses the "atom" grammar rule (see {@link parseLambdaTerm}) starting at "pos": a bare variable
 * reference, a parenthesized term, or an abstraction.
 *
 * @remarks
 * This is where identifiers actually get resolved: a name found in "scope" resolves to that
 * binding (so a bound name always shadows a same-named entry elsewhere); otherwise it is looked up
 * in "bindingCache" — spliced in verbatim if it resolves to a {@link LambdaTerm}, or wrapped as a
 * reference if it resolves to a {@link LambdaVariable} — allocating (and caching) a fresh free
 * variable on first sight of a name absent from both.
 * @remarks
 * For the abstraction case, the parameter reuses the {@link LambdaVariable} found in "bindingCache"
 * under the same name, if any (this is what lets a term spliced in elsewhere, via "bindings", be
 * correctly captured by a same-named binder here — see {@link parseLambdaTerm}); otherwise, and
 * always when that name resolves to a {@link LambdaTerm} instead (splicing has no meaning at a
 * binder position), a fresh {@link LambdaVariable} is allocated, exactly as if the name were
 * unrecognized. Either way, the body is parsed via {@link parseApplicationTokens} with "scope"
 * extended by that one binding — extended, not mutated in place, so returning from the body
 * naturally reverts to the enclosing scope for whatever comes after, which is what makes shadowing
 * resolve correctly without explicit push/pop bookkeeping.
 *
 * @param tokens The full token list, as produced by {@link tokenizeLambdaTerm}.
 * @param pos The index, into "tokens", to start parsing an atom from.
 * @param scope Every name currently bound by an enclosing abstraction, mapped to the
 *  {@link LambdaVariable} it resolves to.
 * @param bindingCache Every name resolved so far during this call to {@link parseLambdaTerm} that
 *  is not in "scope", mapped to the {@link LambdaTermBinding} it was resolved to. Mutated in place
 *  on first sight of a name absent from both "scope" and "bindingCache".
 * @returns The parsed atom, and the index of the first unconsumed token.
 * @throws {Error} If "pos" is not the start of a variable, a parenthesized term (missing closing
 *  ")"), or a well-formed abstraction (missing parameter identifier or ".").
 */
function parseAtomTokens(
  tokens: LambdaToken[],
  pos: number,
  scope: ReadonlyMap<string, LambdaVariable>,
  bindingCache: Map<string, LambdaTermBinding>
): { term: LambdaTerm; pos: number } {
  const token = tokens[pos];
  if (token === undefined) {
    throw new Error("Unexpected end of input while parsing a lambda term.");
  }

  if (token.kind === "ident") {
    const boundVariable = scope.get(token.name);
    if (boundVariable !== undefined) {
      return { term: LambdaVariableTerm(boundVariable), pos: pos + 1 };
    }

    const cached = bindingCache.get(token.name);
    if (cached !== undefined) {
      const term = isLambdaTerm(cached) ? cached : LambdaVariableTerm(cached);
      return { term, pos: pos + 1 };
    }

    const fresh = LambdaVariableFrom(token.name)[0];
    bindingCache.set(token.name, fresh);
    return { term: LambdaVariableTerm(fresh), pos: pos + 1 };
  }

  if (token.kind === "lparen") {
    const inner = parseApplicationTokens(tokens, pos + 1, scope, bindingCache);
    const closing = tokens[inner.pos];
    if (closing?.kind !== "rparen") {
      throw new Error(`Expected ")" to close a parenthesized term, at token index ${inner.pos}.`);
    }
    return { term: inner.term, pos: inner.pos + 1 };
  }

  if (token.kind === "lambda") {
    const paramToken = tokens[pos + 1];
    if (paramToken?.kind !== "ident") {
      throw new Error(`Expected a parameter name after "λ", at token index ${pos + 1}.`);
    }
    const dotToken = tokens[pos + 2];
    if (dotToken?.kind !== "dot") {
      throw new Error(`Expected "." after an abstraction's parameter, at token index ${pos + 2}.`);
    }
    const cached = bindingCache.get(paramToken.name);
    const parameter =
      cached !== undefined && !isLambdaTerm(cached) ? cached : LambdaVariableFrom(paramToken.name)[0];
    const childScope = new Map(scope);
    childScope.set(paramToken.name, parameter);
    const body = parseApplicationTokens(tokens, pos + 3, childScope, bindingCache);
    return { term: LambdaAbstraction(parameter, body.term), pos: body.pos };
  }

  throw new Error(`Unexpected token at index ${pos} while parsing a lambda term atom.`);
}

/**
 * Parses "source" as a {@link LambdaTerm}, following the grammar:
 * ```
 * term        := application
 * application := atom (WS atom)*        // left-associative juxtaposition
 * atom        := variable | abstraction | '(' term ')'
 * abstraction := ('λ' | '\') ident WS? '.' term   // body extends as far right as possible
 * variable    := ident
 * ident       := /[A-Za-z_][A-Za-z0-9_']*​/
 * ```
 *
 * @remarks
 * Application-argument separation requires at least one whitespace character (or a parenthesis)
 * between atoms: since identifiers are tokenized by longest match, multi-character names like
 * "x_0" would otherwise be indistinguishable from a run of juxtaposed single-letter variables
 * (e.g. the paper-style shorthand "xxyz" for "x x y z"). Write such applications as "x x y z".
 * @remarks
 * Both "λ" and "\" are accepted as the abstraction binder, so ASCII-only sources can be written
 * without the Greek letter.
 * @remarks
 * Every occurrence of a bound name resolves, within its binder's body, to one single
 * {@link LambdaVariable} object — and a nested binder reusing the same name correctly shadows it
 * (see {@link parseAtomTokens}) — so a term built by this function behaves identically, under
 * {@link substitute} and beta reduction, to the same term built by hand with
 * {@link LambdaAbstraction} / {@link LambdaApplication} / {@link LambdaVariableTerm}.
 * @remarks
 * Binding avoidance in this library is by object identity, not display name (see
 * {@link LambdaVariable}). Consequently, splicing in a term whose free variables happen to share a
 * display name with a binder somewhere in "source" does **not** capture them: that binder's
 * parameter and the spliced term's free variable remain distinct objects unless "bindings" links
 * them (see the "bindings" parameter below). This is usually what you want — it is exactly what
 * prevents accidental capture — but it means a name used both as a splice point and, unrelatedly,
 * as a binder elsewhere in "source" will not unify just because the text looks like it should.
 * @remarks
 * If the same name is passed in "bindings" as a {@link LambdaVariable} and "source" binds that name
 * with more than one enclosing "λ" (e.g. "λs.λs. ..."), every one of those binders reuses the same
 * object, so the inner one does not shadow the outer one the way two independently-allocated
 * binders would. Avoid reusing one bindings name across nested binders in the same call.
 *
 * @param source The lambda-term source text to parse.
 * @param bindings Maps a subset of "source"'s identifiers — every occurrence not bound by an
 *  enclosing "λ" within "source" itself, plus (per the second remark above) any "λ" binder whose
 *  parameter name matches a {@link LambdaVariable} entry — to either:
 *  - a pre-existing {@link LambdaVariable}, reused by identity: an identifier resolves to a
 *    reference to it, and a "λ" binder with the same parameter name reuses it as its own parameter
 *    instead of allocating a fresh one (so a term spliced in elsewhere that already refers to this
 *    variable is correctly captured by that binder);
 *  - a whole {@link LambdaTerm}, spliced in verbatim wherever its name appears as a plain
 *    identifier (never at a "λ" binder position, where splicing has no meaning — a fresh variable
 *    is allocated there instead, as if the name were absent from "bindings").
 *  A name absent from "bindings" is instead resolved to a freshly allocated free variable, shared
 *  across every occurrence of that name within this one call but not with any other call to
 *  "parseLambdaTerm".
 * @returns The parsed term.
 * @throws {Error} If "source" is not a well-formed "term" per the grammar above, or if it parses
 *  a well-formed term but has leftover, unconsumed input afterward (e.g. "x)" or "x x)").
 */
export function parseLambdaTerm(
  source: string,
  bindings: Readonly<Record<string, LambdaVariable | LambdaTerm>> = {}
): LambdaTerm {
  const tokens = tokenizeLambdaTerm(source);
  if (tokens.length === 0) {
    throw new Error("Cannot parse an empty lambda term source.");
  }

  const bindingCache = new Map<string, LambdaTermBinding>(Object.entries(bindings));
  const { term, pos } = parseApplicationTokens(tokens, 0, new Map(), bindingCache);
  if (pos !== tokens.length) {
    throw new Error(`Unexpected trailing input in lambda term source "${source}", at token index ${pos}.`);
  }
  return term;
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
