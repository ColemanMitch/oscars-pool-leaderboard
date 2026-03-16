import type { Participant, CategoryPicks } from "./types.js";
import type { NomineeColumn } from "./types.js";
import { getCategories, getParticipantPicks } from "./sheets.js";

export function computeLeaderboard(
  rows: string[][],
  columns: NomineeColumn[],
  winners: Record<string, string[]>
): Participant[] {
  const categoryMap = getCategories(columns);
  const participants: Participant[] = [];

  for (const row of rows) {
    const { name, email, picks } = getParticipantPicks(row, columns);
    if (!name || name === "Unknown") continue;

    let totalScore = 0;
    let maxPossible = 0;
    const categories: CategoryPicks[] = [];

    for (const [categoryName, categoryInfo] of categoryMap) {
      const categoryPicks = picks.get(categoryName) || new Map();
      const categoryWinners = winners[categoryName] || null;

      let pointsEarned = 0;
      if (categoryWinners) {
        for (const winner of categoryWinners) {
          if (categoryPicks.has(winner)) {
            pointsEarned += categoryPicks.get(winner)!;
          }
        }
      }

      totalScore += pointsEarned;

      // Max possible = points already earned + max points from unannounced categories
      if (categoryWinners) {
        maxPossible += pointsEarned;
      } else {
        maxPossible += categoryInfo.maxPoints;
      }

      const picksList = Array.from(categoryPicks.entries())
        .map(([nominee, points]) => ({ nominee, points }))
        .sort((a, b) => b.points - a.points);

      categories.push({
        category: categoryName,
        maxPoints: categoryInfo.maxPoints,
        picks: picksList,
        winner: categoryWinners,
        pointsEarned,
      });
    }

    participants.push({ name, email, totalScore, maxPossible, categories });
  }

  // Sort by total score desc, then by name asc
  participants.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.name.localeCompare(b.name);
  });

  return participants;
}
