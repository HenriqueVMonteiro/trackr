import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "@/shared";
import { ValidationError, type DomainError } from "@/shared";
import { FrozenClock, SequentialIdGenerator } from "@/shared";
import { ImportIssues } from "./ImportIssues";
import { IssueTemplate } from "../templates/IssueTemplate";
import type {
  IssueCreator,
  CreateIssueInput,
  CreateIssueResult,
} from "../ports/IssueCreator";

// FakeIssueCreator: registra cada chamada e pode falhar em títulos específicos.
class FakeIssueCreator implements IssueCreator {
  calls: CreateIssueInput[] = [];
  private counter = 0;

  constructor(private readonly failTitles: ReadonlySet<string> = new Set()) {}

  async createIssue(
    input: CreateIssueInput,
  ): Promise<Result<CreateIssueResult, DomainError>> {
    this.calls.push(input);
    if (this.failTitles.has(input.title)) {
      return err(new ValidationError("title rejected", { field: "title" }));
    }
    this.counter++;
    return ok({ issueId: `iss_${String(this.counter).padStart(4, "0")}` });
  }
}

describe("ImportIssues", () => {
  const projectId = "prj_0001";
  const setup = (creator: FakeIssueCreator) =>
    new ImportIssues({
      issueCreator: creator,
      clock: new FrozenClock("2026-06-07T10:00:00Z"),
      ids: new SequentialIdGenerator(),
    });

  it("creates N issues from a CSV via the IssueCreator", async () => {
    const creator = new FakeIssueCreator();
    const useCase = setup(creator);
    const raw = ["title,status", "First,open", "Second,open", "Third,open"].join("\n");

    const r = await useCase.execute({ projectId, format: "csv", raw });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.created).toBe(3);
    expect(r.value.failed).toBe(0);
    expect(r.value.errors).toEqual([]);
    expect(creator.calls).toHaveLength(3);
    expect(creator.calls[0]?.projectId).toBe(projectId);
    expect(creator.calls[0]?.title).toBe("First");
  });

  it("reports failures returned by the IssueCreator", async () => {
    const creator = new FakeIssueCreator(new Set(["Second"]));
    const useCase = setup(creator);
    const raw = ["title", "First", "Second", "Third"].join("\n");

    const r = await useCase.execute({ projectId, format: "csv", raw });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.created).toBe(2);
    expect(r.value.failed).toBe(1);
    expect(r.value.errors).toHaveLength(1);
    expect(r.value.errors[0]).toContain("Second");
  });

  it("fills missing fields from the template before creating", async () => {
    const creator = new FakeIssueCreator();
    const useCase = setup(creator);
    const template = new IssueTemplate("bug", { status: "open", priority: "high" });
    const raw = ["title", "Crash on save"].join("\n");

    const r = await useCase.execute({ projectId, format: "csv", raw, template });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(creator.calls[0]?.status).toBe("open");
    expect(creator.calls[0]?.priority).toBe("high");
  });

  it("returns the parse error without creating any issue", async () => {
    const creator = new FakeIssueCreator();
    const useCase = setup(creator);

    const r = await useCase.execute({ projectId, format: "json", raw: "not json" });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBeInstanceOf(ValidationError);
    expect(creator.calls).toHaveLength(0);
  });
});
