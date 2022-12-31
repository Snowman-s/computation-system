> COCKE, John; MINSKY, Marvin. Universality of tag systems with P= 2. Journal of the ACM (JACM), 1964, 11.1: 15-20.

# 変換対象の TM

## ルール

| State ($Q_i$) | Write ($S_i$) | Move ($D_i$) | If Read=A ($Q_{iA}$) | If Read=B ($Q_{iB}$) |
| :-----------: | :-----------: | :----------: | :------------------: | :------------------: |
|      q1       |       A       |      R       |          q1          |          q2          |
|      q2       |       A       |      L       |          q3          |          q3          |
|      q3       |       B       |      R       |          q3          |          qf          |

## 動作の予測

(BLANK is A, The symbol on head position is ?)

B?ABB, q1 -> BA?BB, q1 -> BAA?B, q2 -> BA?AB, q3 -> BAB?B, q3 -> BABBB, qf

# 構成法

### 入力の変換

入力の形状は、 $A_ix_i(α_ix_i)^MB_ix_i(β_ix_i)^N$

まず入力 B?ABB を左右に分け、(右をひっくり返して) 二進数に見立てる。この時、空白記号が 0、もう片方が 1 になるのだ。

M (左側) =...AB -> ...01 -> 1  
N (右側) =...ABBA -> ...0110 -> 6

内部状態が q1 であることから、それに対応した文字を使って...  
タグシステムの最初の語は、 $A_1x(α_1x)^1B_1x(β_1x)^6$ となる。
(記号 x は読まないので添え字の必要が無いと思われる。)

### ルール ($S_i$の折り込み, 右に動く時 )

現在の語：
$A_1x(α_1x)^1B_1x(β_1x)^6$

ルールの形状は、書き込む Symbol ($S_i$) による次のどちらか

$A_i \rightarrow C_ix_i$ ($S_i$ = 0)  
$A_i \rightarrow C_ix_ic_ix_i$ ($S_i$ = 1)

...と、  
$α_i \rightarrow c_ix_ic_ix_i$  
$B_i \rightarrow S_i$  
$β_i \rightarrow s_i$

今回は $S_1 = A \rightarrow 0$ なので、

$A_1 \rightarrow C_1x$  
$α_1 \rightarrow c_1xc_1x$  
$B_1 \rightarrow S_1$  
$β_1 \rightarrow s_1$

を採用。語は、

$A_1x(α_1x)^1B_1x(β_1x)^6 \rightarrow B_1x(β_1x)^6C_1x(c_1x)^2 \rightarrow C_1x(c_1x)^2S_1(s_1)^6$

### ルール (反復パターンの生成)

現在の語：
$C_1x(c_1x)^2S_1(s_1)^6$

ルールの形状は、  
$C_i \rightarrow D_{i1}D_{i0}$  
$c_i \rightarrow d_{i1}d_{i0}$  
$S_i \rightarrow T_{i1}T_{i0}$  
$s_i \rightarrow t_{i1}t_{i0}$

ここで、"i1"は、i 番目の状態の時、"1"に相当する記号を読んだときに、次に遷移する状態の番号である。
"i0"も似たような奴。

今回は、  
$C_1 \rightarrow D_{2}D_{1}$  
$c_1 \rightarrow d_{2}d_{1}$  
$S_1 \rightarrow T_{2}T_{1}$  
$s_1 \rightarrow t_{2}t_{1}$

となる。

語は、$C_1x(c_1x)^2S_1(s_1)^6 \rightarrow S_{1}(s_{1})^6D_{2}D_{1}(d_{2}d_{1})^2 \rightarrow D_{1}(d_{2}d_{1})^2T_{2}T_{1}(t_{2}t_{1})^3$

### ルール ("ずれ"の読み込み)

現在の語：
$D_{1}(d_{2}d_{1})^2T_{2}T_{1}(t_1t_0)^3$

ルールの形状は、 先頭が$D_0$か$D_1$かで変わる：

先頭が $D_0$ のとき：  
$D_{i0} \rightarrow x_{i0}A_{i0}x_{i0}$  
$d_{i0} \rightarrow α_{i0}x_{i0}$  
$T_{i0} \rightarrow B_{i0}x_{i0}$  
$t_{i0} \rightarrow β_{i0}$

先頭が $D_1$ のとき：  
$D_{i1} \rightarrow A_{i1}x_{i1}$  
$d_{i1} \rightarrow α_{i1}x_{i1}$  
$T_{i1} \rightarrow B_{i1}x_{i1}$  
$t_{i1} \rightarrow β_{i1}x_{i1}$

