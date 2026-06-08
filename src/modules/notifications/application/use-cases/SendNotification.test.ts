import { describe, it, expect } from "vitest";

import { ok, err, type Result } from "@/shared/result";
import { type DomainError } from "@/shared/errors";
import { FrozenClock, SequentialIdGenerator } from "@/shared";
import { SendNotification } from "./SendNotification";
import { ChannelDeliveryError } from "../../domain";
import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";
import type { NotificationChannel } from "../ports/NotificationChannel";
import type {
  NotificationOutcome,
  NotificationRepository,
} from "../ports/NotificationRepository";

class FakeChannel implements NotificationChannel {
  sent: Notification[] = [];
  constructor(
    readonly channel: Channel,
    private readonly succeed: boolean,
  ) {}
  async send(notification: Notification): Promise<Result<void, DomainError>> {
    this.sent.push(notification);
    return this.succeed ? ok(undefined) : err(new ChannelDeliveryError("smtp down"));
  }
}

class FakeRepo implements NotificationRepository {
  saved: { notification: Notification; outcome: NotificationOutcome }[] = [];
  prefs = new Map<string, Channel[]>();
  async save(notification: Notification, outcome: NotificationOutcome): Promise<void> {
    this.saved.push({ notification, outcome });
  }
  async getPreferences(userId: string, eventType: string): Promise<Channel[]> {
    return this.prefs.get(`${userId}:${eventType}`) ?? [];
  }
  async setPreferences(userId: string, eventType: string, channels: Channel[]): Promise<void> {
    this.prefs.set(`${userId}:${eventType}`, channels);
  }
}

const setup = (channel: NotificationChannel | null) => {
  const repo = new FakeRepo();
  const channels = new Map<Channel, NotificationChannel>();
  if (channel) channels.set(channel.channel, channel);
  const useCase = new SendNotification({
    repo,
    channels,
    clock: new FrozenClock(new Date("2026-06-07T10:00:00Z")),
    ids: new SequentialIdGenerator(),
  });
  return { repo, useCase };
};

const input = {
  recipientId: "00000000-0000-0000-0000-000000000001",
  to: "user@example.com",
  channel: "email" as Channel,
  subject: "Assigned",
  body: "<b>hi</b>",
};

describe("SendNotification", () => {
  it("creates the channel-specific Notification (Factory Method) and marks it sent", async () => {
    const ch = new FakeChannel("email", true);
    const { repo, useCase } = setup(ch);
    const r = await useCase.execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.delivered).toBe(true);
      expect(r.value.notification.channel).toBe("email");
    }
    expect(ch.sent).toHaveLength(1);
    expect(repo.saved[0]?.outcome.status).toBe("sent");
  });

  it("records a failed outcome when the channel send fails", async () => {
    const { repo, useCase } = setup(new FakeChannel("email", false));
    const r = await useCase.execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.delivered).toBe(false);
    expect(repo.saved[0]?.outcome.status).toBe("failed");
    expect(repo.saved[0]?.outcome.error).toBe("smtp down");
  });

  it("fails (not delivered) when no adapter is registered for the channel", async () => {
    const { repo, useCase } = setup(null);
    const r = await useCase.execute(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.delivered).toBe(false);
    expect(repo.saved[0]?.outcome.status).toBe("failed");
  });

  it("rejects an empty subject with ValidationError", async () => {
    const { useCase } = setup(new FakeChannel("email", true));
    const r = await useCase.execute({ ...input, subject: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });
});
