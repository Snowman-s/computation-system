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
  MinskyRegisterMachine,
  Fractran,
  FractranFraction,
  FractranNumber,
  DeterministicLambdaCalculus,
  LambdaVariableFrom,
  LambdaAbstraction,
  LambdaVariableTerm,
} from "../src/computation-system";

describe("ConverterTest", () => {
  describe("2 or more elements", () => {
    test("positive", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
      const ruleset = TMRuleSet.builder()
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
      expect(tsConfigBeforeExecute.word.toString()).toBe("A_0xB_{0.l_1}x");

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
      expect(tsConfig.word.toString()).toBe("A_4xB_{4.l_1}x");
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

      const validInterpretations: TagSystemWord[] = [];
      while (!transformHierarchy.stopped()) {
        const word = transformHierarchy.getConfiguration(0)?.word;
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

      const table = transformHierarchy.getTransFormLogOf(0)!.transformTable;

      for (const row of table) {
        switch (row.letter.value) {
          case "A":
            //その文字は何を出力するか？
            expect((row.output as TagSystemWord).asLetters().map((letter) => letter.value)).toEqual([
              "B", "H"
            ]);
            //その文字はどう表現されるか？
            expect(row.charRepresent.map((symbol) => symbol.value)).toEqual(["A", "A", "A"]);
            //その文字の出力はどう表現されるか？
            expect(row.outRepresent.map((symbol) => symbol.value)).toEqual(["F", "F", "A", "A", "A", "A", "A", "A", "A", "F", "A"]);
            break;
          case "B":
            //その文字は何を出力するか？
            expect((row.output as TagSystemWord).asLetters().map((letter) => letter.value)).toEqual([
              "A"
            ]);
            //その文字はどう表現されるか？
            expect(row.charRepresent.map((symbol) => symbol.value)).toEqual(["A"]);
            //その文字の出力はどう表現されるか？
            expect(row.outRepresent.map((symbol) => symbol.value)).toEqual(["F", "F", "A", "A", "A"]);
            break;
          case "H":
            //その文字は何を出力するか？
            expect(row.output).toEqual("STOP");
            //その文字はどう表現されるか？
            expect(row.charRepresent.map((symbol) => symbol.value)).toEqual(["A", "A", "A", "A", "A", "A"]);
            //その文字の出力はどう表現されるか？ (STOP命令)
            expect(row.outRepresent.map((symbol) => symbol.value)).toEqual(["Q", "Q"]);
            break;
          default:
            fail();
        }
      }
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

      expect(() => transformHierarchy.start(tagSystem, [[B, A, A]])).toThrow();

      expect(transformHierarchy.getTuple(0)).toBeNull();
      expect(transformHierarchy.getConfiguration(0)).toBeNull();
      expect(transformHierarchy.asIndependantSystem(0)).toBeNull();
      expect(transformHierarchy.getTransFormLogOf(0)).toBeNull();

      transformHierarchy.start(validTagSystem, [[A, B, B]]);
      expect(transformHierarchy.getTuple(0)).toEqual(validTagSystem.asTuple());
      expect(transformHierarchy.asIndependantSystem(0)).not.toBeNull();

      expect(() => transformHierarchy.getTransFormLogOf(1)).toThrow();
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
        const letter = new Map<string, TMSymbol>();
        tuple.symbolSet.forEach((symbol) => {
          letter.set(symbol.value, symbol);
        });

        const [tape, startHead] = element.interpretInput([[A, B, B]]);

        const leftOfTape = tape.slice(0, startHead + 1);
        leftOfTape.push([...tuple.symbolSet].find((symbol) => symbol.value == "M")!);
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
        expect(() => element.interpretInput([[A, B]])).toThrow();

        element.bind(tagSystem.asTuple());

        // 知らない文字
        expect(() => element.interpretInput([[{ value: "A" }]])).toThrow();
      });
    });
  });
  describe("TuringMachine2SymbolToWriteFirstTuringMachine", () => {
    test("Positive", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
      const ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(B, B, "R", qf)
        .state(qf)
        .build();

      const tm = new TuringMachine(A, ruleset, q1, qf);

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
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
      const ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(B, B, "R", qf)
        .state(qf)
        .build();

      const tm = new TuringMachine(B, ruleset, q1, qf);

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
      const [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
      const [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
      const invalidRuleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(B, C, "R", qf)
        .state(qf)
        .build();
      const invalidTM = new TuringMachine(A, invalidRuleset, q1, qf);

      const validRuleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(B, B, "R", qf)
        .state(qf)
        .build();
      const validTM = new TuringMachine(A, validRuleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2SymbolToWriteFirstTuringMachine());
      expect(() => hierarchy.start(invalidTM, [[A, A, B, B], 0])).toThrow();

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

        const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
        const [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
        const ruleset = TMRuleSet.builder()
          .state(q1)
          .add(A, B, "R")
          .add(B, A, "R", q2)
          .state(q2)
          .add(B, B, "R", qf)
          .state(qf)
          .build();
        const tm = new TuringMachine(A, ruleset, q1, qf);
        tm.start([[A, A, B, B], 0]);

        // bind()前
        expect(element.interpretConfigration(tm.getConfiguration())).toBeNull();

        element.bind(tm.asTuple());

        // 入力がnull
        expect(element.interpretConfigration(null)).toBeNull();
      });
      test("interpretInput() throws Error if unexpected params", () => {
        const element = Converter.turingMachine2SymbolToWriteFirstTuringMachine();

        const [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
        const [q1, q2, qf]: TMState[] = TMStateFrom("q1", "q2", "qf");
        const ruleset = TMRuleSet.builder()
          .state(q1)
          .add(A, B, "R")
          .add(B, A, "R", q2)
          .state(q2)
          .add(B, B, "R", qf)
          .state(qf)
          .build();
        const tm = new TuringMachine(A, ruleset, q1, qf);

        // bind()前
        expect(() => element.interpretInput([[A, A, B, B], 0])).toThrow();

        element.bind(tm.asTuple());

        // 入力が、最初のヘッド位置に、bind()で与えられていない記号を持つ
        expect(() => element.interpretInput([[C, A, B, B], 0])).toThrow();
      });
    });
  });
  describe("WriteFirstTM2SymbolToTagSystem", () => {
    test("Positive", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
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
        .add(B, qf)
        .build();

      const tm = new WriteFirstTuringMachine(A, ruleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, B], 0, q1]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_3x" + "α_3x".repeat(3) + "B_{3.l_1}x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…A+BBBA+…/);

      const initStateTransformData = hierarchy
        .getTransFormLogOf(0)!
        .symbolCorrespondenceTable.find((data) => data.state == q1)!;

      const initStateOutput = hierarchy
        .getTuple(1)
        ?.ruleSet.getCandinates(initStateTransformData.A);

      if (initStateOutput?.stop == true) fail();
      expect(initStateOutput?.writeWord.asLetters()[0].value).toBe("C_0");
    });
    test("Work if blank symbol is changed with another letter", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
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
        .add(B, qf)
        .build();

      const tm = new WriteFirstTuringMachine(B, ruleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      hierarchy.start(tm, [[A, B, B], 0, q1]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_3xB_{3.l_0}x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…B+BB+…/);
    });
    test("Work if head position > 0", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
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
        .add(B, qf)
        .build();

      const tm = new WriteFirstTuringMachine(A, ruleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      // ABA'BB, q1 -> ABAB'B, q2 -> ABA'AB, q3 -> ABBBB', qf
      hierarchy.start(tm, [[A, B, A, B, B], 2, q1]);
      const tmtapeBeforeExecuted = hierarchy.getConfiguration(0)?.tape;
      expect(tmtapeBeforeExecuted?.toString()).toMatch(/…A+BABBA+…/);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const word = hierarchy.getConfiguration(1)?.word;
      expect(word?.toString()).toEqual("A_3x" + "α_3x".repeat(7) + "B_{3.l_1}x");
      const tmtape = hierarchy.getConfiguration(0)?.tape;
      expect(tmtape?.toString()).toMatch(/…A+BBBBA+…/);
    });
    test("Error if any state(s) have no corresponding rules", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2, q3, q4, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "q4", "qf");

      const ruleset = WriteFirstTMRuleSet.builder()
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

      const tm = new WriteFirstTuringMachine(A, ruleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrow();
    });
    test("Error if any state(s) have 2 or more corresponding rules", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
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
        .add(B, qf)
        .state(q3, A, "R")
        .add(A, q3)
        .add(B, qf)
        .build();

      const tm = new WriteFirstTuringMachine(A, ruleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrow();
    });
    test("Error if any state(s) have incomplete read-move rule", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      const rulesetWithoutA = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(B, qf)
        .build();

      const tm = new WriteFirstTuringMachine(A, rulesetWithoutA, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrow();

      const rulesetWithoutB = WriteFirstTMRuleSet.builder()
        .state(q1, A, "R")
        .add(A, q1)
        .add(B, q2)
        .state(q2, A, "L")
        .add(A, q3)
        .add(B, q3)
        .state(q3, B, "R")
        .add(A, q3)
        .build();

      const tm2 = new WriteFirstTuringMachine(A, rulesetWithoutB, qf);

      expect(() => hierarchy.start(tm2, [[A, B, B], 0, q1])).toThrow();
    });
    test('Error if any state(s) have "HALT" rule', () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      const ruleset = WriteFirstTMRuleSet.builder()
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

      const tm = new WriteFirstTuringMachine(A, ruleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrow();
    });
    test("Tuple and config is null before executed", () => {
      const hierarchy: ITransformHierarchy<
        [WriteFirstTuringMachine, TagSystem],
        [WriteFirstTM2SymbolToTagSystemTransformLog]
      > = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());
      expect(hierarchy.getTuple(0)).toBeNull();
      expect(hierarchy.getTuple(1)).toBeNull();
      expect(hierarchy.asIndependantSystem(0)).toBeNull();
      expect(hierarchy.asIndependantSystem(1)).toBeNull();
      expect(hierarchy.getConfiguration(0)).toBeNull();
      expect(hierarchy.getConfiguration(1)).toBeNull();
    });
    test("Error if not init-state used in TMRule", () => {
      const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
      const [q1, q2]: TMState[] = TMStateFrom("q1", "q2");

      const ruleset = WriteFirstTMRuleSet.builder().state(q2, A, "R").add(A, q2).add(B, q2).build();

      const tm = new WriteFirstTuringMachine(A, ruleset, q2);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrow();
    });
    test("Error if 3-alphabet used for TMRule", () => {
      const [A, B, C]: TMSymbol[] = TMSymbolFrom("A", "B", "C");
      const [q1, q2, q3, qf]: TMState[] = TMStateFrom("q1", "q2", "q3", "qf");

      const errorRuleset = WriteFirstTMRuleSet.builder()
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

      const tm = new WriteFirstTuringMachine(A, errorRuleset, qf);

      const hierarchy = createHierarchy(Converter.writeFirstTM2SymbolToTagSystem());

      expect(() => hierarchy.start(tm, [[A, B, B], 0, q1])).toThrow();
    });

    describe("unit", () => {
      test("interpretConfigration() returns null if unexpected params", () => {
        const element = Converter.writeFirstTM2SymbolToTagSystem();

        const [A, B]: TMSymbol[] = TMSymbolFrom("A", "B");
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
          .add(B, qf)
          .build();

        const tm = new WriteFirstTuringMachine(B, ruleset, qf);

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

  describe("TuringMachine2SymbolToMinskyRegisterMachine", () => {
    test("Positive", () => {
      const [A, B] = TMSymbolFrom("A", "B");
      const [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

      const ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(A, B, "L")
        .add(B, A, "L", qf)
        .build();

      const tm = new TuringMachine(A, ruleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2symbolToMinskyRegisterMachine());

      hierarchy.start(tm, [[A, B, B], 0]);

      const tmConfigBeforeExecute = hierarchy.getConfiguration(0)!;
      expect(tmConfigBeforeExecute.tape.toString()).toMatch(/…A+BBA+…/);
      expect(tmConfigBeforeExecute.headPosition).toBe(0);
      expect(tmConfigBeforeExecute.nowState).toBe(q1);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const tmConfig = hierarchy.getConfiguration(0)!;
      const mrmConfig = hierarchy.getConfiguration(1)!;

      expect(tmConfig.tape.toString()).toMatch(/…A+BA+…/);
      expect(tmConfig.headPosition).toBe(0);
      expect(tmConfig.nowState).toBe(qf);

      expect(mrmConfig).not.toBeNull();
      expect(hierarchy.asIndependantSystem(1)).toBeInstanceOf(MinskyRegisterMachine);
    });

    test("Correctly handles moves when the shrinking-side register requires multiple drain iterations (regression for d <- z loopback bug)", () => {
      const [A, B] = TMSymbolFrom("A", "B");
      const [q1, qf] = TMStateFrom("q1", "qf");

      const ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R", qf)
        .add(B, B, "R", qf)
        .build();

      const tm = new TuringMachine(A, ruleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2symbolToMinskyRegisterMachine());

      // tape: A(head), B, B, B -> N starts at 7, so floor(7/2) = 3 requires
      // the "d <- z" drain loop to iterate more than once.
      hierarchy.start(tm, [[A, B, B, B], 0]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const tmConfig = hierarchy.getConfiguration(0)!;
      const mrmConfig = hierarchy.getConfiguration(1)!;

      expect(tmConfig.tape.toString()).toBe("…ABBBBA…");
      expect(tmConfig.nowState).toBe(qf);

      expect(mrmConfig.registers[1]).toBe(BigInt(1)); // M
      expect(mrmConfig.registers[2]).toBe(BigInt(3)); // N
      expect(mrmConfig.registers[3]).toBe(BigInt(0)); // Z (must not leak)
    });

    test("Work with symbol1 as blank", () => {
      const [A, B] = TMSymbolFrom("A", "B");
      const [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

      const ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(A, B, "L")
        .add(B, A, "L", qf)
        .build();

      const tm = new TuringMachine(B, ruleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2symbolToMinskyRegisterMachine());

      hierarchy.start(tm, [[A, B, B], 0]);

      while (!hierarchy.stopped()) {
        hierarchy.proceed(1);
      }

      const tmConfig = hierarchy.getConfiguration(0)!;
      expect(tmConfig.tape.toString()).toMatch(/…B+AAB+…/);
      expect(tmConfig.nowState).toBe(qf);
    });

    test("Monkey - Error if not 2-symbol", () => {
      const [A, B, C] = TMSymbolFrom("A", "B", "C");
      const [q1, qf] = TMStateFrom("q1", "qf");

      const invalidRuleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, C, "R")
        .add(C, A, "R", qf)
        .build();

      const invalidTM = new TuringMachine(A, invalidRuleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2symbolToMinskyRegisterMachine());

      expect(() => hierarchy.start(invalidTM, [[A, B, C], 0])).toThrow();

      expect(hierarchy.getConfiguration(1)).toBeNull();
      expect(hierarchy.asIndependantSystem(1)).toBeNull();
      expect(hierarchy.getTuple(1)).toBeNull();
    });

    test("Monkey - Error if multiple rules for same state-symbol", () => {
      const [A, B] = TMSymbolFrom("A", "B");
      const [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

      const validRuleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R")
        .add(B, A, "R", q2)
        .state(q2)
        .add(A, B, "L")
        .add(B, A, "L", qf)
        .build();

      const validTM = new TuringMachine(A, validRuleset, q1, qf);

      const hierarchy = createHierarchy(Converter.turingMachine2symbolToMinskyRegisterMachine());

      hierarchy.start(validTM, [[A, B, B], 0]);

      expect(hierarchy.getConfiguration(1)).not.toBeNull();
      expect(hierarchy.asIndependantSystem(1)).not.toBeNull();
      expect(hierarchy.getTuple(1)).not.toBeNull();
    });

    describe("unit", () => {
      test("interpretConfigration() returns null if unexpected params", () => {
        const element = Converter.turingMachine2symbolToMinskyRegisterMachine();

        const [A, B] = TMSymbolFrom("A", "B");
        const [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

        const ruleset = TMRuleSet.builder()
          .state(q1)
          .add(A, B, "R")
          .add(B, A, "R", q2)
          .state(q2)
          .add(A, B, "L")
          .add(B, A, "L", qf)
          .build();

        const tm = new TuringMachine(A, ruleset, q1, qf);

        // bind()前
        expect(
          element.interpretConfigration({
            registers: [BigInt(0), BigInt(0), BigInt(0), BigInt(0)],
            instructionPointer: 0,
          })
        ).toBeNull();

        element.bind(tm.asTuple());

        // 入力がnull
        expect(element.interpretConfigration(null)).toBeNull();

        // instructionPointerが不正な位置
        expect(
          element.interpretConfigration({
            registers: [BigInt(0), BigInt(0), BigInt(0), BigInt(0)],
            instructionPointer: 9999,
          })
        ).toBeNull();
      });

      test("interpretInput() throws Error if unexpected params", () => {
        const element = Converter.turingMachine2symbolToMinskyRegisterMachine();

        const [A, B] = TMSymbolFrom("A", "B");
        const [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

        const ruleset = TMRuleSet.builder()
          .state(q1)
          .add(A, B, "R")
          .add(B, A, "R", q2)
          .state(q2)
          .add(A, B, "L")
          .add(B, A, "L", qf)
          .build();

        const tm = new TuringMachine(A, ruleset, q1, qf);

        // bind()前
        expect(() => element.interpretInput([[A, B], 0])).toThrow();

        element.bind(tm.asTuple());

        // 正常なケース
        expect(() => element.interpretInput([[A, B], 0])).not.toThrow();
      });
    });
  });

  describe("TuringMachine to 2-symbol", () => {
    test("Positive", () => {
      const element = Converter.turingMachineTo2Symbol();

      const [A, B, S] = TMSymbolFrom("A", "B", "S");
      const [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

      const ruleset = TMRuleSet.builder()
        .state(q1)
        .add(A, B, "R", q2)
        .state(q2)
        .add(B, S, "L")
        .add(S, A, "R", qf)
        .build();

      const virtualTM = new TuringMachine(S, ruleset, q1, qf);

      element.bind(virtualTM.asTuple());

      const symbol2TM = element.asIndependantSystem()!;

      //A'BSB, q1 -> BB'SB, q2 -> S'SSSB, q2 -> AS'SSB, qf
      symbol2TM.start(element.interpretInput([[A, B, S, B], 0]));

      while (!symbol2TM.isAccepted()) {
        symbol2TM.proceed(1);
      }
      expect(element.interpretConfigration(symbol2TM.getConfiguration())?.tape.toString()).toMatch(
        /S+ASSSBS+/
      );
    });
  });

  describe("MinskyRegisterMachineToFractran", () => {
    test("Positive - INC instruction", () => {
      const element = Converter.minskyRegisterMachineToFractran();

      const program = [
        { type: "INC" as const, register: 0, next: 1 },
        { type: "HALT" as const },
      ];
      const mrm = new MinskyRegisterMachine(2, program);

      element.bind(mrm.asTuple());

      const fractran = element.asIndependantSystem()!;
      fractran.start(element.interpretInput({ registers: [BigInt(5), BigInt(3)] }));

      while (!fractran.isStopped()) {
        fractran.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(fractran.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.registers).toEqual([BigInt(6), BigInt(3)]);
      expect(interpretedConfig!.instructionPointer).toBe(1);
    });

    test("Positive - DEC instruction (non-zero)", () => {
      const element = Converter.minskyRegisterMachineToFractran();

      const program = [
        { type: "DEC" as const, register: 0, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "INC" as const, register: 1, next: 2 },
        { type: "HALT" as const },
      ];
      const mrm = new MinskyRegisterMachine(2, program);

      element.bind(mrm.asTuple());

      const fractran = element.asIndependantSystem()!;
      fractran.start(element.interpretInput({ registers: [BigInt(5), BigInt(0)] }));

      while (!fractran.isStopped()) {
        fractran.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(fractran.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.registers).toEqual([BigInt(4), BigInt(1)]);
      expect(interpretedConfig!.instructionPointer).toBe(2);
    });

    test("Positive - DEC instruction (zero)", () => {
      const element = Converter.minskyRegisterMachineToFractran();

      const program = [
        { type: "DEC" as const, register: 0, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "INC" as const, register: 1, next: 2 },
        { type: "HALT" as const },
      ];
      const mrm = new MinskyRegisterMachine(2, program);

      element.bind(mrm.asTuple());

      const fractran = element.asIndependantSystem()!;
      fractran.start(element.interpretInput({ registers: [BigInt(0), BigInt(10)] }));

      while (!fractran.isStopped()) {
        fractran.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(fractran.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.registers).toEqual([BigInt(0), BigInt(10)]);
      expect(interpretedConfig!.instructionPointer).toBe(2);
    });

    test("Complex program - addition", () => {
      const element = Converter.minskyRegisterMachineToFractran();

      // Program: R2 = R0 + R1
      // while R0 > 0: R0--, R2++
      // while R1 > 0: R1--, R2++
      const program = [
        { type: "DEC" as const, register: 0, nextIfNonZero: 1, nextIfZero: 2 },
        { type: "INC" as const, register: 2, next: 0 },
        { type: "DEC" as const, register: 1, nextIfNonZero: 3, nextIfZero: 4 },
        { type: "INC" as const, register: 2, next: 2 },
        { type: "HALT" as const },
      ];
      const mrm = new MinskyRegisterMachine(3, program);

      element.bind(mrm.asTuple());

      const fractran = element.asIndependantSystem()!;
      fractran.start(element.interpretInput({ registers: [BigInt(3), BigInt(5), BigInt(0)] }));

      while (!fractran.isStopped()) {
        fractran.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(fractran.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.registers).toEqual([BigInt(0), BigInt(0), BigInt(8)]);
      expect(interpretedConfig!.instructionPointer).toBe(4);
    });

    describe("unit", () => {
      test("interpretConfigration() returns null if unexpected params", () => {
        const element = Converter.minskyRegisterMachineToFractran();

        const program = [{ type: "HALT" as const }];
        const mrm = new MinskyRegisterMachine(1, program);

        element.bind(mrm.asTuple());

        // Configuration with invalid instruction prime
        const fractran = new Fractran([FractranFraction.fromFractranNumbers(
          new FractranNumber([{ base: 999, exponent: 1 }]),
          new FractranNumber([{ base: 1, exponent: 1 }])
        )]);
        fractran.start(new FractranNumber([{ base: 999, exponent: 1 }]));

        expect(element.interpretConfigration(fractran.getConfiguration())).toBeNull();
      });

      test("interpretInput() works correctly", () => {
        const element = Converter.minskyRegisterMachineToFractran();

        const program = [{ type: "HALT" as const }];
        const mrm = new MinskyRegisterMachine(2, program);

        element.bind(mrm.asTuple());

        const input = element.interpretInput({ registers: [BigInt(3), BigInt(5)] });

        // Should have factors for both registers and the initial instruction
        expect(input.factors.length).toBeGreaterThanOrEqual(3);
        
        // Sum of exponents should be 3 + 5 + 1 (for instruction pointer)
        const totalExponent = input.factors.reduce((sum, f) => sum + f.exponent, 0);
        expect(totalExponent).toBe(9);
      });
    });
  });

  describe("TuringMachineToDeterministicLambdaCalculus", () => {
    test("Positive - immediately accepting machine", () => {
      const element = Converter.turingMachineToDeterministicLambdaCalculus();
      const [blank, one] = TMSymbolFrom("0", "1");
      const [q0] = TMStateFrom("q0");
      // "one" is registered into the symbol set via a rule at q0 itself; since q0 is the accept
      // state this rule is dead (real TM semantics never consult it), but it still needs to exist
      // so that "one" is part of symbolSet and can legally appear in the input word below.
      const ruleset = TMRuleSet.builder().state(q0).add(one, one, "R", q0).build();
      const tm = new TuringMachine(blank, ruleset, q0, q0);

      element.bind(tm.asTuple());

      const lambda = element.asIndependantSystem()!;
      lambda.start(element.interpretInput([[one], 0]));

      while (!lambda.isStopped()) {
        lambda.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(lambda.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.nowState).toBe(q0);
      expect(interpretedConfig!.headPosition).toBe(0);
      expect(interpretedConfig!.tape.read(0)).toBe(one);
    });

    test("Positive - single right move", () => {
      const element = Converter.turingMachineToDeterministicLambdaCalculus();
      const [blank, one] = TMSymbolFrom("0", "1");
      const [q0, q1] = TMStateFrom("q0", "q1");
      const ruleset = TMRuleSet.builder()
        .state(q0)
        .add(blank, blank, "R", q1)
        .add(one, one, "R", q1)
        .build();
      const tm = new TuringMachine(blank, ruleset, q0, q1);

      element.bind(tm.asTuple());

      const lambda = element.asIndependantSystem()!;
      lambda.start(element.interpretInput([[one, one], 0]));

      while (!lambda.isStopped()) {
        lambda.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(lambda.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.nowState).toBe(q1);
      expect(interpretedConfig!.headPosition).toBe(1);
      expect(interpretedConfig!.tape.read(0)).toBe(one);
      expect(interpretedConfig!.tape.read(1)).toBe(one);
    });

    test("Positive - single left move with an empty left tape", () => {
      const element = Converter.turingMachineToDeterministicLambdaCalculus();
      const [blank, one] = TMSymbolFrom("0", "1");
      const [q0, q1] = TMStateFrom("q0", "q1");
      const ruleset = TMRuleSet.builder()
        .state(q0)
        .add(blank, blank, "L", q1)
        .add(one, blank, "L", q1)
        .build();
      const tm = new TuringMachine(blank, ruleset, q0, q1);

      element.bind(tm.asTuple());

      const lambda = element.asIndependantSystem()!;
      lambda.start(element.interpretInput([[one], 0]));

      while (!lambda.isStopped()) {
        lambda.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(lambda.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.nowState).toBe(q1);
      expect(interpretedConfig!.headPosition).toBe(0);
      expect(interpretedConfig!.tape.read(0)).toBe(blank);
      expect(interpretedConfig!.tape.read(1)).toBe(blank);
    });

    test("Positive - four right moves, exhausting the right tape and re-fixing the theta recursion each step", () => {
      const element = Converter.turingMachineToDeterministicLambdaCalculus();
      const [blank, one] = TMSymbolFrom("0", "1");
      const [q0, q1, q2, q3, q4] = TMStateFrom("q0", "q1", "q2", "q3", "q4");
      const builder = TMRuleSet.builder();
      [
        [q0, q1],
        [q1, q2],
        [q2, q3],
        [q3, q4],
      ].forEach(([from, to]) => {
        builder.state(from).add(blank, blank, "R", to).add(one, one, "R", to);
      });
      const ruleset = builder.build();
      const tm = new TuringMachine(blank, ruleset, q0, q4);

      element.bind(tm.asTuple());

      const lambda = element.asIndependantSystem()!;
      lambda.start(element.interpretInput([[one, one, one, one], 0]));

      while (!lambda.isStopped()) {
        lambda.proceed(1);
      }

      const interpretedConfig = element.interpretConfigration(lambda.getConfiguration());
      expect(interpretedConfig).not.toBeNull();
      expect(interpretedConfig!.nowState).toBe(q4);
      expect(interpretedConfig!.headPosition).toBe(4);
      expect(interpretedConfig!.tape.read(0)).toBe(one);
      expect(interpretedConfig!.tape.read(1)).toBe(one);
      expect(interpretedConfig!.tape.read(2)).toBe(one);
      expect(interpretedConfig!.tape.read(3)).toBe(one);
      expect(interpretedConfig!.tape.read(4)).toBe(blank);
    });

    describe("unit", () => {
      test("bind() throws if acceptState is null", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank] = TMSymbolFrom("0");
        const [q0] = TMStateFrom("q0");
        const tm = new TuringMachine(blank, TMRuleSet.builder().build(), q0, null);

        expect(() => element.bind(tm.asTuple())).toThrow();
      });

      test("bind() throws if a non-accept state has no rule for some symbol", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank, one] = TMSymbolFrom("0", "1");
        const [q0, q1] = TMStateFrom("q0", "q1");
        // "one" is registered into the symbol set via a (dead, since q1 is the accept state) rule
        // at q1, but q0 has no rule for it, so the transition table is not total outside q1.
        const ruleset = TMRuleSet.builder()
          .state(q0)
          .add(blank, blank, "R", q1)
          .state(q1)
          .add(one, one, "R", q1)
          .build();
        const tm = new TuringMachine(blank, ruleset, q0, q1);

        expect(() => element.bind(tm.asTuple())).toThrow();
      });

      test("bind() throws if a non-accept state has ambiguous rules for some symbol", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank, one] = TMSymbolFrom("0", "1");
        const [q0, q1] = TMStateFrom("q0", "q1");
        const ruleset = TMRuleSet.builder()
          .state(q0)
          .add(blank, blank, "R", q1)
          .add(one, blank, "R", q1)
          .add(one, one, "L", q1)
          .build();
        const tm = new TuringMachine(blank, ruleset, q0, q1);

        expect(() => element.bind(tm.asTuple())).toThrow();
      });

      test("bind() throws if a non-accept state has a HALT rule", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank, one] = TMSymbolFrom("0", "1");
        const [q0, q1] = TMStateFrom("q0", "q1");
        const ruleset = TMRuleSet.builder()
          .state(q0)
          .add(blank, blank, "R", q1)
          .addHALT(one)
          .build();
        const tm = new TuringMachine(blank, ruleset, q0, q1);

        expect(() => element.bind(tm.asTuple())).toThrow();
      });

      test("asTuple() / asIndependantSystem() / getTransFormLog() are null before bind()", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();

        expect(element.asTuple()).toBeNull();
        expect(element.asIndependantSystem()).toBeNull();
        expect(element.getTransFormLog()).toBeNull();
      });

      test("asTuple() / asIndependantSystem() / getTransFormLog() are populated after bind()", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank] = TMSymbolFrom("0");
        const [q0] = TMStateFrom("q0");
        const tm = new TuringMachine(blank, TMRuleSet.builder().build(), q0, q0);

        element.bind(tm.asTuple());

        expect(element.asTuple()).toEqual({});
        expect(element.asIndependantSystem()).toBeInstanceOf(DeterministicLambdaCalculus);

        const log = element.getTransFormLog();
        expect(log).not.toBeNull();
        expect(log!.symbolCorrespondenceTable.map((row) => row.symbol)).toEqual([blank]);
        expect(log!.stateCorrespondenceTable.map((row) => row.state)).toEqual([q0]);
      });

      test("interpretConfigration() returns null for a term that is not at a clean simulation point", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank] = TMSymbolFrom("0");
        const [q0] = TMStateFrom("q0");
        const tm = new TuringMachine(blank, TMRuleSet.builder().build(), q0, q0);

        element.bind(tm.asTuple());

        const [x] = LambdaVariableFrom("x");
        const identityTerm = LambdaAbstraction(x, LambdaVariableTerm(x));

        expect(element.interpretConfigration({ term: identityTerm })).toBeNull();
      });

      test("interpretConfigration() returns null when the driving system has not started", () => {
        const element = Converter.turingMachineToDeterministicLambdaCalculus();
        const [blank] = TMSymbolFrom("0");
        const [q0] = TMStateFrom("q0");
        const tm = new TuringMachine(blank, TMRuleSet.builder().build(), q0, q0);

        element.bind(tm.asTuple());

        expect(element.interpretConfigration(null)).toBeNull();
      });
    });
  });
});
