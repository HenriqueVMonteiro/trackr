import { describe, it, expect } from "vitest";

import { WebhookEndpoint } from "./WebhookEndpoint";
import { RetryPolicy } from "./RetryPolicy";

const at = new Date("2026-06-07T10:00:00Z");
const base = {
  id: "whk_0001",
  workspaceId: "wsp_0001",
  url: "https://example.com/hook",
  secret: "a-very-long-secret-value",
  createdAt: at,
};

describe("WebhookEndpoint", () => {
  it("creates a valid endpoint with sane defaults", () => {
    const r = WebhookEndpoint.create(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.active).toBe(true);
      expect(r.value.signatureAlgo).toBe("hmac-sha256");
      expect(r.value.retryPolicy).toEqual(RetryPolicy.exponential());
    }
  });

  it("rejects non-https URLs", () => {
    for (const url of ["http://example.com", "ftp://x", "not-a-url", ""]) {
      const r = WebhookEndpoint.create({ ...base, url });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("validation");
    }
  });

  it("rejects a secret shorter than 16 chars", () => {
    const r = WebhookEndpoint.create({ ...base, secret: "short" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown signature algorithm", () => {
    // @ts-expect-error — exercising runtime guard with a bad value
    const r = WebhookEndpoint.create({ ...base, signatureAlgo: "md5" });
    expect(r.ok).toBe(false);
  });

  it("honors an explicit retry policy", () => {
    const r = WebhookEndpoint.create({ ...base, retryPolicy: RetryPolicy.fixed(3, 500) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.retryPolicy).toEqual({ type: "fixed", maxAttempts: 3, delayMs: 500 });
  });
});
