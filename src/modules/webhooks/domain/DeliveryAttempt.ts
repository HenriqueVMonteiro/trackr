// SOLID: SRP — DeliveryAttempt é o registro imutável de UMA tentativa HTTP de
// entrega (código de status, corpo da resposta ou erro). Sem regra de negócio
// que falhe, então `create` retorna a instância direto (como WorkspaceMember).

export interface DeliveryAttemptProps {
  readonly id: string;
  readonly deliveryId: string;
  readonly statusCode: number | null;
  readonly responseBody: string | null;
  readonly error: string | null;
  readonly attemptedAt: Date;
}

export class DeliveryAttempt {
  private constructor(private readonly props: DeliveryAttemptProps) {
    Object.freeze(this);
  }

  static create(props: DeliveryAttemptProps): DeliveryAttempt {
    return new DeliveryAttempt(props);
  }

  static fromPersistence(props: DeliveryAttemptProps): DeliveryAttempt {
    return new DeliveryAttempt(props);
  }

  // Uma tentativa é considerada bem-sucedida quando o status HTTP é 2xx.
  get succeeded(): boolean {
    return this.props.statusCode != null && this.props.statusCode >= 200 && this.props.statusCode < 300;
  }

  get id(): string {
    return this.props.id;
  }
  get deliveryId(): string {
    return this.props.deliveryId;
  }
  get statusCode(): number | null {
    return this.props.statusCode;
  }
  get responseBody(): string | null {
    return this.props.responseBody;
  }
  get error(): string | null {
    return this.props.error;
  }
  get attemptedAt(): Date {
    return new Date(this.props.attemptedAt);
  }

  toJSON(): DeliveryAttemptProps {
    return { ...this.props };
  }
}
