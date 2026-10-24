export type Expression =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: string }
  | {
      kind: "binary";
      operator: "+" | "-" | "*" | "/";
      left: Expression;
      right: Expression;
    };

export type Statement =
  | { kind: "local"; name: string; value: Expression }
  | { kind: "return"; value: Expression };

export type Program = {
  statements: Statement[];
};

type Token = {
  type: "number" | "identifier" | "symbol" | "keyword" | "eof";
  value: string;
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === "-" && source[i + 1] === "-") {
      while (i < source.length && source[i] !== "\n") {
        i++;
      }
      continue;
    }

    if (/[0-9]/.test(char)) {
      const start = i++;

      while (i < source.length && /[0-9.]/.test(source[i])) {
        i++;
      }

      const value = source.slice(start, i);

      if (!/^\d+(?:\.\d+)?$/.test(value)) {
        throw new Error(`Invalid number: ${value}`);
      }

      tokens.push({ type: "number", value });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = i++;

      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) {
        i++;
      }

      const value = source.slice(start, i);

      if (value === "local" || value === "return") {
        tokens.push({ type: "keyword", value });
      } else {
        tokens.push({ type: "identifier", value });
      }

      continue;
    }

    if ("=+-*/()".includes(char)) {
      tokens.push({ type: "symbol", value: char });
      i++;
      continue;
    }

    throw new Error(`Unexpected character "${char}" at position ${i}`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  private current(): Token {
    return this.tokens[this.position];
  }

  private consume(): Token {
    return this.tokens[this.position++];
  }

  private expect(value: string): Token {
    if (this.current().value !== value) {
      throw new Error(
        `Expected "${value}", got "${this.current().value || "end of input"}"`,
      );
    }

    return this.consume();
  }

  parseProgram(): Program {
    const statements: Statement[] = [];

    while (this.current().type !== "eof") {
      statements.push(this.parseStatement());
    }

    if (statements.length === 0) {
      throw new Error("Program cannot be empty");
    }

    if (statements[statements.length - 1].kind !== "return") {
      throw new Error("Program must end with a return statement");
    }

    return { statements };
  }

  private parseStatement(): Statement {
    if (this.current().value === "local") {
      this.consume();

      const name = this.current();

      if (name.type !== "identifier") {
        throw new Error("Expected variable name after local");
      }

      this.consume();
      this.expect("=");

      return {
        kind: "local",
        name: name.value,
        value: this.parseExpression(),
      };
    }

    if (this.current().value === "return") {
      this.consume();

      return {
        kind: "return",
        value: this.parseExpression(),
      };
    }

    throw new Error(`Unsupported statement: "${this.current().value}"`);
  }

  private parseExpression(): Expression {
    return this.parseAdditive();
  }

  private parseAdditive(): Expression {
    let expression = this.parseMultiplicative();

    while (
      this.current().value === "+" ||
      this.current().value === "-"
    ) {
      const operator = this.consume().value as "+" | "-";

      expression = {
        kind: "binary",
        operator,
        left: expression,
        right: this.parseMultiplicative(),
      };
    }

    return expression;
  }

  private parseMultiplicative(): Expression {
    let expression = this.parsePrimary();

    while (["*", "/"].includes(this.current().value)) {
      const operator = this.consume().value as "*" | "/";

      expression = {
        kind: "binary",
        operator,
        left: expression,
        right: this.parsePrimary(),
      };
    }

    return expression;
  }

  private parsePrimary(): Expression {
    const token = this.current();

    if (token.type === "number") {
      this.consume();

      return {
        kind: "number",
        value: Number(token.value),
      };
    }

    if (token.type === "identifier") {
      this.consume();

      return {
        kind: "variable",
        name: token.value,
      };
    }

    if (token.value === "(") {
      this.consume();

      const expression = this.parseExpression();

      this.expect(")");
      return expression;
    }

    throw new Error(
      `Expected expression, got "${token.value || "end of input"}"`,
    );
  }
}

export function parseLuau(source: string): Program {
  if (typeof source !== "string") {
    throw new TypeError("Source must be a string");
  }

  if (source.length > 100_000) {
    throw new RangeError("Source exceeds the 100000 character limit");
  }

  return new Parser(tokenize(source)).parseProgram();
  }
