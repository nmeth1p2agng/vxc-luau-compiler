import {
  parseLuau,
  type Expression,
  type Program,
} from "./parser";

export type Instruction =
  | { op: "CONST"; value: number }
  | { op: "LOAD"; slot: number }
  | { op: "STORE"; slot: number }
  | { op: "ADD" | "SUB" | "MUL" | "DIV" }
  | { op: "RETURN" };

export type VxcBytecode = {
  version: 1;
  instructions: Instruction[];
  localCount: number;
};

class Compiler {
  private instructions: Instruction[] = [];
  private slots = new Map<string, number>();

  constructor(private readonly program: Program) {}

  compile(): VxcBytecode {
    for (const statement of this.program.statements) {
      if (statement.kind === "local") {
        if (this.slots.has(statement.name)) {
          throw new Error(
            `Duplicate local variable: ${statement.name}`,
          );
        }

        this.compileExpression(statement.value);

        const slot = this.slots.size;
        this.slots.set(statement.name, slot);

        this.instructions.push({
          op: "STORE",
          slot,
        });
      } else {
        this.compileExpression(statement.value);

        this.instructions.push({
          op: "RETURN",
        });
      }
    }

    return {
      version: 1,
      instructions: this.instructions,
      localCount: this.slots.size,
    };
  }

  private compileExpression(expression: Expression): void {
    switch (expression.kind) {
      case "number":
        this.instructions.push({
          op: "CONST",
          value: expression.value,
        });
        return;

      case "variable": {
        const slot = this.slots.get(expression.name);

        if (slot === undefined) {
          throw new Error(`Unknown variable: ${expression.name}`);
        }

        this.instructions.push({
          op: "LOAD",
          slot,
        });
        return;
      }

      case "binary":
        this.compileExpression(expression.left);
        this.compileExpression(expression.right);

        this.instructions.push({
          op: {
            "+": "ADD",
            "-": "SUB",
            "*": "MUL",
            "/": "DIV",
          }[expression.operator],
        });
        return;
    }
  }
}

export function compileLuau(source: string): VxcBytecode {
  return new Compiler(parseLuau(source)).compile();
}
