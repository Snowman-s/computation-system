import { ComputationSystem } from "./computation-system";
import { SimpleTape } from "./util/tape";

/**
 * Immutable cells informaiton to refer.
 */
export interface LockedECACells {
  /**
  * Returns the current cell range.
  */
  getCenterRange(): { min: number, max: number }

  /**
  * Returns the state with which the left or right edge should be filled.
  */
  getEmptyCell(): 0 | 1

  /**
  * Returns whether the left edge of the cell is infinite.
  */
  isInfiniteLeft(): boolean

  /**
  * Returns whether the right edge of the cell is infinite.
  */
  isInfiniteRight(): boolean

  /**
   * Returns *n*th cell state of the cells.
   * @param n Index of cells. Can be < 0.
   * @returns is the cell 0 or 1.
   */
  readCellAt(index: number): 0 | 1
}

export type ECAConfiguration = {
  lockedCells: LockedECACells;
};

class ECACells {
  tapeImpl: SimpleTape<0 | 1>
  infiniteLeft: boolean;
  infiniteRight: boolean;

  public static create(initialCell: (0 | 1)[], infiniteLeft: boolean, infiniteRight: boolean, emptyCell: 0 | 1) {
    return new ECACells(new SimpleTape(initialCell, emptyCell, 0, (s) => s.toString()), infiniteLeft, infiniteRight);
  }

  private constructor(tapeImpl: SimpleTape<0 | 1>, infiniteLeft: boolean, infiniteRight: boolean) {
    this.infiniteLeft = infiniteLeft;
    this.infiniteRight = infiniteRight;

    this.tapeImpl = tapeImpl;
  }

  getCenterRange(): { min: number; max: number; } {
    return this.tapeImpl.getRange();
  }
  isInfiniteLeft(): boolean {
    return this.infiniteLeft;
  }
  isInfiniteRight(): boolean {
    return this.infiniteRight;
  }
  getEmptyCell(): 0 | 1 {
    return this.tapeImpl.getBlank();
  }

  readCellAt(index: number): 0 | 1 {
    return this.tapeImpl.read(index);
  }
  writeCellAt(index: number, cell: 0 | 1) {
    let range = this.tapeImpl.getRange();
    if ((!this.infiniteLeft) && index < range.min) {
      return
    } else if ((!this.infiniteRight) && range.max <= index) {
      return
    }
    this.tapeImpl.write(index, cell);
  }

  locked() {
    let cloned = new ECACells(this.tapeImpl, this.infiniteLeft, this.infiniteRight)

    return new (class implements LockedECACells {
      getCenterRange() {
        return cloned.getCenterRange();
      }
      getEmptyCell() {
        return cloned.getEmptyCell();
      }
      isInfiniteLeft() {
        return cloned.infiniteLeft;
      }
      isInfiniteRight() {
        return cloned.infiniteRight;
      }
      readCellAt(index: number) {
        return cloned.readCellAt(index);
      }
    })
  }

  toString() {
    return this.tapeImpl.toString()
  }
}

/**
 * A object for simulate the Elementary cellular automaton(Rule **).
 */
export class ElementaryCellularAutomaton implements ComputationSystem {
  rule: number
  cells: ECACells | null = null;
  infiniteLeft: boolean
  infiniteRight: boolean
  emptyCell: 0 | 1

  /**
   * Initialize machine with given arguments.
   * 
   * When it has infinite cells(`infiniteLeft` and/or `infiniteRight` is `true`), this class only supports the following *rule* ―  
   * If `emptyCell` == 0, then rule must be even;  
   * else rule must be less than 128.
   * 
   * @param rule the rule number.
   * @param infiniteLeft A boolean indicates that the left side of cells is infinite. Default is true.
   * @param infiniteRight A boolean indicates that the right side of cells is infinite. Default is true.
   * @param emptyCell Indicates what empty cells(both side) are to be treated as filled with. Default is 0.
   */
  constructor(rule: number, { infiniteLeft = true, infiniteRight = true, emptyCell = 0 }: { infiniteLeft?: boolean, infiniteRight?: boolean, emptyCell?: 0 | 1 } = {}) {
    if (infiniteLeft || infiniteRight) {
      if (emptyCell == 0 && rule % 2 != 0) {
        throw new Error(`If cells has infinite side and emptyCell is 0, this class only supports even rule. Got ${rule}.`);
      } else if (emptyCell == 1 && rule >= 128) {
        throw new Error(`If cells has infinite side and emptyCell is 1, this class only supports the rule which is less than 128. Got ${rule}.`);
      }
    }

    this.infiniteLeft = infiniteLeft
    this.infiniteRight = infiniteRight
    this.emptyCell = emptyCell

    this.rule = rule
  }

  /**
   * Returns configuration(current status) of this machine.
   *
   * @remarks
   * A ECA's configuration is represented as follows:
   * - cells - Cells' state of this machine.
   *
   * @returns Current status of this machine if {@link ElementaryCellularAutomaton.start} was called, null otherwise.
   */
  getConfiguration(): ECAConfiguration | null {
    if (this.cells === null) {
      return null;
    }
    return {
      lockedCells: this.cells.locked()
    }
  }

  /**
   * Returns a tuple representation of this machine.
   *
   * @remarks
   * A ECA is represented as follows:
   * - rule - the rule number of this machine.
   */
  asTuple() {
    return {
      rule: this.rule
    }
  }

  /**
   * Initiates processing for a given cells.
   * @param cells Initial cell state.
   * 
   * @remarks Cells are set up as starting at index 0.
   */
  start(input: { cells: (0 | 1)[] }): void {
    this.cells = ECACells.create(input.cells, this.infiniteLeft, this.infiniteRight, this.emptyCell)
  }

  /**
   * Proceeds with this machine. This method must be called after {@link ElementaryCellularAutomaton.start} called, or get an error,
   *
   * @param step Non-negative integer indicating how many steps to advance this machine.
   */
  proceed(step: number): void {
    if (this.cells === null) {
      throw new Error("You must call start() before proceed().");
    }
    let range = this.cells.getCenterRange();
    for (let s = 0; s < step; s++) {
      let before = this.emptyCell
      for (let i = range.min - 1; i < range.max + 1; i++) {
        const shift = (before * 4) + (this.cells.readCellAt(i) * 2) + (this.cells.readCellAt(i + 1))
        before = this.cells.readCellAt(i)
        this.cells.writeCellAt(i, ((this.rule >> shift) & 1) as 0 | 1)
      }
    }
  }
  isStopped(): boolean {
    return false
  }
  clone(): ElementaryCellularAutomaton {
    return new ElementaryCellularAutomaton(this.rule);
  }
}
