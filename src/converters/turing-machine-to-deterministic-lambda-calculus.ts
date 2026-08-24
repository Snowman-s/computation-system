import {
  TMConfiguration,
  TMRuleSet,
  TMState,
  TMSymbol,
  TMTape,
  TuringMachine,
} from "../turing-machine";
import {
  defaultAlphaConversionStrategy,
  DeterministicLambdaCalculus,
  LambdaAbstraction,
  LambdaApplication,
  LambdaCalculusConfiguration,
  LambdaTerm,
  LambdaVariable,
  LambdaVariableFrom,
  LambdaVariableTerm,
  parseLambdaTerm,
} from "../computation-system";
import { ITransformElement } from "../converter";
import { TuringMachineToDeterministicLambdaCalculusTransformLog } from "../transform-log-types";

/**
 * Transforms a {@link TuringMachine} into a {@link DeterministicLambdaCalculus} term that
 * simulates it, by encoding states and tape symbols as Scott numerals and the transition
 * function as a term driven by a call-by-value fixed-point combinator.
 *
 * @remarks
 * This transformation only accepts Turing machines whose halting behavior is expressed purely
 * through a single accept state: "system.acceptState" must be non-null, and every (state, symbol)
 * pair other than "system.acceptState" must have exactly one rule, whose move is "L" or "R" (never
 * "HALT"). See {@link TuringMachineToDeterministicLambdaCalculusTransformElement.bind} for why.
 *
 * @see U. Dal Lago and B. Accattoli, "Encoding Turing Machines into the Deterministic λ-Calculus,"
 *  arXiv:1711.10078, 2017.
 */
