import type { Channel } from "../../domain/Channel";
import type { NotificationRepository } from "../ports/NotificationRepository";

export interface SubscribeUserToTopicInput {
  userId: string;
  eventType: string;
  channel: Channel;
}

// SOLID: SRP — habilita UM canal para um tópico (event_type) sem remover os demais.
export class SubscribeUserToTopic {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: SubscribeUserToTopicInput): Promise<void> {
    const current = await this.repo.getPreferences(input.userId, input.eventType);
    if (!current.includes(input.channel)) {
      await this.repo.setPreferences(input.userId, input.eventType, [...current, input.channel]);
    }
  }
}
