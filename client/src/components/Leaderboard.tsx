import { useState } from "react";
import { useLeaderboard } from "../hooks/useLeaderboard";
import type { Participant, CategoryPicks } from "../types";

function CategoryBreakdown({ categories }: { categories: CategoryPicks[] }) {
  return (
    <div className="breakdown">
      <div className="breakdown-grid">
        {categories.map((cat) => {
          const announced = cat.winner !== null;
          return (
            <div
              key={cat.category}
              className={`category-card ${announced ? "announced" : ""}`}
            >
              <div className="cat-header">
                <span className="cat-name">{cat.category}</span>
                <span
                  className={`cat-points ${
                    announced
                      ? cat.pointsEarned > 0
                        ? "earned"
                        : "zero"
                      : "pending"
                  }`}
                >
                  {announced ? `${cat.pointsEarned}/${cat.maxPoints}` : "TBD"}
                </span>
              </div>
              {announced && (
                <div className="winner-row">
                  <span>{"\u2605"} {cat.winner}</span>
                </div>
              )}
              {cat.picks.map((pick) => (
                <div
                  key={pick.nominee}
                  className={`pick-row ${
                    pick.nominee === cat.winner ? "is-winner" : ""
                  }`}
                >
                  <span>{pick.nominee}</span>
                  <span className="pick-pts">{pick.points} pts</span>
                </div>
              ))}
              {cat.picks.length === 0 && !announced && (
                <div className="pick-row">
                  <span style={{ fontStyle: "italic" }}>No picks</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardRow({
  participant,
  rank,
  expanded,
  onToggle,
}: {
  participant: Participant;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div
        className={`leaderboard-row ${expanded ? "expanded" : ""} rank-${rank}`}
        onClick={onToggle}
      >
        <span className="rank">#{rank}</span>
        <span className="name">{participant.name}</span>
        <span className="score">{participant.totalScore}</span>
        <span className="max-possible">{participant.maxPossible}</span>
      </div>
      {expanded && (
        <CategoryBreakdown categories={participant.categories} />
      )}
    </>
  );
}

export default function Leaderboard() {
  const { data, error, loading } = useLeaderboard();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <div>Loading leaderboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error">
        <p>Failed to load leaderboard</p>
        <p style={{ fontSize: "0.85rem", marginTop: 8 }}>{error}</p>
      </div>
    );
  }

  const progress =
    data.totalCategories > 0
      ? (data.categoriesAnnounced / data.totalCategories) * 100
      : 0;

  return (
    <div className="container">
      <div className="header">
        <h1>Oscars Pool 2026</h1>
        <p className="subtitle">
          {data.participants.length} participants &middot;{" "}
          {data.totalCategories} categories
        </p>
      </div>

      <div className="progress-bar-container">
        <div className="progress-label">
          <span>Categories Announced</span>
          <span>
            {data.categoriesAnnounced} / {data.totalCategories}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="leaderboard">
        <div className="leaderboard-header">
          <span>#</span>
          <span>Name</span>
          <span style={{ textAlign: "right" }}>Score</span>
          <span style={{ textAlign: "right" }}>Max</span>
        </div>

        {data.participants.map((p, i) => (
          <LeaderboardRow
            key={p.email || p.name}
            participant={p}
            rank={i + 1}
            expanded={expandedIdx === i}
            onToggle={() =>
              setExpandedIdx(expandedIdx === i ? null : i)
            }
          />
        ))}
      </div>

      <div className="refresh-indicator">
        <span className="refresh-dot" />
        <span>Live — updates every 15s</span>
      </div>
    </div>
  );
}
