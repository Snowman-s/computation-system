import { TagSystem, TagSystemLetterFrom, TagSystemRuleSet } from "../src/tag-system";
import { TMConfiguration, TuringMachine } from "../src/turing-machine";
import { Converter, TransformHierarchy } from "../src/converter";

describe("ConverterTest", () => {
  it("TagSystem2TuringMachine", () => {
    const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

    const tagSystemRuleSet = TagSystemRuleSet.builder()
      .add(A, [B, H])
      .add(B, [A])
      .addStop(H)
      .build();
    const tagSystem = new TagSystem(2, tagSystemRuleSet);

    const transformHierarchy = Converter.tag2SystemToTuringMachine218New();

    transformHierarchy.start(tagSystem.asTuple(), [[A, B, B]]);
    //    transformHierarchy.proceed(3);
    const turingMachineConfig: TMConfiguration = transformHierarchy.getConfiguration(1)!;
    if (turingMachineConfig !== null) {
      console.log(turingMachineConfig.tape.toString());
    }
    /*    const turingMachineTuple = transformHierarchy.getTuple(1);
    turingMachineTuple.initState;

    expect(transformHierarchy.asIndependantSystem(1)).toBeInstanceOf(TuringMachine);*/
  });
});
