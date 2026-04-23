import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const CACHE_KEY = "main";
const REPO_FULL_NAME = "john-bacic/button-maker";

const encoder = new TextEncoder();

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const computeHmacSha256 = async (secret, payload) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `sha256=${toHex(new Uint8Array(signature))}`;
};

http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const event = req.headers.get("x-github-event");
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret) {
      if (!signature) {
        return new Response("Missing signature", { status: 401 });
      }

      const expected = await computeHmacSha256(secret, rawBody);
      if (!timingSafeEqual(signature, expected)) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    if (event !== "push") {
      return new Response("Ignored", { status: 200 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (payload.repository?.full_name !== REPO_FULL_NAME) {
      return new Response("Ignored repository", { status: 200 });
    }

    const shortSha = String(payload.after || payload.head_commit?.id || "").slice(0, 7);
    const updatedAt = Date.now();

    await ctx.runMutation(internal.githubDeploy.setCached, {
      key: CACHE_KEY,
      sha: shortSha || undefined,
      status: shortSha ? "ok" : "unavailable",
      updatedAt,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;
