import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";

export type NotificationStatus = "pending" | "sent" | "failed";

export interface NotificationOutcome {
  status: NotificationStatus;
  sentAt: Date | null;
  error: string | null;
}

// SOLID: DIP — persistência de notificações e preferências atrás de uma abstração.
export interface NotificationRepository {
  save(notification: Notification, outcome: NotificationOutcome): Promise<void>;
  getPreferences(userId: string, eventType: string): Promise<Channel[]>;
  setPreferences(userId: string, eventType: string, channels: Channel[]): Promise<void>;
}
