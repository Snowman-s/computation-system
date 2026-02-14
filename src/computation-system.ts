export * from "./turing-machine";
export * from "./tag-system";
export * from "./elementary-cellular-automaton";
export * from "./write-first-turing-machine";
export * from "./fractran";
export * from "./minsky-register-machine";
export * from "./transform-log-types";
export * from "./converter";

export interface ComputationSystem {
  getConfiguration(): unknown;
  asTuple(): unknown;

  start(arg: unknown): void;
  proceed(step: number): void;
  isStopped(): boolean;

  clone(): ComputationSystem;
}
