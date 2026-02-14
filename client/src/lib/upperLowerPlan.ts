import type { ExerciseAlternative, ExerciseSet, WorkoutDay } from "@shared/userData";

const UPPER_LOWER_PLAN = {
  meta: {
    planName: "Upper / Lower 4-Day Split",
    frequency: 4,
    goal: ["strength", "muscle tone", "fat loss", "heart health"],
    createdFor: "Planet Fitness + Home",
    version: "1.0.0",
  },
  schedule: {
    monday: "upperA",
    tuesday: "lowerA",
    wednesday: "rest",
    thursday: "upperB",
    friday: "lowerB",
  },
  workouts: {
    upperA: {
      id: "upperA",
      name: "Upper A (Push Emphasis)",
      type: "upper",
      exercises: [
        {
          id: "chest_press",
          name: "Chest Press",
          muscleGroup: ["chest", "triceps", "front_delts"],
          sets: 4,
          reps: "6-8",
          alternatives: [
            { name: "Dumbbell Bench Press", reason: "machine busy" },
            { name: "Push-ups", reason: "home workout" },
          ],
        },
        {
          id: "incline_press",
          name: "Incline Press",
          muscleGroup: ["upper_chest", "shoulders"],
          sets: 3,
          reps: "8-10",
          alternatives: [
            { name: "Incline Dumbbell Press", reason: "no machine" },
          ],
        },
        {
          id: "seated_row",
          name: "Seated Row",
          muscleGroup: ["upper_back", "lats"],
          sets: 3,
          reps: "8-12",
          alternatives: [
            { name: "One-arm Dumbbell Row", reason: "home workout" },
          ],
        },
        {
          id: "shoulder_press",
          name: "Shoulder Press",
          muscleGroup: ["shoulders", "triceps"],
          sets: 3,
          reps: "6-8",
          alternatives: [
            { name: "Arnold Press", reason: "variety" },
          ],
        },
        {
          id: "lateral_raise",
          name: "Lateral Raises",
          muscleGroup: ["side_delts"],
          sets: 3,
          reps: "12-20",
          alternatives: [
            { name: "Cable Lateral Raises", reason: "better isolation" },
          ],
        },
        {
          id: "tricep_pushdown",
          name: "Cable Tricep Pushdown",
          muscleGroup: ["triceps"],
          sets: 3,
          reps: "10-15",
          alternatives: [
            { name: "Overhead Dumbbell Extension", reason: "no cable" },
          ],
        },
      ],
    },
    lowerA: {
      id: "lowerA",
      name: "Lower A (Quad Focus)",
      type: "lower",
      exercises: [
        {
          id: "leg_press",
          name: "Leg Press",
          muscleGroup: ["quads", "glutes"],
          sets: 4,
          reps: "6-10",
          alternatives: [
            { name: "Goblet Squat", reason: "home workout" },
          ],
        },
        {
          id: "walking_lunges",
          name: "Walking Lunges",
          muscleGroup: ["quads", "glutes"],
          sets: 3,
          reps: "8-12 per leg",
          alternatives: [
            { name: "Split Squats", reason: "limited space" },
          ],
        },
        {
          id: "leg_curl",
          name: "Seated Leg Curl",
          muscleGroup: ["hamstrings"],
          sets: 3,
          reps: "8-12",
          alternatives: [
            { name: "Dumbbell RDL", reason: "home workout" },
          ],
        },
        {
          id: "hip_thrust",
          name: "Hip Thrust",
          muscleGroup: ["glutes"],
          sets: 3,
          reps: "10-12",
          alternatives: [
            { name: "Glute Bridge", reason: "no bench" },
          ],
        },
        {
          id: "calf_raise",
          name: "Standing Calf Raise",
          muscleGroup: ["calves"],
          sets: 3,
          reps: "12-20",
          alternatives: [
            { name: "Seated Calf Raise", reason: "machine available" },
          ],
        },
        {
          id: "plank",
          name: "Plank",
          muscleGroup: ["core"],
          sets: 3,
          reps: "30-60 seconds",
          alternatives: [
            { name: "Dead Bug", reason: "lower back friendly" },
          ],
        },
      ],
    },
    upperB: {
      id: "upperB",
      name: "Upper B (Pull Emphasis)",
      type: "upper",
      exercises: [
        {
          id: "lat_pulldown",
          name: "Lat Pulldown",
          muscleGroup: ["lats"],
          sets: 4,
          reps: "6-10",
          alternatives: [
            { name: "Assisted Pull-up", reason: "strength progression" },
          ],
        },
        {
          id: "db_row",
          name: "Dumbbell Row",
          muscleGroup: ["upper_back"],
          sets: 3,
          reps: "8-12",
          alternatives: [
            { name: "Seated Row Machine", reason: "machine preference" },
          ],
        },
        {
          id: "face_pull",
          name: "Face Pulls",
          muscleGroup: ["rear_delts", "upper_back"],
          sets: 3,
          reps: "12-15",
          alternatives: [
            { name: "Rear Delt Fly", reason: "no cable" },
          ],
        },
        {
          id: "bicep_curl",
          name: "Dumbbell Curl",
          muscleGroup: ["biceps"],
          sets: 3,
          reps: "8-12",
          alternatives: [
            { name: "EZ Bar Curl", reason: "machine available" },
          ],
        },
        {
          id: "pushups",
          name: "Push-ups",
          muscleGroup: ["chest", "triceps"],
          sets: 2,
          reps: "10-15",
          alternatives: [
            { name: "Chest Press Machine", reason: "fatigue management" },
          ],
        },
      ],
    },
    lowerB: {
      id: "lowerB",
      name: "Lower B (Posterior Chain)",
      type: "lower",
      exercises: [
        {
          id: "romanian_deadlift",
          name: "Romanian Deadlift",
          muscleGroup: ["hamstrings", "glutes"],
          sets: 4,
          reps: "6-8",
          alternatives: [
            { name: "Smith Machine RDL", reason: "stability" },
          ],
        },
        {
          id: "hack_squat",
          name: "Hack Squat / Leg Press (High Feet)",
          muscleGroup: ["quads", "glutes"],
          sets: 3,
          reps: "10-12",
          alternatives: [
            { name: "Goblet Squat", reason: "home workout" },
          ],
        },
        {
          id: "bulgarian_split_squat",
          name: "Bulgarian Split Squat",
          muscleGroup: ["quads", "glutes"],
          sets: 3,
          reps: "8-10 per leg",
          alternatives: [
            { name: "Reverse Lunges", reason: "balance issues" },
          ],
        },
        {
          id: "leg_curl",
          name: "Lying Leg Curl",
          muscleGroup: ["hamstrings"],
          sets: 3,
          reps: "10-15",
          alternatives: [
            { name: "Stability Ball Curl", reason: "home workout" },
          ],
        },
        {
          id: "pallof_press",
          name: "Pallof Press",
          muscleGroup: ["core"],
          sets: 3,
          reps: "10-12 per side",
          alternatives: [
            { name: "Suitcase Carry", reason: "functional core" },
          ],
        },
      ],
    },
  },
} as const;

