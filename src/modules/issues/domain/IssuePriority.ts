export type IssuePriority = "none" | "low" | "medium" | "high" | "urgent";

export const ISSUE_PRIORITIES: readonly IssuePriority[] = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
] as const;

const RANK: Record<IssuePriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function comparePriority(a: IssuePriority, b: IssuePriority): number {
  return RANK[a] - RANK[b];
}
