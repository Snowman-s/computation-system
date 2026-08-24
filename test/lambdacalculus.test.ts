import {
  AlphaConversionStrategy,
  LambdaAbstraction,
  LambdaApplication,
  LambdaCalculus,
  LambdaVariableFrom,
  LambdaVariableTerm,
  defaultAlphaConversionStrategy,
  lambdaTermToString,
  parseLambdaTerm,
} from "../src/computation-system";

describe("LambdaCalculus", () => {
  it("asTuple should always return an empty object", () => {
    const lc = new LambdaCalculus();
    expect(lc.asTuple()).toEqual({});
  });

  it("getConfiguration should return null before start", () => {
    const lc = new LambdaCalculus();
    expect(lc.getConfiguration()).toBeNull();
  });

  it("should throw when proceed() is called before start()", () => {
    const lc = new LambdaCalculus();
    expect(() => {
      lc.proceed(1);
    }).toThrow();
  });

  it("performs a single beta reduction: (λx.x) y -> y", () => {
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(LambdaAbstraction(x, LambdaVariableTerm(x)), LambdaVariableTerm(y));

    const lc = new LambdaCalculus();
    lc.start(term);
    lc.proceed(1);

    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual(lambdaTermToString(LambdaVariableTerm(y)));
  });

  it("reaches beta-normal form and reports isStopped()", () => {
    // (λx.x) ((λy.y) z) reduces to z in two normal-order steps.
    const [x, y, z] = LambdaVariableFrom("x", "y", "z");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaVariableTerm(x)),
      LambdaApplication(LambdaAbstraction(y, LambdaVariableTerm(y)), LambdaVariableTerm(z))
    );

    const lc = new LambdaCalculus();
    lc.start(term);

    expect(lc.isStopped()).toEqual(false);

    lc.proceed(2);

    expect(lc.isStopped()).toEqual(true);
    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual(lambdaTermToString(LambdaVariableTerm(z)));
  });

  it("proceeding past normal form is a no-op", () => {
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(LambdaAbstraction(x, LambdaVariableTerm(x)), LambdaVariableTerm(y));

    const lc = new LambdaCalculus();
    lc.start(term);
    lc.proceed(10);

    const afterOvershoot = lambdaTermToString(lc.getConfiguration()!.term);
    lc.proceed(10);

    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual(afterOvershoot);
    expect(lc.isStopped()).toEqual(true);
  });

  it("avoids variable capture via alpha-conversion: (λx.λy.x) y", () => {
    // Substituting free "y" for "x" must not let the inner binder "y" capture it:
    // the result must still refer to the *outer* y, not the inner (now-renamed) one.
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaAbstraction(y, LambdaVariableTerm(x))),
      LambdaVariableTerm(y)
    );

    const lc = new LambdaCalculus();
    lc.start(term);
    lc.proceed(1);

    const reduced = lc.getConfiguration()!.term;
    expect(reduced.type).toEqual("abstraction");
    if (reduced.type === "abstraction") {
      expect(reduced.body).toEqual({ type: "variable", variable: y });
      // The freshly-bound parameter must not be the same object as the free "y" being substituted in.
      expect(reduced.parameter).not.toBe(y);
    }
  });

  it("resolves shadowing correctly for λx.λx.x applied to an argument", () => {
    // Both binders intentionally reuse the same variable object "x" to express shadowing:
    // the body's "x" refers to the inner binder, so applying should not substitute it.
    const [x, a] = LambdaVariableFrom("x", "a");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaAbstraction(x, LambdaVariableTerm(x))),
      LambdaVariableTerm(a)
    );

    const lc = new LambdaCalculus();
    lc.start(term);
    lc.proceed(1);

    expect(lc.getConfiguration()!.term).toEqual(LambdaAbstraction(x, LambdaVariableTerm(x)));
  });

  it("clone should create an independent instance", () => {
    const [x] = LambdaVariableFrom("x");
    const lc = new LambdaCalculus();
    const cloned = lc.clone();

    expect(cloned).not.toBe(lc);
    expect(cloned.asTuple()).toEqual(lc.asTuple());

    lc.start(LambdaVariableTerm(x));
    expect(cloned.getConfiguration()).toBeNull();
  });

  it("uses a custom AlphaConversionStrategy's returned variable when alpha-converting", () => {
    // Same capture-avoidance scenario as above: (λx.λy.x) y
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaAbstraction(y, LambdaVariableTerm(x))),
      LambdaVariableTerm(y)
    );
    const [customReplacement] = LambdaVariableFrom("fresh");
    const strategy: AlphaConversionStrategy = jest.fn(() => customReplacement);

    const lc = new LambdaCalculus(strategy);
    lc.start(term);
    lc.proceed(1);

    const reduced = lc.getConfiguration()!.term;
    expect(reduced.type).toEqual("abstraction");
    if (reduced.type === "abstraction") {
      expect(reduced.parameter).toBe(customReplacement);
    }
  });

  it("passes every variable name in the current term as existingVariableNames to the strategy", () => {
    // (λx.λy.x) y — the strategy should see "x" and "y" among existingVariableNames
    // at the moment it is asked to rename the outer "x".
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaAbstraction(y, LambdaVariableTerm(x))),
      LambdaVariableTerm(y)
    );

    let seenExistingVariableNames: ReadonlySet<string> | null = null;
    const strategy: AlphaConversionStrategy = (variable, existingVariableNames) => {
      seenExistingVariableNames = existingVariableNames;
      return defaultAlphaConversionStrategy(variable, existingVariableNames);
    };

    const lc = new LambdaCalculus(strategy);
    lc.start(term);
    lc.proceed(1);

    expect(seenExistingVariableNames).not.toBeNull();
    expect(seenExistingVariableNames!.has("x")).toEqual(true);
    expect(seenExistingVariableNames!.has("y")).toEqual(true);
  });

  it("clone should carry over the custom AlphaConversionStrategy", () => {
    const [x, y] = LambdaVariableFrom("x", "y");
    const [customReplacement] = LambdaVariableFrom("fresh");
    const strategy: AlphaConversionStrategy = jest.fn(() => customReplacement);
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaAbstraction(y, LambdaVariableTerm(x))),
      LambdaVariableTerm(y)
    );

    const lc = new LambdaCalculus(strategy);
    const cloned = lc.clone();
    cloned.start(term);
    cloned.proceed(1);

    const reduced = cloned.getConfiguration()!.term;
    expect(reduced.type).toEqual("abstraction");
    if (reduced.type === "abstraction") {
      expect(reduced.parameter).toBe(customReplacement);
    }
  });
});

