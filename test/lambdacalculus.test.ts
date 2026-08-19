import {
  LambdaAbstraction,
  LambdaApplication,
  LambdaCalculus,
  LambdaVariableFrom,
  LambdaVariableTerm,
  lambdaTermToString,
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
