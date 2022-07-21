import {
  TagSystem,
  TagSystemLetter,
  TagSystemLetterFrom,
  TagSystemRuleSet,
} from "../src/tag-system";

describe("TagSystemRule", () => {
  it("NormalTagSystemRuleTest", () => {
    const [A, B, H]: TagSystemLetter[] = TagSystemLetterFrom("A", "B", "H");
    const ruleset = TagSystemRuleSet.builder().add(A, [A, B]).add(B, [H]).addStop(H).build();

    expect(ruleset.getAllUsedLetters()).toContain(A);
    expect(ruleset.getAllUsedLetters()).toContain(B);
    expect(ruleset.getAllUsedLetters()).toContain(H);

    const rule1 = ruleset.getCandinates(A);
    expect(rule1.stop).toEqual(false);
    if (rule1.stop === false) {
      //Should be exec.
      expect(rule1.writeWord.asLetters()).toEqual([A, B]);
    }
    const rule2 = ruleset.getCandinates(H);
    expect(rule2.stop).toEqual(true);
  });
  it("MonkeyCreateTest", () => {
    const [A, B, C, D, H]: TagSystemLetter[] = TagSystemLetterFrom("A", "B", "C", "D", "H");
    expect(() => TagSystemRuleSet.builder().add(A, [A, A]).add(A, [A, B])).toThrow();

    expect(() => TagSystemRuleSet.builder().add(B, [A]).addStop(B)).toThrow();

    expect(() => TagSystemRuleSet.builder().add(D, [A]).add(C, [D])).not.toThrow();
    expect(() => TagSystemRuleSet.builder().add(D, [A]).add(C, [D]).build()).toThrow();

    expect(() => TagSystemRuleSet.builder().addStop(H).addStop(H)).toThrow();

    expect(() => {
      const ruleset = TagSystemRuleSet.builder().add(A, [B]).add(B, [A]).build();
      ruleset.getCandinates(H);
    }).toThrow();
  });
  it("ToStringTest", () => {
    const [A, B]: TagSystemLetter[] = TagSystemLetterFrom("A", "B");
    const ruleset = TagSystemRuleSet.builder().add(A, [A, B]).addStop(B).build();

    expect(ruleset.toString()).toBe("[A → AB, B → STOP]");
  });
});

describe("TagSystemTest", () => {
  it("NormalTagSystemTest", () => {
    //from https://ja.wikipedia.org/wiki/%E3%82%BF%E3%82%B0%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0
    const [a, b, c, H] = TagSystemLetterFrom("a", "b", "c", "H");
    const ruleset = TagSystemRuleSet.builder()
      .add(a, [c, c, b, a, H])
      .add(b, [c, c, a])
      .add(c, [c, c])
      .addStop(H)
      .build();

    const ts = new TagSystem(2, ruleset);
    expect(ts.asTuple().deleteNum).toEqual(2);
    expect(ts.asTuple().letterSet).toContain(a);
    expect(ts.asTuple().letterSet).toContain(b);
    expect(ts.asTuple().letterSet).toContain(c);
    expect(ts.asTuple().letterSet).toContain(H);
    expect(ts.asTuple().ruleSet).toEqual(ruleset);
    ts.start([b, a, a]);
    expect(ts.isStopped()).toBe(false);
    ts.proceed(1);
    const word1 = ts.getNowWord();
    expect(word1).not.toBeNull();
    if (word1 !== null) {
      // Must be to exec.
      expect(word1.asLetters()).toEqual([a, c, c, a]);
    }
    ts.proceed(3);
    const word2 = ts.getNowWord();
    expect(word2).not.toBeNull();
    if (word2 !== null) {
      expect(word2.asLetters()).toEqual([b, a, H, c, c, c, c]);
    }
    ts.proceed(10);
    const word3 = ts.getNowWord();
    expect(word3).not.toBeNull();
    if (word3 !== null) {
      expect(word3.asLetters()).toEqual([H, c, c, c, c, c, c, a]);
    }
    expect(ts.isStopped()).toBe(true);
    ts.proceed(10);
    const word4 = ts.getNowWord();
    expect(word4).not.toBeNull();
    if (word4 !== null) {
      expect(word4.asLetters()).toEqual([H, c, c, c, c, c, c, a]);
    }
  });
  it("MonkeyTagSystemTest", () => {
    const [A, B, C]: TagSystemLetter[] = TagSystemLetterFrom("A", "B", "C");
    expect(() => {
      const emptyRuleSet = TagSystemRuleSet.builder().build();
      new TagSystem(2, emptyRuleSet);
    }).not.toThrowError();
    expect(() => {
      const emptyRuleSet = TagSystemRuleSet.builder().build();
      new TagSystem(-9, emptyRuleSet);
    }).toThrowError();
    expect(() => {
      const emptyRuleSet = TagSystemRuleSet.builder().build();
      new TagSystem(0, emptyRuleSet);
    }).toThrowError();
    expect(() => {
      const ruleSet = TagSystemRuleSet.builder().add(A, [A, B]).add(B, [A, A]).build();
      new TagSystem(2, ruleSet).start([C]);
    }).toThrowError();

    const sampleRule = TagSystemRuleSet.builder().add(A, [A, B]).add(B, [A, B]).build();
    const sampleTagSystem = new TagSystem(2, sampleRule);
    expect(sampleTagSystem.getNowWord()).toBe(null);

    expect(() => sampleTagSystem.proceed()).toThrowError();
    sampleTagSystem.start([]);
    expect(() => sampleTagSystem.proceed(-9)).toThrowError();
    expect(() => sampleTagSystem.proceed()).not.toThrowError();
    expect(sampleTagSystem.isStopped()).toBe(true);
  });
});
