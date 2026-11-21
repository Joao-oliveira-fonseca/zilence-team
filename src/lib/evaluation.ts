export const CATEGORIES = {
  macro: ["vision", "objectives", "rotations", "decisions", "waves", "reading"],
  micro: ["mechanics", "combos", "positioning", "execution", "precision", "consistency"],
  teamplay: ["communication", "sync", "teamfights", "coordination", "synergy", "teamwork"],
  knowledge: ["matchups", "champions", "compositions", "powerspikes", "winconditions", "strategy"],
  mental: ["consistency", "discipline", "adaptability", "emotional", "recovery", "posture"],
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
export type Scores = Record<string, number>;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Mean of the 1–5 star scores given in one category (unscored criteria are ignored). */
export function categoryAverage(scores: Scores, category: Category): number | null {
  return avg(
    CATEGORIES[category]
      .map((c) => scores[`${category}.${c}`])
      .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5),
  );
}

/** Overall Rating = mean of the five category averages, rounded to 2 decimals. */
export function overallRating(scores: Scores): number | null {
  const a = avg(CATEGORY_KEYS.map((c) => categoryAverage(scores, c)).filter((v): v is number => v !== null));
  return a === null ? null : Math.round(a * 100) / 100;
}

/** Champion Pool Rating, computed separately from the Overall Rating. */
export function championPoolRating(ratings: number[]): number | null {
  const a = avg(ratings);
  return a === null ? null : Math.round(a * 100) / 100;
}

export function formatRating(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toFixed(1);
}
