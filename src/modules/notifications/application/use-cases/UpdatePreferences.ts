import type { Channel } from "../../domain/Channel";
import type { NotificationRepository } from "../ports/NotificationRepository";

export interface UpdatePreferencesInput {
  userId: string;
  eventType: string;
  channels: Channel[];
}

// SOLID: SRP — define o conjunto de canais habilitados de um usuário para um tópico.
export class UpdatePreferences {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: UpdatePreferencesInput): Promise<void> {
    await this.repo.setPreferences(input.userId, input.eventType, input.channels);
  }
}
