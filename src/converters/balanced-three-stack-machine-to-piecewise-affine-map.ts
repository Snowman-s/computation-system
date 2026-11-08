import {
  AffinePiece,
  BalancedThreeStackMachine,
  BalancedThreeStackMachineConfiguration,
  BalancedThreeStackMachineTuple,
  BalancedThreeStackRule,
  PiecewiseAffineMap,
  PiecewiseAffineMapConfiguration,
  PiecewiseAffineMapTuple,
  ThreeStackControl,
  ThreeStackLetter,
  ThreeStacks,
  ThreeStackWord,
} from "../computation-system";
import { Rational } from "../rational";
import { ITransformElement } from "../converter";
import { BalancedThreeStackMachineToPiecewiseAffineMapTransformLog } from "../transform-log-types";

/**
 * The distance between the origins of adjacent controls on the first coordinate.
 * As in the paper, it is 4: every configuration of a control is in its origin + (0, 1)^3,
 * so the boxes of different controls are apart, and the observation cube (-1, 2)^3 contains only the control at 0.
 */
const CONTROL_SPACING = 4n;

/**
 * Transforms a {@link BalancedThreeStackMachine} into a {@link PiecewiseAffineMap} on the 3-dimensional space,
 * following the encoding in the proof of Theorem 4.1 of the paper.
 *
 * @remarks
 * Each letter is given an odd digit and the base is B = 2|Σ|+1, so that a stack ξ (followed by infinitely many blanks)
 * is encoded as e(ξ) = Σ_{j≥1} digit(ξ_j) B^(-j) in (0, 1), and a configuration (s; L, R, J) as the point
 * origin(s) + (e(L), e(R), e(J)).
 * Since e(αξ) = e(α) + B^(-|α|) e(ξ), the stacks starting with a prefix α form the interval I(α) = e(α) + [0, B^(-|α|)],
 * and replacing α with α' is an affine map from I(α) onto I(α').
 * So each rule becomes a piece from the box of the configurations it applies to onto the box of its results,
 * and the map simulates the machine exactly, one rule per step.
 *
 * Since the rules are balanced, every piece has determinant 1 (the source and target boxes have the same volume).
 * Since the rule sources (and targets) of the machine are separated and the even digits are left unused as gaps,
 * the source boxes (and the target boxes) are pairwise disjoint.
 *
 * Controls without outgoing rules are placed at origins with non-positive first coordinates, and the others at positive ones.
 * For a machine from {@link TuringMachineToBalancedThreeStackMachineTransformElement}, whose only such control is A_h,
 * this gives the observation of Theorem 4.1: the point enters (-1, 2)^3 if and only if the Turing machine halts.
 *
 * @see OpenAI. Incompressible Box Transport and Finite Computation. preprint, 2026. (Section 4)
 */
