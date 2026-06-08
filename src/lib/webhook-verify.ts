import crypto from "crypto";

/**
 * Verify Meta webhook signature (X-Hub-Signature-256)
 * Meta sends HMAC-SHA256 signature with every webhook POST request.
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const appSecret = process.env.META_APP_SECRET;
  
  // If app secret is not configured, log warning and allow (backwards compatible)
  if (!appSecret) {
    console.warn("[Webhook] META_APP_SECRET not configured — signature verification skipped");
    return true;
  }

  if (!signatureHeader) {
    console.warn("[Webhook] Missing X-Hub-Signature-256 header");
    return false;
  }

  // Header format: "sha256=<hex_digest>"
  const expectedSignature = signatureHeader.replace("sha256=", "");
  const computedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf-8")
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(computedSignature, "hex")
    );
  } catch {
    return false;
  }
}