今回は、
$D_{1} \rightarrow xA_{1}x$  
$d_{1} \rightarrow α_{1}x$  
$T_{1} \rightarrow B_{1}x$  
$t_{1} \rightarrow β_{1}$

を用いる。

これの結果、次の語を得る。  
$... \rightarrow T_0(t_1t_0)^3 xA_{1}x(α_{1}x)^2  \rightarrow A_{1}x(α_{1}x)^2B_{1}x(β_{1})^3$

これは、M=2=(0b10)と N=3=(0b11)を表している。したがってテープは以下のようになる。

BA?BB, q1

(予想；BA?BB, q1。 一致。)

### 入力変換 2

左に動くためにとるのは  
BAA?B, q2 -> BA?AB, q3

...ABAA -> ...0100 -> M = 4  
...AB -> ...01 -> N = 1

よって初期語は  
$A_2x(α_2x)^4B_2x(β_2x)^1$

### A を B の後ろに送る

現在の語：
$A_2x(α_2x)^4B_1x(β_2x)^1$

ルールの形状は、  
$A_i \rightarrow {A_i}'x_i$  
$α_i \rightarrow {α_i}'x_i$

今回は、
$A_2 \rightarrow {A_2}'x$  
$α_2 \rightarrow {α_2}'x$

語は、
$A_2x(α_2x)^4B_2x(β_2x)^1 \rightarrow B_2x(β_2x)^1{A_2}'x({α_2}'x)^4 $

### ルール (左に動く時)

現在の語：
$B_2x(β_2x)^1{A_2}'x({α_2}'x)^4$

ルールの形状は、  
${A_i}' \rightarrow S_i$  
${α_i}' \rightarrow s_i$  
$β_i \rightarrow c_ix_ic_ix_i$

...と、書き込む Symbol ($S_i$) による次のどちらか

$B_i \rightarrow C_ix_i$ ($S_i$ = 0)  
$B_i \rightarrow C_ix_ic_ix_i$ ($S_i$ = 1)

今回は $S_2 = A \rightarrow 0$ なので、

${A_2}' \rightarrow S_2$  
${α_2}' \rightarrow s_2$  
$B_2 \rightarrow C_2x$  
$β_2 \rightarrow c_2xc_2x$

を採用。語は、

$B_2x(β_2x)^1{A_2}'x({α_2}'x)^4 \rightarrow {A_2}'x({α_2}'x)^4C_2x(c_2x)^2 \rightarrow C_2x(c_2x)^2S_2(s_2)^4$

### ルール (反復パターンの生成)

現在の語：
$C_2x(c_2x)^1S_2(s_2)^3$

ルールの形状は、  
$C_i \rightarrow {D_{i1}}'{D_{i0}}'$  
$c_i \rightarrow {d_{i1}}'{d_{i0}}'$  
$S_i \rightarrow {T_{i1}}'{T_{i0}}'$  
$s_i \rightarrow {t_{i1}}'{t_{i0}}'$

ここで、"i1"は、i 番目の状態の時、"1"に相当する記号を読んだときに、次に遷移する状態の番号である。
"i0"も似たような奴。

今回は、  
$C_2 \rightarrow {D_3}'{D_3}'$  
$c_2 \rightarrow {d_3}'{d_3}'$  
$S_2 \rightarrow {T_3}'{T_3}'$  
$s_2 \rightarrow {t_3}'{t_3}'$

となる。

語は、$C_2x(c_2x)^2S_2(s_2)^4 \rightarrow S_2(s_2)^4{D_3}'{D_3}'(d_3'd_3')^2 \rightarrow {D_3}'(d_3'd_3')^2{T_3}'{T_3}'({t_3}'{t_3}')^2$

### ルール ("ずれ"の読み込み)

現在の語：
${D_3}'(d_3'd_3')^2{T_3}'{T_3}'({t_3}'{t_3}')^2$

ルールの形状は、 先頭が${D_0}'$か${D_1}'$かで変わる：

先頭が ${D_0}'$ のとき：  
${D_{i0}}' \rightarrow {x_{i0}}'{B_{i0}}'{x_{i0}}'$  
${d_{i0}}' \rightarrow {β_{i0}}'{x_{i0}}'$  
${T_{i0}}' \rightarrow {A_{i0}}{x_{i0}}'$  
${t_{i0}}' \rightarrow {α_{i0}}$

先頭が ${D_1}'$ のとき：  
${D_{i1}}' \rightarrow {B_{i1}}'{x_{i1}}'$  
${d_{i1}}' \rightarrow {β_{i1}}'{x_{i1}}'$  
${T_{i1}}' \rightarrow {A_{i1}}{x_{i1}}'$  
${t_{i1}}' \rightarrow {α_{i1}}{x_{i1}}'$

