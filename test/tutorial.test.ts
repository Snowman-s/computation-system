import {
  TagSystem,
  TagSystemConfiguration,
  TagSystemLetterFrom,
  TagSystemRuleSet,
  Converter,
  createHierarchy,
  ITransformHierarchy,
  Tag2SystemToTuringMachine218TransformLog,
  TuringMachine,
  TMConfiguration,
} from "../src/computation-system";

describe("Tutorial", () => {
  it("Converter", () => {
    // Let's make "Turing Machine" which simulates "2-Tag System". (Yurii Rogozhin. Small universal Turing machines. Theoretical Computer Science, 168(2):215–240, 1996.)

    //Create 2-Tag System first.
    //(If it started with ABB, The computation will be ABB -> BBH -> HA.)
    const [A, B, H] = TagSystemLetterFrom("A", "B", "H");

    const tagSystemRuleSet = TagSystemRuleSet.builder()
      .add(A, [B, H])
      .add(B, [A])
      .addStop(H)
      .build();
    const tagSystem = new TagSystem(2, tagSystemRuleSet);

    //Create Turing Machine which can simulate ANY 2-Tag System.
    const transformHierarchy: ITransformHierarchy<
      [TagSystem, TuringMachine],
      [Tag2SystemToTuringMachine218TransformLog]
    > = createHierarchy(Converter.tag2SystemToTuringMachine218());

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
    const configOfTM: TMConfiguration = transformHierarchy.getConfiguration(1)!;

    console.log(configOfTM.tape.toString());

    //Get the log-object showing how the transformation was performed.
    //The format of that table depends on the conversion method. See the code of "converter.ts".
    //!WARN! This feature is currently particularly unstable and can easily change (e.g., method names), so use with caution.
    const table = transformHierarchy.getTransFormLogOf(0)!;
  });
});
