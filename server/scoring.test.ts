import { describe, it, expect } from "vitest";
import { computeLeaderboard } from "./scoring.js";
import type { NomineeColumn } from "./types.js";

const columns: NomineeColumn[] = [
  { category: "Best Actor", maxPoints: 90, nominee: "Actor A", columnIndex: 3 },
  { category: "Best Actor", maxPoints: 90, nominee: "Actor B", columnIndex: 4 },
  { category: "Best Picture", maxPoints: 120, nominee: "Film A", columnIndex: 5 },
  { category: "Best Picture", maxPoints: 120, nominee: "Film B", columnIndex: 6 },
];

describe("computeLeaderboard", () => {
  it("scores 0 when no winners are set", () => {
    const rows = [["ts", "a@b.com", "Alice", "90 points", "", "120 points", ""]];
    const result = computeLeaderboard(rows, columns, {});
    expect(result[0].totalScore).toBe(0);
    expect(result[0].maxPossible).toBe(210); // 90 + 120
  });

  it("awards points when participant picked the winner", () => {
    const rows = [["ts", "a@b.com", "Alice", "90 points", "", "120 points", ""]];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor A" });
    expect(result[0].totalScore).toBe(90);
  });

  it("awards 0 when participant picked wrong nominee", () => {
    const rows = [["ts", "a@b.com", "Alice", "90 points", "", "120 points", ""]];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor B" });
    expect(result[0].totalScore).toBe(0);
  });

  it("awards partial points for split votes", () => {
    const rows = [["ts", "a@b.com", "Alice", "60 points", "30 points", "", ""]];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor A" });
    expect(result[0].totalScore).toBe(60);
  });

  it("awards the other side of a split when they win", () => {
    const rows = [["ts", "a@b.com", "Alice", "60 points", "30 points", "", ""]];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor B" });
    expect(result[0].totalScore).toBe(30);
  });

  it("computes maxPossible correctly with some winners set", () => {
    const rows = [["ts", "a@b.com", "Alice", "60 points", "30 points", "120 points", ""]];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor A" });
    // Earned 60 from Best Actor + 120 max still possible from Best Picture
    expect(result[0].maxPossible).toBe(60 + 120);
  });

  it("sorts participants by score descending", () => {
    const rows = [
      ["ts", "a@b.com", "Alice", "30 points", "", "120 points", ""],
      ["ts", "b@b.com", "Bob", "90 points", "", "", "120 points"],
    ];
    const result = computeLeaderboard(rows, columns, {
      "Best Actor": "Actor A",
      "Best Picture": "Film A",
    });
    expect(result[0].name).toBe("Alice"); // 30 + 120 = 150
    expect(result[0].totalScore).toBe(150);
    expect(result[1].name).toBe("Bob"); // 90 + 0 = 90
    expect(result[1].totalScore).toBe(90);
  });

  it("breaks ties alphabetically by name", () => {
    const rows = [
      ["ts", "z@b.com", "Zara", "90 points", "", "", ""],
      ["ts", "a@b.com", "Alice", "90 points", "", "", ""],
    ];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor A" });
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Zara");
  });

  it("includes category breakdown per participant", () => {
    const rows = [["ts", "a@b.com", "Alice", "60 points", "30 points", "120 points", ""]];
    const result = computeLeaderboard(rows, columns, { "Best Actor": "Actor A" });
    const bestActor = result[0].categories.find((c) => c.category === "Best Actor")!;
    expect(bestActor.winner).toBe("Actor A");
    expect(bestActor.pointsEarned).toBe(60);
    expect(bestActor.picks).toEqual([
      { nominee: "Actor A", points: 60 },
      { nominee: "Actor B", points: 30 },
    ]);
  });
});
