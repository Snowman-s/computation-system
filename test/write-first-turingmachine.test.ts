import {
  WriteFirstTMRuleOutput,
  WriteFirstTMRuleSet,
  WriteFirstTuringMachine,
  TMState,
  TMStateFrom,
  TMSymbol,
  TMSymbolFrom,
} from "../src/computation-system";

describe("WriteFirstTMRule", () => {
  it("NormalWriteFirstTMRuleTest", () => {
    const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
    const [q1, q2]: TMState[] = TMStateFrom("q1", "q2");
    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(A, q1)
      .state(q2, A, "L")
      .add(B, q1)
      .build();
    expect(ruleset.getAllUsedStates()).toContain(q1);
    expect(ruleset.getAllUsedStates()).toContain(q2);
    expect(ruleset.getAllUsedSymbols()).toContain(A);
    expect(ruleset.getAllUsedSymbols()).toContain(B);

    const rules1 = ruleset.getCandinates(q1);
    expect(rules1.length).toEqual(1);
    expect(rules1[0]).toEqual({
      write: A,
      move: "R",
      changeStates: [{ read: A, thenGoTo: q1 }],
    });
    const rules2 = ruleset.getCandinates(q2);
    expect(rules2.length).toEqual(1);
    expect(rules2[0]).toEqual({
      write: A,
      move: "L",
      changeStates: [{ read: B, thenGoTo: q1 }],
    });
  });
  it("MonkeyCreateTest", () => {
    const [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
    const [q1, q2, q3, q4]: TMState[] = TMStateFrom("q1", "q2", "q3", "q4");
    const builder = WriteFirstTMRuleSet.builder();

    expect(() => builder.add(A, q1)).toThrow();
    expect(() => builder.addHALT(B)).toThrow();

    const ruleset = builder
      .state(q3, A, "R")
      .add(A, q2)
      .state(q1, A, "R")
      .add(A, q1)
      .add(A, q1)
      .add(B, q1)
      .add(B, q2)
      .addHALT(C)
      .addHALT(C)
      .state(q2, A, "R")
      .add(A, q2)
      .state(q2, B, "R")
      .add(A, q2)
      .state(q3, A, "R")
      .add(B, q2)
      .state(q4, A, "L")
      .build();

    const rules1 = ruleset.getCandinates(q1);
    expect(rules1.length).toEqual(1);
    expect(rules1[0]).toEqual<WriteFirstTMRuleOutput>({
      write: A,
      move: "R",
      changeStates: [
        {
          read: A,
          thenGoTo: q1,
        },
        {
          read: B,
          thenGoTo: q1,
        },
        {
          read: B,
          thenGoTo: q2,
        },
        {
          read: C,
          thenGoTo: "HALT",
        },
      ],
    });
    const rules2 = ruleset.getCandinates(q2);
    expect(rules2.length).toEqual(2);
    expect(rules2).toContainEqual<WriteFirstTMRuleOutput>({
      write: A,
      move: "R",
      changeStates: [
        {
          read: A,
          thenGoTo: q2,
        },
      ],
    });
    expect(rules2).toContainEqual<WriteFirstTMRuleOutput>({
      write: B,
      move: "R",
      changeStates: [
        {
          read: A,
          thenGoTo: q2,
        },
      ],
    });
    const rules3 = ruleset.getCandinates(q3);
    expect(rules3).toEqual<WriteFirstTMRuleOutput[]>([
      {
        write: A,
        move: "R",
        changeStates: [
          {
            read: A,
            thenGoTo: q2,
          },
          {
            read: B,
            thenGoTo: q2,
          },
        ],
      },
    ]);
    const rule4 = ruleset.getCandinates(q4);
    expect(rule4.length).toBe(0);
  });
  it("ToStringTest", () => {
    const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
    const [q1, q2]: TMState[] = TMStateFrom("q1", "q2");
    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(B, q1)
      .state(q2, B, "R")
      .add(B, q1)
      .addHALT(A)
      .build();

    expect(ruleset.toString()).toEqual("[q1 AR[B:q1], q2 BR[B:q1, A:-]]");
  });
});

describe("WriteFirstTuringMachine", function () {
  it("ManuallyProceedTest", () => {
    const [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    const [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(A, q1)
      .add(B, q2)
      .state(q2, A, "L")
      .add(A, q3)
      .add(B, q3)
      .state(q3, B, "R")
      .add(A, q3)
      .add(B, q3)
      .add(Blank, qf)
      .build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset, qf);
    //スタート前
    expect(() => tm.proceed()).toThrow();

    tm.start([[A, A, B, B], 0, q1]);

    tm.proceed(5);

    expect(tm.isStopped()).toEqual(false);
    expect(tm.isAccepted()).toBe(false);
    tm.proceed();
    expect(tm.isStopped()).toEqual(true);
    expect(tm.isAccepted()).toBe(true);

    expect(tm.getInitialWord()).not.toBeNull();

    //nullではない
    const initialWord = tm.getInitialWord()!;
    expect(initialWord[1]).toBe(A);
    expect(initialWord).not.toHaveProperty("write");
    //これ以上TMが動くことは無い
    expect(() => tm.proceed()).not.toThrow();
  });
  it('Use"HALT"Test', () => {
    const [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    const [q1, q2, q3]: TMState[] = TMStateFrom("q1", "q2", "q3");

    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(A, q1)
      .add(B, q2)
      .state(q2, A, "R")
      .add(B, q3)
      .state(q3, B, "R")
      .addHALT(Blank)
      .build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset);
    tm.start([[A, A, B, B], 0, q1]);

    tm.proceed(3);
    expect(tm.isHalted()).toEqual(false);
    expect(tm.isStopped()).toEqual(false);
    tm.proceed();
    expect(tm.isHalted()).toEqual(true);
    expect(tm.isAccepted()).toEqual(false);
    expect(tm.isStopped()).toEqual(true);

    expect(() => tm.proceed()).not.toThrow();
  });
  it("Zero-LengthTapeTest", () => {
    const [Blank]: TMSymbol[] = TMSymbolFrom("S");
    const [q1]: TMState[] = TMStateFrom("q1");
    const ruleset = WriteFirstTMRuleSet.builder().state(q1, Blank, "R").addHALT(Blank).build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset);
    tm.start([[], 0, q1]);

    expect(() => tm.proceed()).not.toThrow();
    expect(tm.isHalted()).toBe(true);
  });
  it("TupleTest", () => {
    const [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    const [q1, qf]: TMState[] = TMStateFrom("q1", "qf");
    const ruleset = WriteFirstTMRuleSet.builder().state(q1, A, "R").add(B, q1).build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset, qf);

    const tuple = tm.asTuple();
    expect(tuple.acceptState).toEqual(qf);
    expect(tuple.blankSymbol).toEqual(Blank);
    expect(tuple.inputSymbolSet).toContain(A);
    expect(tuple.inputSymbolSet).toContain(B);
    expect(tuple.inputSymbolSet).toContain(Blank);
    expect(tuple.ruleset.getCandinates(q1)[0].move).toEqual("R");
    expect(tuple.symbolSet).toContain(A);
    expect(tuple.symbolSet).toContain(B);
    expect(tuple.symbolSet).toContain(Blank);
    expect(tuple.stateSet).toContain(q1);
    expect(tuple.stateSet).toContain(qf);
  });
  it("GetConfigurationTest", () => {
    const [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    const [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");
    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(A, q1)
      .add(B, q2)
      .state(q2, A, "R")
      .add(B, q3)
      .state(q3, B, "R")
      .add(Blank, qf)
      .build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset, qf);
    //スタート前
    expect(() => tm.proceed()).toThrow();
    const beforeConfig = tm.getConfiguration();
    expect(beforeConfig).toBeNull();

    tm.start([[A, A, B, B], 0, q1]);

    tm.proceed(3);

    const afterConfig = tm.getConfiguration();
    expect(afterConfig).not.toBeNull();
    expect(afterConfig!.headPosition).toBe(3);
    expect(afterConfig!.nowState).toBe(q3);
    expect(afterConfig!.tape.read(0)).toBe(A);
    expect(afterConfig!.tape.read(1)).toBe(A);
    expect(afterConfig!.tape.read(2)).toBe(A);
    expect(afterConfig!.tape.read(3)).toBe(B);
  });
  it("MonkeyTuringMachineTest", () => {
    const [A, B, C, D, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "C", "D", "S");
    const [q1, q2, q3]: TMState[] = TMStateFrom("q1", "q2", "q3");
    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(A, q1)
      .add(A, q1)
      .add(B, q1)
      .add(B, q2)
      .addHALT(C)
      .addHALT(C)
      .state(q2, A, "R")
      .add(A, q2)
      .state(q2, B, "R")
      .add(A, q2)
      .build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset);
    tm.start([[A, A, B], 0, q1]);

    expect(() => tm.proceed(-1)).toThrow();

    expect(() => tm.proceed(0)).not.toThrow();
    expect(() => tm.proceed(1)).not.toThrow();
    //複数候補
    expect(() => tm.proceed()).toThrow();

    tm.start([[Blank, A, D], 0, q1]);
    expect(() => tm.proceed()).not.toThrow();
    //候補なし
    expect(() => tm.proceed()).toThrow();

    const tm2 = new WriteFirstTuringMachine(Blank, ruleset);
    tm2.start([[A, B], 0, q2]);
    //複数候補(2)
    expect(() => tm2.proceed()).toThrow();

    const tm3 = new WriteFirstTuringMachine(Blank, ruleset);
    tm3.start([[], 0, q3]);
    //候補なし(2)
    expect(() => tm3.proceed()).toThrow();
  });
  it("CloneTest", () => {
    const [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    const [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");
    const ruleset = WriteFirstTMRuleSet.builder()
      .state(q1, A, "R")
      .add(A, q1)
      .add(B, q2)
      .state(q2, A, "R")
      .add(B, q3)
      .state(q3, B, "R")
      .add(Blank, qf)
      .build();

    const tm = new WriteFirstTuringMachine(Blank, ruleset, qf);
    expect(tm.clone().asTuple()).toEqual(tm.asTuple());
  });
});
