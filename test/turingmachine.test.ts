import {
  TMMove,
  TMMoveAndHALT,
  TMRuleSet,
  TMState,
  TMSymbol,
  TMTape,
  TuringMachine
} from '../src/turing-machine'

describe('TMTape', function() {
  it('CreateTapeTest', () => {
    let [A, B, Blank]: TMSymbol[] = ['A', 'B', 'S']
    let tape = TMTape.create([A, A, B, B], Blank)

    expect(tape.read(0)).toEqual(A)
    expect(tape.read(2)).toEqual(B)
    expect(tape.read(-5)).toEqual(Blank)
  })
  it('TapeWriteTest', () => {
    let [A, B, C, Blank]: TMSymbol[] = ['A', 'B', 'C', 'S']
    let tape = TMTape.create([A, A, B, B], Blank)

    tape.write(1, C)
    expect(tape.read(1)).toEqual(C)
    tape.write(5, C)
    expect(tape.read(5)).toEqual(C)
    tape.write(-9, B)
    expect(tape.read(-9)).toEqual(B)
  })
})

describe('TMRule', () => {
  it('NormalTMRuleTest', () => {
    let [A, B]: TMSymbol[] = ['A', 'B']
    let [q1, q2]: TMState[] = ['q1', 'q2']
    const ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .state(q2)
      .add(B, B, TMMove.RIGHT, q1)
      .build()

    const rules1 = ruleset.getCandinates(q1, A)
    expect(rules1.length).toEqual(1)
    expect(rules1[0]).toEqual({
      write: B,
      move: TMMove.RIGHT,
      nextState: q1
    })
    const rules2 = ruleset.getCandinates(q2, B)
    expect(rules2.length).toEqual(1)
    expect(rules2[0]).toEqual({
      write: B,
      move: TMMove.RIGHT,
      nextState: q1
    })
    const rules3 = ruleset.getCandinates(q2, A)
    expect(rules3.length).toEqual(0)
  })
  it('MonkeyCreateTest', () => {
    let [A, B, C]: TMSymbol[] = ['A', 'B', 'C']
    let [q1]: TMState[] = ['q1']
    const builder = TMRuleSet.builder()

    expect(() => builder.add(A, B, TMMove.RIGHT)).toThrowError()
    expect(() => builder.addHALT(A)).toThrowError()

    const ruleset = builder
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(A, B, TMMove.RIGHT)
      .add(B, B, TMMove.LEFT)
      .add(B, A, TMMove.LEFT)
      .addHALT(C)
      .addHALT(C)
      .build()

    const rules1 = ruleset.getCandinates(q1, A)
    expect(rules1.length).toEqual(1)
    expect(rules1[0]).toEqual({
      write: B,
      move: TMMove.RIGHT,
      nextState: q1
    })
    const rules2 = ruleset.getCandinates(q1, B)
    expect(rules2.length).toEqual(2)
    expect(rules2).toContainEqual({
      write: B,
      move: TMMove.LEFT,
      nextState: q1
    })
    expect(rules2).toContainEqual({
      write: A,
      move: TMMove.LEFT,
      nextState: q1
    })
    const rules3 = ruleset.getCandinates(q1, C)
    expect(rules3.length).toEqual(1)
    expect(rules3[0]).toEqual({
      move: TMMoveAndHALT.HALT
    })
  })
})

describe('TuringMachine', function() {
  it('ManuallyProceedTest', () => {
    let [A, B, Blank]: TMSymbol[] = ['A', 'B', 'S']
    let [q1, q2, qf]: TMState[] = ['q1', 'q2', 'qf']
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(B, A, TMMove.RIGHT, q2)
      .state(q2)
      .add(B, B, TMMove.RIGHT, qf)
      .state(qf)
      .build()

    let tm = new TuringMachine(ruleset, q1, qf)
    //スタート前
    expect(() => tm.proceed()).toThrowError()

    let tape = TMTape.create([A, A, B, B], Blank)
    tm.start(tape, 0)

    tm.proceed(3)

    expect(tm.isAccepted()).toBe(false)
    tm.proceed()
    expect(tm.isAccepted()).toBe(true)
    //これ以上TMが動くことは無い
    expect(() => tm.proceed()).not.toThrowError()
  })
  it('Use"HALT"Test', () => {
    let [A, B, Blank]: TMSymbol[] = ['A', 'B', 'S']
    let [q1, q2]: TMState[] = ['q1', 'q2']
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.RIGHT)
      .add(B, A, TMMove.RIGHT, q2)
      .state(q2)
      .addHALT(B)
      .build()

    let tm = new TuringMachine(ruleset, q1)
    let tape = TMTape.create([A, A, B, B], Blank)
    tm.start(tape, 0)

    tm.proceed(3)
    expect(tm.isHALT()).toEqual(false)
    tm.proceed()
    expect(tm.isHALT()).toEqual(true)
    expect(tm.isAccepted()).toEqual(false)

    expect(() => tm.proceed()).not.toThrowError()
  })
  it('MonkeyTuringMachineTest', () => {
    let [A, B, C, D, Blank]: TMSymbol[] = ['A', 'B', 'C', 'S']
    let [q1]: TMState[] = ['q1', 'q2']
    let ruleset = TMRuleSet.builder()
      .state(q1)
      .add(A, B, TMMove.LEFT)
      .add(B, A, TMMove.RIGHT)
      .add(C, C, TMMove.LEFT)
      .add(C, D, TMMove.RIGHT)
      .add(Blank, B, TMMove.CENTER)
      .build()

    let tm = new TuringMachine(ruleset, q1)
    let tape1 = TMTape.create([A, C], Blank)
    tm.start(tape1, 0)

    expect(() => tm.proceed(-1)).toThrowError()

    expect(() => tm.proceed(0)).not.toThrowError()
    expect(() => tm.proceed(4)).not.toThrowError()
    //複数候補
    expect(() => tm.proceed()).toThrowError()

    let tape2 = TMTape.create([Blank, A, D], Blank)
    tm.start(tape2, 1)
    expect(() => tm.proceed(4)).not.toThrowError()
    //候補なし
    expect(() => tm.proceed()).toThrowError()
  })
})
