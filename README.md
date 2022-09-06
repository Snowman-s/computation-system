# Computation-System

Simulate computational models, such as Turing machines.

It also supports the conversion of a computational model into a computational model that simulates it.

This can be used in Typescript.

## Usage

### Execute a Turing Machine

<details><summary>Code (Folded)</summary>

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

// Get now configuration(operation-dependent information) of Turing Machine.
const afterConfig = tm.getConfiguration()!;

// Print tape of Turing Machine.
console.log(afterConfig.tape.toString());
```

</details>

### Execute a TagSyetem

<details><summary>Code (Folded)</summary>

```typescript
import { TagSystem, TagSystemLetterFrom, TagSystemRuleSet } from "computation-system";

// Create letters.
const [a, b, c, H] = TagSystemLetterFrom("a", "b", "c", "H");

// Create rule set.
const ruleset = TagSystemRuleSet.builder()
  .add(a, [c, c, b, a, H])
  .add(b, [c, c, a])
  .add(c, [c, c])
  .addStop(H)
  .build();

//Create Tag System!
const ts = new TagSystem(2, ruleset);

// Start Tag System.
ts.start([[b, a, a]]);

// Proceed. The system will automatically stop.
ts.proceed(20);

// Get now configuration(operation-dependent information) of Tag System.
const afterConfig = ts.getConfiguration()!;

// Print tape of Tag System.
console.log(afterConfig.word.toString());
```

</details>

### Converter (Beta)

<details><summary>Code (Folded)</summary>

```typescript
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

// Let's make "Turing Machine" which simulates "2-Tag System". (Yurii Rogozhin. Small universal Turing machines. Theoretical Computer Science, 168(2):215–240, 1996.)

//Create 2-Tag System first.
//(If it started with ABB, The computation will be ABB -> BBH -> HA.)
const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

const tagSystemRuleSet = TagSystemRuleSet.builder().add(A, [B, H]).add(B, [A]).addStop(H).build();
const tagSystem = new TagSystem(2, tagSystemRuleSet);

//Create Turing Machine which can simulate ANY 2-Tag System.
const transformHierarchy: ITransformHierarchy<[TagSystem, TuringMachine]> =
  Converter.tag2SystemToTuringMachine218New();

//Pass the 2-Tag System and start Turing Machine.
//(The Tag System will be copied and freezed, to refer operation-INdependent information)
transformHierarchy.start(tagSystem, [[A, B, B]]);

//Proceed.
while (!transformHierarchy.stopped()) {
  transformHierarchy.proceed(1);
}

//Get the configuration of the Turing Machine, And interpret it as the Tag System's configuration.
//This hierarchy has type argument [TagSystem, TuringMachine]. So, with "0", we can refer Tag System's information. (Of course, with "1", we can refer Turing Machine's information.)
const configOfTagSystem: TagSystemConfiguration = transformHierarchy.getConfiguration(0)!;

//This hierarchy is stopped, so Tag System's word must be HA.
console.log(configOfTagSystem.word.toString()); // HA

//Get configuration of the Turing Machine and print tape.
const configOfTM: TagSystemConfiguration = transformHierarchy.getConfiguration(1)!;

console.log(configOfTM.tape.toString());

//Get the table showing how the transformation was performed.
//The format of that table depends on the conversion method. See the code of "Converter.ts".
//!WARN! This feature is currently particularly unstable and can easily change (e.g., method names), so use with caution.
let table = transformHierarchy.getTransFormLogTable(0)!;
```

</details>

## Supported Features

(This lib is WIP, so functions are few.)

### Execute

- Turing Machine
- Tag System

### Convert (Beta)

- "Turing Machine" simulates "2-Tag System"  
   (Yurii Rogozhin. Small universal Turing machines. Theoretical Computer
  Science, 168(2):215–240, 1996.)

## Documents

TSDoc: https://snowman-s.github.io/computation-system/

## LICENSE

This software is released under the MIT License, see LICENSE.

## Thanks!

This repository created from "TypeScript library starter"(https://github.com/alexjoverm/typescript-library-starter)! Thanks!
