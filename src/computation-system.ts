export * from "./turing-machine";
export * from "./tag-system";
export * from "./converter";
export * from "./write-first-turing-machine";

export interface ComputationSystem {
  getConfiguration(): unknown;
  asTuple(): unknown;

  start(arg: unknown): void;
  proceed(step: number): void;
  isStopped(): boolean;

  clone(): ComputationSystem;
}
