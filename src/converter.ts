import {
  TagSystem,
} from "./tag-system";
import {
  TuringMachine,
} from "./turing-machine";
import {
  ComputationSystem,
  Fractran,
  MinskyRegisterMachine,
  WriteFirstTuringMachine,
} from "./computation-system";
import {
  WriteFirstTM2SymbolToTagSystemTransformLog,
  Tag2SystemToTuringMachine218TransformLog,
  TuringMachine2SymbolToWriteFirstTuringMachineTransformLog,
  TuringMachineTo2SymbolTransformLog,
  TuringMachine2SymbolToMinskyRegisterMachineTransformLog,
  MinskyRegisterMachineToFractranTransformLog,
} from "./transform-log-types";
import { Tag2SystemToTuringMachine218TransformElement } from "./converters/tag2-system-to-turing-machine-218";
import { TuringMachine2SymbolToWriteFirstTuringMachineTransformElement } from "./converters/turing-machine-2symbol-to-write-first-turing-machine";
import { WriteFirstTM2SymbolToTagSystemTransformElement } from "./converters/write-first-tm-2symbol-to-tag-system";
import { TuringMachineTo2SymbolTransformElement } from "./converters/turing-machine-to-2symbol";
import { TuringMachine2SymbolToMinskyRegisterMachineTransformElement } from "./converters/turing-machine-2symbol-to-minsky-register-machine";
import { MinskyRegisterMachineToFractranTransformElement } from "./converters/minsky-register-machine-to-fractran";

export class Converter {
  /* istanbul ignore next */
  private constructor() {}

  /**
   * @see Yurii Rogozhin. Small universal Turing machines. Theoretical Computer Science, 168(2):215–240, 1996.
   */
  public static tag2SystemToTuringMachine218(): ITransformElement<
    TagSystem,
    TuringMachine,
    Tag2SystemToTuringMachine218TransformLog
  > {
    return new Tag2SystemToTuringMachine218TransformElement();
  }

  public static turingMachine2SymbolToWriteFirstTuringMachine(): ITransformElement<
    TuringMachine,
    WriteFirstTuringMachine,
    TuringMachine2SymbolToWriteFirstTuringMachineTransformLog
  > {
    return new TuringMachine2SymbolToWriteFirstTuringMachineTransformElement();
  }

  /**
   * @see COCKE, John; MINSKY, Marvin. Universality of tag systems with P= 2. Journal of the ACM (JACM), 1964, 11.1: 15-20.
   */
  public static writeFirstTM2SymbolToTagSystem(
    fillRulesAsPossible = false
  ): ITransformElement<
    WriteFirstTuringMachine,
    TagSystem,
    WriteFirstTM2SymbolToTagSystemTransformLog
  > {
    return new WriteFirstTM2SymbolToTagSystemTransformElement(fillRulesAsPossible);
  }

  /**
   * @see SHANNON, Claude E. A universal Turing machine with two internal states. Automata studies, 1956, 34: 157-165.
   */
  public static turingMachineTo2Symbol(): ITransformElement<
    TuringMachine,
    TuringMachine,
    TuringMachineTo2SymbolTransformLog
  > {
    return new TuringMachineTo2SymbolTransformElement();
  }

  public static turingMachine2symbolToMinskyRegisterMachine(): ITransformElement<
    TuringMachine,
    MinskyRegisterMachine,
    TuringMachine2SymbolToMinskyRegisterMachineTransformLog
  > {
    return new TuringMachine2SymbolToMinskyRegisterMachineTransformElement();
  }

  public static minskyRegisterMachineToFractran(): ITransformElement<
    MinskyRegisterMachine,
    Fractran,
    MinskyRegisterMachineToFractranTransformLog
  > {
    return new MinskyRegisterMachineToFractranTransformElement();
  }
}

export type SystemInput<T extends ComputationSystem> = Parameters<T["start"]>[0];
export type SystemConfigration<T extends ComputationSystem> = Exclude<
  ReturnType<T["getConfiguration"]>,
  null
>;
export type SystemTuple<T extends ComputationSystem> = ReturnType<T["asTuple"]>;

export interface ITransformElement<
  Take extends ComputationSystem,
  As extends ComputationSystem,
  TransformLog
> {
  interpretConfigration(real: SystemConfigration<As> | null): SystemConfigration<Take> | null;
  interpretInput(virtual: SystemInput<Take>): SystemInput<As>;
  bind(system: SystemTuple<Take>): void;
  asTuple(): SystemTuple<As> | null;
  asIndependantSystem(): As | null;
  getTransFormLog(): TransformLog | null;
}

type SystemsAsHierarchyElements<
  S extends ComputationSystem[] | unknown,
  TransformLog extends unknown[]
> = S extends ComputationSystem[]
  ? S["length"] extends 2
    ? [ITransformElement<S[0], S[1], TransformLog[0]>]
    : [
        ITransformElement<S[0], S[1], TransformLog[0]>,
        ...SystemsAsHierarchyElements<Remove1<S>, Remove1<TransformLog>>
      ]
  : [];

export type Remove2<T extends unknown[]> = T extends [infer _, infer _, ...infer Rests]
  ? Rests
  : unknown[];
export type Remove1<T extends unknown[]> = T extends [infer _, ...infer Rests] ? Rests : unknown[];
export type FirstOf<T extends unknown[]> = T extends [infer F, ...infer _] ? F : T[0];
export type LastOf<T extends unknown[]> = T extends [...infer _, infer Last] ? Last : T[0];

