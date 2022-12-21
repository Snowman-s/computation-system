import {
  TagSystem,
  TagSystemConfiguration,
  TagSystemLetterFrom,
  TagSystemRuleSet,
  TagSystemWord,
  TuringMachine,
  Converter,
  TMSymbol,
  TMSymbolFrom,
  TMStateFrom,
  TMState,
  TMRuleSet,
  WriteFirstTMRuleSet,
  WriteFirstTuringMachine,
  ITransformHierarchy,
  createHierarchy,
  WriteFirstTM2SymbolToTagSystemTransformLog,
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

    const transformHierarchy = createHierarchy(Converter.tag2SystemToTuringMachine218());

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

    let table = transformHierarchy.getTransFormLogOf(0)!;

    //その解釈結果が何の文字か？
    expect(table[0].letter.value).toBe("A");
    //その文字は何を出力するか？
    expect((table[1].output as TagSystemWord).asLetters().map((letter) => letter.value)).toEqual([
      "A",
    ]);
    //その文字はどう表現されるか？
    expect(table[1].charRepresent.map((symbol) => symbol.value)).toEqual(["A", "A", "A", "A"]);
    //その文字の出力はどう表現されるか？
    expect(table[1].outRepresent.map((symbol) => symbol.value)).toEqual(["F", "F", "A"]);
    //その文字の出力はどう表現されるか？ (STOP命令)
    expect(table[2].outRepresent.map((symbol) => symbol.value)).toEqual(["Q", "Q"]);
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

    const transformHierarchy = createHierarchy(Converter.tag2SystemToTuringMachine218());

    expect(() => transformHierarchy.start(tagSystem, [[A, B, B]])).toThrowError();

    expect(transformHierarchy.getTuple(0)).toBeNull();
    expect(transformHierarchy.getConfiguration(0)).toBeNull();
    expect(transformHierarchy.asIndependantSystem(0)).toBeNull();
    expect(transformHierarchy.getTransFormLogOf(0)).toBeNull();

    transformHierarchy.start(validTagSystem, [[A, B, B]]);
    expect(transformHierarchy.getTuple(0)).toEqual(validTagSystem.asTuple());
    expect(transformHierarchy.asIndependantSystem(0)).not.toBeNull();

    expect(() => transformHierarchy.getTransFormLogOf(1)).toThrowError();
  });
  it("TuringMachine2SymbolToWriteFirstTuringMachine", () => {
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

    const hierarchy = createHierarchy(Converter.turingMachine2SymbolToWriteFirstTuringMachine(A));
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
  it("MonkeyTuringMachine2SymbolToWriteFirstTuringMachine", () => {
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

    const hierarchy = createHierarchy(Converter.turingMachine2SymbolToWriteFirstTuringMachine(A));
    expect(() => hierarchy.start(invalidTM, [[A, A, B, B], 0])).toThrowError();

    expect(hierarchy.getConfiguration(1)).toBeNull();
    expect(hierarchy.getTuple(1)).toBeNull();
    hierarchy.start(validTM, [[A, A, B, B], 0]);
    expect(hierarchy.getConfiguration(1)).not.toBeNull();
    expect(hierarchy.getTuple(1)).not.toBeNull();
  });
  describe("WriteFirstTM2SymbolToTagSystem", () => {
    test("Normal", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let ruleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, ruleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, B], 0]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_3xα_3xα_3xα_3xB_3x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…ABB.AA…/);

      const initStateTransformData = hierarchy
        .getTransFormLogOf(0)
        ?.symbolCorrespondenceTable.filter((data) => data.state == q1)[0]!;

      const initStateOutput = hierarchy
        .getTuple(1)
        ?.ruleSet.getCandinates(initStateTransformData.A!);

      if (initStateOutput?.stop == true) fail();
      expect(initStateOutput?.writeWord.asLetters()[0].value).toBe("C_0");
    });
    test("Work if blank symbol is changed with another letter", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let ruleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(B, ruleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, B], 0]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_3xB_3x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…BB.BB…/);
    });
    test("Work if head position > 0", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let ruleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, ruleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, A, B, B], 2]);
      const tmtapeBeforeExecuted = hierarchy.getConfiguration(0)?.tape;
      expect(tmtapeBeforeExecuted?.toString()).toMatch(/…AB.BBA…/);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_3x" + "α_3x".repeat(7) + "B_3x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…ABBB.AA…/);
    });
    test("Error if any state(s) have no corresponding rules", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, q4, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "q4", "qf");

      let ruleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q4)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, ruleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0])).toThrowError();
    });
    test("Error if any state(s) have 2 or more corresponding rules", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let ruleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .add(B, qf)
        .state(q3, A, "R")
        .add(A, q3)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, ruleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0])).toThrowError();
    });
    test("Error if any state(s) have incomplete read-move rule", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let rulesetWithoutA = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, rulesetWithoutA, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0])).toThrowError();

      let rulesetWithoutB = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .build();

      let tm2 = new WriteFirstTuringMachine(A, rulesetWithoutB, q1, qf);

      expect(() => hierarchy.start(tm2, [[A, B, B], 0])).toThrowError();
    });
    test('Error if any state(s) have "HALT" rule', () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let ruleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .addHALT(A)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, ruleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0])).toThrowError();
    });
    test("Tuple and config is null before executed", () => {
      let hierarchy: ITransformHierarchy<
        [WriteFirstTuringMachine, TagSystem],
        [WriteFirstTM2SymbolToTagSystemTransformLog]
      >;
      hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());
      expect(hierarchy.getTuple(0)).toBeNull();
      expect(hierarchy.getTuple(1)).toBeNull();
      expect(hierarchy.asIndependantSystem(0)).toBeNull();
      expect(hierarchy.asIndependantSystem(1)).toBeNull();
      expect(hierarchy.getConfiguration(0)).toBeNull();
      expect(hierarchy.getConfiguration(1)).toBeNull();
    });
    test("Error if not init-state used in TMRule", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2]: TMState[] = TMStateFrom("q1", "q2");

      let ruleset = WriteFirstTMRuleSet.builder().state(q2, A, "R").add(A, q2).add(B, q2).build();

      let tm = new WriteFirstTuringMachine(A, ruleset, q1, q2);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0])).toThrowError();
    });
    test("Error if 3-alphabet used for TMRule", () => {
      let [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
      let [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      let errorRuleset = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, C, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .add(B, qf)
        .build();

      let tm = new WriteFirstTuringMachine(A, errorRuleset, q1, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0])).toThrowError();
    });
  });
});
