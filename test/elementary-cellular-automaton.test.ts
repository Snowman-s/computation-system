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

  it("Rule 30 - chaotic behavior", () => {
    const eca = new ElementaryCellularAutomaton(30);
    eca.start({ cells: [1] });
    expect(eca.asTuple()).toEqual({ rule: 30 });
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…01110…");
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…0110010…");
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…011011110…");
  })

  it("Rule 90 - sierpinski triangle pattern", () => {
    const eca = new ElementaryCellularAutomaton(90);
    eca.start({ cells: [1] });
    expect(eca.asTuple()).toEqual({ rule: 90 });
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…01010…");
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…0100010…");
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…010101010…");
  })

  it("Rule 184 - traffic flow", () => {
    const eca = new ElementaryCellularAutomaton(184);
    eca.start({ cells: [1, 0, 1, 1, 0, 1] });
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…01101010…");
    
    eca.proceed(1);
    // Traffic flow pattern continues evolving
    expect(eca.getConfiguration()!.lockedCells.getCenterRange()).toBeDefined();
  })

  it("Rule 0 - all cells die", () => {
    const eca = new ElementaryCellularAutomaton(0);
    eca.start({ cells: [1, 1, 1] });
    
    eca.proceed(1);
    // Rule 0 makes all cells become 0
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…00…");
  })

  it("Multiple cells initial state", () => {
    const eca = new ElementaryCellularAutomaton(110);
    eca.start({ cells: [1, 0, 1] });
    
    expect(eca.getConfiguration()!.lockedCells.readCellAt(0)).toBe(1);
    expect(eca.getConfiguration()!.lockedCells.readCellAt(1)).toBe(0);
    expect(eca.getConfiguration()!.lockedCells.readCellAt(2)).toBe(1);
    
    eca.proceed(1);
    expect(eca.getConfiguration()!.lockedCells.toString()).toEqual("…011110…");
  })

  it("Large number of steps", () => {
    const eca = new ElementaryCellularAutomaton(110);
    eca.start({ cells: [1] });
    
    eca.proceed(10);
    const config = eca.getConfiguration()!;
    expect(config.lockedCells.getCenterRange().min).toBeLessThan(0);
    expect(config.lockedCells.getCenterRange().max).toBeGreaterThan(0);
  })

  describe("Finite cells behavior", () => {
    it("Finite left boundary", () => {
      const eca = new ElementaryCellularAutomaton(110, { infiniteLeft: false });
      eca.start({ cells: [1, 0, 1] });
      
      eca.proceed(1);
      const range = eca.getConfiguration()!.lockedCells.getCenterRange();
      expect(range.min).toBeGreaterThanOrEqual(0);
    })

    it("Finite right boundary", () => {
      const eca = new ElementaryCellularAutomaton(110, { infiniteRight: false });
      eca.start({ cells: [1, 0, 1] });
      
      eca.proceed(1);
      const range = eca.getConfiguration()!.lockedCells.getCenterRange();
      expect(range.max).toBeLessThanOrEqual(3);
    })

    it("Both boundaries finite", () => {
      const eca = new ElementaryCellularAutomaton(110, { infiniteLeft: false, infiniteRight: false });
      eca.start({ cells: [1, 0, 1] });
      
      eca.proceed(2);
      const range = eca.getConfiguration()!.lockedCells.getCenterRange();
      expect(range.min).toBe(0);
      expect(range.max).toBeLessThanOrEqual(3);
    })

    it("Finite cells with odd rule", () => {
      // With finite cells, odd rules should be allowed even with emptyCell = 0
      const eca = new ElementaryCellularAutomaton(111, { infiniteLeft: false, infiniteRight: false });
      eca.start({ cells: [1, 0, 1] });
      eca.proceed(1);
      expect(eca.getConfiguration()).not.toBeNull();
    })
  })

  describe("emptyCell = 1 behavior", () => {
    it("Rule 127 with emptyCell = 1", () => {
      const eca = new ElementaryCellularAutomaton(127, { emptyCell: 1 });
      eca.start({ cells: [0] });
      
      eca.proceed(1);
      expect(eca.getConfiguration()!.lockedCells.getEmptyCell()).toBe(1);
    })

    it("Rule 73 with emptyCell = 1", () => {
      const eca = new ElementaryCellularAutomaton(73, { emptyCell: 1 });
      eca.start({ cells: [0, 1, 0] });
      
      eca.proceed(1);
      const config = eca.getConfiguration()!;
      expect(config.lockedCells.getEmptyCell()).toBe(1);
    })
  })

  describe("Error cases", () => {
    it("Should throw error for odd rule with infinite cells and emptyCell = 0", () => {
      expect(() => {
        new ElementaryCellularAutomaton(111);
      }).toThrow();
    })

    it("Should throw error for rule >= 128 with infinite cells and emptyCell = 1", () => {
      expect(() => {
        new ElementaryCellularAutomaton(128, { emptyCell: 1 });
      }).toThrow();
    })

    it("Should throw error when proceed() is called before start()", () => {
      const eca = new ElementaryCellularAutomaton(110);
      expect(() => {
        eca.proceed(1);
      }).toThrow();
    })
  })

  describe("Configuration methods", () => {
    it("getConfiguration should return null before start", () => {
      const eca = new ElementaryCellularAutomaton(110);
      expect(eca.getConfiguration()).toBeNull();
    })

    it("getConfiguration should return valid configuration after start", () => {
      const eca = new ElementaryCellularAutomaton(110);
      eca.start({ cells: [1] });
      const config = eca.getConfiguration();
      
      expect(config).not.toBeNull();
      expect(config!.lockedCells).toBeDefined();
      expect(config!.lockedCells.getEmptyCell()).toBe(0);
      expect(config!.lockedCells.isInfiniteLeft()).toBe(true);
      expect(config!.lockedCells.isInfiniteRight()).toBe(true);
    })

    it("readCellAt should work correctly", () => {
      const eca = new ElementaryCellularAutomaton(110);
      eca.start({ cells: [1, 0, 1, 1] });
      const config = eca.getConfiguration()!;
      
      expect(config.lockedCells.readCellAt(0)).toBe(1);
      expect(config.lockedCells.readCellAt(1)).toBe(0);
      expect(config.lockedCells.readCellAt(2)).toBe(1);
      expect(config.lockedCells.readCellAt(3)).toBe(1);
      expect(config.lockedCells.readCellAt(-1)).toBe(0); // empty cell
      expect(config.lockedCells.readCellAt(10)).toBe(0); // empty cell
    })

    it("isInfiniteLeft and isInfiniteRight should reflect configuration", () => {
      const eca = new ElementaryCellularAutomaton(110, { infiniteLeft: false, infiniteRight: false });
      eca.start({ cells: [1] });
      const config = eca.getConfiguration()!;
      
      expect(config.lockedCells.isInfiniteLeft()).toBe(false);
      expect(config.lockedCells.isInfiniteRight()).toBe(false);
    })
  })

  describe("Other methods", () => {
    it("isStopped should always return false", () => {
      const eca = new ElementaryCellularAutomaton(110);
      expect(eca.isStopped()).toBe(false);
      
      eca.start({ cells: [1] });
      expect(eca.isStopped()).toBe(false);
      
      eca.proceed(5);
      expect(eca.isStopped()).toBe(false);
    })

    it("clone should create a new instance with same rule", () => {
      const eca = new ElementaryCellularAutomaton(110);
      const cloned = eca.clone();
      
      expect(cloned).not.toBe(eca);
      expect(cloned.asTuple()).toEqual(eca.asTuple());
      expect(cloned.asTuple().rule).toBe(110);
    })
  })

  describe("Edge cases", () => {
    it("Zero steps proceed should not change state", () => {
      const eca = new ElementaryCellularAutomaton(110);
      eca.start({ cells: [1, 0, 1] });
      const before = eca.getConfiguration()!.lockedCells.toString();
      
      eca.proceed(0);
      const after = eca.getConfiguration()!.lockedCells.toString();
      
      expect(after).toEqual(before);
    })

    it("Single cell initial state", () => {
      const eca = new ElementaryCellularAutomaton(110);
      eca.start({ cells: [1] });
      
      expect(eca.getConfiguration()!.lockedCells.readCellAt(0)).toBe(1);
      expect(eca.getConfiguration()!.lockedCells.getCenterRange().min).toBe(0);
      expect(eca.getConfiguration()!.lockedCells.getCenterRange().max).toBe(1);
    })

    it("All zeros initial state", () => {
      const eca = new ElementaryCellularAutomaton(110);
      eca.start({ cells: [0, 0, 0] });
      
      eca.proceed(1);
      const config = eca.getConfiguration()!;
      // Rule 110 with all zeros stays as zeros
      expect(config.lockedCells.toString()).toBe("…00…");
    })

    it("All ones initial state", () => {
      const eca = new ElementaryCellularAutomaton(110);
      eca.start({ cells: [1, 1, 1] });
      
      eca.proceed(1);
      const config = eca.getConfiguration()!;
      expect(config).not.toBeNull();
    })
  })
})
