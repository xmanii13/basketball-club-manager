/**
 * Optional Resend delivery. Without RESEND_API_KEY + EMAIL_FROM, callers should
 * surface a one-time magic link in-UI after acknowledgement only (never on
 * email-lookup alone).
 */
export function emailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
}

export async function sendMagicLinkEmail(input: {
  to: string;
  magicUrl: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  if (!apiKey || !from) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: "Your Sweet Wednesday Hoops profile link",
        text: [
          "Open this link to access your player profile:",
          input.magicUrl,
          "",
          "This link expires soon and can only be used once.",
          "If you did not request it, you can ignore this email.",
        ].join("\n"),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("email send failed", res.status, detail.slice(0, 200));
      return { ok: false, reason: "send_failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      "email send error",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, reason: "send_failed" };
  }
}
