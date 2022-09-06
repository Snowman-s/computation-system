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
});
