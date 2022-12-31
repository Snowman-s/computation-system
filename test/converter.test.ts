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
  TMTape,
  TagSystemLetter,
} from "../src/computation-system";

describe("ConverterTest", () => {
  describe("2 or more elements", () => {
    test("positive", () => {
      let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      let [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
      let ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "L", q2)
        .state(q2)
        .add(A, B, "R", qf)
        .add(B, B, "R", qf)
        .build();

      const hierarchy = createHierarchy(
        Converter.turingMachine2SymbolToWriteFirstTuringMachine()
      ).appendLastAndNewHierarchy(Converter.writeFirstTM2SymbolToTagSystem(true));

      hierarchy.start(new TuringMachine(B, ruleset, q1, qf), [[A, B], 0]);
      const tmConfigBeforeExecute = hierarchy.getConfiguration(0)!;
      const writeTmConfigBeforeExecute = hierarchy.getConfiguration(1)!;
      const tsConfigBeforeExecute = hierarchy.getConfiguration(2)!;

      expect(tmConfigBeforeExecute.tape.toString()).toMatch(/…B+AB+…/);
      expect(writeTmConfigBeforeExecute.tape.toString()).toMatch(/…B+AB+…/);
      expect(tsConfigBeforeExecute.word.toString()).toBe("A_{0.l_1}xB_0x");

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const tmConfig = hierarchy.getConfiguration(0)!;
      const writeTmConfig = hierarchy.getConfiguration(1)!;
      const tsConfig = hierarchy.getConfiguration(2)!;

      expect(tmConfig.tape.toString()).toMatch(/…B+AB+…/);
      expect(tmConfig.headPosition).toBe(1);
      expect(tmConfig.nowState).toBe(qf);
      expect(tmConfig.tape.read(tmConfig.headPosition)).toBe(A);

      expect(writeTmConfig.tape.toString()).toMatch(/…B+AB+…/);
      expect(tsConfig.word.toString()).toBe("A_{4.l_1}xB_4x");
    });
  });

  describe("TagSystem2TuringMachine", () => {
    test("Positive", () => {
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
      expect(validInterpretations.map((word) => word.toString())).toEqual([
        "ABB",
        "BBH",
        "HA",
        "HA",
      ]);

      const configLast: TagSystemConfiguration = transformHierarchy.getConfiguration(0)!;
      expect(configLast.word.asLetters()).toEqual([H, A]);

      const turingMachineTuple = transformHierarchy.getTuple(1)!;
      const states = Array.from(turingMachineTuple.stateSet).map((v) => v.value);
      expect(states).toContainEqual("q1");
      expect(states).toContainEqual("q2");
      expect(states.length).toBe(2);

      expect(transformHierarchy.asIndependantSystem(0)).toBeInstanceOf(TagSystem);
      expect(transformHierarchy.asIndependantSystem(1)).toBeInstanceOf(TuringMachine);

      let table = transformHierarchy.getTransFormLogOf(0)!.transformTable;

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
    test("Monkey", () => {
      const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

      const tagSystemRuleSet = TagSystemRuleSet.builder()
        .add(B, [A, H])
        .add(A, [B])
        .addStop(H)
        .build();
      const tagSystem = new TagSystem(10, tagSystemRuleSet);
      const validTagSystem = new TagSystem(2, tagSystemRuleSet);

      const transformHierarchy = createHierarchy(Converter.tag2SystemToTuringMachine218());

      expect(() => transformHierarchy.start(tagSystem, [[B, A, A]])).toThrowError();

      expect(transformHierarchy.getTuple(0)).toBeNull();
      expect(transformHierarchy.getConfiguration(0)).toBeNull();
      expect(transformHierarchy.asIndependantSystem(0)).toBeNull();
      expect(transformHierarchy.getTransFormLogOf(0)).toBeNull();

      transformHierarchy.start(validTagSystem, [[A, B, B]]);
      expect(transformHierarchy.getTuple(0)).toEqual(validTagSystem.asTuple());
      expect(transformHierarchy.asIndependantSystem(0)).not.toBeNull();

      expect(() => transformHierarchy.getTransFormLogOf(1)).toThrowError();
    });
    describe("unit", () => {
      test("interpretConfigration() returns null if unexpected params", () => {
        const element = Converter.tag2SystemToTuringMachine218();

        const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

        const tagSystemRuleSet = TagSystemRuleSet.builder()
          .add(A, [B, H])
          .add(B, [A])
          .addStop(H)
          .build();
        const tagSystem = new TagSystem(2, tagSystemRuleSet);

        //bind()する前
        expect(
          element.interpretConfigration({
            nowState: { value: "hoge", meaning: "state" },
            tape: TMTape.create([], { value: "hoge", meaning: "symbol" }).locked(),
            headPosition: 0,
          })
        ).toBeNull();

        element.bind(tagSystem.asTuple());

        //入力がnull
        expect(element.interpretConfigration(null)).toBeNull();

        // 入力が不完全に終わる
        const tuple = element.asTuple()!;
        const letter = new Map<String, TMSymbol>();
        tuple.symbolSet.forEach((symbol) => {
          letter.set(symbol.value, symbol);
        });

        const [tape, startHead] = element.interpretInput([[A, B, B]]);

        const leftOfTape = tape.slice(0, startHead + 1);
        leftOfTape.push([...tuple.symbolSet].filter((symbol) => symbol.value == "M")[0]);
        expect(
          element.interpretConfigration({
            tape: TMTape.create(leftOfTape, tuple.blankSymbol).locked(),
            nowState: tuple.initState,
            headPosition: startHead,
          })
        ).toBeNull();

        //入力に知らない文字がある
        const leftOfTape2 = tape.slice(0, startHead + 1);
        leftOfTape2.push({ value: "A", meaning: "symbol" });
        expect(
          element.interpretConfigration({
            tape: TMTape.create(leftOfTape2, tuple.blankSymbol).locked(),
            nowState: tuple.initState,
            headPosition: startHead,
          })
        ).toBeNull();
      });
      test("interpretInput() throws Error if unexpected params", () => {
        const element = Converter.tag2SystemToTuringMachine218();

        const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

        const tagSystemRuleSet = TagSystemRuleSet.builder()
          .add(A, [B, H])
          .add(B, [A])
          .addStop(H)
          .build();
        const tagSystem = new TagSystem(2, tagSystemRuleSet);

        // bind() 前
        expect(() => element.interpretInput([[A, B]])).toThrowError();

        element.bind(tagSystem.asTuple());

        // 知らない文字
        expect(() => element.interpretInput([[{ value: "A" }]])).toThrowError();
      });
    });
  });
  describe("TuringMachine2SymbolToWriteFirstTuringMachine", () => {
    test("Positive", () => {
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

      const hierarchy = createHierarchy(Converter.turingMachine2SymbolToWriteFirstTuringMachine());
      hierarchy.start(tm, [[A, A, B, B], 0]);

      expect(hierarchy.getConfiguration(1)?.tape.toString()).toMatch(/…A+BBA+…/);
      expect(hierarchy.getTuple(1)?.ruleset.toString()).toBe(
        "[q1-A BR[A:q1-A, B:q1-B], q1-B AR[A:q2-A, B:q2-B], q2-B BR[A:qf, B:qf]]"
      );

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      expect(hierarchy.getConfiguration(0)?.tape.toString()).toMatch(/…A+BBABA+…/);
      expect(hierarchy.getConfiguration(1)?.tape.toString()).toMatch(/…A+BBABA+…/);
    });
    test("WorkIfBlankSymbolChanged", () => {
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

      let tm = new TuringMachine(B, ruleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2SymbolToWriteFirstTuringMachine());
      expect(hierarchy.getTransFormLogOf(0)).toBeNull();

      hierarchy.start(tm, [[A, A, B, B], 0]);
      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      expect(hierarchy.getConfiguration(0)?.tape.toString()).toMatch(/…B+AB+…/);
      expect(hierarchy.getConfiguration(1)?.tape.toString()).toMatch(/…B+AB+…/);

      expect(hierarchy.getTransFormLogOf(0)).not.toBeNull();
    });
    test("Monkey", () => {
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

      const hierarchy = createHierarchy(Converter.turingMachine2SymbolToWriteFirstTuringMachine());
      expect(() => hierarchy.start(invalidTM, [[A, A, B, B], 0])).toThrowError();

      expect(hierarchy.getConfiguration(1)).toBeNull();
      expect(hierarchy.asIndependantSystem(1)).toBeNull();
      expect(hierarchy.getTuple(1)).toBeNull();
      hierarchy.start(validTM, [[A, A, B, B], 0]);
      expect(hierarchy.getConfiguration(1)).not.toBeNull();
      expect(hierarchy.asIndependantSystem(1)).not.toBeNull();
      expect(hierarchy.getTuple(1)).not.toBeNull();
    });

    describe("unit", () => {
      test("interpretConfigration() returns null if unexpected params", () => {
        const element = Converter.turingMachine2SymbolToWriteFirstTuringMachine();

        let [A, B]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
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
        tm.start([[A, A, B, B], 0]);

        // bind()前
        expect(element.interpretConfigration(tm.getConfiguration())).toBeNull();

        element.bind(tm.asTuple());

        // 入力がnull
        expect(element.interpretConfigration(null)).toBeNull();
      });
      test("interpretInput() throws Error if unexpected params", () => {
        const element = Converter.turingMachine2SymbolToWriteFirstTuringMachine();

        let [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
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

        // bind()前
        expect(() => element.interpretInput([[A, A, B, B], 0])).toThrowError();

        element.bind(tm.asTuple());

        // 入力が、最初のヘッド位置に、bind()で与えられていない記号を持つ
        expect(() => element.interpretInput([[C, A, B, B], 0])).toThrowError();
      });
    });
  });
  describe("WriteFirstTM2SymbolToTagSystem", () => {
    test("Positive", () => {
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

      let tm = new WriteFirstTuringMachine(A, ruleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, B], 0, q1]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_{3.l_1}x" + "α_3x".repeat(3) + "B_3x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…A+BBBA+…/);

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

      let tm = new WriteFirstTuringMachine(B, ruleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, B], 0, q1]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_{3.l_0}xB_3x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…B+BB+…/);
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

      let tm = new WriteFirstTuringMachine(A, ruleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      // ABA'BB, q1 -> ABAB'B, q2 -> ABA'AB, q3 -> ABBBB', qf
      hierarchy.start(tm, [[A, B, A, B, B], 2, q1]);
      const tmtapeBeforeExecuted = hierarchy.getConfiguration(0)?.tape;
      expect(tmtapeBeforeExecuted?.toString()).toMatch(/…A+BABBA+…/);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_{3.l_1}x" + "α_3x".repeat(7) + "B_3x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…A+BBBBA+…/);
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

      let tm = new WriteFirstTuringMachine(A, ruleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrowError();
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

      let tm = new WriteFirstTuringMachine(A, ruleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrowError();
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

      let tm = new WriteFirstTuringMachine(A, rulesetWithoutA, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrowError();

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

      let tm2 = new WriteFirstTuringMachine(A, rulesetWithoutB, qf);

      expect(() => hierarchy.start(tm2, [[A, B, B], 0, q1])).toThrowError();
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

      let tm = new WriteFirstTuringMachine(A, ruleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrowError();
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

      let tm = new WriteFirstTuringMachine(A, ruleset, q2);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrowError();
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

      let tm = new WriteFirstTuringMachine(A, errorRuleset, qf);

      let hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrowError();
    });

    describe("unit", () => {
      test("interpretConfigration() returns null if unexpected params", () => {
        const element = Converter.writeFirstTM2SymbolToTagSystem();

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

        let tm = new WriteFirstTuringMachine(B, ruleset, qf);

        const lettersAsWord = function (i: TagSystemLetter[]) {
          return new (class implements TagSystemWord {
            asLetters(): TagSystemLetter[] {
              return i;
            }
            toString(): string {
              throw new Error("Method not implemented.");
            }
          })();
        };

        // bind()前
        expect(
          element.interpretConfigration({
            word: lettersAsWord([]),
          })
        ).toBeNull();

        element.bind(tm.asTuple());
        const transFormLog = element.getTransFormLog()!;

        // 入力が null
        expect(element.interpretConfigration(null)).toBeNull();

        // 入力が短い
        expect(
          element.interpretConfigration({
            word: lettersAsWord([transFormLog.letterX]),
          })
        ).toBeNull();

        // 入力の先頭がAではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([transFormLog.letterX, transFormLog.letterX]),
          })
        ).toBeNull();

        // 2つ目の文字がxではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.symbolCorrespondenceTable[0].B,
            ]),
          })
        ).toBeNull();
        // 語長が2文字
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
            ]),
          })
        ).toBeNull();
        // 3つ目の文字がαではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].beta,
            ]),
          })
        ).toBeNull();
        // 語長が3文字
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
            ]),
          })
        ).toBeNull();
        // 4つ目の文字がxではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.symbolCorrespondenceTable[0].alpha,
            ]),
          })
        ).toBeNull();
        // 語長が4文字
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
            ]),
          })
        ).toBeNull();
        // 5つ目の文字がBではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].beta,
            ]),
          })
        ).toBeNull();
        // 語長が5文字
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
            ]),
          })
        ).toBeNull();
        // 6つ目の文字がxではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
              transFormLog.symbolCorrespondenceTable[0].B,
            ]),
          })
        ).toBeNull();
        // 語長が6文字 - この時はOK
        /*expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
              transFormLog.letterX,
            ]),
          })
        ).not.toBeNull();*/
        // 7つ目の文字がβではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
            ]),
          })
        ).toBeNull();
        // 語長が7文字
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].beta,
            ]),
          })
        ).toBeNull();
        // 8つ目の文字がxではない
        expect(
          element.interpretConfigration({
            word: lettersAsWord([
              transFormLog.symbolCorrespondenceTable[0].A,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].alpha,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].B,
              transFormLog.letterX,
              transFormLog.symbolCorrespondenceTable[0].beta,
              transFormLog.symbolCorrespondenceTable[0].beta,
            ]),
          })
        ).toBeNull();
      });
    });
  });
});
