import {
  DeterministicLambdaCalculus,
  LambdaAbstraction,
  LambdaApplication,
  LambdaCalculus,
  LambdaVariableFrom,
  LambdaVariableTerm,
  isDeterministicLambdaTerm,
  lambdaTermToString,
} from "../src/computation-system";

describe("isDeterministicLambdaTerm", () => {
  it("accepts an application whose argument is a variable", () => {
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(LambdaAbstraction(x, LambdaVariableTerm(x)), LambdaVariableTerm(y));

    expect(isDeterministicLambdaTerm(term)).toBe(true);
  });

  it("accepts an application whose argument is an abstraction", () => {
    const [x, z] = LambdaVariableFrom("x", "z");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaVariableTerm(x)),
      LambdaAbstraction(z, LambdaVariableTerm(z))
    );

    expect(isDeterministicLambdaTerm(term)).toBe(true);
  });

  it("rejects an application whose argument is itself an application", () => {
    const [x, z, w] = LambdaVariableFrom("x", "z", "w");
    const term = LambdaApplication(
      LambdaAbstraction(x, LambdaVariableTerm(x)),
      LambdaApplication(LambdaAbstraction(z, LambdaVariableTerm(z)), LambdaVariableTerm(w))
    );

    expect(isDeterministicLambdaTerm(term)).toBe(false);
  });

  it("rejects a violation nested inside an abstraction body", () => {
    // The violation is unreachable by weak evaluation, but the grammar is a static property
    // of the whole term, so it must still be rejected.
    const [x, y, z, w] = LambdaVariableFrom("x", "y", "z", "w");
    const term = LambdaAbstraction(
      x,
      LambdaApplication(
        LambdaAbstraction(y, LambdaVariableTerm(y)),
        LambdaApplication(LambdaAbstraction(z, LambdaVariableTerm(z)), LambdaVariableTerm(w))
      )
    );

    expect(isDeterministicLambdaTerm(term)).toBe(false);
  });

  it("accepts a value-only application nested inside an abstraction body", () => {
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaAbstraction(x, LambdaApplication(LambdaAbstraction(y, LambdaVariableTerm(y)), LambdaVariableTerm(x)));

    expect(isDeterministicLambdaTerm(term)).toBe(true);
  });

  it("accepts a bare variable and a bare abstraction", () => {
    const [x] = LambdaVariableFrom("x");

    expect(isDeterministicLambdaTerm(LambdaVariableTerm(x))).toBe(true);
    expect(isDeterministicLambdaTerm(LambdaAbstraction(x, LambdaVariableTerm(x)))).toBe(true);
  });
});

