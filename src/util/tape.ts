export class SimpleTape<S> {
  private readonly data: S[];
  private readonly blank: S;
  private readonly strFunc: (s: S) => string;
  private minIndex: number;

  public constructor(
    data: S[],
    blank: S,
    minIndex: number,
    strFunc: (s: S) => string = (s) => `${s}`
  ) {
    this.data = [...data];
    this.blank = blank;
    this.minIndex = minIndex;
    this.strFunc = strFunc;
  }

  public read(n: number): S {
    if (n < this.minIndex) return this.blank;
    if (this.minIndex + this.data.length <= n) return this.blank;
    if (this.data[n - this.minIndex] == undefined) throw new Error(`${this.minIndex}, ${this.data.length}, ${n}`)
    return this.data[n - this.minIndex]
  }

  public write(n: number, symbol: S) {
    console.debug(`${n}, ${symbol}, ${this.minIndex}, ${this.data.length}`)
    if (symbol == this.blank) {
      // データ縮小
      if (n == this.minIndex) {
        this.data.shift()
        this.minIndex += 1
        while (this.data.length != 0 && this.data[0] == this.blank) {
          this.data.shift()
          this.minIndex += 1
        }
        return
      } else if (n == this.minIndex + this.data.length - 1) {
        this.data.pop()
        while (this.data.length != 0 && this.data.at(-1) == this.blank) {
          this.data.pop()
        }
        return
      }
    }

    if (n < this.minIndex) {
      if (symbol == this.blank) return
      // データ拡張
      this.data.unshift(...Array(this.minIndex - n).fill(this.blank));
      this.minIndex = n;
    } else if (this.minIndex + this.data.length - 1 < n) {
      if (symbol == this.blank) return
      this.data.push(...Array(n - (this.minIndex + this.data.length - 1)).fill(this.blank));
    }

    this.data[n - this.minIndex] = symbol;
  }

  public getRange(): { min: number, max: number } {
    return { min: this.minIndex, max: this.minIndex + this.data.length }
  }
  public getBlank() {
    return this.blank
  }

  public clone(): SimpleTape<S> {
    return new SimpleTape([...this.data], this.blank, this.minIndex);
  }

  public toString() {
    let str = "…" + this.strFunc(this.blank);
    for (let s of this.data) {
      str += this.strFunc(s)
    }
    return str + this.strFunc(this.blank) + "…";
  }
}
