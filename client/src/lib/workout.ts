import type { WorkoutDay } from "@/lib/store";

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
