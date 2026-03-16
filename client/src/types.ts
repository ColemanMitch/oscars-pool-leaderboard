export interface ParticipantPick {
  nominee: string;
  points: number;
}

export interface CategoryPicks {
  category: string;
  maxPoints: number;
  picks: ParticipantPick[];
  winner: string[] | null;
  pointsEarned: number;
}

export interface Participant {
  name: string;
  email: string;
  totalScore: number;
  maxPossible: number;
  categories: CategoryPicks[];
}

export interface LeaderboardData {
  participants: Participant[];
  winners: Record<string, string[]>;
  categoriesAnnounced: number;
  totalCategories: number;
  lastUpdated: string;
}

export interface Category {
  name: string;
  maxPoints: number;
  nominees: string[];
  winner: string[] | null;
}