export type HierarchyElementAsTransformLog<
  InitElement extends ITransformElement<ComputationSystem, ComputationSystem, unknown>
> = InitElement extends ITransformElement<infer _, infer _, infer TransformLog>
  ? [TransformLog]
  : never;

export function createHierarchy<
  Take extends ComputationSystem,
  As extends ComputationSystem,
  TransformLog
>(
  initWith: ITransformElement<Take, As, TransformLog>
): ITransformHierarchy<[Take, As], [TransformLog]> {
  return new TransformHierarchy<[Take, As], [TransformLog]>([
    initWith,
  ] as SystemsAsHierarchyElements<[Take, As], [TransformLog]>);
}

export interface ITransformHierarchy<
  S extends ComputationSystem[],
  TransformLog extends unknown[]
> {
  start(inputSystem: FirstOf<S>, input: SystemInput<FirstOf<S>>): void;

  proceed(step: number): void;
  stopped(): boolean;
  getConfiguration<N extends number>(system: N): SystemConfigration<S[N]> | null;
  getTuple<N extends number>(system: N): SystemTuple<S[N]> | null;
  asIndependantSystem<N extends number>(system: N): S[N] | null;
  getTransFormLogOf<S extends number>(smallerSystem: S): TransformLog[S] | null;
  appendLastAndNewHierarchy<Add extends ComputationSystem, TransformLogAdd>(
    append: ITransformElement<LastOf<S>, Add, TransformLogAdd>
  ): ITransformHierarchy<[...S, Add], [...TransformLog, TransformLogAdd]>;
}

class TransformHierarchy<S extends ComputationSystem[], TransformLog extends unknown[]>
  implements ITransformHierarchy<S, TransformLog>
{
  private elements: SystemsAsHierarchyElements<S, TransformLog>;
  private baseSystem: LastOf<S> | null = null;
  private inputSystemSample: FirstOf<S> | null = null;

  public constructor(elements: SystemsAsHierarchyElements<S, TransformLog>) {
    this.elements = elements;
  }

  getTransFormLogOf<S extends number>(smallerSystem: S): TransformLog[S] | null {
    return this.inputSystemSample === null ? null : this.elements[smallerSystem].getTransFormLog();
  }

  stopped(): boolean {
    return this.baseSystem !== null && this.baseSystem.isStopped();
  }

  start(inputSystem: FirstOf<S>, input: Parameters<FirstOf<S>["start"]>[0]): void {
    let tuple: ReturnType<ComputationSystem["asTuple"]> = inputSystem.asTuple();

    this.elements.forEach((elm) => {
      elm.bind(tuple);
      tuple = elm.asTuple();
    });

    let inputCopy: Parameters<ComputationSystem["start"]>[0] = input;
    this.elements.forEach((elm) => {
      inputCopy = elm.interpretInput(inputCopy);
    });
    this.baseSystem = this.elements[this.elements.length - 1].asIndependantSystem() as LastOf<S>;
    this.baseSystem.start(inputCopy as any);

    this.inputSystemSample = inputSystem.clone() as FirstOf<S>;
  }

  proceed(step: number): void {
    if (this.baseSystem === null) {
      throw new Error("You must call start() before proceed().");
    }
    this.baseSystem.proceed(step);
  }

  getConfiguration<N extends number>(
    system: N
  ): Exclude<ReturnType<S[N]["getConfiguration"]>, null> | null {
    if (this.baseSystem === null) return null;

    let ret = this.baseSystem.getConfiguration();
    if (system <= this.elements.length - 1) {
      ret = this.elements[this.elements.length - 1].interpretConfigration(ret);
      for (let i = this.elements.length - 2; system <= i; i--) {
        ret = this.elements[i].interpretConfigration(ret);
      }
    }

    return ret as Exclude<ReturnType<S[N]["getConfiguration"]>, null> | null;
  }

  getTuple<N extends number>(system: N): ReturnType<S[N]["asTuple"]> | null {
    let ret: SystemTuple<ComputationSystem> | null;

    if (system === 0) {
      if (this.inputSystemSample === null) {
        ret = null;
      } else {
        ret = this.inputSystemSample.asTuple();
      }
    } else {
      ret = this.elements[system - 1].asTuple();
    }

    return ret as ReturnType<S[N]["asTuple"]> | null;
  }

  asIndependantSystem<N extends number>(system: N): S[N] | null {
    let ret: ComputationSystem | null;

    if (system === 0) {
      if (this.inputSystemSample === null) {
        ret = null;
      } else {
        ret = this.inputSystemSample.clone();
      }
    } else {
      ret = this.elements[system - 1].asIndependantSystem();
    }

    return ret as S[N];
  }

  appendLastAndNewHierarchy<Add extends ComputationSystem, TransformLogAdd>(
    append: ITransformElement<LastOf<S>, Add, TransformLogAdd>
  ): ITransformHierarchy<[...S, Add], [...TransformLog, TransformLogAdd]> {
    const copyelements = [...this.elements];
    copyelements.push(append);
    return new TransformHierarchy<[...S, Add], [...TransformLog, TransformLogAdd]>(
      copyelements as SystemsAsHierarchyElements<[...S, Add], [...TransformLog, TransformLogAdd]>
    );
  }
}