export class TuringMachineToDeterministicLambdaCalculusTransformElement
  implements
    ITransformElement<
      TuringMachine,
      DeterministicLambdaCalculus,
      TuringMachineToDeterministicLambdaCalculusTransformLog
    >
{
  private transformLog: TuringMachineToDeterministicLambdaCalculusTransformLog | null = null;

  /**
   * The fixed point of "transaux", i.e. the term simulating the machine's transition function.
   * Built once in {@link TuringMachineToDeterministicLambdaCalculusTransformElement.bind} and
   * reused, unmodified, both to build {@link TuringMachineToDeterministicLambdaCalculusTransformElement.interpretInput}'s
   * result and internally, at every recursive call site inside "transaux" itself.
   */
  private transTerm: LambdaTerm | null = null;

  private system: {
    stateList: TMState[];
    symbolList: TMSymbol[];
    blankSymbol: TMSymbol;
    inputSymbolList: TMSymbol[];
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  } | null = null;

  /**
   * Binds this converter to a source machine's tuple, building the "trans" term (see
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTransTerm}) and the
   * symbol/state correspondence tables.
   *
   * @remarks
   * The paper's construction assumes a transition function that is total everywhere except at a
   * single distinguished final state "q_fin". This method enforces that assumption on "system" so
   * that {@link TuringMachineToDeterministicLambdaCalculusTransformElement.interpretConfigration}
   * can always map a lambda-encoded final configuration's state component back to a real
   * {@link TMState} (namely "system.acceptState"), rather than to a synthetic state that would not
   * belong to "system.stateSet".
   *
   * @param system The tuple of the source Turing machine.
   * @throws {Error} If "system.acceptState" is null, if some (state, symbol) pair other than
   *  "system.acceptState" has zero or more than one rule, or if a rule outside
   *  "system.acceptState" has move "HALT".
   */
  bind(system: {
    stateSet: Set<TMState>;
    symbolSet: Set<TMSymbol>;
    blankSymbol: TMSymbol;
    inputSymbolSet: Set<TMSymbol>;
    ruleset: TMRuleSet;
    initState: TMState;
    acceptState: TMState | null;
  }): void {
    if (system.acceptState === null) {
      throw new Error("This converter only supports Turing machines with a single accept state.");
    }

    // 遷移が一個であることの確認
    for(const state of system.stateSet) {
      if(state === system.acceptState) continue;
      for(const symbol of system.symbolSet) {
        const rule = system.ruleset.getCandinates(state, symbol);
        if (rule.length == 0) throw new Error("No trasition found");
        if (rule.length > 1) throw new Error("Many trasition found");
        if (rule[0].move === "HALT") throw new Error("Halt trasition on non-accept-state found");
      }
    }

    this.system = {
      stateList: Array.from(system.stateSet),
      symbolList: Array.from(system.symbolSet),
      blankSymbol: system.blankSymbol,
      inputSymbolList: Array.from(system.inputSymbolSet),
      ruleset: system.ruleset,
      initState: system.initState,
      acceptState: system.acceptState,
    };

    this.transTerm = this.buildTransTerm();

    this.transformLog = {
      symbolCorrespondenceTable: this.system.symbolList.map(
        (v, i) => {return {
          symbol: v,
          index: i 
        }}
      ),
      stateCorrespondenceTable: this.system.stateList.map(
        (v, i) => {return {
          state: v,
          index: i 
        }}
      )
    }
  }

  /**
   * Builds the closed term "trans (λw.w) C̄_in(word, headPosition)": "trans" simulates the
   * machine's transitions (see {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTransTerm}),
   * and the identity continuation "λw.w" is used in place of the paper's "final"/"flat" composite,
   * so that the eventual normal form is the plain configuration tuple ⟨s^r,a,r,q⟩, from which
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.interpretConfigration} can
   * recover a full {@link TMConfiguration}, not just an output string.
   *
   * @param virtual The word and head position to start the source machine with, exactly as
   *  accepted by {@link TuringMachine.start}.
   * @returns A term belonging to Λdet, ready to be passed to {@link DeterministicLambdaCalculus.start}.
   * @throws {Error} If called before {@link TuringMachineToDeterministicLambdaCalculusTransformElement.bind}.
   */
  interpretInput(virtual: [word: TMSymbol[], headPosition: number]): LambdaTerm {
    if (this.system == null) {
      throw new Error("This converter must be bound before interpreting input.");
    }

    const [word, headPosition] = virtual;

    let left: TMSymbol[];
    let head: TMSymbol;
    let right: TMSymbol[];
    if (headPosition < 0) {
      left = [];
      head = this.system.blankSymbol;
      right = word;
    } else if (headPosition >= word.length) {
      left = word;
      head = this.system.blankSymbol;
      right = [];
    } else {
      left = word.slice(0, headPosition);
      head = word[headPosition];
      right = word.slice(headPosition + 1);
    }
    const leftReversed = left.slice().reverse();

    const initialConfig = this.encodeConfigTuple(
      this.encodeStringLiteral(leftReversed),
      this.encodeAlphabetElement(this.system.symbolList.indexOf(head), this.system.symbolList.length),
      this.encodeStringLiteral(right),
      this.encodeAlphabetElement(
        this.system.stateList.indexOf(this.system.initState),
        this.system.stateList.length
      )
    );

    const [w] = LambdaVariableFrom("w");
    const identity = LambdaAbstraction(w, LambdaVariableTerm(w));

    return LambdaApplication(LambdaApplication(this.transTerm!, identity), initialConfig);
  }

  /**
   * Recovers a {@link TMConfiguration} from a lambda term, if the term is currently at one of the
   * simulation's "clean" points: either the argument of an application (matching "trans k C̄"), or
   * the term itself (matching the bare final tuple "C̄"). See
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.decodeConfigTuple}.
   *
   * @remarks
   * Every other reachable term (i.e. every term reachable strictly between two such clean points,
   * while "trans" is still unfolding a single transition) does not match either shape and this
   * method returns null for it, mirroring how {@link MinskyRegisterMachineToFractranTransformElement.interpretConfigration}
   * returns null for instruction pointers that don't line up with a state boundary.
   * @remarks
   * {@link TMTape.create} always places its "symbols" array starting at tape index 0 — its
   * "startOn" argument only feeds "getWrittenRange()"'s metadata, it does not shift where symbols
   * are actually stored — so the tape here is built with the left tape first (index 0) through the
   * right tape last, and "headPosition" is set to wherever the head symbol actually landed in that
   * array ("leftReversed.length"), not to a fixed 0. This mirrors how the other converters in this
   * codebase (e.g. {@link TuringMachine2SymbolToMinskyRegisterMachineTransformElement}) use
   * {@link TMTape.create}: a coordinate system local to the reconstructed configuration, not the
   * original absolute one.
   *
   * @param real The current configuration of the driving {@link DeterministicLambdaCalculus}, or
   *  null if it has not started.
   * @returns The corresponding {@link TMConfiguration}, or null if "real" is null, this converter
   *  is not bound, or "real.term" is not at a clean point.
   */
  interpretConfigration(real: LambdaCalculusConfiguration | null): TMConfiguration | null {
    if(this.system == null || real == null) return null;

    const candidate = real.term.type === "application" ? real.term.argument : real.term;
    const originalConfig = this.decodeConfigTuple(candidate);
    if (originalConfig == null) return null;

    const leftToRight = originalConfig.leftReversed.slice().reverse();

    return {
      nowState: originalConfig.state,
      tape: TMTape.create(
        leftToRight
          .concat([originalConfig.head])
          .concat(originalConfig.right),
        this.system.blankSymbol
      ).locked(),
      headPosition: originalConfig.leftReversed.length
    }
  }

  /**
   * @returns An empty object once bound (mirroring {@link DeterministicLambdaCalculus.asTuple}),
   *  or null if this converter is not bound.
   */
  asTuple(): Record<string, never> | null {
    if(this.system == null) return null;
    return {};
  }

  /**
   * @returns A fresh {@link DeterministicLambdaCalculus} once bound, or null otherwise.
   */
  asIndependantSystem(): DeterministicLambdaCalculus | null {
    if (this.system === null) return null;
    return new DeterministicLambdaCalculus(defaultAlphaConversionStrategy);
  }

  getTransFormLog(): TuringMachineToDeterministicLambdaCalculusTransformLog | null {
    if (this.system === null) return null;
    return this.transformLog;
  }

  // --- Literal data encoding (concrete, known-in-advance values; no runtime reduction needed) ---

  /**
   * Builds "λx_1...λx_arity.x_index", the Scott encoding of one element of an "arity"-element
   * alphabet. Used for both the tape-symbol alphabet ("arity" = "symbolList.length") and the state
   * alphabet ("arity" = "stateList.length").
   *
   * @remarks
   * Allocates fresh parameter variables on every call rather than sharing a variable set across
   * encoded elements: construction cost is bounded by the (small, fixed) alphabet size, so the
   * simplicity of not reasoning about shared variable identity outweighs the negligible allocation
   * savings.
   *
   * @param index The 0-based index of the element to select, within [0, arity).
   * @param arity The size of the alphabet "index" is drawn from.
   * @returns The encoded element, a closed term.
   */
  private encodeAlphabetElement(index: number, arity: number): LambdaTerm {
    const params = LambdaVariableFrom(...Array.from({ length: arity }, (_, i) => `x_${i}`));
    let abst : LambdaTerm = LambdaAbstraction(params[arity - 1], LambdaVariableTerm(params[index]));
    for (let i = arity - 2; i >= 0; i--) {
      abst = LambdaAbstraction(params[i], abst);
    }
    return abst;
  }

  /**
   * Builds the Scott encoding of the concrete string "symbols", by literal structural recursion
   * (nil := "λx_1...λx_n.λy.y", cons a_i r := "λx_1...λx_n.λy.x_i r̄") rather than by running
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildAppendTerm} at
   * evaluation time, since the whole string is already known here.
   *
   * @param symbols The string to encode, over the machine's tape-symbol alphabet.
   * @returns The encoded string, a closed term.
   */
  private encodeStringLiteral(symbols: TMSymbol[]): LambdaTerm {
    const n = this.system!.symbolList.length;
    if (n === 0) {
      throw new Error("Cannot encode a string over an empty alphabet.");
    }
    const params = LambdaVariableFrom(...Array.from({ length: n }, (_, i) => `x_${i}`));

    for (const symbol of symbols) {
      if (!this.system!.symbolList.includes(symbol)) {
        throw new Error(`Cannot encode a string containing symbol ${symbol.value} not in the alphabet.`);
      }
    }

    const createAllSymbolAbst = (term: LambdaTerm | "y") => {
      const y = LambdaVariableFrom("y")[0];
      let abst;
      if (term == "y") {
        abst = LambdaAbstraction(y, LambdaVariableTerm(y));
      } else {
        abst = LambdaAbstraction(y, term);
      }
      for (let i=n-1;i>=0;i--){
        abst = LambdaAbstraction(params[i], abst);
      }
      return abst;
    }

    let returning = createAllSymbolAbst("y");
    for(let i=symbols.length-1;i>=0;i--){
      returning = createAllSymbolAbst(LambdaApplication(
        LambdaVariableTerm(params[this.system!.symbolList.findIndex(t=>t===symbols[i])]),
        returning
      ));
    }

    return returning;
  }

  /**
   * Builds "⟨t,s,u,r⟩ := λx.(x t s u r)", the encoding of a configuration
   * (leftReversed, head, right, state) as an uncurried Scott tuple.
   *
   * @param leftReversed The encoded, reversed left-of-head tape (s^r in the paper's notation).
   * @param head The encoded symbol currently under the head.
   * @param right The encoded right-of-head tape.
   * @param state The encoded machine state.
   * @returns The encoded configuration tuple, a closed term if its four components are closed.
   */
  private encodeConfigTuple(
    leftReversed: LambdaTerm,
    head: LambdaTerm,
    right: LambdaTerm,
    state: LambdaTerm
  ): LambdaTerm {
    return parseLambdaTerm("λx.(x t s u r)", { t: leftReversed, s: head, u: right, r: state });
  }

  // --- Terms evaluated at simulation time ---

  /**
   * Builds Turing's call-by-value fixed-point combinator "θ := (λx.λy.y(λz.xxyz))(λx.λy.y(λz.xxyz))",
   * used by {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTransTerm} to
   * tie the recursive knot of "trans" without ever constructing a term with a genuine reference
   * cycle (see Lemma 2.1 in the cited paper): recursion here is achieved purely by beta-reduction
   * duplicating this term at evaluation time, so the term graph itself stays a finite tree, which
   * the rest of this library's term-walking functions (e.g. "collectVariableNames", "substitute")
   * require.
   *
   * @returns "θ", a closed term.
   */
  private buildTheta(): LambdaTerm {
    return parseLambdaTerm("(λx.λy.y (λz.x x y z)) (λx.λy.y (λz.x x y z))");
  }

  /**
   * Builds "append[a] := λk.λs. k (a :: s)", which prepends the "symbolIndex"-th alphabet element
   * to a string value "s" in O(1) steps, then hands the result to a continuation "k".
   *
   * @remarks
   * Takes the continuation "k" as its first argument, not the string "s": the paper's lemma
   * statement and its proof momentarily disagree with each other on this order, but the CPS
   * convention followed throughout this construction (every auxiliary term takes its continuation
   * first) and every actual call site inside "trans" agree on "k" first, so that is the order used
   * here.
   *
   * @param symbolIndex The 0-based index, into the tape-symbol alphabet, of the symbol to prepend.
   * @param alphabetSize The size of the tape-symbol alphabet ("symbolList.length").
   * @returns "append[a]" for a = symbolList[symbolIndex], a closed term.
   */
  private buildAppendTerm(symbolIndex: number, alphabetSize: number): LambdaTerm {
    const [s, k, y] = LambdaVariableFrom("s", "k", "y");
    const xs = new Array(alphabetSize).fill(0).map((_, i) => LambdaVariableFrom(`x_${i}`)[0]);

    let inner = LambdaAbstraction(
      y, LambdaApplication(LambdaVariableTerm(xs[symbolIndex]), LambdaVariableTerm(s))
    );

    for (let i = alphabetSize - 1; i >= 0; i--) {
      inner = LambdaAbstraction(xs[i], inner);
    }

    return parseLambdaTerm("λk.λs.(k inner)", { k, s, inner });
  }

  /**
   * Builds "transaux", the non-recursive body that {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTransTerm}
   * ties into "trans" via "θ". Encodes the machine's transition function as nested Scott selectors:
   * an outer selector on the current state, then (for each state) one on the symbol read, whose
   * result is one of three shapes depending on that (state, symbol) pair:
   * - **final** (state is "acceptState"): returns the configuration unchanged to the continuation.
   * - **move left**: pops a symbol off the (reversed) left tape — or substitutes the blank symbol
   *   if the left tape is empty — appends the written symbol to the right tape via "append", and
   *   recurses via "selfRef".
   * - **move right**: symmetric to "move left".
   *
   * @remarks
   * Every recursive call site uses "selfRef" (a plain variable reference) rather than a direct
   * reference to "transaux" itself, since "transaux" is being built here and so cannot yet hold a
   * reference to its own, not-yet-constructed fixed point; see
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTheta} for how "selfRef"
   * is tied to that fixed point via "θ" once evaluation begins.
   *
   * @param selfRef The variable, bound by "transaux"'s own outer parameter, that every recursive
   *  call site inside the built term must reference in order to call back into "trans" once "θ"
   *  has substituted it for the true self-reference.
   * @returns "transaux", a closed term (given "selfRef" is only ever used bound within it).
   */
  private buildTransAux(selfRef: LambdaVariable): LambdaTerm {
    if (this.system == null) throw new Error("Internal Error");

    const {symbolList, stateList, blankSymbol, acceptState, ruleset} = this.system;

    const P_i = (state: TMState, head: TMSymbol, appendSymbol: TMSymbol) => {
      const [u, k, w] = LambdaVariableFrom("u", "k", "w");
      const append = this.buildAppendTerm(symbolList.findIndex(sl => sl == appendSymbol), symbolList.length);
      const config = this.encodeConfigTuple(
        LambdaVariableTerm(u),
        this.encodeAlphabetElement(symbolList.findIndex(h => h==head), symbolList.length),
        LambdaVariableTerm(w),
        this.encodeAlphabetElement(stateList.findIndex(s => s==state), stateList.length)
      )

      return parseLambdaTerm("λu.λk.(append (λw.((selfRef k) config)))", { u, k, w, append, selfRef, config });
    }

    const P = (state: TMState, appendSymbol: TMSymbol) => {
      const [k, w] = LambdaVariableFrom("k", "w");
      const append = this.buildAppendTerm(symbolList.findIndex(sl => sl == appendSymbol), symbolList.length);
      const config = this.encodeConfigTuple(
        this.encodeStringLiteral([]),
        this.encodeAlphabetElement(symbolList.findIndex(h => h==blankSymbol), symbolList.length),
        LambdaVariableTerm(w),
        this.encodeAlphabetElement(stateList.findIndex(s => s==state), stateList.length)
      )

      return parseLambdaTerm("λk.(append (λw.((selfRef k) config)))", { k, w, append, selfRef, config });
    }

    // move right の場合。P_i / P の鏡像: 選択に使う文字列が右テープ側になり、
    // append で新しく構築した文字列は右テープではなく左テープ側に入る。
    const R_i = (state: TMState, head: TMSymbol, appendSymbol: TMSymbol) => {
      const [u, k, w] = LambdaVariableFrom("u", "k", "w");
      const append = this.buildAppendTerm(symbolList.findIndex(sl => sl == appendSymbol), symbolList.length);
      const config = this.encodeConfigTuple(
        LambdaVariableTerm(w),
        this.encodeAlphabetElement(symbolList.findIndex(h => h==head), symbolList.length),
        LambdaVariableTerm(u),
        this.encodeAlphabetElement(stateList.findIndex(s => s==state), stateList.length)
      )

      return parseLambdaTerm("λu.λk.(append (λw.((selfRef k) config)))", { u, k, w, append, selfRef, config });
    }

    const R = (state: TMState, appendSymbol: TMSymbol) => {
      const [k, w] = LambdaVariableFrom("k", "w");
      const append = this.buildAppendTerm(symbolList.findIndex(sl => sl == appendSymbol), symbolList.length);
      const config = this.encodeConfigTuple(
        LambdaVariableTerm(w),
        this.encodeAlphabetElement(symbolList.findIndex(h => h==blankSymbol), symbolList.length),
        this.encodeStringLiteral([]),
        this.encodeAlphabetElement(stateList.findIndex(s => s==state), stateList.length)
      )

      return parseLambdaTerm("λk.(append (λw.((selfRef k) config)))", { k, w, append, selfRef, config });
    }

    // N(state, symbol) は N_i^j に相当する。「一個しかなく、しかも HALT でないことが保証済み」の
    // 前提のもと、move の種類ごとに T_i^j = λu.uP_1...P_nP（left）/ λu.λk.λv.vR_1...R_nRku（right）
    // を組み立てる。u（left）/ u,k,v（right）を明示的に LambdaAbstraction で束縛しておかないと、
    // 外側の q M_1...M_m a u k v から適用された実引数が中に届かない。
    const N = (state: TMState, symbol: TMSymbol) => {
      if (state == acceptState) {
        const [u, k, v] = LambdaVariableFrom("u", "k", "v");
        const config = this.encodeConfigTuple(
          LambdaVariableTerm(u),
          this.encodeAlphabetElement(symbolList.findIndex(h => h==symbol), symbolList.length),
          LambdaVariableTerm(v),
          this.encodeAlphabetElement(stateList.findIndex(s => s==state), stateList.length)
        )
        return parseLambdaTerm("λu.λk.λv.(k config)", { u, k, v, config });
      } else {
        // 一つしかなく、しかもHALTでないことが保証済み (bind() でチェック済み)
        const [rule] = ruleset.getCandinates(state, symbol);
        if (rule.move === "HALT") {
          throw new Error("Internal Error: bind() should have rejected HALT rules on non-accept states.");
        }
        if (rule.move == "L") {
          const [u] = LambdaVariableFrom("u");
          let term: LambdaTerm = LambdaVariableTerm(u);
          for(const innerSymbol of symbolList) {
            term = LambdaApplication(term, P_i(rule.nextState, innerSymbol, rule.write))
          }
          term = LambdaApplication(term, P(rule.nextState, rule.write))
          return LambdaAbstraction(u, term);
        } else {
          // R
          const [u, k, v] = LambdaVariableFrom("u", "k", "v");
          let term: LambdaTerm = LambdaVariableTerm(v);
          for(const innerSymbol of symbolList) {
            term = LambdaApplication(term, R_i(rule.nextState, innerSymbol, rule.write))
          }
          term = LambdaApplication(term, R(rule.nextState, rule.write))
          term = LambdaApplication(term, LambdaVariableTerm(k));
          term = LambdaApplication(term, LambdaVariableTerm(u));
          return LambdaAbstraction(u, LambdaAbstraction(k, LambdaAbstraction(v, term)));
        }
      }
    }

    // M(state) は M_i := λa. a N_i^1...N_i^n に相当する。選択に使う "a" を先頭に置き、
    // そこへ各記号に対応する N(state, symbol) を順に適用する（記号のエンコードである "a" 自身が
    // n個の N(...) の中から実際に読んだ記号に対応するものを選ぶ n項セレクタになる）。
    const M = (state: TMState) => {
      const [a] = LambdaVariableFrom("a");
      let term: LambdaTerm = LambdaVariableTerm(a);
      for(const symbol of symbolList){
        term = LambdaApplication(term, N(state, symbol));
      }

      return LambdaAbstraction(a, term);
    }

    const [k, y, u, a, v, q] = LambdaVariableFrom("k", "y", "u", "a", "v", "q");

    // transaux := λx.λk.λy. y(λu.λa.λv.λq. q M_1...M_m a u k v)
    // "q" が状態、続く M_1...M_m が状態ごとの分岐（M(state)）。それらを q に適用して現在の
    // 状態に対応する M を選び出したうえで、a(読んだ記号) u(左テープ) k(継続) v(右テープ) を
    // その順に渡す。y は configuration タプルそのもの(⟨u,a,v,q⟩)であり、y にこの4項分解関数を
    // 適用することで u,a,v,q の実際の値が展開される。
    let body: LambdaTerm = LambdaVariableTerm(q);
    for (const state of stateList) {
      body = LambdaApplication(body, M(state));
    }
    body = LambdaApplication(body, LambdaVariableTerm(a));
    body = LambdaApplication(body, LambdaVariableTerm(u));
    body = LambdaApplication(body, LambdaVariableTerm(k));
    body = LambdaApplication(body, LambdaVariableTerm(v));

    const configSelector = parseLambdaTerm("λu.λa.λv.λq.body", { u, a, v, q, body });
    const transaux = parseLambdaTerm("λselfRef.λk.λy.(y configSelector)", { selfRef, k, y, configSelector });

    return transaux;
  }

  /**
   * Builds and caches "trans := θ transaux" (see
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTheta} and
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.buildTransAux}), the term
   * that simulates the source machine's transition function under weak reduction.
   *
   * @returns "trans", a closed term; also stored in "this.transTerm".
   */
  private buildTransTerm(): LambdaTerm {
    const [selfRef] = LambdaVariableFrom("x");

    this.transTerm = LambdaApplication(
      this.buildTheta(),
      this.buildTransAux(selfRef)
    );

    return this.transTerm;
  }

  // --- Structural decoding (best-effort pattern matching; null on anything not recognized) ---

  /**
   * The inverse of {@link TuringMachineToDeterministicLambdaCalculusTransformElement.encodeAlphabetElement}:
   * recognizes a term of the exact shape "λx_1...λx_arity.x_i" and returns "i", or null if "term"
   * does not have exactly that shape (e.g. wrong arity, or a body that isn't a bare reference to
   * one of the just-bound parameters).
   *
   * @param term The term to decode.
   * @param arity The expected alphabet size.
   * @returns The decoded 0-based index, or null if "term" does not match.
   */
  private decodeAlphabetElement(term: LambdaTerm, arity: number): number | null {
    let rec = term;
    const params = [];

    for(let i=0; i<arity; i++) {
      if (rec.type !== "abstraction") return null;

      const { parameter, body } = rec;
      rec = body;
      params.push(parameter);
    }

    if (rec.type != "variable") return null;

    const index = params.findIndex((v) => v == rec.variable);
    return index < 0 ? null: index;
  }

  /**
   * The inverse of {@link TuringMachineToDeterministicLambdaCalculusTransformElement.encodeStringLiteral}:
   * recognizes a term of the exact Scott-list shape (nil or cons, over an "alphabetSize"-element
   * alphabet) and returns the decoded string, or null if "term" does not match at any level of the
   * recursion.
   *
   * @param term The term to decode.
   * @param alphabetSize The size of the tape-symbol alphabet ("symbolList.length").
   * @returns The decoded string, or null if "term" does not match.
   */
  private decodeStringList(term: LambdaTerm, alphabetSize: number): TMSymbol[] | null {
    let rec = term;
    const params = [];

    for (let i = 0; i < alphabetSize + 1; i++) {
      if (rec.type !== "abstraction") return null;

      const { parameter, body } = rec;
      rec = body;
      params.push(parameter);
    }

    const xs = params.slice(0, alphabetSize);
    const y = params[alphabetSize];

    if (rec.type === "variable") {
      return rec.variable === y ? [] : null;
    }

    if (rec.type !== "application") return null;

    const { func, argument } = rec;
    if (func.type !== "variable") return null;

    const symbolIndex = xs.findIndex((v) => v === func.variable);
    if (symbolIndex === -1) return null;

    const tail = this.decodeStringList(argument, alphabetSize);
    if (tail === null) return null;

    return [this.system!.symbolList[symbolIndex], ...tail];
  }

  /**
   * The inverse of {@link TuringMachineToDeterministicLambdaCalculusTransformElement.encodeConfigTuple}:
   * recognizes a term of the exact shape "λx.(x t s u r)" and decodes each of "t", "s", "u", "r" via
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.decodeStringList} /
   * {@link TuringMachineToDeterministicLambdaCalculusTransformElement.decodeAlphabetElement}.
   *
   * @param term The term to decode.
   * @returns The decoded configuration components, or null if "term" or any of its four components
   *  does not match.
   */
  private decodeConfigTuple(
    term: LambdaTerm
  ): { leftReversed: TMSymbol[]; head: TMSymbol; right: TMSymbol[]; state: TMState } | null {
    if (this.system == null) return null;

    if (term.type !== "abstraction") return null;
    const x = term.parameter;
    let seeing = term.body;

    if (seeing.type !== "application") return null;
    const stateTerm = seeing.argument;
    seeing = seeing.func;

    if (seeing.type !== "application") return null;
    const rightTerm = seeing.argument;
    seeing = seeing.func;

    if (seeing.type !== "application") return null;
    const headTerm = seeing.argument;
    seeing = seeing.func;

    if (seeing.type !== "application") return null;
    const leftReversedTerm = seeing.argument;
    seeing = seeing.func;

    if (seeing.type !== "variable" || seeing.variable !== x) return null;

    const leftReversed = this.decodeStringList(leftReversedTerm, this.system.symbolList.length);
    const head = this.decodeAlphabetElement(headTerm, this.system.symbolList.length);
    const right = this.decodeStringList(rightTerm, this.system.symbolList.length);
    const state = this.decodeAlphabetElement(stateTerm, this.system.stateList.length);
    if (leftReversed == null || head == null || right == null || state == null) return null;

    return {
      leftReversed,
      head: this.system.symbolList[head],
      right,
      state: this.system.stateList[state]
    }
  }
}
