import { describe, it, expect } from "vitest";
import { CreateLabel } from "./CreateLabel";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { LabelRepository } from "../ports/LabelRepository";
import type { Label } from "../../domain";

class FakeRepo implements LabelRepository {
  saved: Label[] = [];
  existing: Label | null = null;
  async save(l: Label): Promise<void> {
    this.saved.push(l);
  }
  async findById(): Promise<Label | null> {
    return null;
  }
  async findByProjectAndName(): Promise<Label | null> {
    return this.existing;
  }
  async listByProject(): Promise<Label[]> {
    return [];
  }
  async delete(): Promise<void> {}
}

describe("CreateLabel", () => {
  const actor = "00000000-0000-0000-0000-000000000050";

  const setup = () => {
    const repo = new FakeRepo();
    const events = new InMemoryEventBus();
    const useCase = new CreateLabel({
      repo,
      clock: new FrozenClock("2026-06-07T12:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, events, useCase };
  };

  it("creates a label", async () => {
    const { useCase, repo } = setup();
    const r = await useCase.execute({
      actorId: actor,
      projectId: "prj_001",
      name: "bug",
      color: "#ff0000",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("bug");
      expect(r.value.color).toBe("#ff0000");
    }
    expect(repo.saved).toHaveLength(1);
  });

  it("ValidationError on invalid color", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({
      actorId: actor,
      projectId: "prj_001",
      name: "bug",
      color: "red",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("ConflictError when name already taken", async () => {
    const { useCase, repo } = setup();
    // populate the existing label
    const first = await useCase.execute({
      actorId: actor,
      projectId: "prj_001",
      name: "bug",
      color: "#ff0000",
    });
    if (first.ok) repo.existing = first.value;
    const second = await useCase.execute({
      actorId: actor,
      projectId: "prj_001",
      name: "bug",
      color: "#00ff00",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("conflict");
  });

  it("publishes label.created event", async () => {
    const { useCase, events } = setup();
    const seen: unknown[] = [];
    events.subscribe("label.created", async (e) => {
      seen.push(e);
    });
    await useCase.execute({
      actorId: actor,
      projectId: "prj_001",
      name: "bug",
      color: "#ff0000",
    });
    expect(seen).toHaveLength(1);
  });
});
