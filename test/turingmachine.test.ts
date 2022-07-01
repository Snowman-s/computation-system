import exp from "constants";
import {
  TMMove,
  TMRuleSet,
  TMState,
  TMStateFrom,
  TMSymbol,
  TMSymbolFrom,
  TMTape,
  TuringMachine,
} from "../src/turing-machine";

describe("TMTape", function () {
  it("CreateTapeTest", () => {
    let [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    let tape = TMTape.create([A, A, B, B], Blank);

    expect(tape.read(0)).toEqual(A);
    expect(tape.read(2)).toEqual(B);
    expect(tape.read(-5)).toEqual(Blank);
  });
  it("TapeWriteTest", () => {
    let [A, B, C, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "C", "S");
    let tape = TMTape.create([A, A, B, B], Blank);

    tape.write(1, C);
    expect(tape.read(1)).toEqual(C);
    tape.write(5, C);
    expect(tape.read(5)).toEqual(C);
    tape.write(-9, B);
    expect(tape.read(-9)).toEqual(B);
  });
  it("ToStringTest", () => {
    let [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    let tape = TMTape.create([A, A, A, A], Blank);

    expect(tape.toString()).toEqual("…SAAAAS…");
    tape.write(1, B);
    expect(tape.toString()).toEqual("…SABAAS…");
    tape.write(5, B);
    expect(tape.toString()).toEqual("…SABAASBS…");
    tape.write(-2, B);
    expect(tape.toString()).toEqual("…SBSABAASBS…");
    expect(`${tape}`).toEqual("…SBSABAASBS…");

    expect(tape.toString()).toBe(tape.locked().toString());

    let tape2 = TMTape.create([], Blank);
    expect(tape2.toString()).toEqual("…SS…");
  });
  it("CloneTest", () => {
    let [A, Blank]: TMSymbol[] = TMSymbolFrom("A", "S");
    let tape = TMTape.create([A, A, A, A], Blank);

    let tape2 = tape.clone();
    tape.write(42, A);
    expect(tape2.read(42)).toBe(Blank);

    let lockedTape = tape.locked();
    tape.write(-99, A);
    expect(lockedTape.read(-99)).toBe(Blank);
  });
});

describe("TMRule", () => {
  it("NormalTMRuleTest", () => {
    let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
    let [q1, q2]: TMState[] = TMStateFrom("q1", "q2");
    const ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .state(q2)
      .add(B, B, TMMove.RIGHT, q1)
      .build();
    expect(ruleset.getAllUsedStates()).toContain(q1);
    expect(ruleset.getAllUsedStates()).toContain(q2);
    expect(ruleset.getAllUsedSymbols()).toContain(A);
    expect(ruleset.getAllUsedSymbols()).toContain(B);

    const rules1 = ruleset.getCandinates(q1, A);
    expect(rules1.length).toEqual(1);
    expect(rules1[0]).toEqual({
      write: B,
      move: TMMove.RIGHT,
      nextState: q1,
    });
    const rules2 = ruleset.getCandinates(q2, B);
    expect(rules2.length).toEqual(1);
    expect(rules2[0]).toEqual({
      write: B,
      move: TMMove.RIGHT,
      nextState: q1,
    });
    const rules3 = ruleset.getCandinates(q2, A);
    expect(rules3.length).toEqual(0);
  });
  it("MonkeyCreateTest", () => {
    let [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
    let [q1]: TMState[] = TMStateFrom("q1");
    const builder = TMRuleSet.builder();

    expect(() => builder.add(A, B, TMMove.RIGHT)).toThrowError();
    expect(() => builder.addHALT(A)).toThrowError();

    const ruleset = builder
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(A, B, TMMove.RIGHT)
      .add(B, B, TMMove.LEFT)
      .add(B, A, TMMove.LEFT)
      .addHALT(C)
      .addHALT(C)
      .build();

    const rules1 = ruleset.getCandinates(q1, A);
    expect(rules1.length).toEqual(1);
    expect(rules1[0]).toEqual({
      write: B,
      move: TMMove.RIGHT,
      nextState: q1,
    });
    const rules2 = ruleset.getCandinates(q1, B);
    expect(rules2.length).toEqual(2);
    expect(rules2).toContainEqual({
      write: B,
      move: TMMove.LEFT,
      nextState: q1,
    });
    expect(rules2).toContainEqual({
      write: A,
      move: TMMove.LEFT,
      nextState: q1,
    });
    const rules3 = ruleset.getCandinates(q1, C);
    expect(rules3.length).toEqual(1);
    expect(rules3[0].move).toEqual("HALT");
  });
  it("ToStringTest", () => {
    let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
    let [q1, q2]: TMState[] = TMStateFrom("q1", "q2");
    const ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .state(q2)
      .add(B, B, TMMove.RIGHT, q1)
      .addHALT(A)
      .build();

    expect(ruleset.toString()).toEqual("[q1 AB Rq1, q2 BB Rq1, q2 A  ―]");
  });
});

describe("TuringMachine", function () {
  it("ManuallyProceedTest", () => {
    let [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    let [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(B, A, TMMove.RIGHT, q2)
      .state(q2)
      .add(B, B, TMMove.RIGHT, qf)
      .state(qf)
      .build();

    let tm = new TuringMachine(Blank, ruleset, q1, qf);
    //スタート前
    expect(() => tm.proceed()).toThrowError();

    tm.start([A, A, B, B], 0);

    tm.proceed(3);

    expect(tm.isAccepted()).toBe(false);
    tm.proceed();
    expect(tm.isAccepted()).toBe(true);

    expect(tm.getInitialWord()).not.toBeNull();

    //nullではない
    const initialWord = tm.getInitialWord()!;
    expect(initialWord[1]).toBe(A);
    expect(initialWord).not.toHaveProperty("write");
    //これ以上TMが動くことは無い
    expect(() => tm.proceed()).not.toThrowError();
  });
  it('Use"HALT"Test', () => {
    let [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    let [q1, q2]: TMState[] = TMStateFrom("q1", "q2");
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(B, A, TMMove.RIGHT, q2)
      .state(q2)
      .addHALT(B)
      .build();

    let tm = new TuringMachine(Blank, ruleset, q1);
    tm.start([A, A, B, B], 0);

    tm.proceed(3);
    expect(tm.isHalted()).toEqual(false);
    tm.proceed();
    expect(tm.isHalted()).toEqual(true);
    expect(tm.isAccepted()).toEqual(false);

    expect(() => tm.proceed()).not.toThrowError();
  });
  it("Zero-LengthTapeTest", () => {
    let [Blank]: TMSymbol[] = TMSymbolFrom("S");
    let [q1]: TMState[] = TMStateFrom("q1");
    let ruleset = TMRuleSet.builder().state(q1).addHALT(Blank).build();

    let tm = new TuringMachine(Blank, ruleset, q1);
    tm.start([], 0);

    expect(() => tm.proceed()).not.toThrowError();
    expect(tm.isHalted()).toBe(true);
  });
  it("TupleTest", () => {
    let [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    let [q1, qf]: TMState[] = TMStateFrom("q1", "qf");
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.LEFT)
      .add(B, A, TMMove.RIGHT)
      .add(Blank, B, TMMove.CENTER)
      .build();

    let tm = new TuringMachine(Blank, ruleset, q1, qf);

    const tuple = tm.asTuple();
    expect(tuple.acceptState).toEqual(qf);
    expect(tuple.blankSymbol).toEqual(Blank);
    expect(tuple.initState).toEqual(q1);
    expect(tuple.inputSymbolSet).toContain(A);
    expect(tuple.inputSymbolSet).toContain(B);
    expect(tuple.inputSymbolSet).toContain(Blank);
    expect(tuple.ruleset.getCandinates(q1, A)[0].move).toEqual(TMMove.LEFT);
    expect(tuple.symbolSet).toContain(A);
    expect(tuple.symbolSet).toContain(B);
    expect(tuple.symbolSet).toContain(Blank);
    expect(tuple.stateSet).toContain(q1);
    expect(tuple.stateSet).toContain(qf);
  });
  it("GetConfigurationTest", () => {
    let [A, B, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "S");
    let [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(B, A, TMMove.RIGHT, q2)
      .state(q2)
      .add(B, B, TMMove.RIGHT, qf)
      .state(qf)
      .build();

    let tm = new TuringMachine(Blank, ruleset, q1, qf);
    //スタート前
    expect(() => tm.proceed()).toThrowError();
    const beforeConfig = tm.getConfiguration();
    expect(beforeConfig).toBeNull();

    tm.start([A, A, B, B], 0);

    tm.proceed(3);

    const afterConfig = tm.getConfiguration();
    expect(afterConfig).not.toBeNull();
    expect(afterConfig!.headPosition).toBe(3);
    expect(afterConfig!.nowState).toBe(q2);
    expect(afterConfig!.tape.read(0)).toBe(B);
    expect(afterConfig!.tape.read(2)).toBe(A);
  });
  it("MonkeyTuringMachineTest", () => {
    let [A, B, C, D, Blank]: TMSymbol[] = TMSymbolFrom("A", "B", "C", "D", "S");
    let [q1]: TMState[] = TMStateFrom("q1");
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.LEFT)
      .add(B, A, TMMove.RIGHT)
      .add(C, C, TMMove.LEFT)
      .add(C, D, TMMove.RIGHT)
      .add(Blank, B, TMMove.CENTER)
      .build();

    let tm = new TuringMachine(Blank, ruleset, q1);
    tm.start([A, C], 0);

    expect(() => tm.proceed(-1)).toThrowError();

    expect(() => tm.proceed(0)).not.toThrowError();
    expect(() => tm.proceed(4)).not.toThrowError();
    //複数候補
    expect(() => tm.proceed()).toThrowError();

    tm.start([Blank, A, D], 1);
    expect(() => tm.proceed(4)).not.toThrowError();
    //候補なし
    expect(() => tm.proceed()).toThrowError();
  });
});
