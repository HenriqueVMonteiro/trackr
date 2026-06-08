import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

// SOLID: SRP — WebhookDelivery é o agregado de uma tentativa de entrega de um
// evento a um endpoint. Conhece seu próprio ciclo de status; quem ORQUESTRA a
// entrega HTTP é o worker (B3). Imutável: transições retornam nova instância.

export type DeliveryStatus =
  | "pending"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "dead_lettered";

export interface WebhookDeliveryProps {
  readonly id: string;
  readonly endpointId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly status: DeliveryStatus;
  readonly attemptCount: number;
  readonly lastAttemptedAt: Date | null;
  readonly lastError: string | null;
  readonly createdAt: Date;
}

export interface CreateWebhookDeliveryInput {
  readonly id: string;
  readonly endpointId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly createdAt: Date;
}

export class WebhookDelivery {
  private constructor(private readonly props: WebhookDeliveryProps) {
    Object.freeze(this);
  }

  static create(input: CreateWebhookDeliveryInput): Result<WebhookDelivery, ValidationError> {
    if (input.eventType.trim().length === 0) {
      return err(new ValidationError("eventType must not be empty", { field: "eventType" }));
    }
    return ok(
      new WebhookDelivery({
        id: input.id,
        endpointId: input.endpointId,
        eventType: input.eventType,
        payload: input.payload,
        status: "pending",
        attemptCount: 0,
        lastAttemptedAt: null,
        lastError: null,
        createdAt: input.createdAt,
      }),
    );
  }

  static fromPersistence(props: WebhookDeliveryProps): WebhookDelivery {
    return new WebhookDelivery(props);
  }

  // Marca o início de uma tentativa (consumida pelo worker no B3).
  markInProgress(at: Date): WebhookDelivery {
    return new WebhookDelivery({ ...this.props, status: "in_progress", lastAttemptedAt: at });
  }

  // Tentativa bem-sucedida (2xx): incrementa contador e fecha como succeeded.
  recordSuccess(at: Date): WebhookDelivery {
    return new WebhookDelivery({
      ...this.props,
      status: "succeeded",
      attemptCount: this.props.attemptCount + 1,
      lastAttemptedAt: at,
      lastError: null,
    });
  }

  // Tentativa falha: incrementa o contador ANTES de comparar; vira "failed" (será
  // re-enfileirada pela Strategy no B3) ou "dead_lettered" quando attemptCount
  // atinge maxAttempts (ex.: max=3 → falhas 1 e 2 ficam "failed"; a 3ª "dead_lettered").
  recordFailure(error: string, at: Date, maxAttempts: number): WebhookDelivery {
    const attemptCount = this.props.attemptCount + 1;
    const status: DeliveryStatus = attemptCount >= maxAttempts ? "dead_lettered" : "failed";
    return new WebhookDelivery({
      ...this.props,
      status,
      attemptCount,
      lastAttemptedAt: at,
      lastError: error,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get endpointId(): string {
    return this.props.endpointId;
  }
  get eventType(): string {
    return this.props.eventType;
  }
  get payload(): unknown {
    return this.props.payload;
  }
  get status(): DeliveryStatus {
    return this.props.status;
  }
  get attemptCount(): number {
    return this.props.attemptCount;
  }
  get lastAttemptedAt(): Date | null {
    return this.props.lastAttemptedAt ? new Date(this.props.lastAttemptedAt) : null;
  }
  get lastError(): string | null {
    return this.props.lastError;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  isDeadLettered(): boolean {
    return this.props.status === "dead_lettered";
  }

  toJSON(): WebhookDeliveryProps {
    return { ...this.props };
  }
}
