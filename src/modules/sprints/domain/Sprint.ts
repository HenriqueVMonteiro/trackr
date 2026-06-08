import { ok, err, type Result } from "@/shared/result";
import { ValidationError, InvalidTransitionError } from "@/shared/errors";
import type { SprintStatus } from "./SprintStatus";

// SOLID: SRP — Sprint só conhece suas próprias invariantes (nome, janela de
// datas, capacidade) e seu ciclo de vida (planned -> active -> closed).
// Persistência mora no repo; orquestração, no use case.

export interface SprintProps {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly status: SprintStatus;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly capacity: number;
  readonly createdAt: Date;
}

// Input de criação não carrega status: toda sprint nasce "planned".
export interface CreateSprintProps {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly capacity: number;
  readonly createdAt: Date;
}

const NAME_MIN = 2;
const NAME_MAX = 80;

export class Sprint {
  private constructor(private readonly props: SprintProps) {
    Object.freeze(this);
  }

  // Factory com validação para entradas vindas do mundo externo (use cases).
  static create(input: CreateSprintProps): Result<Sprint, ValidationError> {
    const name = input.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return err(
        new ValidationError(`Sprint name must be ${NAME_MIN}-${NAME_MAX} chars`, {
          field: "name",
        }),
      );
    }
    if (input.endDate.getTime() <= input.startDate.getTime()) {
      return err(
        new ValidationError("Sprint endDate must be after startDate", {
          field: "endDate",
        }),
      );
    }
    if (input.capacity < 0) {
      return err(
        new ValidationError("Sprint capacity must be >= 0", { field: "capacity" }),
      );
    }
    return ok(
      new Sprint({
        id: input.id,
        workspaceId: input.workspaceId,
        name,
        status: "planned",
        startDate: input.startDate,
        endDate: input.endDate,
        capacity: input.capacity,
        createdAt: input.createdAt,
      }),
    );
  }

  // Reconstitui de persistência (já validado quando foi salvo).
  static fromPersistence(props: SprintProps): Sprint {
    return new Sprint(props);
  }

  // Operação de domínio — transição planned -> active (imutável).
  start(at: Date): Result<Sprint, InvalidTransitionError> {
    if (this.props.status !== "planned") {
      return err(new InvalidTransitionError(this.props.status, "active"));
    }
    return ok(new Sprint({ ...this.props, status: "active", startDate: at }));
  }

  // Operação de domínio — transição active -> closed (imutável).
  close(at: Date): Result<Sprint, InvalidTransitionError> {
    if (this.props.status !== "active") {
      return err(new InvalidTransitionError(this.props.status, "closed"));
    }
    return ok(new Sprint({ ...this.props, status: "closed", endDate: at }));
  }

  get id(): string {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): SprintStatus {
    return this.props.status;
  }
  get startDate(): Date {
    return new Date(this.props.startDate);
  }
  get endDate(): Date {
    return new Date(this.props.endDate);
  }
  get capacity(): number {
    return this.props.capacity;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  toJSON(): SprintProps {
    return { ...this.props };
  }
}
