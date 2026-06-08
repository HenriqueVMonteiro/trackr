import type { Channel } from "./Channel";

export interface NotificationContent {
  readonly id: string;
  readonly recipientId: string;
  // Endereço específico do canal: e-mail, subscription push (JSON) ou userId (in-app).
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly createdAt: Date;
}

// GoF: Factory Method (Product) — a hierarquia de Notification é o "produto"
// criado pelas NotificationFactory concretas (ver application/NotificationFactory.ts).
// Cada subclasse fixa seu Channel; o conteúdo é imutável.
export abstract class Notification {
  protected constructor(protected readonly content: NotificationContent) {
    Object.freeze(this);
  }

  abstract get channel(): Channel;

  get id(): string {
    return this.content.id;
  }
  get recipientId(): string {
    return this.content.recipientId;
  }
  get to(): string {
    return this.content.to;
  }
  get subject(): string {
    return this.content.subject;
  }
  get body(): string {
    return this.content.body;
  }
  get createdAt(): Date {
    return new Date(this.content.createdAt);
  }

  toJSON(): NotificationContent & { channel: Channel } {
    return { ...this.content, channel: this.channel };
  }
}

export class EmailNotification extends Notification {
  constructor(content: NotificationContent) {
    super(content);
  }
  get channel(): Channel {
    return "email";
  }
}

export class PushNotification extends Notification {
  constructor(content: NotificationContent) {
    super(content);
  }
  get channel(): Channel {
    return "push";
  }
}

export class InAppNotification extends Notification {
  constructor(content: NotificationContent) {
    super(content);
  }
  get channel(): Channel {
    return "in_app";
  }
}

export class WebhookNotification extends Notification {
  constructor(content: NotificationContent) {
    super(content);
  }
  get channel(): Channel {
    return "webhook";
  }
}
