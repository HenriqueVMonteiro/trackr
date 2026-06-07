import { describe, it, expect } from "vitest";
import { ok, err, isOk, isErr, map, flatMap, mapErr, unwrap, unwrapOr } from "./result";

describe("Result", () => {
  describe("constructors", () => {
    it("ok wraps a value as Ok", () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });

    it("err wraps an error as Err", () => {
      const r = err("oops");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("oops");
    });
  });

  describe("guards", () => {
    it("isOk discriminates Ok", () => {
      expect(isOk(ok(1))).toBe(true);
      expect(isOk(err("e"))).toBe(false);
    });

    it("isErr discriminates Err", () => {
      expect(isErr(err("e"))).toBe(true);
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe("map", () => {
    it("applies fn on Ok", () => {
      expect(map(ok(2), (x) => x * 2)).toEqual(ok(4));
    });

    it("passes through Err untouched", () => {
      expect(map(err("e") as ReturnType<typeof err<string>>, (x: number) => x * 2)).toEqual(
        err("e"),
      );
    });
  });

  describe("flatMap", () => {
    it("chains Ok results", () => {
      expect(flatMap(ok(2), (x) => ok(x + 1))).toEqual(ok(3));
    });

    it("propagates inner Err", () => {
      expect(flatMap(ok(2), () => err("inner"))).toEqual(err("inner"));
    });

    it("short-circuits on outer Err", () => {
      expect(flatMap(err("outer"), () => ok(1))).toEqual(err("outer"));
    });
  });

  describe("mapErr", () => {
    it("transforms the error of an Err", () => {
      expect(mapErr(err("low"), (s) => s.toUpperCase())).toEqual(err("LOW"));
    });

    it("passes through Ok untouched", () => {
      expect(mapErr(ok(1), (s: string) => s.toUpperCase())).toEqual(ok(1));
    });
  });

  describe("unwrapOr", () => {
    it("returns value on Ok", () => {
      expect(unwrapOr(ok(1), 0)).toBe(1);
    });

    it("returns default on Err", () => {
      expect(unwrapOr(err("e"), 0)).toBe(0);
    });
  });

  describe("unwrap", () => {
    it("returns value on Ok", () => {
      expect(unwrap(ok(1))).toBe(1);
    });

    it("throws on Err", () => {
      expect(() => unwrap(err("e"))).toThrowError(/unwrap\(\) called on Err/);
    });
  });
});
