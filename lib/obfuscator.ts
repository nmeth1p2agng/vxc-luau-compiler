import {
  compileLuau,
  type Instruction,
  type VxcBytecode,
} from "./compiler";

export type EncodedInstruction = {
  opcode: number;
  operand?: number;
};

export type ObfuscatedBytecode = {
  version: 1;
  localCount: number;
  instructions: EncodedInstruction[];
};

const OPCODE_MAP: Record<Instruction["op"], number> = {
  CONST: 41,
  LOAD: 17,
  STORE: 93,
  ADD: 28,
  SUB: 64,
  MUL: 12,
  DIV: 75,
  RETURN: 36,
};

export function obfuscateBytecode(
  program: VxcBytecode,
): ObfuscatedBytecode {
  const instructions: EncodedInstruction[] =
    program.instructions.map((instruction) => {
      switch (instruction.op) {
        case "CONST":
          return {
            opcode: OPCODE_MAP.CONST,
            operand: instruction.value,
          };

        case "LOAD":
        case "STORE":
          return {
            opcode: OPCODE_MAP[instruction.op],
            operand: instruction.slot,
          };

        case "ADD":
        case "SUB":
        case "MUL":
        case "DIV":
        case "RETURN":
          return {
            opcode: OPCODE_MAP[instruction.op],
          };
      }
    });

  return {
    version: 1,
    localCount: program.localCount,
    instructions,
  };
}

export function obfuscateLuau(
  source: string,
): ObfuscatedBytecode {
  return obfuscateBytecode(compileLuau(source));
}
