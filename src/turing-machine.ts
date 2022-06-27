export type TMState = string
export type TMSymbol = string

export const TMMove = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  CENTER: 'CENTER'
} as const

export const TMMoveAndHALT = { ...TMMove, HALT: 'HALT' } as const

export type TMMove = typeof TMMove[keyof typeof TMMove]

type TMRuleOutput =
  | { write: TMState; move: TMMove; nextState: TMState }
  | { move: typeof TMMoveAndHALT.HALT }
type TMRule = { nowState: TMState; read: TMState; out: TMRuleOutput }

class TMEquality {
  static ruleEquals(a: TMRule, b: TMRule) {
    if (a.out.move === TMMoveAndHALT.HALT) {
      return a.nowState === b.nowState && a.read === b.read && a.out.move === b.out.move
    } else {
      if (a.out.move !== b.out.move) return false
      return (
        a.nowState === b.nowState &&
        a.read === b.read &&
        a.out.nextState == b.out.nextState &&
        a.out.write == b.out.write
      )
    }
  }
}

export class TMRuleSet {
  public static builder() {
    return new TMRuleSetBuilder()
  }

  private rules: TMRule[] = []

  constructor(rules: TMRule[]) {
    this.rules = rules
  }

  public getCandinates(state: TMState, nowSymbol: TMSymbol) {
    return this.rules
      .filter(rule => rule.nowState == state && rule.read == nowSymbol)
      .map(rule => rule.out)
  }
}

export class TMRuleSetBuilder {
  private nowBuildingState: string | null = null
  private rules: TMRule[] = []

  public state(state: TMState) {
    this.nowBuildingState = state
    return this
  }

  public add(read: TMSymbol, write: TMSymbol, move: TMMove, nextState?: TMState) {
    if (this.nowBuildingState == null) {
      throw new Error('You must specify to what TMState this rule is bounded, using state().')
    }

    const e = {
      nowState: this.nowBuildingState,
      read: read,
      out: {
        write: write,
        move: move,
        nextState: nextState ?? this.nowBuildingState
      }
    }

    if (this.rules.filter(a => TMEquality.ruleEquals(a, e)).length === 0) {
      this.rules.push(e)
    }

    return this
  }

  public addHALT(read: TMSymbol) {
    if (this.nowBuildingState == null) {
      throw new Error('You must specify to what TMState this rule is bounded, using state().')
    }

    const e = {
      nowState: this.nowBuildingState,
      read: read,
      out: {
        move: TMMoveAndHALT.HALT
      }
    }

    if (this.rules.filter(a => TMEquality.ruleEquals(a, e)).length === 0) {
      this.rules.push(e)
    }

    return this
  }

  public build() {
    return new TMRuleSet(this.rules)
  }
}

export class TMTape {
  private readonly data: Map<number, TMSymbol>
  private readonly blank: TMSymbol

  private minIndex: number
  private maxIndex: number

  private constructor(
    data: Map<number, TMSymbol>,
    blank: TMSymbol,
    minIndex: number,
    maxIndex: number
  ) {
    this.data = data
    this.blank = blank
    this.minIndex = minIndex
    this.maxIndex = maxIndex
  }

  public static create(symbols: TMSymbol[], blank: TMSymbol) {
    const tapeData = new Map<number, TMSymbol>()
    symbols.forEach((symbol, i) => {
      tapeData.set(i, symbol)
    })
    return new TMTape(tapeData, blank, 0, tapeData.size - 1)
  }

  public read(n: number) {
    return this.data.has(n) ? this.data.get(n)!! : this.blank
  }

  public write(n: number, symbol: TMSymbol) {
    this.minIndex = Math.min(n, this.minIndex)
    this.maxIndex = Math.max(n, this.maxIndex)

    return this.data.set(n, symbol)
  }

  public toString() {
    let str = '…' + this.blank
    for (let index = this.minIndex; index <= this.maxIndex; index++) {
      str += this.data.get(index) ?? this.blank
    }

    return str + this.blank + '…'
  }
}

export class TuringMachine {
  private readonly ruleset: TMRuleSet
  private readonly initState: TMState
  private readonly acceptState: TMState | null

  private nowState: TMState | null = null

  private tape: TMTape | null = null
  private headPosition = 0

  private halt = false

  constructor(ruleset: TMRuleSet, initState: TMState, acceptState: TMState | null = null) {
    this.ruleset = ruleset
    this.initState = initState
    this.acceptState = acceptState
  }

  public start(tape: TMTape, headPosition: number) {
    this.tape = tape
    this.headPosition = headPosition
    this.nowState = this.initState
    this.halt = false
  }

  public proceed(step = 1) {
    if (step < 0) {
      throw new Error('"step" must be >= 0.')
    }

    if (this.nowState == null || this.tape == null) {
      throw new Error('You must call start() before proceed().')
    }

    for (let i = 0; i < step; i++) {
      if (this.isAccepted()) return
      if (this.isHALT()) return

      const readSymbol = this.tape.read(this.headPosition)
      const candinateRules = this.ruleset.getCandinates(this.nowState, readSymbol)

      if (candinateRules.length > 1) {
        throw new Error(
          `Many rules corresponding to {${this.nowState}, ${readSymbol}} are defined.`
        )
      } else if (candinateRules.length == 0) {
        throw new Error(
          `The rule corresponding to {${this.nowState}, ${readSymbol}} is not defined.`
        )
      }

      const action = candinateRules[0]
      if (action.move == TMMoveAndHALT.HALT) {
        this.halt = true
        break
      }

      this.tape.write(this.headPosition, action.write)
      switch (action.move) {
        case TMMove.CENTER:
          //do nothing
          break
        case TMMove.LEFT:
          this.headPosition--
          break
        case TMMove.RIGHT:
          this.headPosition++
          break
      }

      this.nowState = action.nextState
    }
  }

  public isAccepted() {
    return this.nowState == this.acceptState
  }

  public isHALT() {
    return this.halt
  }
}
