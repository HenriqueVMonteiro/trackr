import { describe, it, expect } from "vitest";
import { NanoidGenerator, SequentialIdGenerator, ID_PREFIXES } from "./id-generator";

describe("NanoidGenerator", () => {
  it("returns prefixed ids", () => {
    const gen = new NanoidGenerator();
    const id = gen.generate(ID_PREFIXES.issue);
    expect(id.startsWith("iss_")).toBe(true);
  });

  it("returns unique ids on subsequent calls", () => {
    const gen = new NanoidGenerator();
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(gen.generate("test"));
    }
    expect(seen.size).toBe(100);
  });

  it("respects the configured nanoid size", () => {
    const gen = new NanoidGenerator(8);
    const id = gen.generate("x");
    // "x_" + 8 chars
    expect(id.length).toBe(10);
  });
});

describe("SequentialIdGenerator", () => {
  it("produces sequential ids per prefix", () => {
    const gen = new SequentialIdGenerator();
    expect(gen.generate("iss")).toBe("iss_0001");
    expect(gen.generate("iss")).toBe("iss_0002");
    expect(gen.generate("wsp")).toBe("wsp_0001");
    expect(gen.generate("iss")).toBe("iss_0003");
  });
});
