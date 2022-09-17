import {
  TagSystem,
  TagSystemConfiguration,
  TagSystemLetterFrom,
  TagSystemRuleSet,
  TagSystemWord,
  TuringMachine,
  Converter,
  ITransformHierarchy,
  TransformLogTableElm,
  TMSymbol,
  TMSymbolFrom,
  TMStateFrom,
  TMState,
  TMRuleSet,
} from "../src/computation-system";

describe("ConverterTest", () => {
  it("TagSystem2TuringMachine", () => {
    const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

    const tagSystemRuleSet = TagSystemRuleSet.builder()
      .add(A, [B, H])
      .add(B, [A])
      .addStop(H)
      .build();
    const tagSystem = new TagSystem(2, tagSystemRuleSet);

    const transformHierarchy: ITransformHierarchy<[TagSystem, TuringMachine]> =
      Converter.tag2SystemToTuringMachine218New();

    transformHierarchy.start(tagSystem, [[A, B, B]]);

    const configFirst: TagSystemConfiguration = transformHierarchy.getConfiguration(0)!;
    expect(configFirst.word.asLetters()).toEqual([A, B, B]);

    let validInterpretations: TagSystemWord[] = [];
    while (!transformHierarchy.stopped()) {
      let word = transformHierarchy.getConfiguration(0)?.word;
      if (word !== undefined) {
        validInterpretations.push(word);
      }
      transformHierarchy.proceed(1);
    }

    expect(validInterpretations.map((word) => word.asLetters())).toEqual([
      [A, B, B],
      [B, B, H],
      [H, A],
      [H, A],
    ]);
    expect(validInterpretations.map((word) => word.toString())).toEqual(["ABB", "BBH", "HA", "HA"]);

    const configLast: TagSystemConfiguration = transformHierarchy.getConfiguration(0)!;
    expect(configLast.word.asLetters()).toEqual([H, A]);

    const turingMachineTuple = transformHierarchy.getTuple(1)!;
    const states = Array.from(turingMachineTuple.stateSet).map((v) => v.value);
    expect(states).toContainEqual("q1");
    expect(states).toContainEqual("q2");
    expect(states.length).toBe(2);

    expect(transformHierarchy.asIndependantSystem(0)).toBeInstanceOf(TagSystem);
    expect(transformHierarchy.asIndependantSystem(1)).toBeInstanceOf(TuringMachine);

    let table = transformHierarchy.getTransFormLogTable(0)!;
    let mapper = function mapper(elm: TransformLogTableElm): any {
      if ("value" in elm) {
        return elm.value;
      } else if (Array.isArray(elm)) {
        return elm.map((elm2) => mapper(elm2));
      } else {
        return elm.toString();
      }
    };
    //その解釈結果が何の文字か？
    expect(mapper(table[0][0])).toBe("A");
    //その文字は何を出力するか？
    expect(mapper(table[1][1])).toBe("A");
    //その文字はどう表現されるか？
    expect(mapper(table[1][3])).toEqual(["A", "A", "A", "A"]);
    //その文字の出力はどう表現されるか？
    expect(mapper(table[1][4])).toEqual(["F", "F", "A"]);
    //その文字の出力はどう表現されるか？ (STOP命令)
    expect(mapper(table[2][4])).toEqual(["Q", "Q"]);
  });
  it("MonkeyTagSystem2TuringMachine", () => {
    const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

    const tagSystemRuleSet = TagSystemRuleSet.builder()
      .add(A, [B, H])
      .add(B, [A])
      .addStop(H)
      .build();
    const tagSystem = new TagSystem(10, tagSystemRuleSet);
    const validTagSystem = new TagSystem(2, tagSystemRuleSet);

    const transformHierarchy: ITransformHierarchy<[TagSystem, TuringMachine]> =
      Converter.tag2SystemToTuringMachine218New();

    expect(() => transformHierarchy.start(tagSystem, [[A, B, B]])).toThrowError();

    expect(transformHierarchy.getTuple(0)).toBeNull();
    expect(transformHierarchy.getConfiguration(0)).toBeNull();
    expect(transformHierarchy.asIndependantSystem(0)).toBeNull();
    expect(transformHierarchy.getTransFormLogTable(0)).toBeNull();

    transformHierarchy.start(validTagSystem, [[A, B, B]]);
    expect(transformHierarchy.getTuple(0)).toEqual(validTagSystem.asTuple());
    expect(transformHierarchy.asIndependantSystem(0)).not.toBeNull();

    expect(() => transformHierarchy.getTransFormLogTable(1)).toThrowError();
  });
  it("TuringMachine2SymbolToMoveFirstTuringMachine", () => {
    let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
    let [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, "R")
      .add(B, A, "R", q2)
      .state(q2)
      .add(B, B, "R", qf)
      .state(qf)
      .build();

    let tm = new TuringMachine(A, ruleset, q1, qf);

    const hierarchy = Converter.turingMachine2SymbolToMoveFirstTuringMachineNew(A);
    hierarchy.start(tm, [[A, A, B, B], 0]);

    expect(hierarchy.getConfiguration(1)?.tape.toString()).toBe("…AAABBA…");
    expect(hierarchy.getTuple(1)?.ruleset.toString()).toBe(
      "[q1-A BR[A:q1-A, B:q1-B], q1-B AR[A:q2-A, B:q2-B], q2-B BR[A:qf, B:qf]]"
    );
    while (!hierarchy.stopped()) {
      hierarchy.proceed(1);
    }

    expect(hierarchy.getConfiguration(0)?.tape.toString()).toBe("…ABBABA…");
    expect(hierarchy.getConfiguration(1)?.tape.toString()).toBe("…ABBABA…");
  });
  it("MonkeyTuringMachine2SymbolToMoveFirstTuringMachine", () => {
    let [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
    let [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
    let invalidRuleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, "R")
      .add(B, A, "R", q2)
      .state(q2)
      .add(B, C, "R", qf)
      .state(qf)
      .build();
    let invalidTM = new TuringMachine(A, invalidRuleset, q1, qf);

    let validRuleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, "R")
      .add(B, A, "R", q2)
      .state(q2)
      .add(B, B, "R", qf)
      .state(qf)
      .build();
    let validTM = new TuringMachine(A, validRuleset, q1, qf);

    const hierarchy = Converter.turingMachine2SymbolToMoveFirstTuringMachineNew(A);
    expect(() => hierarchy.start(invalidTM, [[A, A, B, B], 0])).toThrowError();

    expect(hierarchy.getConfiguration(1)).toBeNull();
    expect(hierarchy.getTuple(1)).toBeNull();
    hierarchy.start(validTM, [[A, A, B, B], 0]);
    expect(hierarchy.getConfiguration(1)).not.toBeNull();
    expect(hierarchy.getTuple(1)).not.toBeNull();
  });
});
