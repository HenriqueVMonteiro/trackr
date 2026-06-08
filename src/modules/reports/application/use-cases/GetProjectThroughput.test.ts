import { describe, it, expect } from "vitest";
import { GetProjectThroughput } from "./GetProjectThroughput";
import type { ReportReader } from "../ports/ReportReader";
import type {
  CycleTimeReport,
  StatusDistribution,
  ThroughputBucket,
} from "../../domain";

class FakeReader implements ReportReader {
  throughput: ThroughputBucket[] = [];
  calls = 0;
  async getProjectThroughput(): Promise<ThroughputBucket[]> {
    this.calls++;
    return this.throughput;
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
}

describe("GetProjectThroughput", () => {
  const from = new Date("2026-04-01T00:00:00Z");
  const to = new Date("2026-06-01T00:00:00Z");

  it("delegates to reader and returns buckets", async () => {
    const reader = new FakeReader();
    reader.throughput = [
      { weekStartingAt: new Date("2026-04-06"), closedCount: 3, canceledCount: 0 },
      { weekStartingAt: new Date("2026-04-13"), closedCount: 5, canceledCount: 1 },
    ];
    const r = await new GetProjectThroughput(reader).execute({
      projectId: "prj_001",
      from,
      to,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(2);
      expect(r.value[0]?.closedCount).toBe(3);
    }
    expect(reader.calls).toBe(1);
  });

  it("ValidationError when to <= from", async () => {
    const r = await new GetProjectThroughput(new FakeReader()).execute({
      projectId: "prj_001",
      from: to,
      to: from,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("ValidationError when range exceeds 52 weeks", async () => {
    const reader = new FakeReader();
    const tooFar = new Date(from.getTime() + 53 * 7 * 24 * 60 * 60 * 1000);
    const r = await new GetProjectThroughput(reader).execute({
      projectId: "prj_001",
      from,
      to: tooFar,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("returns empty array when reader has no data", async () => {
    const reader = new FakeReader();
    const r = await new GetProjectThroughput(reader).execute({
      projectId: "prj_001",
      from,
      to,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(0);
  });
});
