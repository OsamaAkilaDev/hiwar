// A tiny, safe parser for model-written functions of x ("x^2", "2sin(x)",
// "y = sqrt(abs(x))"). No eval: only numbers, x, + - * / ^, parentheses, the
// constants pi and e, and the functions below. Anything else throws.

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const NAMES = new RegExp(
  [...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS), "x"]
    .sort((a, b) => b.length - a.length)
    .join("|"),
  "g",
);

// Own keys only: "constructor" and friends must not resolve.
const known = (name: string) =>
  Object.hasOwn(FUNCTIONS, name) || Object.hasOwn(CONSTANTS, name);

type Fn = (x: number) => number;
const TOKEN = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+\d*|\*\*|[-+*/^(),])/y;

export function compile(source: string): Fn {
  // "y = …" and "f(x) = …" are common; keep only the right-hand side.
  const text = source
    .toLowerCase()
    .replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=/, "")
    .replace(/π/g, "pi")
    .replace(/[·×]/g, "*")
    .replace(/−/g, "-");
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.trimEnd().length) {
    const m = TOKEN.exec(text);
    if (!m?.[1]) throw new Error(`unexpected input in ${source}`);
    const tok = m[1] === "**" ? "^" : m[1];
    // Glued names like "sinx" or "xcos" split into known ones.
    if (/^[a-z]/.test(tok) && !known(tok)) {
      const parts = tok.match(NAMES) ?? [];
      if (parts.join("") !== tok) throw new Error(`unknown name ${tok}`);
      tokens.push(...parts);
    } else tokens.push(tok);
  }
  let i = 0;
  const peek = () => tokens[i];
  const take = (t?: string) => {
    const tok = tokens[i++];
    if (tok === undefined || (t && tok !== t)) throw new Error(`expected ${t}`);
    return tok;
  };
  // A term may follow another with no operator: 2x, 3(x+1), 2sin(x).
  const startsTerm = (t?: string) =>
    t !== undefined && (t === "(" || /^[a-z\d.]/.test(t));

  const expr = (): Fn => {
    let left = term();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const l = left;
      const r = term();
      left = op === "+" ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  };
  const term = (): Fn => {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t === "*" || t === "/") {
        take();
        const l = left;
        const r = unary();
        left = t === "*" ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (startsTerm(t)) {
        const l = left;
        const r = power();
        left = (x) => l(x) * r(x);
      } else return left;
    }
  };
  // Unary minus binds looser than ^, so -x^2 is -(x^2).
  const unary = (): Fn => {
    if (peek() === "-") {
      take();
      const v = unary();
      return (x) => -v(x);
    }
    if (peek() === "+") take();
    return power();
  };
  const power = (): Fn => {
    const base = primary();
    if (peek() !== "^") return base;
    take();
    const exp = unary();
    return (x) => base(x) ** exp(x);
  };
  const primary = (): Fn => {
    const t = take();
    if (t === "(") {
      const v = expr();
      take(")");
      return v;
    }
    if (/^[\d.]/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) throw new Error(`bad number ${t}`);
      return () => n;
    }
    if (t === "x") return (x) => x;
    if (Object.hasOwn(CONSTANTS, t)) {
      const constant = CONSTANTS[t] as number;
      return () => constant;
    }
    const fn = Object.hasOwn(FUNCTIONS, t) ? FUNCTIONS[t] : undefined;
    if (fn) {
      // sin x and sin(x) both work.
      const arg = peek() === "(" ? primary() : power();
      return (x) => fn(arg(x));
    }
    throw new Error(`unknown name ${t}`);
  };

  const fn = expr();
  if (i !== tokens.length) throw new Error(`unexpected ${tokens[i]}`);
  return fn;
}
