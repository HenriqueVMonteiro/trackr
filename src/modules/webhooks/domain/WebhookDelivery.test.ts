import { describe, it, expect } from "vitest";

import { WebhookDelivery } from "./WebhookDelivery";

const at = new Date("2026-06-07T10:00:00Z");
const later = new Date("2026-06-07T10:05:00Z");
const baseInput = {
  id: "del_0001",
  endpointId: "whk_0001",
  eventType: "issue.created",
  payload: { issueId: "iss_0001" },
  createdAt: at,
};

describe("WebhookDelivery", () => {
  it("starts pending with zero attempts", () => {
    const r = WebhookDelivery.create(baseInput);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("pending");
      expect(r.value.attemptCount).toBe(0);
      expect(r.value.lastAttemptedAt).toBeNull();
    }
  });

  it("rejects an empty eventType", () => {
    const r = WebhookDelivery.create({ ...baseInput, eventType: "  " });
    expect(r.ok).toBe(false);
  });

  it("recordSuccess marks succeeded and bumps the attempt count", () => {
    const r = WebhookDelivery.create(baseInput);
    if (!r.ok) throw new Error("setup");
    const done = r.value.recordSuccess(later);
    expect(done.status).toBe("succeeded");
    expect(done.attemptCount).toBe(1);
    expect(done.lastError).toBeNull();
    expect(done.lastAttemptedAt).toEqual(later);
  });

  it("recordFailure stays 'failed' below maxAttempts and 'dead_lettered' at the ceiling", () => {
    const r = WebhookDelivery.create(baseInput);
    if (!r.ok) throw new Error("setup");
    const first = r.value.recordFailure("boom", later, 3);
    expect(first.status).toBe("failed");
    expect(first.attemptCount).toBe(1);

    const second = first.recordFailure("boom", later, 3);
    expect(second.status).toBe("failed");

    const third = second.recordFailure("boom", later, 3);
    expect(third.status).toBe("dead_lettered");
    expect(third.attemptCount).toBe(3);
    expect(third.isDeadLettered()).toBe(true);
    expect(third.lastError).toBe("boom");
  });

  it("markInProgress flips status without counting an attempt", () => {
    const r = WebhookDelivery.create(baseInput);
    if (!r.ok) throw new Error("setup");
    const inProgress = r.value.markInProgress(later);
    expect(inProgress.status).toBe("in_progress");
    expect(inProgress.attemptCount).toBe(0);
  });
});