describe("DeterministicLambdaCalculus", () => {
  it("asTuple should always return an empty object", () => {
    const dlc = new DeterministicLambdaCalculus();
    expect(dlc.asTuple()).toEqual({});
  });

  it("getConfiguration should return null before start", () => {
    const dlc = new DeterministicLambdaCalculus();
    expect(dlc.getConfiguration()).toBeNull();
  });

  it("should throw when proceed() is called before start()", () => {
    const dlc = new DeterministicLambdaCalculus();
    expect(() => {
      dlc.proceed(1);
    }).toThrow();
  });

  it("start() rejects a term outside the deterministic lambda calculus", () => {
    const [x, z, w] = LambdaVariableFrom("x", "z", "w");
    const invalidTerm = LambdaApplication(
      LambdaAbstraction(x, LambdaVariableTerm(x)),
      LambdaApplication(LambdaAbstraction(z, LambdaVariableTerm(z)), LambdaVariableTerm(w))
    );

    const dlc = new DeterministicLambdaCalculus();
    expect(() => {
      dlc.start(invalidTerm);
    }).toThrow();
  });

  it("performs a single weak beta reduction: (λx.x) y -> y", () => {
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaApplication(LambdaAbstraction(x, LambdaVariableTerm(x)), LambdaVariableTerm(y));

    const dlc = new DeterministicLambdaCalculus();
    dlc.start(term);
    dlc.proceed(1);

    expect(lambdaTermToString(dlc.getConfiguration()!.term)).toEqual(lambdaTermToString(LambdaVariableTerm(y)));
  });

  it("never reduces a redex nested inside an abstraction body, unlike LambdaCalculus", () => {
    // λx.((λy.y) x): the whole term is already a value (an abstraction), so weak evaluation
    // must report it as stopped immediately, even though its body still contains a redex.
    const [x, y] = LambdaVariableFrom("x", "y");
    const term = LambdaAbstraction(x, LambdaApplication(LambdaAbstraction(y, LambdaVariableTerm(y)), LambdaVariableTerm(x)));

    const dlc = new DeterministicLambdaCalculus();
    dlc.start(term);
    expect(dlc.isStopped()).toBe(true);

    const beforeProceed = lambdaTermToString(dlc.getConfiguration()!.term);
    dlc.proceed(1);
    expect(lambdaTermToString(dlc.getConfiguration()!.term)).toEqual(beforeProceed);

    // The general (strong, normal-order) LambdaCalculus, by contrast, does reduce the same term.
    const lc = new LambdaCalculus();
    lc.start(term);
    expect(lc.isStopped()).toBe(false);
    lc.proceed(1);
    expect(lambdaTermToString(lc.getConfiguration()!.term)).toEqual(
      lambdaTermToString(LambdaAbstraction(x, LambdaVariableTerm(x)))
    );
  });

  it("reduces the call-by-value fixpoint combinator to a weak-normal form without diverging", () => {
    // t := λx.λy.y(λz.((x x) y) z), theta := t t, s := λk.λw.k w.
    // Per Dal Lago & Accattoli's derivation, "theta s" reduces (in weak evaluation) to
    // "λw.(λz.theta s z) w" in exactly 3 steps, which is already an abstraction (a value) even
    // though its body still contains a suspended redex.
    const [x, y, z, k, w] = LambdaVariableFrom("x", "y", "z", "k", "w");
    const t = LambdaAbstraction(
      x,
      LambdaAbstraction(
        y,
        LambdaApplication(
          LambdaVariableTerm(y),
          LambdaAbstraction(
            z,
            LambdaApplication(
              LambdaApplication(LambdaApplication(LambdaVariableTerm(x), LambdaVariableTerm(x)), LambdaVariableTerm(y)),
              LambdaVariableTerm(z)
            )
          )
        )
      )
    );
    const theta = LambdaApplication(t, t);
    const s = LambdaAbstraction(k, LambdaAbstraction(w, LambdaApplication(LambdaVariableTerm(k), LambdaVariableTerm(w))));
    const term = LambdaApplication(theta, s);

    expect(isDeterministicLambdaTerm(term)).toBe(true);

    const dlc = new DeterministicLambdaCalculus();
    dlc.start(term);
    expect(dlc.isStopped()).toBe(false);

    dlc.proceed(3);
    expect(dlc.isStopped()).toBe(true);

    const expected = LambdaAbstraction(
      w,
      LambdaApplication(
        LambdaAbstraction(z, LambdaApplication(LambdaApplication(theta, s), LambdaVariableTerm(z))),
        LambdaVariableTerm(w)
      )
    );
    expect(lambdaTermToString(dlc.getConfiguration()!.term)).toEqual(lambdaTermToString(expected));

    // Weak evaluation must not diverge: proceeding further is a no-op once stopped.
    dlc.proceed(10);
    expect(lambdaTermToString(dlc.getConfiguration()!.term)).toEqual(lambdaTermToString(expected));
  });

  it("clone() creates an independent instance that has not been started", () => {
    const [x] = LambdaVariableFrom("x");
    const dlc = new DeterministicLambdaCalculus();
    dlc.start(LambdaVariableTerm(x));

    const cloned = dlc.clone();
    expect(cloned.getConfiguration()).toBeNull();
  });
});
