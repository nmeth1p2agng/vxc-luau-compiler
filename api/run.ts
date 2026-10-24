import type { VercelRequest, VercelResponse } from "@vercel/node";
import { protectLuau } from "../lib/protector";

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const source = body?.source;

    if (typeof source !== "string") {
      return res.status(400).json({
        success: false,
        error: 'Field "source" must be a string.'
      });
    }

    const result = protectLuau(source);

    return res.status(200).json({
      success: result.success,
      format: "vxc-luau-protector-v1",
      output: result.output,
      originalLength: result.originalLength,
      outputLength: result.outputLength,
      transformations: result.transformations,
      warnings: result.warnings
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    return res.status(400).json({
      success: false,
      error: message
    });
  }
}
