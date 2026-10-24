import {
  compileLuau,
  type Instruction,
  type VxcBytecode,
} from "./compiler";

export type VmOptions = {
  maxSteps?: number;
  maxStackDepth?: number;
};

const DEFAULT_MAX_STEPS = 100_000;
const DEFAULT_MAX_STACK_DEPTH = 10_000;

function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(
      `${name} must be a positive safe integer`,
    );
  }
}

export function executeBytecode(
  program: VxcBytecode,
  options: VmOptions = {},
): number {
  if (program.version !== 1) {
    throw new Error("Unsupported bytecode version");
  }

  if (
    !Number.isSafeInteger(program.localCount) ||
    program.localCount < 0 ||
    !Array.isArray(program.instructions)
  ) {
    throw new Error("Invalid bytecode program");
  }

  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const maxStackDepth =
    options.maxStackDepth ?? DEFAULT_MAX_STACK_DEPTH;

  requirePositiveInteger(maxSteps, "maxSteps");
  requirePositiveInteger(maxStackDepth, "maxStackDepth");

  const locals: number[] = new Array(program.localCount);
  const stack: number[] = [];

  let steps = 0;

  const pop = (): number => {
    const value = stack.pop();

    if (value === undefined) {
      throw new Error("VM stack underflow");
    }

    return value;
  };

  for (const instruction of program.instructions) {
    steps++;

    if (steps > maxSteps) {
      throw new RangeError("VM instruction limit exceeded");
    }

    switch (instruction.op) {
      case "CONST":
        if (!Number.isFinite(instruction.value)) {
          throw new Error("Invalid numeric constant");
        }

        stack.push(instruction.value);
        break;

      case "LOAD":
        if (
          !Number.isSafeInteger(instruction.slot) ||
          instruction.slot < 0 ||
          instruction.slot >= locals.length ||
          !(instruction.slot in locals)
        ) {
          throw new Error("Invalid or uninitialized local slot");
        }

        stack.push(locals[instruction.slot]);
        break;

      case "STORE": {
        if (
          !Number.isSafeInteger(instruction.slot) ||
          instruction.slot < 0 ||
          instruction.slot >= locals.length
        ) {
          throw new Error("Invalid local slot");
        }

        locals[instruction.slot] = pop();
        break;
      }

      case "ADD":
      case "SUB":
      case "MUL":
      case "DIV": {
        const right = pop();
        const left = pop();

        if (instruction.op === "DIV" && right === 0) {
          throw new RangeError("Division by zero");
        }

        let result: number;

        switch (instruction.op) {
          case "ADD":
            result = left + right;
            break;

          case "SUB":
            result = left - right;
            break;

          case "MUL":
            result = left * right;
            break;

          case "DIV":
            result = left / right;
            break;
        }

        if (!Number.isFinite(result)) {
          throw new RangeError("Non-finite arithmetic result");
        }

        stack.push(result);
        break;
      }

      case "RETURN": {
        const result = pop();

        if (stack.length !== 0) {
          throw new Error(
            "Unexpected values remaining on VM stack",
          );
        }

        return result;
      }

      default:
        throw new Error(
          `Unsupported VM instruction: ${
            (instruction as Instruction).op
          }`,
        );
    }

    if (stack.length > maxStackDepth) {
      throw new RangeError("VM stack depth limit exceeded");
    }
  }

  throw new Error("VM program ended without RETURN");
}

export function runLuau(
  source: string,
  options: VmOptions = {},
): number {
  return executeBytecode(compileLuau(source), options);
}
