import { and, eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { notifications, notificationPreferences } from "@/infrastructure/db/schema";
import { isChannel, type Channel } from "../domain/Channel";
import type { Notification } from "../domain/Notification";
import type {
  NotificationOutcome,
  NotificationRepository,
} from "../application/ports/NotificationRepository";

// SOLID: DIP — concretiza a port sobre Drizzle.
export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Database) {}

  async save(notification: Notification, outcome: NotificationOutcome): Promise<void> {
    const j = notification.toJSON();
    await this.db
      .insert(notifications)
      .values({
        id: j.id,
        recipientId: j.recipientId,
        channel: j.channel,
        subject: j.subject,
        body: j.body,
        status: outcome.status,
        sentAt: outcome.sentAt,
        error: outcome.error,
        createdAt: j.createdAt,
      })
      .onConflictDoUpdate({
        target: notifications.id,
        set: { status: outcome.status, sentAt: outcome.sentAt, error: outcome.error },
      });
  }

  async getPreferences(userId: string, eventType: string): Promise<Channel[]> {
    const row = await this.db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType),
      ),
    });
    // Type guard em vez de cast: descarta valores fora do union Channel.
    return row ? row.channelsEnabled.filter(isChannel) : [];
  }

  async setPreferences(userId: string, eventType: string, channels: Channel[]): Promise<void> {
    await this.db
      .insert(notificationPreferences)
      .values({ userId, eventType, channelsEnabled: channels })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.eventType],
        set: { channelsEnabled: channels },
      });
  }
}
