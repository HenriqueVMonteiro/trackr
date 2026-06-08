import type { Clock, IdGenerator, EventBus, Unsubscribe } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleNotificationRepository } from "./infrastructure/DrizzleNotificationRepository";
import { registerIssueAssignedSubscriber } from "./interface/subscribers/IssueAssignedSubscriber";
import {
  SendNotification,
  UpdatePreferences,
  SubscribeUserToTopic,
  type NotificationChannel,
  type NotificationRepository,
} from "./application";
import type { Channel } from "./domain/Channel";

export type * from "./domain";
export type {
  NotificationChannel,
  NotificationRepository,
  NotificationOutcome,
  NotificationStatus,
  NotificationPayload,
  SendNotificationInput,
  SendNotificationOutput,
  UpdatePreferencesInput,
  SubscribeUserToTopicInput,
} from "./application";
export {
  NotificationFactory,
  notificationFactoryFor,
} from "./application";
export { buildNotificationChannels } from "./infrastructure/channels";

export interface NotificationsModuleDeps {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
  // Mapa canal -> adapter (montado via buildNotificationChannels). Default vazio.
  channels?: ReadonlyMap<Channel, NotificationChannel>;
}

export interface NotificationsModule {
  sendNotification: SendNotification;
  updatePreferences: UpdatePreferences;
  subscribeUserToTopic: SubscribeUserToTopic;
  repository: NotificationRepository;
  // GoF: Observer — registra os subscribers de evento; devolve o unsubscribe.
  registerSubscribers(): Unsubscribe;
}

// GoF: Factory (composição) / SOLID: DIP.
export function createNotificationsModule(deps: NotificationsModuleDeps): NotificationsModule {
  const repository = new DrizzleNotificationRepository(deps.db);
  const channels = deps.channels ?? new Map<Channel, NotificationChannel>();
  const sendNotification = new SendNotification({
    repo: repository,
    channels,
    clock: deps.clock,
    ids: deps.ids,
  });

  return {
    sendNotification,
    updatePreferences: new UpdatePreferences(repository),
    subscribeUserToTopic: new SubscribeUserToTopic(repository),
    repository,
    registerSubscribers: () =>
      registerIssueAssignedSubscriber(deps.events, { sendNotification, repo: repository }),
  };
}
