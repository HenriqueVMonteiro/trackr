import type { ActivitySnapshot } from "../../domain/ActivitySnapshot";

// SOLID: DIP — use cases dependem desta port; DrizzleActivityRepository é
// injetado no bootstrap. Activity persiste Memento snapshots em ordem.
//
// SOLID: ISP — read e write separados não trariam ganho real aqui (mesmo
// caller usa os dois), então mantemos uma interface coesa.

export interface ActivityRepository {
  save(snapshot: ActivitySnapshot): Promise<void>;
  listByIssue(issueId: string, limit?: number): Promise<ActivitySnapshot[]>;
}
