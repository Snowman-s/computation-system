# Conputation-System

Simulate computational models, such as Turing machines.

It also supports the conversion of a computational model into a computational model that simulates it.

This can be used in Typescript.

## Usage

### Simulate a Turing Machine

```typescript
import { TMRuleSet, TMStateFrom, TMSymbolFrom, TuringMachine } from "computation-system";
// Create symbol and states.
let [A, B, Blank] = TMSymbolFrom("A", "B", "S");
let [q1, q2, qf] = TMStateFrom("q1", "q2", "qf");

// Create rule set.
let ruleset = TMRuleSet.builder()
  .state(q1)
  .add(A, B, "R")
  .add(B, A, "R", q2)
  .state(q2)
  .add(B, B, "R", qf)
  .state(qf)
  .build();

//Create Turing Machine!
let tm = new TuringMachine(Blank, ruleset, q1, qf);

// Start Turing Machine.
tm.start([[A, A, B, B], 0]);
// Proceed. The system will automatically stop.
tm.proceed(10);

// Get now configuration(operation-dependent information) of turing machine
const afterConfig = tm.getConfiguration();

// Print tape of Turing Machine
console.log(afterConfig.tape.toString());
```

## Supported Features

(This lib is WIP, so functions are few.)

### Execute

- Turing Machine
- Tag System

### Convert

- "Turing Machine" simulates "2-Tag System"

## LICENSE

This software is released under the MIT License, see LICENSE.

## Thanks!

This repository created from "TypeScript library starter"(https://github.com/alexjoverm/typescript-library-starter.git)! Thanks!
