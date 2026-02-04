import { z } from "zod";

export const unitSystemSchema = z.enum(["imperial", "metric"]);
export const dayTypeSchema = z.enum(["lift", "run", "recovery"]);
export const goalTypeSchema = z.enum([
  "strength",
  "hypertrophy",
  "endurance",
  "fat_loss",
  "balanced",
]);
export const equipmentSchema = z.enum([
  "bodyweight",
  "dumbbell",
  "barbell",
  "bench",
  "rack",
  "bands",
  "kettlebell",
]);

export const exerciseSetSchema = z.object({
  id: z.string(),
  targetReps: z.string(),
  actualReps: z.number().nullable(),
  weight: z.number().nullable(),
  completed: z.boolean(),
  perfectForm: z.boolean(),
});

export const exerciseAlternativeSchema = z.object({
  id: z.string(),
  name: z.string(),
  reason: z.string().optional(),
  muscleGroup: z.string().optional(),
});

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroup: z.string().optional(),
  sets: z.array(exerciseSetSchema),
  alternatives: z.array(exerciseAlternativeSchema).optional(),
  primary: z
    .object({
      id: z.string(),
      name: z.string(),
      muscleGroup: z.string().optional(),
    })
    .optional(),
  swapReason: z.string().optional(),
  notes: z.string().optional(),
  restTimerSeconds: z.number().optional(),
  videoUrl: z.string().optional(),
});

export const workoutDaySchema = z.object({
  id: z.string(),
  dayNumber: z.number(),
  title: z.string(),
  type: dayTypeSchema,
  dayType: z.enum(["push", "pull", "legs", "cardio", "full"]).optional(),
  exercises: z.array(exerciseSchema),
  runTarget: z
    .object({
      distance: z.number(),
      description: z.string(),
    })
    .optional(),
  completed: z.boolean(),
  dateCompleted: z.string().optional(),
  notes: z.string().optional(),
  runActual: z
    .object({
      distance: z.number(),
      timeSeconds: z.number(),
    })
    .optional(),
  calvesStretched: z.boolean().optional(),
});

export const userProfileSchema = z.object({
  name: z.string(),
  height: z.number(),
  weight: z.number(),
  goal: z.string(),
  goalType: goalTypeSchema.default("balanced"),
  units: unitSystemSchema,
  dailyRunTarget: z.number(),
  nutritionTarget: z.string(),
  onboardingCompleted: z.boolean(),
  startOfWeek: z.number(),
  equipment: z.array(equipmentSchema).default(["bodyweight"]),
});

export const userDataSchema = z.object({
  schemaVersion: z.number().optional(),
  profile: userProfileSchema,
  history: z.array(workoutDaySchema),
  currentPlan: z.array(workoutDaySchema),
  updatedAt: z.number().optional(),
});

export type UnitSystem = z.infer<typeof unitSystemSchema>;
export type DayType = z.infer<typeof dayTypeSchema>;
export type ExerciseSet = z.infer<typeof exerciseSetSchema>;
export type ExerciseAlternative = z.infer<typeof exerciseAlternativeSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkoutDay = z.infer<typeof workoutDaySchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserData = z.infer<typeof userDataSchema>;
export type GoalType = z.infer<typeof goalTypeSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