今回は、  
${D_3}' \rightarrow x{B_3}'x$  
${d_3}' \rightarrow {β_3}'x$  
${T_3}' \rightarrow {A_3}x$  
${t_3}' \rightarrow {α_3}x$

を用いる。

これの結果、次の語を得る。  
${D_3}'(d_3'd_3')^2{T_3}'{T_3}'({t_3}'{t_3}')^2 \rightarrow {T_3}'({t_3}'{t_3}')^2x{B_3}'{x}({β_3}'{x})^2 \rightarrow {B_3}'{x}({β_3}'{x})^2A_3x(α_3x)^2$

### ルール (ひっくりかえす)

現在の語：
${B_3}'{x}({β_3}'{x})^2A_3x(α_3x)^2$

ルールの形状は、  
${B_{i0}}' \rightarrow {B_{i0}}$  
${β_{i0}}' \rightarrow {β_{i0}}$  
${B_{i1}}' \rightarrow {B_{i1}}$  
${β_{i1}}' \rightarrow {β_{i1}}$

今回は、  
${B_3}' \rightarrow {B_3}$  
${β_3}' \rightarrow {β_3}$

を採用(重複)。

最終的に
$A_3x(α_3x)^2B_3x({β_3}{x})^2$ を得る。

これは、

BA?AB, q3

を意味する。
予測：BA?AB, q3 。　一致。

# 必要なルールまとめ

- $x \rightarrow x$
- 各 $q_i$ につき...

  - 右に移動する時...

    - 書き込む記号が...
      - 0 なら $A_i \rightarrow C_ix$
      - 1 なら $A_i \rightarrow C_ixc_ix$
    - $α_i \rightarrow c_ixc_ix$
    - $B_i \rightarrow S_i$
    - $β_i \rightarrow s_i$

  - 左に移動する時...

    - $A_i \rightarrow {A_i}'x$
    - $α_i \rightarrow {α_i}'x$
    - ${A_i}' \rightarrow {S_i}'$
    - ${α_i}' \rightarrow {s_i}'$
    - $β_i \rightarrow {c_i}'x{c_i}'x$

    - 書き込む記号が...

      - 0 なら、$B_i \rightarrow {C_i}'x$
      - 1 なら、$B_i \rightarrow {C_i}'x{c_i}'x$

  - 共通...
    - $C_i \rightarrow D_{i1}D_{i0}$
    - $c_i \rightarrow d_{i1}d_{i0}$
    - $S_i \rightarrow T_{i1}T_{i0}$
    - $s_i \rightarrow t_{i1}t_{i0}$
    - $D_{i0} \rightarrow xA_{i0}x$
    - $d_{i0} \rightarrow α_{i0}x$
    - $T_{i0} \rightarrow B_{i0}x$
    - $t_{i0} \rightarrow β_{i0}$
    - $D_{i1} \rightarrow A_{i1}x$
    - $d_{i1} \rightarrow α_{i1}x$
    - $T_{i1} \rightarrow B_{i1}x$
    - $t_{i1} \rightarrow β_{i1}x$
    - ${C_i}' \rightarrow {D_{i1}}'{D_{i0}}'$
    - ${c_i}' \rightarrow {d_{i1}}'{d_{i0}}'$
    - ${S_i}' \rightarrow {T_{i1}}'{T_{i0}}'$
    - ${s_i}' \rightarrow {t_{i1}}'{t_{i0}}'$
    - ${D_{i0}}' \rightarrow x{B_{i0}}'x$
    - ${d_{i0}}' \rightarrow {β_{i0}}'x$
    - ${T_{i0}}' \rightarrow {A_{i0}}x$
    - ${t_{i0}}' \rightarrow {α_{i0}}$
    - ${D_{i1}}' \rightarrow {B_{i1}}'x$
    - ${d_{i1}}' \rightarrow {β_{i1}}'x$
    - ${T_{i1}}' \rightarrow {A_{i1}}x$
    - ${t_{i1}}' \rightarrow {α_{i1}}x$
    - ${B_{i0}}' \rightarrow {B_{i0}}$
    - ${β_{i0}}' \rightarrow {β_{i0}}$
    - ${B_{i1}}' \rightarrow {B_{i1}}$
    - ${β_{i1}}' \rightarrow {β_{i1}}$
    - (上の、 $A$ や $α$ や $B$ や $B'$ や $β$ の添え字である $i1$ は i 番目の状態の時に記号 1 を読んだらどの状態になるかの番号に置き換える。$i0$も同様。)
