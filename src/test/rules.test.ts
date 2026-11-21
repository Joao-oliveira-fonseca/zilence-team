import { describe, expect, it } from "vitest";
import { effectiveTaskStatus, eloTier } from "@/lib/constants";
import { translate } from "@/i18n";
import { pt } from "@/i18n/pt";
import { es } from "@/i18n/es";

describe("ZILENCE rules", () => {
  it("defaults the interface to Portuguese text", () => {
    expect(translate("pt", "common.signOut")).toBe("Sair");
  });

  it("has a Spanish translation for every Portuguese key", () => {
    const missing = Object.keys(pt).filter((key) => !(key in es) || es[key as keyof typeof es].trim() === "");
    expect(missing).toEqual([]);
  });

  it("keeps competitive terms in English in both languages", () => {
    expect(translate("pt", "nav.teamHub")).toBe("Team Hub");
    expect(translate("es", "nav.teamHub")).toBe("Team Hub");
  });

  it("treats an unfinished task past its deadline as overdue", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    expect(effectiveTaskStatus({ status: "pending", due_at: "2026-11-20T12:00:00Z" }, now)).toBe("overdue");
    expect(effectiveTaskStatus({ status: "completed", due_at: "2026-11-20T12:00:00Z" }, now)).toBe("completed");
    expect(effectiveTaskStatus({ status: "in_progress", due_at: "2026-11-22T12:00:00Z" }, now)).toBe("in_progress");
  });

  it("reads the tier from an elo such as Diamond II", () => {
    expect(eloTier("Diamond II")).toBe("Diamond");
    expect(eloTier("Grandmaster")).toBe("Grandmaster");
    expect(eloTier(null)).toBeNull();
  });
});

import { categoryAverage, championPoolRating, overallRating } from "@/lib/evaluation";

describe("Evaluation math", () => {
  it("averages a category from its starred criteria only", () => {
    expect(categoryAverage({ "macro.vision": 4, "macro.waves": 5 }, "macro")).toBe(4.5);
  });
  it("Overall Rating is the mean of the five category averages", () => {
    const scores = { "macro.vision": 5, "micro.mechanics": 4, "teamplay.sync": 4, "knowledge.matchups": 4, "mental.discipline": 4 };
    expect(overallRating(scores)).toBe(4.2);
  });
  it("Champion Pool Rating is separate from Overall", () => {
    expect(championPoolRating([5, 4, 3])).toBe(4);
    expect(championPoolRating([])).toBeNull();
  });
});
