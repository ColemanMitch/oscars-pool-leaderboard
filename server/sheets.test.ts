import { describe, it, expect } from "vitest";
import { parsePoints, parseHeader, parseTsv, getCategories, getParticipantPicks } from "./sheets.js";
import type { NomineeColumn } from "./types.js";

describe("parsePoints", () => {
  it("parses single point value", () => {
    expect(parsePoints("60 points")).toBe(60);
  });

  it("sums comma-separated point values", () => {
    expect(parsePoints("60 points, 30 points")).toBe(90);
  });

  it("handles three values", () => {
    expect(parsePoints("40 points, 30 points, 20 points")).toBe(90);
  });

  it("returns 0 for empty string", () => {
    expect(parsePoints("")).toBe(0);
  });

  it("returns 0 for whitespace", () => {
    expect(parsePoints("   ")).toBe(0);
  });

  it("returns 0 for null/undefined", () => {
    expect(parsePoints(null as unknown as string)).toBe(0);
    expect(parsePoints(undefined as unknown as string)).toBe(0);
  });
});

describe("parseHeader", () => {
  it("parses standard header with nominee and film", () => {
    const result = parseHeader(
      'Best Actor (90 points possible) [Timothée Chalamet, "Marty Supreme"]',
      3
    );
    expect(result).toEqual({
      category: "Best Actor",
      maxPoints: 90,
      nominee: 'Timothée Chalamet, "Marty Supreme"',
      columnIndex: 3,
    });
  });

  it("parses header with film title only", () => {
    const result = parseHeader(
      'Best Picture (120 points possible) ["Sinners"]',
      30
    );
    expect(result).toEqual({
      category: "Best Picture",
      maxPoints: 120,
      nominee: '"Sinners"',
      columnIndex: 30,
    });
  });

  it("parses header with different point values", () => {
    const result = parseHeader(
      'Best Animated Short Film (10 points possible) ["Butterfly"]',
      100
    );
    expect(result).toEqual({
      category: "Best Animated Short Film",
      maxPoints: 10,
      nominee: '"Butterfly"',
      columnIndex: 100,
    });
  });

  it("returns null for non-category headers", () => {
    expect(parseHeader("Timestamp", 0)).toBeNull();
    expect(parseHeader("Email Address", 1)).toBeNull();
    expect(parseHeader("Your Name", 2)).toBeNull();
  });
});

describe("parseTsv", () => {
  it("splits rows by newline and columns by tab", () => {
    const result = parseTsv("a\tb\tc\n1\t2\t3");
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("skips empty lines", () => {
    const result = parseTsv("a\tb\n\n1\t2\n");
    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("getCategories", () => {
  it("groups columns by category", () => {
    const columns: NomineeColumn[] = [
      { category: "Best Actor", maxPoints: 90, nominee: "Actor A", columnIndex: 3 },
      { category: "Best Actor", maxPoints: 90, nominee: "Actor B", columnIndex: 4 },
      { category: "Best Picture", maxPoints: 120, nominee: "Film A", columnIndex: 5 },
    ];
    const result = getCategories(columns);
    expect(result.get("Best Actor")).toEqual({
      maxPoints: 90,
      nominees: ["Actor A", "Actor B"],
    });
    expect(result.get("Best Picture")).toEqual({
      maxPoints: 120,
      nominees: ["Film A"],
    });
  });
});

describe("getParticipantPicks", () => {
  const columns: NomineeColumn[] = [
    { category: "Best Actor", maxPoints: 90, nominee: "Actor A", columnIndex: 3 },
    { category: "Best Actor", maxPoints: 90, nominee: "Actor B", columnIndex: 4 },
    { category: "Best Picture", maxPoints: 120, nominee: "Film A", columnIndex: 5 },
  ];

  it("extracts name, email, and point allocations", () => {
    const row = ["ts", "test@email.com", "Test User", "60 points", "30 points", "120 points"];
    const result = getParticipantPicks(row, columns);
    expect(result.name).toBe("Test User");
    expect(result.email).toBe("test@email.com");
    expect(result.picks.get("Best Actor")?.get("Actor A")).toBe(60);
    expect(result.picks.get("Best Actor")?.get("Actor B")).toBe(30);
    expect(result.picks.get("Best Picture")?.get("Film A")).toBe(120);
  });

  it("skips nominees with 0 points", () => {
    const row = ["ts", "test@email.com", "Test User", "90 points", "", ""];
    const result = getParticipantPicks(row, columns);
    expect(result.picks.get("Best Actor")?.get("Actor A")).toBe(90);
    expect(result.picks.get("Best Actor")?.has("Actor B")).toBe(false);
    expect(result.picks.get("Best Picture")?.size).toBe(0);
  });

  it("handles split votes with comma-separated values", () => {
    const row = ["ts", "a@b.com", "User", "60 points, 30 points", "", "80 points, 40 points"];
    const result = getParticipantPicks(row, columns);
    expect(result.picks.get("Best Actor")?.get("Actor A")).toBe(90);
    expect(result.picks.get("Best Picture")?.get("Film A")).toBe(120);
  });
});
