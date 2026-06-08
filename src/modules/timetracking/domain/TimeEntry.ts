import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";
import { Duration } from "./Duration";

// SOLID: SRP — TimeEntry conhece apenas suas invariantes: um período válido
// (endedAt > startedAt), a duração derivada e uma descrição opcional limitada.

export interface TimeEntryProps {
  readonly id: string;
  readonly issueId: string;
  readonly userId: string;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly durationSeconds: number;
  readonly description: string | null;
  readonly createdAt: Date;
}

export interface CreateTimeEntryProps {
  readonly id: string;
  readonly issueId: string;
  readonly userId: string;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly description: string | null;
  readonly createdAt: Date;
}

const DESCRIPTION_MAX = 500;

export class TimeEntry {
  private constructor(private readonly props: TimeEntryProps) {
    Object.freeze(this);
  }

  // Factory com validação para entradas vindas do mundo externo (use cases).
  // durationSeconds é derivado do intervalo, não informado pelo chamador.
  static create(props: CreateTimeEntryProps): Result<TimeEntry, ValidationError> {
    if (props.endedAt.getTime() <= props.startedAt.getTime()) {
      return err(
        new ValidationError("Time entry endedAt must be after startedAt", {
          field: "endedAt",
        }),
      );
    }

    const description = props.description?.trim() ?? null;
    if (description !== null && description.length > DESCRIPTION_MAX) {
      return err(
        new ValidationError(`Time entry description must be <= ${DESCRIPTION_MAX} chars`, {
          field: "description",
        }),
      );
    }

    const durationSeconds = Math.round(
      (props.endedAt.getTime() - props.startedAt.getTime()) / 1000,
    );

    return ok(
      new TimeEntry({
        id: props.id,
        issueId: props.issueId,
        userId: props.userId,
        startedAt: props.startedAt,
        endedAt: props.endedAt,
        durationSeconds,
        description: description === "" ? null : description,
        createdAt: props.createdAt,
      }),
    );
  }

  // Reconstitui de persistência (já validado quando foi salvo).
  static fromPersistence(props: TimeEntryProps): TimeEntry {
    return new TimeEntry(props);
  }

  get id(): string {
    return this.props.id;
  }
  get issueId(): string {
    return this.props.issueId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get startedAt(): Date {
    return new Date(this.props.startedAt);
  }
  get endedAt(): Date {
    return new Date(this.props.endedAt);
  }
  get durationSeconds(): number {
    return this.props.durationSeconds;
  }
  get description(): string | null {
    return this.props.description;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  // Duração como Value Object. Normalizamos para inteiro não-negativo antes de
  // chamar a factory, garantindo que fromSeconds nunca falhe (endedAt >
  // startedAt já é invariante de criação; isto protege contra persistência
  // corrompida sem propagar Result por um caminho inalcançável).
  duration(): Duration {
    const safeSeconds = Math.max(0, Math.round(this.props.durationSeconds));
    const r = Duration.fromSeconds(safeSeconds);
    return r.ok ? r.value : Duration.zero();
  }

  toJSON(): TimeEntryProps {
    return { ...this.props };
  }
}