type PlanWorkout = (typeof UPPER_LOWER_PLAN.workouts)[keyof typeof UPPER_LOWER_PLAN.workouts];

type PlanExercise = PlanWorkout["exercises"][number];

type ScheduleKey = keyof typeof UPPER_LOWER_PLAN.schedule;

const scheduleOrder: ScheduleKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toExerciseId = (name: string) => `ex-${slugify(name)}`;

const titleCase = (value: string) =>
  value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatMuscleGroup = (groups?: readonly string[]) =>
  groups && groups.length ? groups.map(titleCase).join(" • ") : undefined;

const buildSets = (count: number, targetReps: string): ExerciseSet[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `s-${i + 1}`,
    targetReps,
    actualReps: null,
    weight: null,
    completed: false,
    perfectForm: false,
  }));

const buildAlternatives = (exercise: PlanExercise) => {
  const muscleGroup = formatMuscleGroup(exercise.muscleGroup);
  const alternatives: ExerciseAlternative[] = (exercise.alternatives || []).map((option) => ({
    id: toExerciseId(option.name),
    name: option.name,
    reason: option.reason,
    muscleGroup,
  }));
  return alternatives.length ? alternatives : undefined;
};

const resolveDayType = (workout: PlanWorkout): WorkoutDay["dayType"] => {
  if (workout.type === "lower") return "legs";
  if (workout.type === "upper") {
    const normalized = workout.name.toLowerCase();
    if (normalized.includes("push")) return "push";
    if (normalized.includes("pull")) return "pull";
  }
  return "full";
};

export const buildUpperLowerPlan = (): WorkoutDay[] => {
  let dayNumber = 1;
  const days: WorkoutDay[] = [];

  scheduleOrder.forEach((key) => {
    const scheduleEntry = UPPER_LOWER_PLAN.schedule[key];
    if (!scheduleEntry) return;
    if (scheduleEntry === "rest") {
      days.push({
        id: `day-${dayNumber}`,
        dayNumber,
        title: "Rest",
        type: "recovery",
        dayType: "cardio",
        completed: false,
        exercises: [],
      });
      dayNumber += 1;
      return;
    }
    const workout = UPPER_LOWER_PLAN.workouts[scheduleEntry];
    if (!workout) return;

    days.push({
      id: `day-${dayNumber}`,
      dayNumber,
      title: workout.name,
      type: "lift",
      dayType: resolveDayType(workout),
      completed: false,
      exercises: workout.exercises.map((exercise, index) => ({
        id: exercise.id || `d${dayNumber}-e${index + 1}`,
        name: exercise.name,
        muscleGroup: formatMuscleGroup(exercise.muscleGroup),
        alternatives: buildAlternatives(exercise),
        sets: buildSets(exercise.sets, exercise.reps),
      })),
    });
    dayNumber += 1;
  });

  return days;
};