describe("defaultAlphaConversionStrategy", () => {
  it("appends \"'\" to the variable's name when there is no collision", () => {
    const [x] = LambdaVariableFrom("x");
    const result = defaultAlphaConversionStrategy(x, new Set());
    expect(result.value).toEqual("x'");
  });

  it("keeps appending \"'\" until the name no longer collides with existingVariableNames", () => {
    const [x] = LambdaVariableFrom("x");
    const result = defaultAlphaConversionStrategy(x, new Set(["x", "x'"]));
    expect(result.value).toEqual("x''");
  });
});

describe("parseLambdaTerm", () => {
  it("parses a bare variable", () => {
    const term = parseLambdaTerm("x");
    expect(term.type).toEqual("variable");
    expect(lambdaTermToString(term)).toEqual("x");
  });

  it("parses an abstraction", () => {
    expect(lambdaTermToString(parseLambdaTerm("λx.x"))).toEqual("λx.x");
  });

  it("accepts \"\\\" as an alternative spelling of \"λ\"", () => {
    expect(lambdaTermToString(parseLambdaTerm("\\x.x"))).toEqual(lambdaTermToString(parseLambdaTerm("λx.x")));
  });

  it("left-associates juxtaposed atoms as application: f x y", () => {
    expect(lambdaTermToString(parseLambdaTerm("f x y"))).toEqual("((f x) y)");
  });

  it("lets parentheses override the default left-associativity: f (x y)", () => {
    expect(lambdaTermToString(parseLambdaTerm("f (x y)"))).toEqual("(f (x y))");
  });

  it("lets an abstraction body extend as far right as possible: λx.f x", () => {
    // Must parse as λx.(f x), not (λx.f) x.
    expect(lambdaTermToString(parseLambdaTerm("λx.f x"))).toEqual("λx.(f x)");
  });

  it("is insensitive to incidental whitespace", () => {
    expect(lambdaTermToString(parseLambdaTerm("  λ x . x  "))).toEqual(lambdaTermToString(parseLambdaTerm("λx.x")));
  });

  it("resolves every occurrence of a bound name to the same variable, so beta reduction substitutes correctly", () => {
    const lc = new LambdaCalculus();
    lc.start(parseLambdaTerm("(λx.x) y"));
    lc.proceed(1);

    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual("y");
  });

  it("shadows an outer binder with an inner one reusing the same name: (λx.λx.x) a", () => {
    // Same scenario as the hand-built "resolves shadowing correctly" test above: the inner "x"
    // must not be substituted by the application to "a", since it refers to the inner binder.
    const [a] = LambdaVariableFrom("a");
    const lc = new LambdaCalculus();
    lc.start(parseLambdaTerm("(λx.λx.x) a", { a }));
    lc.proceed(1);

    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual("λx.x");
  });

  it("resolves a name declared in bindings to the given LambdaVariable object", () => {
    const [y] = LambdaVariableFrom("y");
    const lc = new LambdaCalculus();
    lc.start(parseLambdaTerm("(λx.x) y", { y }));
    lc.proceed(1);

    const reduced = lc.getConfiguration()!.term;
    expect(reduced.type).toEqual("variable");
    if (reduced.type === "variable") {
      expect(reduced.variable).toBe(y);
    }
  });

  it("splices a LambdaTerm bound in bindings verbatim at an identifier position", () => {
    const inner = parseLambdaTerm("f a");
    const term = parseLambdaTerm("g inner", { inner });

    expect(term.type).toEqual("application");
    if (term.type === "application") {
      expect(term.argument).toBe(inner);
    }
  });

  it("reuses a bindings LambdaVariable as an abstraction's own parameter when its name matches the binder", () => {
    const [s] = LambdaVariableFrom("s");
    const term = parseLambdaTerm("λs.s", { s });

    expect(term.type).toEqual("abstraction");
    if (term.type === "abstraction") {
      expect(term.parameter).toBe(s);
    }
  });

  it("lets a spliced term's free variable be captured by a same-named binder reused via bindings", () => {
    const [s, f, y] = LambdaVariableFrom("s", "f", "y");
    const inner = LambdaApplication(LambdaVariableTerm(f), LambdaVariableTerm(s));
    const abstraction = parseLambdaTerm("λs.inner", { s, inner });

    const lc = new LambdaCalculus();
    lc.start(LambdaApplication(abstraction, LambdaVariableTerm(y)));
    lc.proceed(1);

    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual("(f y)");
  });

  it("does not capture a spliced term's free variable via an unrelated, unlinked same-named binder", () => {
    const [s] = LambdaVariableFrom("s");
    const inner = LambdaVariableTerm(s);
    // "s" itself is deliberately not passed in bindings, only "inner" is.
    const term = parseLambdaTerm("λs.inner", { inner });

    expect(term.type).toEqual("abstraction");
    if (term.type === "abstraction") {
      expect(term.parameter).not.toBe(s);
      expect(term.body).toBe(inner);
    }
  });

  it("resolves repeated occurrences of an undeclared free name, within one call, to the same object", () => {
    const term = parseLambdaTerm("x x");
    expect(term.type).toEqual("application");
    if (term.type === "application") {
      expect(term.func.type).toEqual("variable");
      expect(term.argument.type).toEqual("variable");
      if (term.func.type === "variable" && term.argument.type === "variable") {
        expect(term.func.variable).toBe(term.argument.variable);
      }
    }
  });

  it("does not share auto-created free variables across separate calls", () => {
    const first = parseLambdaTerm("x");
    const second = parseLambdaTerm("x");
    expect(first.type).toEqual("variable");
    expect(second.type).toEqual("variable");
    if (first.type === "variable" && second.type === "variable") {
      expect(first.variable).not.toBe(second.variable);
    }
  });

  it("throws on an empty source", () => {
    expect(() => parseLambdaTerm("")).toThrow();
  });

  it("throws on an unknown character", () => {
    expect(() => parseLambdaTerm("x $ y")).toThrow();
  });

  it("throws on an unbalanced opening parenthesis", () => {
    expect(() => parseLambdaTerm("(x")).toThrow();
  });

  it("throws on leftover input after a well-formed term", () => {
    expect(() => parseLambdaTerm("x)")).toThrow();
  });

  it("throws on an abstraction missing its dot", () => {
    expect(() => parseLambdaTerm("λx x")).toThrow();
  });

  it("throws on an abstraction missing its parameter", () => {
    expect(() => parseLambdaTerm("λ.x")).toThrow();
  });
});

describe("lambdaTermToString", () => {
  it("renders a variable", () => {
    const [x] = LambdaVariableFrom("x");
    expect(lambdaTermToString(LambdaVariableTerm(x))).toEqual("x");
  });

  it("renders an abstraction", () => {
    const [x] = LambdaVariableFrom("x");
    expect(lambdaTermToString(LambdaAbstraction(x, LambdaVariableTerm(x)))).toEqual("λx.x");
  });

  it("renders an application", () => {
    const [f, x] = LambdaVariableFrom("f", "x");
    expect(lambdaTermToString(LambdaApplication(LambdaVariableTerm(f), LambdaVariableTerm(x)))).toEqual("(f x)");
  });
});
