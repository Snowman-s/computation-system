import {
  BalancedThreeStackMachine,
  BalancedThreeStackRule,
  ThreeStackControlFrom,
  ThreeStackLetterFrom,
  ThreeStacks,
  ThreeStackWord,
} from "../src/computation-system";

describe("BalancedThreeStackMachine", () => {
  const [c0, c1, c2] = ThreeStackControlFrom("c0", "c1", "c2");
  const [z, a, b, s, t, u, v] = ThreeStackLetterFrom("z", "a", "b", "s", "t", "u", "v");
  const E: ThreeStackWord = [];

  describe("Factory", () => {
    test("ThreeStackControlFrom creates distinct controls", () => {
      const [x, y] = ThreeStackControlFrom("x", "x");
      expect(x.value).toBe("x");
      expect(x.meaning).toBe("control");
      expect(x).not.toBe(y);
    });

    test("ThreeStackLetterFrom creates distinct letters", () => {
      const [x, y] = ThreeStackLetterFrom("x", "x");
      expect(x.value).toBe("x");
      expect(x.meaning).toBe("letter");
      expect(x).not.toBe(y);
    });
  });

  describe("Constructor", () => {
    test("Error if a rule is not balanced", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [E, E, E] },
      ];
      expect(() => new BalancedThreeStackMachine(z, rules, c0)).toThrow(/balanced/i);
    });

    test("Error if sources are not separated (prefix relation on every stack)", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[s], E, E] },
        { fromControl: c0, pop: [[a, b], E, E], toControl: c2, push: [[s, t], E, E] },
      ];
      expect(() => new BalancedThreeStackMachine(z, rules, c0)).toThrow(/source/i);
    });

    test("Error if sources are not separated (empty prefix is a prefix of anything)", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[s], E, E] },
        { fromControl: c0, pop: [E, E, [a]], toControl: c2, push: [E, E, [s]] },
      ];
      expect(() => new BalancedThreeStackMachine(z, rules, c0)).toThrow(/source/i);
    });

    test("Error if targets are not separated", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c2, push: [[s], E, E] },
        { fromControl: c1, pop: [[a], E, E], toControl: c2, push: [[s], E, E] },
      ];
      expect(() => new BalancedThreeStackMachine(z, rules, c0)).toThrow(/target/i);
    });

    test("Separated rules sharing the same control are accepted", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[s], E, E] },
        { fromControl: c0, pop: [[b], E, E], toControl: c1, push: [[t], E, E] },
      ];
      expect(() => new BalancedThreeStackMachine(z, rules, c0)).not.toThrow();
    });

    test("Rules separated only by a later stack are accepted", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [E, [a], [a]], toControl: c1, push: [[s], E, [s]] },
        { fromControl: c0, pop: [E, [a], [b]], toControl: c1, push: [[s], E, [t]] },
      ];
      expect(() => new BalancedThreeStackMachine(z, rules, c0)).not.toThrow();
    });
  });

  describe("start / getConfiguration", () => {
    test("getConfiguration returns null before start", () => {
      const machine = new BalancedThreeStackMachine(z, [], c0);
      expect(machine.getConfiguration()).toBeNull();
    });

    test("start sets the initial control and the stacks", () => {
      const machine = new BalancedThreeStackMachine(z, [], c1);
      machine.start([[a], [b, s], E]);
      expect(machine.getConfiguration()).toEqual({ control: c1, stacks: [[a], [b, s], []] });
    });

    test("Trailing blank letters are removed fromControl configuration", () => {
      const machine = new BalancedThreeStackMachine(z, [], c0);
      machine.start([[a, z, z], [z], [z, a, z]]);
      expect(machine.getConfiguration()).toEqual({ control: c0, stacks: [[a], [], [z, a]] });
    });

    test("Mutating the input after start does not affect the machine", () => {
      const machine = new BalancedThreeStackMachine(z, [], c0);
      const left = [a];
      machine.start([left, E, E]);
      left.push(b);
      expect(machine.getConfiguration()!.stacks[0]).toEqual([a]);
    });
  });

  describe("proceed", () => {
    test("Error if called before start", () => {
      const machine = new BalancedThreeStackMachine(z, [], c0);
      expect(() => machine.proceed(1)).toThrow();
    });

    test("Error if step < 0", () => {
      const machine = new BalancedThreeStackMachine(z, [], c0);
      machine.start([E, E, E]);
      expect(() => machine.proceed(-1)).toThrow();
    });

    test("Replaces prefixes and keeps tails", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], [b], E], toControl: c1, push: [E, E, [a, b]] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a, s], [b, t], [u]]);
      machine.proceed(1);
      expect(machine.getConfiguration()).toEqual({ control: c1, stacks: [[s], [t], [a, b, u]] });
    });

    test("Pops beyond the finite part are filled with the blank letter", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [E, [s, z, z], E], toControl: c1, push: [[t], E, [u, v]] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([E, [s], E]);
      machine.proceed(1);
      expect(machine.getConfiguration()).toEqual({ control: c1, stacks: [[t], [], [u, v]] });
    });

    test("Pushed blanks on top of an empty stack are normalized away", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [E, E, [z]] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a], E, E]);
      machine.proceed(1);
      expect(machine.getConfiguration()).toEqual({ control: c1, stacks: [[], [], []] });
    });

    test("proceed(0) does nothing", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[b], E, E] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a], E, E]);
      machine.proceed(0);
      expect(machine.getConfiguration()).toEqual({ control: c0, stacks: [[a], [], []] });
    });

    test("Selects the rule whose source matches", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[s], E, E] },
        { fromControl: c0, pop: [[b], E, E], toControl: c2, push: [[t], E, E] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[b], E, E]);
      machine.proceed(1);
      expect(machine.getConfiguration()).toEqual({ control: c2, stacks: [[t], [], []] });
    });

    test("Stops early when no rule is applicable", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c0, push: [E, [a], E] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a, a], E, E]);
      machine.proceed(10);
      expect(machine.getConfiguration()).toEqual({ control: c0, stacks: [[], [a, a], []] });
      expect(machine.isStopped()).toBe(true);
    });
  });

  describe("isStopped", () => {
    test("False before start", () => {
      const machine = new BalancedThreeStackMachine(z, [], c0);
      expect(machine.isStopped()).toBe(false);
    });

    test("False if a rule is applicable", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[b], E, E] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a], E, E]);
      expect(machine.isStopped()).toBe(false);
    });

    test("True if no rule matches the stacks", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[b], E, E] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[b], E, E]);
      expect(machine.isStopped()).toBe(true);
    });

    test("True if no rule leaves the current control, and proceed does nothing", () => {
      const rules: BalancedThreeStackRule[] = [
        { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [[b], E, E] },
      ];
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a], E, E]);
      machine.proceed(1);
      expect(machine.isStopped()).toBe(true);
      machine.proceed(5);
      expect(machine.getConfiguration()).toEqual({ control: c1, stacks: [[b], [], []] });
    });
  });

  describe("asTuple / clone", () => {
    const rules: BalancedThreeStackRule[] = [
      { fromControl: c0, pop: [[a], E, E], toControl: c1, push: [E, [b], E] },
    ];

    test("asTuple returns the definition of the machine", () => {
      const machine = new BalancedThreeStackMachine(z, rules, c2);
      const tuple = machine.asTuple();
      expect(tuple.blank).toBe(z);
      expect(tuple.initControl).toBe(c2);
      expect(tuple.rules).toEqual(rules);
      expect(new Set(tuple.controlSet)).toEqual(new Set([c0, c1, c2]));
      expect(new Set(tuple.letterSet)).toEqual(new Set([z, a, b]));
    });

    test("clone has the same definition and is not started", () => {
      const machine = new BalancedThreeStackMachine(z, rules, c0);
      machine.start([[a], E, E]);
      const cloned = machine.clone();
      expect(cloned).toBeInstanceOf(BalancedThreeStackMachine);
      expect(cloned).not.toBe(machine);
      expect(cloned.asTuple()).toEqual(machine.asTuple());
      expect(cloned.getConfiguration()).toBeNull();
    });
  });

  describe("Paper construction (Theorem 4.1, rules (8)-(13))", () => {
    // 作業テープ x を b に書き換えて右へ進み、b を読んだら停止する TM を論文の規則で組んだもの
    const [Aq, Sq, Tq, Dq, Ah] = ThreeStackControlFrom("A(q)", "S(q)", "T(q)", "D(q)", "A(h)");
    const [bl, x, barB, barX, star, kB, kX, kStar, k0] = ThreeStackLetterFrom(
      "b", "x", "[b]", "[x]", "*", "κb", "κx", "κ*", "κ0"
    );
    const work = [
      { letter: bl, marked: barB },
      { letter: x, marked: barX },
    ];

    const buildRules = (): BalancedThreeStackRule[] => {
      const rules: BalancedThreeStackRule[] = [];
      for (const { letter, marked } of work) {
        // (8)
        rules.push({ fromControl: Aq, pop: [E, [letter], E], toControl: Sq, push: [[marked], E, E] });
        // (9)
        rules.push({ fromControl: Sq, pop: [E, [letter], E], toControl: Sq, push: [[letter], E, E] });
        // (11)
        rules.push({ fromControl: Tq, pop: [[letter], E, E], toControl: Tq, push: [E, [letter], E] });
        // (12)
        rules.push({ fromControl: Tq, pop: [[marked], E, E], toControl: Dq, push: [E, [letter], E] });
      }
      // (10)
      rules.push({ fromControl: Sq, pop: [E, [star, bl], E], toControl: Tq, push: [E, [star], [bl]] });
      // (13) δ(q, x) = (q, b, +1)
      rules.push({ fromControl: Dq, pop: [E, [x, bl], [bl]], toControl: Aq, push: [[bl], [bl], [kB]] });
      rules.push({ fromControl: Dq, pop: [E, [x, x], [bl]], toControl: Aq, push: [[bl], [x], [kX]] });
      rules.push({ fromControl: Dq, pop: [E, [x, star, bl], [bl]], toControl: Aq, push: [[bl], [bl, star], [kStar]] });
      // (13) δ(q, b) = (h, b, 0)
      rules.push({ fromControl: Dq, pop: [E, [bl], [bl]], toControl: Ah, push: [E, [bl], [k0]] });
      return rules;
    };

    const initial: ThreeStacks = [E, [x, x, star], E];

    test("All rules are balanced and separated", () => {
      expect(() => new BalancedThreeStackMachine(bl, buildRules(), Aq)).not.toThrow();
    });

    test("Each work step takes 2m+2 rules and the checkpoints match the tape", () => {
      const machine = new BalancedThreeStackMachine(bl, buildRules(), Aq);
      machine.start(initial);

      // m = 2 なので 6 規則で 1 作業ステップ
      machine.proceed(6);
      expect(machine.getConfiguration()).toEqual({ control: Aq, stacks: [[], [x, star], [kX]] });

      // m = 1 なので 4 規則で 1 作業ステップ (右端での右移動で空白を露出させる行)
      machine.proceed(4);
      expect(machine.getConfiguration()).toEqual({
        control: Aq,
        stacks: [[], [bl, star], [kStar, kX]],
      });

      // b を読んで停止制御へ
      machine.proceed(4);
      expect(machine.getConfiguration()).toEqual({
        control: Ah,
        stacks: [[], [bl, star], [k0, kStar, kX]],
      });
      expect(machine.isStopped()).toBe(true);
    });

    test("Intermediate controls follow the preparation rules", () => {
      const machine = new BalancedThreeStackMachine(bl, buildRules(), Aq);
      machine.start(initial);

      const trace: { control: string; stacks: string[][] }[] = [];
      for (let i = 0; i < 6; i++) {
        machine.proceed(1);
        const config = machine.getConfiguration()!;
        trace.push({
          control: config.control.value,
          stacks: config.stacks.map((stack) => stack.map((letter) => letter.value)),
        });
      }

      expect(trace).toEqual([
        { control: "S(q)", stacks: [["[x]"], ["x", "*"], []] },
        { control: "S(q)", stacks: [["x", "[x]"], ["*"], []] },
        { control: "T(q)", stacks: [["x", "[x]"], ["*"], []] },
        { control: "T(q)", stacks: [["[x]"], ["x", "*"], []] },
        { control: "D(q)", stacks: [[], ["x", "x", "*"], []] },
        { control: "A(q)", stacks: [[], ["x", "*"], ["κx"]] },
      ]);
    });
  });
});
