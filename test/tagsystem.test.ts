import { assert } from "console";
import {
  TagSystem,
  TagSystemLetter,
  TagSystemLetterFrom,
  TagSystemRule,
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
    expect(rule1.length).toEqual(1);
    expect(rule1[0].stop).toEqual(false);
    if (rule1[0].stop === false) {
      //Should be exec.
      expect(rule1[0].writeWord.getLetters()).toEqual([A, B]);
    }
    const rule2 = ruleset.getCandinates(H);
    expect(rule2.length).toEqual(1);
    expect(rule2[0].stop).toEqual(true);
  });
  it("MonkeyCreateTest", () => {
    const [A, B, C, D, H]: TagSystemLetter[] = TagSystemLetterFrom("A", "B", "C", "D", "H");
    const ruleset = TagSystemRuleSet.builder()
      .add(A, [A, B])
      .add(A, [A, B])
      .add(B, [C])
      .addStop(B)
      .add(C, [C])
      .add(C, [C, D])
      .addStop(H)
      .addStop(H)
      .build();

    const rule1 = ruleset.getCandinates(A);
    expect(rule1.length).toBe(1);
    const rule2 = ruleset.getCandinates(B);
    expect(rule2.length).toBe(2);
    const rule3 = ruleset.getCandinates(C);
    expect(rule3.length).toBe(2);
    const rule4 = ruleset.getCandinates(D);
    expect(rule4.length).toBe(0);
    const rule5 = ruleset.getCandinates(H);
    expect(rule5.length).toBe(1);

    expect(ruleset.getAllUsedLetters().filter((k) => k === A)).toHaveLength(1);
    expect(ruleset.getAllUsedLetters().filter((k) => k === B)).toHaveLength(1);
    expect(ruleset.getAllUsedLetters().filter((k) => k === C)).toHaveLength(1);
    expect(ruleset.getAllUsedLetters().filter((k) => k === D)).toHaveLength(1);
    expect(ruleset.getAllUsedLetters().filter((k) => k === H)).toHaveLength(1);
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
      expect(word1.getLetters()).toEqual([a, c, c, a]);
    }
    ts.proceed(3);
    const word2 = ts.getNowWord();
    expect(word2).not.toBeNull();
    if (word2 !== null) {
      expect(word2.getLetters()).toEqual([b, a, H, c, c, c, c]);
    }
    ts.proceed(10);
    const word3 = ts.getNowWord();
    expect(word3).not.toBeNull();
    if (word3 !== null) {
      expect(word3.getLetters()).toEqual([H, c, c, c, c, c, c, a]);
    }
    expect(ts.isStopped()).toBe(true);
    ts.proceed(10);
    const word4 = ts.getNowWord();
    expect(word4).not.toBeNull();
    if (word4 !== null) {
      expect(word4.getLetters()).toEqual([H, c, c, c, c, c, c, a]);
    }
  });
  it("MonkeyTagSystemTest", () => {
    const [A, B, C, H]: TagSystemLetter[] = TagSystemLetterFrom("A", "B", "C", "H");
    const ruleset = TagSystemRuleSet.builder()
      .add(A, [A, B])
      .add(A, [A, B])
      .add(B, [C, H])
      .addStop(B)
      .addStop(H)
      .addStop(H)
      .build();
    expect(() => new TagSystem(-9, ruleset)).toThrowError();
    expect(() => new TagSystem(0, ruleset)).toThrowError();

    const ts1 = new TagSystem(2, ruleset);

    expect(() => ts1.proceed(2)).toThrowError();
    expect(ts1.getNowWord()).toBeNull();
    ts1.start([]);
    expect(() => ts1.proceed(-1)).toThrowError();
    expect(ts1.isStopped()).toBe(false);
    ts1.proceed(0);
    expect(ts1.isStopped()).toBe(false);
    ts1.proceed(1);
    expect(ts1.isStopped()).toBe(true);
    ts1.start([A]);
    expect(ts1.isStopped()).toBe(false);
    ts1.proceed();
    expect(ts1.isStopped()).toBe(true);

    const ts2 = new TagSystem(3, ruleset);
    //ABCABC -> BCAB -> Error!!!
    ts2.start([A, B, C, B, C]);
    expect(() => ts2.proceed()).not.toThrowError();
    expect(() => ts2.proceed()).toThrowError();
    //ABCC -> CAB -> Error!!!
    ts2.start([A, B, C, C]);
    expect(() => ts2.proceed()).not.toThrowError();
    expect(() => ts2.proceed()).toThrowError();

    ts2.start([H, A, B]);
    expect(ts2.isStopped()).toBe(false);
    ts2.proceed();
    expect(ts2.isStopped()).toBe(true);
  });
});
