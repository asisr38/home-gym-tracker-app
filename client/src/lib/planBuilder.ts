import type { Equipment, ExerciseSet, GoalType, SplitType, WorkoutDay } from "@shared/userData";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const buildSets = (count: number, reps: string): ExerciseSet[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `s-${i + 1}`,
    targetReps: reps,
    actualReps: null,
    weight: null,
    completed: false,
    perfectForm: false,
  }));

// ---------------------------------------------------------------------------
// Set scheme per goal
// ---------------------------------------------------------------------------

type Tier = "compound" | "accessory" | "core";

const SET_SCHEMES: Record<GoalType, Record<Tier, { sets: number; reps: string }>> = {
  strength:    { compound: { sets: 5, reps: "3-5"   }, accessory: { sets: 4, reps: "5-8"   }, core: { sets: 3, reps: "30-45s" } },
  hypertrophy: { compound: { sets: 4, reps: "8-12"  }, accessory: { sets: 3, reps: "10-15" }, core: { sets: 3, reps: "40-60s" } },
  endurance:   { compound: { sets: 3, reps: "12-15" }, accessory: { sets: 3, reps: "15-20" }, core: { sets: 3, reps: "45-60s" } },
  fat_loss:    { compound: { sets: 3, reps: "10-12" }, accessory: { sets: 3, reps: "12-15" }, core: { sets: 3, reps: "45s"    } },
  balanced:    { compound: { sets: 4, reps: "6-10"  }, accessory: { sets: 3, reps: "10-12" }, core: { sets: 3, reps: "45s"    } },
};

// ---------------------------------------------------------------------------
// Exercise option type — ordered by preference (best equipment first)
// ---------------------------------------------------------------------------

type ExerciseOption = {
  name: string;
  requires: Equipment[];
};

type ExerciseSlot = {
  tier: Tier;
  muscleGroup: string;
  options: ExerciseOption[]; // first matching option wins
};

// ---------------------------------------------------------------------------
// Equipment-aware exercise picker
// ---------------------------------------------------------------------------

const pickExercise = (slot: ExerciseSlot, equipment: Equipment[]) =>
  slot.options.find((o) => o.requires.every((r) => equipment.includes(r))) ??
  slot.options[slot.options.length - 1]; // bodyweight fallback

const buildAlternatives = (slot: ExerciseSlot, chosen: ExerciseOption) =>
  slot.options
    .filter((o) => o.name !== chosen.name)
    .map((o) => ({
      id: `ex-${slugify(o.name)}`,
      name: o.name,
      muscleGroup: slot.muscleGroup,
      reason: o.requires.length === 0
        ? "No equipment needed"
        : o.requires.some((r) => !chosen.requires.includes(r))
          ? `Needs ${o.requires.filter((r) => !chosen.requires.includes(r)).join(", ")}`
          : "Alternative",
    }));

// ---------------------------------------------------------------------------
// Day builder
// ---------------------------------------------------------------------------

const buildDay = (
  dayNumber: number,
  id: string,
  title: string,
  dayType: WorkoutDay["dayType"],
  slots: ExerciseSlot[],
  goalType: GoalType,
  equipment: Equipment[],
): WorkoutDay => ({
  id,
  dayNumber,
  title,
  type: "lift",
  dayType,
  completed: false,
  exercises: slots.map((slot, i) => {
    const option = pickExercise(slot, equipment);
    const scheme = SET_SCHEMES[goalType][slot.tier];
    return {
      id: `${id}-e${i + 1}`,
      name: option.name,
      muscleGroup: slot.muscleGroup,
      alternatives: buildAlternatives(slot, option),
      sets: buildSets(scheme.sets, scheme.reps),
    };
  }),
});

const recoveryDay = (dayNumber: number, id: string): WorkoutDay => ({
  id,
  dayNumber,
  title: "Active Recovery",
  type: "recovery",
  dayType: "cardio",
  completed: false,
  exercises: [],
  runTarget: { distance: 2, description: "Easy walk or light jog" },
});

// ---------------------------------------------------------------------------
// Exercise slot libraries
// ---------------------------------------------------------------------------

