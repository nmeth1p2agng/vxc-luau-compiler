import type { VercelRequest, VercelResponse } from "@vercel/node";
import { diagnoseShieldSource } from "../lib/shield-diagnostics";

export default function handler(
req: VercelRequest,
res: VercelResponse
) {
if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).json({
error: "Method not allowed. Use POST."
});
}

const body = req.body;

if (
!body ||
typeof body !== "object" ||
typeof body.source !== "string"
) {
return res.status(400).json({
error: "Request body must contain a string field named source."
});
}

if (body.source.length > 500_000) {
return res.status(413).json({
error: "Source is too large. Maximum length is 500000 characters."
});
}

try {
const report = diagnoseShieldSource(body.source);

return res.status(200).json({
  ok: true,
  report
});

} catch (error) {
return res.status(400).json({
ok: false,
error:
error instanceof Error
? error.message
: "Unable to analyze source."
});
}
}
