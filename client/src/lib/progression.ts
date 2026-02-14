import { startOfWeek, subWeeks } from "date-fns";
import type { WorkoutDay } from "@/lib/store";

export type ExerciseWeekBest = {
  weight: number;
  reps: number | null;
  date: string;
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

      if (!best) {
        best = { weight: set.weight, reps, date: day.dateCompleted as string };
        return;
      }

      if (set.weight > best.weight) {
        best = { weight: set.weight, reps, date: day.dateCompleted as string };
        return;
      }

      if (set.weight === best.weight) {
        const bestReps = best.reps ?? -1;
        const currentReps = reps ?? -1;
        if (currentReps > bestReps) {
          best = { weight: set.weight, reps, date: day.dateCompleted as string };
        }
      }
    });
  });

  return best;
};
