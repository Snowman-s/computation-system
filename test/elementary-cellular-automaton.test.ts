import { ElementaryCellularAutomaton } from "../src/elementary-cellular-automaton"

describe("ECA", () => {
  it("Normal", () => {
    const eca = new ElementaryCellularAutomaton(110);
    eca.start({ cells: [1] });
    expect(eca.asTuple()).toEqual({ rule: 110 });
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…010…");
    expect(eca.getConfiguration()!.lockedCells.getCenterRange()).toEqual({
      min: 0,
      max: 1
    });
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…0110…");
    expect(eca.getConfiguration()!.lockedCells.getCenterRange()).toEqual({
      min: -1,
      max: 1
    });
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…01110…");
    expect(eca.getConfiguration()!.lockedCells.getCenterRange()).toEqual({
      min: -2,
      max: 1
    });
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…011010…");
    expect(eca.getConfiguration()!.lockedCells.getCenterRange()).toEqual({
      min: -3,
      max: 1
    });
  })
})
