/**
 * Restricted calculator: a tokenizer and recursive-descent parser over a small
 * grammar. User input is never passed to eval() or Function().
 *
 *   expr   := term (("+" | "-") term)*
 *   term   := power (("×" | "÷") power)*         (implicit × between ")" / number and "(")
 *   power  := unary ("^" unary)*                   (right-assoc)
 *   unary  := ("-" | "+") unary | postfix
 *   postfix:= atom ("²")*
 *   atom   := number ("E" signed-int)? | "Ans" | "(" expr ")" | "√" atom-or-group
 */

export type Token = { t: "num"; v: string } | { t: "op"; v: string } | { t: "ans" };

export class CalcError extends Error {
  constructor(public kind: "Syntax" | "Math") {
    super(`${kind} ERROR`);
  }
}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " ") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = src.slice(i, j);
      if ((num.match(/\./g) ?? []).length > 1 || num === ".") throw new CalcError("Syntax");
      out.push({ t: "num", v: num });
      i = j;
      continue;
    }
    if (src.startsWith("Ans", i)) {
      out.push({ t: "ans" });
      i += 3;
      continue;
    }
    if ("+-×÷^()²√E".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new CalcError("Syntax");
  }
  return out;
}

export function evaluate(src: string, ans = 0): number {
  const toks = tokenize(src);
  if (toks.length === 0) throw new CalcError("Syntax");
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === "op" && (peek() as { v: string }).v === v;

  const startsAtom = () => {
    const p = peek();
    return p != null && (p.t === "num" || p.t === "ans" || (p.t === "op" && (p.v === "(" || p.v === "√")));
  };

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[pos++] as { v: string }).v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = power();
    for (;;) {
      if (isOp("×") || isOp("÷")) {
        const op = (toks[pos++] as { v: string }).v;
        const r = power();
        if (op === "÷" && r === 0) throw new CalcError("Math");
        v = op === "×" ? v * r : v / r;
      } else if (startsAtom()) {
        v = v * power(); // implicit multiplication, e.g. 2(3) or 2√4
      } else break;
    }
    return v;
  }
  function power(): number {
    const base = unary();
    if (isOp("^")) {
      pos++;
      const exp = power();
      const r = Math.pow(base, exp);
      if (!Number.isFinite(r) || Number.isNaN(r)) throw new CalcError("Math");
      return r;
    }
    return base;
  }
  function unary(): number {
    if (isOp("-")) {
      pos++;
      return -unary();
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return postfix();
  }
  function postfix(): number {
    let v = atom();
    while (isOp("²")) {
      pos++;
      v = v * v;
    }
    return v;
  }
  function atom(): number {
    const p = peek();
    if (!p) throw new CalcError("Syntax");
    if (p.t === "num") {
      pos++;
      let v = parseFloat(p.v);
      if (isOp("E")) {
        pos++;
        let sign = 1;
        if (isOp("-")) {
          pos++;
          sign = -1;
        }
        const e = peek();
        if (!e || e.t !== "num" || !/^\d+$/.test(e.v)) throw new CalcError("Syntax");
        pos++;
        v = v * Math.pow(10, sign * parseInt(e.v, 10));
      }
      return v;
    }
    if (p.t === "ans") {
      pos++;
      return ans;
    }
    if (p.v === "(") {
      pos++;
      const v = expr();
      if (isOp(")")) pos++; // a missing final ")" is tolerated, like a real calculator
      else if (pos < toks.length) throw new CalcError("Syntax");
      return v;
    }
    if (p.v === "√") {
      pos++;
      const v = isOp("(") ? atom() : unary();
      if (v < 0) throw new CalcError("Math");
      return Math.sqrt(v);
    }
    throw new CalcError("Syntax");
  }

  const result = expr();
  if (pos !== toks.length) throw new CalcError("Syntax");
  if (!Number.isFinite(result)) throw new CalcError("Math");
  return result;
}

/** Format a result for a 10-digit display. */
export function formatResult(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e10 || abs < 1e-9)) {
    const [m, e] = n.toExponential(6).split("e");
    return `${parseFloat(m)}×10^${parseInt(e, 10)}`;
  }
  const s = parseFloat(n.toPrecision(10)).toString();
  return s;
}
