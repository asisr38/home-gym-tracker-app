import { startOfWeek, subWeeks } from "date-fns";
import type { WorkoutDay } from "@/lib/store";

export type ExerciseWeekBest = {
  weight: number;
  reps: number | null;
  date: string;
};

const pickBetterSet = (
  current: ExerciseWeekBest | null,
  candidate: ExerciseWeekBest,
) => {
  if (!current) return candidate;
  if (candidate.weight > current.weight) return candidate;
  if (candidate.weight < current.weight) return current;

  const currentReps = current.reps ?? -1;
  const candidateReps = candidate.reps ?? -1;
  return candidateReps > currentReps ? candidate : current;
};

const parseTargetReps = (value?: string) => {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const normalizeWeekStartsOn = (value?: number) => {
  if (typeof value !== "number") return 1;
  return Math.min(6, Math.max(0, value));
};

const getPreviousWeekWindow = (weekStartsOn?: number, now: Date = new Date()) => {
  const safeWeekStart = normalizeWeekStartsOn(weekStartsOn);
  const currentWeekStart = startOfWeek(now, { weekStartsOn: safeWeekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
  const previousWeekStart = subWeeks(currentWeekStart, 1);
  return {
    start: previousWeekStart.getTime(),
    end: currentWeekStart.getTime(),
  };
};

export const getLastWeekBestForExercise = (
  history: WorkoutDay[],
  exerciseName: string,
  weekStartsOn?: number,
): ExerciseWeekBest | null => {
  if (!exerciseName) return null;

  const { start, end } = getPreviousWeekWindow(weekStartsOn);
  let best: ExerciseWeekBest | null = null;

  history.forEach((day) => {
    if (!day.dateCompleted) return;
    const timestamp = Date.parse(day.dateCompleted);
    if (Number.isNaN(timestamp) || timestamp < start || timestamp >= end) return;

    const exercise = day.exercises.find((item) => item.name === exerciseName);
    if (!exercise) return;

    exercise.sets.forEach((set) => {
      if (!set.completed || set.weight === null || set.weight === undefined) return;
      const reps = set.actualReps ?? parseTargetReps(set.targetReps);

      best = pickBetterSet(best, {
        weight: set.weight,
        reps,
        date: day.dateCompleted as string,
      });
    });
  });

  return best;
};

export const getBestSetForExercise = (
  history: WorkoutDay[],
  exerciseName: string,
): ExerciseWeekBest | null => {
  if (!exerciseName) return null;

  let best: ExerciseWeekBest | null = null;

  history.forEach((day) => {
    if (!day.dateCompleted) return;

    const exercise = day.exercises.find((item) => item.name === exerciseName);
    if (!exercise) return;

    exercise.sets.forEach((set) => {
      if (!set.completed || set.weight === null || set.weight === undefined) return;

      const reps = set.actualReps ?? parseTargetReps(set.targetReps);
      best = pickBetterSet(best, {
        weight: set.weight,
        reps,
        date: day.dateCompleted as string,
      });
    });
  });

  return best;
};
