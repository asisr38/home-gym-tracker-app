import type { WorkoutDay } from "@/lib/store";

const WEEKDAY_TO_PLAN_DAY_NUMBER: Partial<Record<number, number>> = {
  1: 1, // Monday -> Upper A
  2: 2, // Tuesday -> Lower A
  3: 3, // Wednesday -> Rest/Cardio
  4: 4, // Thursday -> Upper B
  5: 5, // Friday -> Lower B
};

export const getPlannedSetsForDay = (day: WorkoutDay) =>
  day.exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);

export const getCompletedSetsForDay = (day: WorkoutDay) =>
  day.exercises.reduce(
    (acc, exercise) => acc + exercise.sets.filter((set) => set.completed).length,
    0,
  );

export const getWeeklyStats = (plan: WorkoutDay[]) => {
  const plannedSets = plan.reduce((acc, day) => acc + getPlannedSetsForDay(day), 0);
  const completedSets = plan.reduce((acc, day) => acc + getCompletedSetsForDay(day), 0);
  return { plannedSets, completedSets };
};

export const estimateDayMinutes = (day: WorkoutDay) => {
  if (day.type === "lift") {
    const sets = getPlannedSetsForDay(day);
    // Assumption: ~2.5 minutes per set including rest + setup.
    return Math.max(20, Math.round(sets * 2.5));
  }

  if (day.runTarget?.distance) {
    // Assumption: ~10 minutes per mile/km for easy pace estimates.
    return Math.max(15, Math.round(day.runTarget.distance * 10));
  }

  return 15;
};

export const getScheduledWorkoutForDate = (
  plan: WorkoutDay[],
  date: Date = new Date(),
) => {
  const dayNumber = WEEKDAY_TO_PLAN_DAY_NUMBER[date.getDay()];
  if (!dayNumber) return null;
  return (
    plan.find((day) => day.dayNumber === dayNumber) ||
    plan[dayNumber - 1] ||
    null
  );
};
