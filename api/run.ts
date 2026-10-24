import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runLuau } from "../lib/vm";

export default function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST.",
    });
  }

  const source = req.body?.source;

  if (typeof source !== "string") {
    return res.status(400).json({
      error: 'Request body must contain a string field named "source".',
    });
  }

  if (source.length > 10_000) {
    return res.status(413).json({
      error: "Source exceeds the 10000 character limit.",
    });
  }

  try {
    const result = runLuau(source);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error
        ? error.message
        : "Unknown execution error",
    });
  }
}
