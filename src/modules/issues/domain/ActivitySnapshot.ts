import type { Issue, IssueProps } from "./Issue";

// GoF: Memento — captura o estado completo da Issue num instante específico,
// junto com o estado anterior, permitindo audit log, replay e UI rica de
// "Maria mudou prioridade de Low para High".
//
// SOLID: SRP — ActivitySnapshot só descreve uma mudança; não persiste nem
// publica eventos.

export interface FieldChange {
  readonly from: unknown;
  readonly to: unknown;
}

export interface IssueDiff {
  readonly fields: Readonly<Record<string, FieldChange>>;
}

export interface ActivitySnapshotProps {
  readonly id: string;
  readonly issueId: string;
  readonly actorId: string;
  readonly action: string;
  readonly before: Readonly<IssueProps> | null;
  readonly after: Readonly<IssueProps>;
  readonly diff: IssueDiff;
  readonly createdAt: Date;
}

const VOLATILE_FIELDS: ReadonlySet<keyof IssueProps> = new Set(["updatedAt"]);

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}

function computeDiff(
  before: IssueProps | null,
  after: IssueProps,
): IssueDiff {
  const fields: Record<string, FieldChange> = {};
  if (!before) {
    fields.created = { from: null, to: after.id };
    return { fields };
  }
  for (const key of Object.keys(after) as Array<keyof IssueProps>) {
    if (VOLATILE_FIELDS.has(key)) continue;
    const fromVal = before[key];
    const toVal = after[key];
    if (!valuesEqual(fromVal, toVal)) {
      fields[key] = { from: fromVal, to: toVal };
    }
  }
  return { fields };
}

export class ActivitySnapshot {
  private constructor(private readonly props: ActivitySnapshotProps) {
    Object.freeze(this);
  }

  static capture(input: {
    id: string;
    actorId: string;
    action: string;
    before: Issue | null;
    after: Issue;
    at: Date;
  }): ActivitySnapshot {
    const beforeJson = input.before ? input.before.toJSON() : null;
    const afterJson = input.after.toJSON();
    const diff = computeDiff(beforeJson, afterJson);
    return new ActivitySnapshot({
      id: input.id,
      issueId: input.after.id,
      actorId: input.actorId,
      action: input.action,
      before: beforeJson,
      after: afterJson,
      diff,
      createdAt: input.at,
    });
  }

  static fromPersistence(props: ActivitySnapshotProps): ActivitySnapshot {
    return new ActivitySnapshot(props);
  }

  get id(): string {
    return this.props.id;
  }
  get issueId(): string {
    return this.props.issueId;
  }
  get actorId(): string {
    return this.props.actorId;
  }
  get action(): string {
    return this.props.action;
  }
  get before(): Readonly<IssueProps> | null {
    return this.props.before;
  }
  get after(): Readonly<IssueProps> {
    return this.props.after;
  }
  get diff(): IssueDiff {
    return this.props.diff;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  isCreation(): boolean {
    return this.props.before === null;
  }

  // Lista os nomes dos campos que mudaram (excluindo o virtual "created").
  changedFields(): string[] {
    const keys = Object.keys(this.props.diff.fields);
    return keys.filter((k) => k !== "created");
  }

  toJSON(): ActivitySnapshotProps {
    return { ...this.props };
  }
}
