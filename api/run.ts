import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { obfuscateLuau } from "../lib/obfuscator";

export default function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  const source = req.body?.source;

  if (typeof source !== "string") {
    return res.status(400).json({
      success: false,
      error: 'Expected JSON body: {"source":"return 2 + 3"}',
    });
  }

  if (source.length === 0 || source.length > 10_000) {
    return res.status(400).json({
      success: false,
      error: "Source must contain between 1 and 10000 characters.",
    });
  }

  try {
    const bytecode = obfuscateLuau(source);

    return res.status(200).json({
      success: true,
      format: "vxc-bytecode-v1",
      bytecode,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error
        ? error.message
        : "Compilation failed.",
    });
  }
}
