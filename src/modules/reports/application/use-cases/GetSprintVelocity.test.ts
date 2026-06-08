import { describe, it, expect } from "vitest";
import { GetSprintVelocity } from "./GetSprintVelocity";
import type { ReportReader } from "../ports/ReportReader";
import type {
  BurndownReport,
  CycleTimeReport,
  SprintVelocity,
  StatusDistribution,
  ThroughputBucket,
} from "../../domain";

class FakeReader implements ReportReader {
  velocity: SprintVelocity | null = null;
  async getProjectThroughput(): Promise<ThroughputBucket[]> {
    return [];
  }
  async getProjectCycleTime(): Promise<CycleTimeReport> {
    return { projectId: "x", sampleSize: 0, avgDays: 0, p50Days: 0, p90Days: 0 };
  }
  async getProjectStatusDistribution(): Promise<StatusDistribution> {
    return {
      projectId: "x",
      counts: { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 },
      total: 0,
    };
  }
  async getSprintVelocity(): Promise<SprintVelocity | null> {
    return this.velocity;
  }
  async getSprintBurndown(): Promise<BurndownReport | null> {
    return null;
  }
}

describe("GetSprintVelocity", () => {
  it("returns velocity when sprint exists", async () => {
    const reader = new FakeReader();
    reader.velocity = {
      sprintId: "spr_001",
      sprintName: "S1",
      committedIssues: 10,
      completedIssues: 7,
    };
    const r = await new GetSprintVelocity(reader).execute({ sprintId: "spr_001" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.committedIssues).toBe(10);
      expect(r.value.completedIssues).toBe(7);
    }
  });

  it("NotFoundError when sprint missing", async () => {
    const reader = new FakeReader();
    const r = await new GetSprintVelocity(reader).execute({ sprintId: "spr_nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });
});