const PUSH_SLOTS: ExerciseSlot[] = [
  {
    tier: "compound", muscleGroup: "Chest • Triceps • Front Delts",
    options: [
      { name: "Barbell Bench Press",     requires: ["barbell", "bench", "rack"] },
      { name: "Dumbbell Bench Press",    requires: ["dumbbell", "bench"] },
      { name: "Push-ups",                requires: [] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Upper Chest • Shoulders",
    options: [
      { name: "Incline Dumbbell Press",  requires: ["dumbbell", "bench"] },
      { name: "Incline Push-ups",        requires: [] },
    ],
  },
  {
    tier: "compound", muscleGroup: "Shoulders • Triceps",
    options: [
      { name: "Barbell Overhead Press",  requires: ["barbell", "rack"] },
      { name: "Dumbbell Shoulder Press", requires: ["dumbbell"] },
      { name: "Pike Push-ups",           requires: [] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Side Delts",
    options: [
      { name: "Dumbbell Lateral Raise",  requires: ["dumbbell"] },
      { name: "Band Lateral Raise",      requires: ["bands"] },
      { name: "Arm Circles (weighted)",  requires: [] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Triceps",
    options: [
      { name: "Dumbbell Skull Crushers", requires: ["dumbbell", "bench"] },
      { name: "Band Tricep Pushdown",    requires: ["bands"] },
      { name: "Diamond Push-ups",        requires: [] },
    ],
  },
];

const PULL_SLOTS: ExerciseSlot[] = [
  {
    tier: "compound", muscleGroup: "Lats • Upper Back",
    options: [
      { name: "Pull-ups",                requires: ["rack"] },
      { name: "Dumbbell Row",            requires: ["dumbbell"] },
      { name: "Band Pull-Apart Row",     requires: ["bands"] },
    ],
  },
  {
    tier: "compound", muscleGroup: "Upper Back • Rhomboids",
    options: [
      { name: "Barbell Row",             requires: ["barbell"] },
      { name: "Dumbbell Bent-Over Row",  requires: ["dumbbell"] },
      { name: "Resistance Band Row",     requires: ["bands"] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Rear Delts • Upper Back",
    options: [
      { name: "Dumbbell Face Pulls",     requires: ["dumbbell"] },
      { name: "Band Face Pulls",         requires: ["bands"] },
      { name: "Rear Delt Fly",           requires: ["dumbbell"] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Biceps",
    options: [
      { name: "Barbell Curl",            requires: ["barbell"] },
      { name: "Dumbbell Curl",           requires: ["dumbbell"] },
      { name: "Band Curl",               requires: ["bands"] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Biceps • Brachialis",
    options: [
      { name: "Hammer Curl",             requires: ["dumbbell"] },
      { name: "Band Hammer Curl",        requires: ["bands"] },
      { name: "Chin-ups",                requires: ["rack"] },
    ],
  },
];

const LEG_SLOTS: ExerciseSlot[] = [
  {
    tier: "compound", muscleGroup: "Quads • Glutes",
    options: [
      { name: "Barbell Back Squat",      requires: ["barbell", "rack"] },
      { name: "Goblet Squat",            requires: ["dumbbell"] },
      { name: "Bodyweight Squat",        requires: [] },
    ],
  },
  {
    tier: "compound", muscleGroup: "Hamstrings • Glutes",
    options: [
      { name: "Romanian Deadlift",       requires: ["barbell"] },
      { name: "Dumbbell RDL",            requires: ["dumbbell"] },
      { name: "Single-Leg Hip Hinge",    requires: [] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Quads • Glutes",
    options: [
      { name: "Bulgarian Split Squat",   requires: ["dumbbell", "bench"] },
      { name: "Reverse Lunges",          requires: ["dumbbell"] },
      { name: "Walking Lunges",          requires: [] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Hamstrings",
    options: [
      { name: "Dumbbell Leg Curl",       requires: ["dumbbell", "bench"] },
      { name: "Nordic Curl",             requires: [] },
    ],
  },
  {
    tier: "accessory", muscleGroup: "Glutes",
    options: [
      { name: "Hip Thrust",              requires: ["barbell", "bench"] },
      { name: "Dumbbell Hip Thrust",     requires: ["dumbbell", "bench"] },
      { name: "Glute Bridge",            requires: [] },
    ],
  },
  {
    tier: "core", muscleGroup: "Calves",
    options: [
      { name: "Standing Calf Raise",     requires: [] },
    ],
  },
];

const UPPER_PUSH_SLOTS: ExerciseSlot[] = [
  PUSH_SLOTS[0], // Chest compound
  PUSH_SLOTS[1], // Incline
  {
    tier: "accessory", muscleGroup: "Upper Back • Lats",
    options: [
      { name: "Seated Row",              requires: ["bands"] },
      { name: "Dumbbell Row",            requires: ["dumbbell"] },
      { name: "Band Pull-Apart",         requires: ["bands"] },
    ],
  },
  PUSH_SLOTS[2], // Shoulder press
  PUSH_SLOTS[3], // Lateral raise
  PUSH_SLOTS[4], // Triceps
];

const UPPER_PULL_SLOTS: ExerciseSlot[] = [
  PULL_SLOTS[0], // Lat compound
  PULL_SLOTS[1], // Row
  PULL_SLOTS[2], // Face pulls
  PULL_SLOTS[3], // Bicep curl
  {
    tier: "core", muscleGroup: "Chest • Triceps",
    options: [
      { name: "Push-ups",                requires: [] },
    ],
  },
];

const LOWER_QUAD_SLOTS: ExerciseSlot[] = [
  LEG_SLOTS[0], // Squat
  LEG_SLOTS[2], // Split squat / lunges
  LEG_SLOTS[1], // RDL
  LEG_SLOTS[4], // Hip thrust
  LEG_SLOTS[5], // Calf raise
  {
    tier: "core", muscleGroup: "Core",
    options: [
      { name: "Plank",                   requires: [] },
    ],
  },
];

const LOWER_POSTERIOR_SLOTS: ExerciseSlot[] = [
  LEG_SLOTS[1], // RDL
  LEG_SLOTS[0], // Squat (secondary)
  LEG_SLOTS[2], // Split squat
  LEG_SLOTS[3], // Leg curl
  {
    tier: "core", muscleGroup: "Core",
    options: [
      { name: "Dead Bug",                requires: [] },
      { name: "Pallof Press",            requires: ["bands"] },
    ],
  },
];

const FULL_BODY_A_SLOTS: ExerciseSlot[] = [
  LEG_SLOTS[0],  // Squat
  PUSH_SLOTS[0], // Bench
  PULL_SLOTS[0], // Pull-up / Row
  PUSH_SLOTS[2], // Shoulder press
  LEG_SLOTS[5],  // Calf raise
  { tier: "core", muscleGroup: "Core", options: [{ name: "Plank", requires: [] }] },
];

const FULL_BODY_B_SLOTS: ExerciseSlot[] = [
  LEG_SLOTS[1],  // RDL
  PUSH_SLOTS[1], // Incline press
  PULL_SLOTS[1], // Row
  PUSH_SLOTS[3], // Lateral raise
  LEG_SLOTS[4],  // Hip thrust
  { tier: "core", muscleGroup: "Core", options: [{ name: "Dead Bug", requires: [] }] },
];

const FULL_BODY_C_SLOTS: ExerciseSlot[] = [
  LEG_SLOTS[2],  // Split squat
  PUSH_SLOTS[0], // Push
  PULL_SLOTS[2], // Face pulls
  PULL_SLOTS[3], // Curl
  PUSH_SLOTS[4], // Triceps
  { tier: "core", muscleGroup: "Core", options: [{ name: "Mountain Climbers", requires: [] }] },
];

// ---------------------------------------------------------------------------
// Split builders
// ---------------------------------------------------------------------------

const buildUpperLower = (goalType: GoalType, equipment: Equipment[]): WorkoutDay[] => [
  buildDay(1, "day-1", "Upper A — Push Focus",    "push",   UPPER_PUSH_SLOTS,    goalType, equipment),
  buildDay(2, "day-2", "Lower A — Quad Focus",    "legs",   LOWER_QUAD_SLOTS,    goalType, equipment),
  recoveryDay(3, "day-3"),
  buildDay(4, "day-4", "Upper B — Pull Focus",    "pull",   UPPER_PULL_SLOTS,    goalType, equipment),
  buildDay(5, "day-5", "Lower B — Posterior Chain","legs",  LOWER_POSTERIOR_SLOTS, goalType, equipment),
];

const buildPPL3 = (goalType: GoalType, equipment: Equipment[]): WorkoutDay[] => [
  buildDay(1, "day-1", "Push Day",   "push", PUSH_SLOTS, goalType, equipment),
  recoveryDay(2, "day-2"),
  buildDay(3, "day-3", "Pull Day",   "pull", PULL_SLOTS, goalType, equipment),
  recoveryDay(4, "day-4"),
  buildDay(5, "day-5", "Legs Day",   "legs", LEG_SLOTS,  goalType, equipment),
];

const buildPPL6 = (goalType: GoalType, equipment: Equipment[]): WorkoutDay[] => [
  buildDay(1, "day-1", "Push A",     "push", PUSH_SLOTS, goalType, equipment),
  buildDay(2, "day-2", "Pull A",     "pull", PULL_SLOTS, goalType, equipment),
  buildDay(3, "day-3", "Legs A",     "legs", LEG_SLOTS,  goalType, equipment),
  buildDay(4, "day-4", "Push B",     "push", PUSH_SLOTS, goalType, equipment),
  buildDay(5, "day-5", "Pull B",     "pull", PULL_SLOTS, goalType, equipment),
];

const buildFullBody = (goalType: GoalType, equipment: Equipment[]): WorkoutDay[] => [
  buildDay(1, "day-1", "Full Body A", "full", FULL_BODY_A_SLOTS, goalType, equipment),
  recoveryDay(2, "day-2"),
  buildDay(3, "day-3", "Full Body B", "full", FULL_BODY_B_SLOTS, goalType, equipment),
  recoveryDay(4, "day-4"),
  buildDay(5, "day-5", "Full Body C", "full", FULL_BODY_C_SLOTS, goalType, equipment),
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const buildPlan = (
  splitType: SplitType,
  goalType: GoalType,
  equipment: Equipment[],
): WorkoutDay[] => {
  const eq = equipment.includes("bodyweight") ? equipment : ["bodyweight" as Equipment, ...equipment];
  switch (splitType) {
    case "ppl":       return buildPPL3(goalType, eq);
    case "ppl_6day":  return buildPPL6(goalType, eq);
    case "full_body": return buildFullBody(goalType, eq);
    case "upper_lower":
    default:          return buildUpperLower(goalType, eq);
  }
};

/** Human-readable label + description for each split */
export const SPLIT_OPTIONS: Array<{
  value: SplitType;
  label: string;
  description: string;
  frequency: string;
  schedule: string[];
  bestFor: string;
}> = [
  {
    value: "upper_lower",
    label: "Upper / Lower",
    description: "Alternates pushing and pulling muscles with dedicated leg days.",
    frequency: "4 days / week",
    schedule: ["Upper A", "Lower A", "Rest", "Upper B", "Lower B"],
    bestFor: "Strength & balanced muscle",
  },
  {
    value: "ppl",
    label: "Push / Pull / Legs",
    description: "Each session targets one movement pattern for focused volume.",
    frequency: "3 days / week",
    schedule: ["Push", "Rest", "Pull", "Rest", "Legs"],
    bestFor: "Muscle gain & beginners",
  },
  {
    value: "ppl_6day",
    label: "PPL 6-Day",
    description: "High-frequency PPL — each pattern trained twice per week.",
    frequency: "5 days / week",
    schedule: ["Push A", "Pull A", "Legs A", "Push B", "Pull B"],
    bestFor: "Advanced hypertrophy",
  },
  {
    value: "full_body",
    label: "Full Body",
    description: "Every session trains the whole body — great for recovery and frequency.",
    frequency: "3 days / week",
    schedule: ["Full Body A", "Rest", "Full Body B", "Rest", "Full Body C"],
    bestFor: "Fat loss & general fitness",
  },
];