export class BalancedThreeStackMachineToPiecewiseAffineMapTransformElement
  implements
    ITransformElement<
      BalancedThreeStackMachine,
      PiecewiseAffineMap,
      BalancedThreeStackMachineToPiecewiseAffineMapTransformLog
    >
{
  private transformLog: BalancedThreeStackMachineToPiecewiseAffineMapTransformLog | null = null;
  private mapSample: PiecewiseAffineMap | null = null;

  /**
   * The tuple of the bound machine, kept for the initial control needed by interpretInput.
   */
  private system: BalancedThreeStackMachineTuple | null = null;
  /**
   * The base B as a rational, kept for the arithmetic of encoding and decoding.
   */
  private base: Rational | null = null;
  /**
   * e(b^∞) = digit(b) / (B - 1), the code of a stack with only blanks,
   * so that encoding can append the infinite blank tail and decoding can detect its end.
   */
  private blankTail: Rational | null = null;
  /**
   * The digit of each letter, for encoding.
   */
  private digits: Map<ThreeStackLetter, bigint> | null = null;
  /**
   * The letter of each digit, for decoding.
   */
  private letterOfDigit: Map<bigint, ThreeStackLetter> | null = null;
  /**
   * The index of each control (its origin is (CONTROL_SPACING × index, 0, 0)), for encoding.
   */
  private controlIndex: Map<ThreeStackControl, bigint> | null = null;
  /**
   * The control of each index, for decoding.
   */
  private controlOfIndex: Map<bigint, ThreeStackControl> | null = null;

  /**
   * Binds this converter to a source machine's tuple, building the pieces of every rule and the correspondence tables.
   *
   * @remarks
   * Digits 1, 3, 5, ... are given to the letters in the order of "system.letterSet".
   * Controls without outgoing rules are given the indices 0, -1, -2, ... and the others 1, 2, 3, ...,
   * each in the order of "system.controlSet".
   *
   * @param system The tuple of the source machine.
   */
  bind(system: BalancedThreeStackMachineTuple): void {
    this.system = system;

    const letters = [...system.letterSet];
    this.base = Rational.of(2 * letters.length + 1);
    this.digits = new Map();
    this.letterOfDigit = new Map();
    letters.forEach((letter, k) => {
      const digit = BigInt(2 * k + 1);
      this.digits!.set(letter, digit);
      this.letterOfDigit!.set(digit, letter);
    });
    this.blankTail = Rational.of(this.digits.get(system.blank)!).div(this.base.sub(Rational.of(1)));

    const sources = new Set(system.rules.map((rule) => rule.fromControl));
    this.controlIndex = new Map();
    this.controlOfIndex = new Map();
    let terminalIndex = 0n;
    let workingIndex = 1n;
    for (const control of system.controlSet) {
      const index = sources.has(control) ? workingIndex++ : terminalIndex--;
      this.controlIndex.set(control, index);
      this.controlOfIndex.set(index, control);
    }

    const ruleTable = system.rules.map((rule) => ({ rule, piece: this.buildPiece(rule) }));
    this.mapSample = new PiecewiseAffineMap(3, ruleTable.map(({ piece }) => piece));

    this.transformLog = {
      base: 2 * letters.length + 1,
      letterDigitTable: letters.map((letter) => ({ letter, digit: Number(this.digits!.get(letter)!) })),
      controlOriginTable: [...system.controlSet].map((control) => ({ control, origin: this.origin(control) })),
      ruleTable,
    };
  }

  /**
   * Converts initial stacks of the machine into the initial point.
   *
   * @param virtual The finite parts of the three stacks, as given to {@link BalancedThreeStackMachine.start}.
   * @returns The code of the configuration (initControl; virtual).
   * @throws {Error} If this converter is not bound, or "virtual" contains a letter not in the bound machine's letter set.
   */
  interpretInput(virtual: ThreeStacks): Rational[] {
    if (this.system === null) {
      throw new Error("This converter is not bound.");
    }
    for (const word of virtual) {
      for (const letter of word) {
        if (!this.digits!.has(letter)) {
          throw new Error(`Letter ${letter.value} not in the bound machine's letter set`);
        }
      }
    }
    const origin = this.origin(this.system.initControl);
    return virtual.map((word, j) => origin[j].add(this.encodeStack(word)));
  }

  /**
   * Recovers the configuration of the machine from a point, if it is the code of a configuration.
   *
   * @remarks
   * The control is found from the first coordinate, whose integer part (divided by the spacing) is the index of the control.
   * Each stack is decoded digit by digit until the rest equals the code of the blank tail,
   * so the decoded words have no trailing blanks, as normalized by {@link BalancedThreeStackMachine.getConfiguration}.
   *
   * @param real The current point of the map, or null if it has not started.
   * @returns The corresponding configuration, or null if "real" is null, this converter is not bound,
   *  or the point is not the code of a configuration.
   */
  interpretConfigration(real: PiecewiseAffineMapConfiguration | null): BalancedThreeStackMachineConfiguration | null {
    if (real === null || this.controlOfIndex === null || real.point.length !== 3) {
      return null;
    }
    const [x, y, z] = real.point;

    const index = x.div(Rational.of(CONTROL_SPACING)).floor();
    const control = this.controlOfIndex.get(index);
    if (control === undefined) {
      return null;
    }

    const left = this.decodeStack(x.sub(Rational.of(CONTROL_SPACING * index)));
    const right = this.decodeStack(y);
    const history = this.decodeStack(z);
    if (left === null || right === null || history === null) {
      return null;
    }
    return { control, stacks: [left, right, history] };
  }

  /**
   * @returns The tuple of the simulating map, or null if this converter is not bound.
   */
  asTuple(): PiecewiseAffineMapTuple | null {
    return this.mapSample?.asTuple() ?? null;
  }

  /**
   * @returns A new (not started) copy of the simulating map, or null if this converter is not bound.
   */
  asIndependantSystem(): PiecewiseAffineMap | null {
    return this.mapSample?.clone() ?? null;
  }

  /**
   * @returns The correspondence table, or null if this converter is not bound.
   */
  getTransFormLog(): BalancedThreeStackMachineToPiecewiseAffineMapTransformLog | null {
    return this.transformLog;
  }

  /**
   * Builds the piece of one rule. (Assume that this converter is bound.)
   * @param rule A rule of the bound machine
   * @returns The piece from origin(fromControl) + ∏ I(pop[j]) onto origin(toControl) + ∏ I(push[j]).
   */
  private buildPiece(rule: BalancedThreeStackRule): AffinePiece {
    const { fromControl, pop, toControl, push } = rule;
    const box = (control: ThreeStackControl, prefixes: ThreeStacks) => {
      const origin = this.origin(control);
      const intervals = prefixes.map((prefix) => this.prefixInterval(prefix));
      return {
        min: intervals.map(([min], j) => origin[j].add(min)),
        max: intervals.map(([, max], j) => origin[j].add(max)),
      };
    };
    return { source: box(fromControl, pop), target: box(toControl, push) };
  }

  /**
   * Returns the origin of a control. (Assume that this converter is bound.)
   * @param control A control of the bound machine
   * @returns (CONTROL_SPACING × index, 0, 0)
   */
  private origin(control: ThreeStackControl): Rational[] {
    return [Rational.of(CONTROL_SPACING * this.controlIndex!.get(control)!), Rational.of(0), Rational.of(0)];
  }

  /**
   * Encodes a stack followed by infinitely many blanks. (Assume that this converter is bound.)
   * @param word The finite part of the stack, whose index 0 is the top. Every letter must have a digit.
   * @returns e(word b^∞)
   */
  private encodeStack(word: ThreeStackWord): Rational {
    // Horner's method from the bottom: e(aξ) = (digit(a) + e(ξ)) / B.
    return word.reduceRight(
      (rest, letter) => Rational.of(this.digits!.get(letter)!).add(rest).div(this.base!),
      this.blankTail!
    );
  }

  /**
   * Returns the interval of the stacks starting with a prefix. (Assume that this converter is bound.)
   * @param prefix The prefix, whose index 0 is the top. Every letter must have a digit.
   * @returns [e(prefix), e(prefix) + B^(-|prefix|)], where e(prefix) is the finite sum of the digits of the prefix.
   */
  private prefixInterval(prefix: ThreeStackWord): [Rational, Rational] {
    let min = Rational.of(0);
    let width = Rational.of(1);
    for (const letter of prefix) {
      width = width.div(this.base!);
      min = min.add(Rational.of(this.digits!.get(letter)!).mul(width));
    }
    return [min, min.add(width)];
  }

  /**
   * Decodes the code of a stack. (Assume that this converter is bound.)
   *
   * @remarks
   * The expansion of a rational number in base B is eventually periodic.
   * For a code, it ends with the blank tail; otherwise a remainder repeats, which is detected to stop the loop.
   *
   * @param code The code of a stack
   * @returns The finite part of the stack without trailing blanks, or null if "code" is not the code of a stack
   *  (a digit is not the digit of a letter, or the expansion does not end with the blank tail).
   */
  private decodeStack(code: Rational): ThreeStackWord | null {
    const word: ThreeStackLetter[] = [];
    const seen = new Set<string>();
    let rest = code;
    while (!rest.equals(this.blankTail!)) {
      const key = rest.toString();
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      const scaled = rest.mul(this.base!);
      const digit = scaled.floor();
      const letter = this.letterOfDigit!.get(digit);
      if (letter === undefined) {
        return null;
      }
      word.push(letter);
      rest = scaled.sub(Rational.of(digit));
    }
    return word;
  }
}
