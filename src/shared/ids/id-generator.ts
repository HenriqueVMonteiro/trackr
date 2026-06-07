import { nanoid } from "nanoid";

// SOLID: DIP — domain/application dependem de IdGenerator (port).
// Permite IDs determinísticos em testes (TestIdGenerator).

export interface IdGenerator {
  generate(prefix: string): string;
}

export class NanoidGenerator implements IdGenerator {
  constructor(private readonly size: number = 21) {}

  generate(prefix: string): string {
    return `${prefix}_${nanoid(this.size)}`;
  }
}

// Test double com IDs sequenciais previsíveis.
export class SequentialIdGenerator implements IdGenerator {
  private counters = new Map<string, number>();

  generate(prefix: string): string {
    const next = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, next);
    return `${prefix}_${String(next).padStart(4, "0")}`;
  }
}

export const ID_PREFIXES = {
  workspace: "wsp",
  project: "prj",
  issue: "iss",
  label: "lbl",
  comment: "cmt",
  activity: "act",
  outbox: "out",
  webhook: "whk",
  delivery: "del",
  attempt: "att",
  notification: "ntf",
  sprint: "spr",
  timeEntry: "tme",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];
