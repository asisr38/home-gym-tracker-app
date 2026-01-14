import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import {
  userDataSchema,
  type UserData,
  type UserProfile,
  type WorkoutDay,
  type ExerciseSet,
  type GoalType,
  type Equipment,
} from "@shared/userData";

export type {
  UnitSystem,
  DayType,
  ExerciseSet,
  Exercise,
  WorkoutDay,
  UserProfile,
  GoalType,
  Equipment,
} from "@shared/userData";

export type LoggedSet = {
  id: string;
  dayId: string;
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  timestamp: number;
};

interface AppState {
  profile: UserProfile;
  history: WorkoutDay[]; // Flattened list of completed sessions
  currentPlan: WorkoutDay[]; // The 7-day template
  setLogs: LoggedSet[];

  // Actions
  updateProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile) => void;
  logSet: (dayId: string, exerciseId: string, setId: string, data: Partial<ExerciseSet>) => void;
  logWorkoutSet: (dayId: string, exerciseId: string, data: { weight: number | null; reps: number | null }) => void;
  completeWorkout: (dayId: string, notes?: string, runData?: any, calvesStretched?: boolean) => void;

  // Plan Customization Actions
  addExerciseToDay: (dayId: string, exercise: Exercise) => void;
  removeExerciseFromDay: (dayId: string, exerciseId: string) => void;
  updateExerciseTargets: (dayId: string, exerciseId: string, targets: Partial<ExerciseSet>) => void;

  resetPlan: () => void; // Regenerate the week
  importData: (jsonData: string) => boolean;
  exportData: () => string;
  applyUserData: (data: UserData) => void;
  getUserData: () => UserData;
  resetUserData: () => void;
}

let activeUserKey = "anonymous";

const buildStorageKey = (name: string) => `${name}:${activeUserKey}`;

export const setActiveUserId = (uid?: string | null) => {
  activeUserKey = uid ? uid : "anonymous";
};

const userStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(buildStorageKey(name)),
  setItem: (name, value) => localStorage.setItem(buildStorageKey(name), value),
  removeItem: (name) => localStorage.removeItem(buildStorageKey(name)),
};

const MAX_HISTORY_DAYS = 30;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const pruneHistory = (history: WorkoutDay[]) => {
  const cutoff = Date.now() - MAX_HISTORY_DAYS * MS_IN_DAY;
  return history.filter((day) => {
    if (!day.dateCompleted) return true;
    const timestamp = Date.parse(day.dateCompleted);
    if (Number.isNaN(timestamp)) return true;
    return timestamp >= cutoff;
  });
};

const ensureEquipment = (equipment?: Equipment[]) => {
  const list = equipment && equipment.length ? [...equipment] : ["bodyweight"];
  if (!list.includes("bodyweight")) {
    list.push("bodyweight");
  }
  return list;
};

const inferGoalType = (goal: string): GoalType => {
  const normalized = goal.toLowerCase();
  if (normalized.includes("strength")) return "strength";
  if (normalized.includes("endurance")) return "endurance";
  if (normalized.includes("fat") || normalized.includes("cut")) return "fat_loss";
  if (normalized.includes("muscle") || normalized.includes("hypertrophy")) {
    return "hypertrophy";
  }
  return "balanced";
};

const getSetScheme = (goalType: GoalType, tier: "compound" | "accessory" | "core") => {
  const table: Record<
    GoalType,
    Record<"compound" | "accessory" | "core", { sets: number; reps: string }>
  > = {
    strength: {
      compound: { sets: 4, reps: "4-6" },
      accessory: { sets: 3, reps: "6-8" },
      core: { sets: 3, reps: "30-45s" },
    },
    hypertrophy: {
      compound: { sets: 4, reps: "8-12" },
      accessory: { sets: 3, reps: "10-15" },
      core: { sets: 3, reps: "40-60s" },
    },
    endurance: {
      compound: { sets: 3, reps: "12-15" },
      accessory: { sets: 3, reps: "15-20" },
      core: { sets: 3, reps: "45-60s" },
    },
    fat_loss: {
      compound: { sets: 3, reps: "10-12" },
      accessory: { sets: 3, reps: "12-15" },
      core: { sets: 3, reps: "45s" },
    },
    balanced: {
      compound: { sets: 4, reps: "6-10" },
      accessory: { sets: 3, reps: "10-12" },
      core: { sets: 3, reps: "45s" },
    },
  };
  return table[goalType][tier];
};

const buildSets = (count: number, targetReps: string): ExerciseSet[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `s-${i + 1}`,
    targetReps,
    actualReps: null,
    weight: null,
    completed: false,
    perfectForm: false,
  }));

type ExerciseOption = {
  name: string;
  requires: Equipment[];
};

type ExerciseSlot = {
  tier: "compound" | "accessory" | "core";
  options: ExerciseOption[];
};

const pickExercise = (slot: ExerciseSlot, equipment: Equipment[]) =>
  slot.options.find((option) =>
    option.requires.every((item) => equipment.includes(item)),
  ) || slot.options[slot.options.length - 1];

const buildDay = (
  dayNumber: number,
  title: string,
  slots: ExerciseSlot[],
  goalType: GoalType,
  equipment: Equipment[],
): WorkoutDay => ({
  id: `day-${dayNumber}`,
  dayNumber,
  title,
  type: "lift",
  completed: false,
  exercises: slots.map((slot, index) => {
    const option = pickExercise(slot, equipment);
    const scheme = getSetScheme(goalType, slot.tier);
    return {
      id: `d${dayNumber}-e${index + 1}`,
      name: option.name,
      sets: buildSets(scheme.sets, scheme.reps),
    };
  }),
});

const roundDistance = (value: number) => Math.round(value * 10) / 10;

const buildPlan = (profile: UserProfile): WorkoutDay[] => {
  const goalType = profile.goalType || inferGoalType(profile.goal);
  const equipment = ensureEquipment(profile.equipment);

  const runBase = Math.max(profile.dailyRunTarget || 2, 0.5);
  const runMultiplier =
    goalType === "endurance" ? 1.3 : goalType === "fat_loss" ? 1.15 : goalType === "strength" ? 0.85 : 1;
  const recoveryDistance = roundDistance(runBase * runMultiplier);
  const longRunDistance = roundDistance(runBase * (goalType === "endurance" ? 2.5 : 2));

  return [
    buildDay(
      1,
      "Push Day",
      [
        {
          tier: "compound",
          options: [
            { name: "Barbell Bench Press", requires: ["barbell", "bench"] },
            { name: "DB Flat Bench Press", requires: ["dumbbell", "bench"] },
            { name: "Band Chest Press", requires: ["bands"] },
            { name: "Pushups", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "Incline DB Press", requires: ["dumbbell", "bench"] },
            { name: "Feet-Elevated Pushups", requires: ["bodyweight", "bench"] },
            { name: "Band Incline Press", requires: ["bands"] },
            { name: "Pushups", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "compound",
          options: [
            { name: "Barbell Overhead Press", requires: ["barbell"] },
            { name: "DB Overhead Press", requires: ["dumbbell"] },
            { name: "Kettlebell Press", requires: ["kettlebell"] },
            { name: "Pike Pushups", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "EZ Skullcrushers", requires: ["barbell", "bench"] },
            { name: "DB Skullcrushers", requires: ["dumbbell", "bench"] },
            { name: "Band Triceps Pressdown", requires: ["bands"] },
            { name: "Bench Dips", requires: ["bench", "bodyweight"] },
            { name: "Diamond Pushups", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "DB Chest Fly", requires: ["dumbbell", "bench"] },
            { name: "Band Pushups", requires: ["bands"] },
            { name: "Decline Pushups", requires: ["bodyweight", "bench"] },
            { name: "Pushups", requires: ["bodyweight"] },
          ],
        },
      ],
      goalType,
      equipment,
    ),
    buildDay(
      2,
      "Leg Day",
      [
        {
          tier: "compound",
          options: [
            { name: "Barbell RDL", requires: ["barbell"] },
            { name: "DB RDL", requires: ["dumbbell"] },
            { name: "KB RDL", requires: ["kettlebell"] },
            { name: "Band Good Morning", requires: ["bands"] },
            { name: "Single-Leg RDL", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "compound",
          options: [
            { name: "Front Squat", requires: ["barbell"] },
            { name: "Goblet Squats", requires: ["dumbbell"] },
            { name: "Kettlebell Goblet Squat", requires: ["kettlebell"] },
            { name: "Band Squat", requires: ["bands"] },
            { name: "Bodyweight Squats", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "DB Walking Lunges", requires: ["dumbbell"] },
            { name: "Walking Lunges", requires: ["bodyweight"] },
            { name: "Split Squats", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "Weighted Calf Raises", requires: ["dumbbell"] },
            { name: "Barbell Calf Raises", requires: ["barbell"] },
            { name: "Single-Leg Calf Raises", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "Hip Thrust", requires: ["barbell", "bench"] },
            { name: "Band Glute Bridge", requires: ["bands"] },
            { name: "Glute Bridge", requires: ["bodyweight"] },
          ],
        },
      ],
      goalType,
      equipment,
    ),
    buildDay(
      3,
      "Pull Day",
      [
        {
          tier: "compound",
          options: [
            { name: "Barbell Bent-Over Row", requires: ["barbell"] },
            { name: "Single-Arm DB Row", requires: ["dumbbell", "bench"] },
            { name: "Band Row", requires: ["bands"] },
            { name: "Inverted Row", requires: ["rack", "bodyweight"] },
            { name: "Back Extensions", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "compound",
          options: [
            { name: "Pullups", requires: ["rack", "bodyweight"] },
            { name: "Band Lat Pulldown", requires: ["bands"] },
            { name: "DB Pullovers", requires: ["dumbbell"] },
            { name: "Prone YTWs", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "EZ Bar Curls", requires: ["barbell"] },
            { name: "DB Curls", requires: ["dumbbell"] },
            { name: "Band Curls", requires: ["bands"] },
            { name: "Reverse Snow Angels", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "DB Rear Delt Fly", requires: ["dumbbell"] },
            { name: "Band Face Pull", requires: ["bands"] },
            { name: "Reverse Snow Angels", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "core",
          options: [
            { name: "Farmer Carry", requires: ["dumbbell"] },
            { name: "Suitcase Carry", requires: ["kettlebell"] },
            { name: "Superman Hold", requires: ["bodyweight"] },
          ],
        },
      ],
      goalType,
      equipment,
    ),
    buildDay(
      4,
      "Shoulders & Abs",
      [
        {
          tier: "compound",
          options: [
            { name: "Barbell Overhead Press", requires: ["barbell"] },
            { name: "DB Overhead Press", requires: ["dumbbell"] },
            { name: "Kettlebell Press", requires: ["kettlebell"] },
            { name: "Pike Pushups", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "DB Lateral Raises", requires: ["dumbbell"] },
            { name: "Band Lateral Raises", requires: ["bands"] },
            { name: "Y-Raises", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "EZ Upright Rows", requires: ["barbell"] },
            { name: "DB Upright Rows", requires: ["dumbbell"] },
            { name: "Band Upright Row", requires: ["bands"] },
            { name: "Prone W Raises", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "core",
          options: [
            { name: "Russian Twists", requires: ["bodyweight"] },
            { name: "DB Russian Twists", requires: ["dumbbell"] },
            { name: "Bicycle Crunches", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "core",
          options: [
            { name: "Lying Leg Raises", requires: ["bodyweight"] },
            { name: "Dead Bug", requires: ["bodyweight"] },
          ],
        },
      ],
      goalType,
      equipment,
    ),
    buildDay(
      5,
      "Full Body Metabolic",
      [
        {
          tier: "compound",
          options: [
            { name: "Barbell Thrusters", requires: ["barbell"] },
            { name: "DB Thrusters", requires: ["dumbbell"] },
            { name: "Kettlebell Thrusters", requires: ["kettlebell"] },
            { name: "Bodyweight Squat + Press", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "Barbell Floor Wipers", requires: ["barbell"] },
            { name: "Band Dead Bug", requires: ["bands"] },
            { name: "Mountain Climbers", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "Renegade Rows", requires: ["dumbbell"] },
            { name: "Band Rows", requires: ["bands"] },
            { name: "Plank Rows", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "accessory",
          options: [
            { name: "Decline Pushups", requires: ["bodyweight", "bench"] },
            { name: "Band Pushups", requires: ["bands"] },
            { name: "Pushups", requires: ["bodyweight"] },
          ],
        },
        {
          tier: "core",
          options: [
            { name: "Plank", requires: ["bodyweight"] },
            { name: "Side Plank", requires: ["bodyweight"] },
          ],
        },
      ],
      goalType,
      equipment,
    ),
    {
      id: "day-6",
      dayNumber: 6,
      title: "Active Recovery Run",
      type: "run",
      completed: false,
      exercises: [],
      runTarget: {
        distance: recoveryDistance,
        description: "Easy pace, keep HR low.",
      },
    },
    {
      id: "day-7",
      dayNumber: 7,
      title: "Long Run / Rest",
      type: "recovery",
      completed: false,
      exercises: [],
      runTarget: {
        distance: longRunDistance,
        description: "Longer distance or complete rest.",
      },
    },
  ];
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  height: 0,
  weight: 0,
  goal: "Build Muscle & Endurance",
  goalType: "balanced",
  units: "imperial",
  dailyRunTarget: 2,
  nutritionTarget: "",
  onboardingCompleted: false,
  startOfWeek: 1,
  equipment: ["bodyweight"],
};

const normalizeProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  goalType: profile.goalType || inferGoalType(profile.goal),
  equipment: ensureEquipment(profile.equipment),
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: { ...DEFAULT_PROFILE },
      history: [],
      currentPlan: buildPlan(DEFAULT_PROFILE),
      setLogs: [],

      updateProfile: (profile) =>
        set((state) => ({
          profile: normalizeProfile({ ...state.profile, ...profile }),
        })),

      completeOnboarding: (profile) => {
        const normalizedProfile = normalizeProfile({ ...profile, onboardingCompleted: true });
        set({
          profile: normalizedProfile,
          currentPlan: buildPlan(normalizedProfile),
        });
      },

      logSet: (dayId, exerciseId, setId, data) => set((state) => {
        const newPlan = state.currentPlan.map(day => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            exercises: day.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              return {
                ...ex,
                sets: ex.sets.map(s => {
                  if (s.id !== setId) return s;
                  return { ...s, ...data };
                })
              };
            })
          };
        });
        const updatedDay = newPlan.find((day) => day.id === dayId);
        const updatedHistory = updatedDay?.completed
          ? state.history.map((entry) =>
            entry.id === updatedDay.id &&
              entry.dateCompleted === updatedDay.dateCompleted
              ? updatedDay
              : entry,
          )
          : state.history;
        return { currentPlan: newPlan, history: updatedHistory };
      }),

      logWorkoutSet: (dayId, exerciseId, data) =>
        set((state) => {
          const timestamp = Date.now();
          const newLog: LoggedSet = {
            id: `${dayId}-${exerciseId}-${timestamp}`,
            dayId,
            exerciseId,
            weight: data.weight ?? null,
            reps: data.reps ?? null,
            timestamp,
          };

          const newPlan = state.currentPlan.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              exercises: day.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;
                const nextIndex = exercise.sets.findIndex((set) => !set.completed);
                if (nextIndex === -1) return exercise;
                const nextSets = exercise.sets.map((set, index) =>
                  index === nextIndex
                    ? {
                      ...set,
                      weight: data.weight ?? set.weight,
                      actualReps: data.reps ?? set.actualReps,
                      completed: true,
                    }
                    : set,
                );
                return { ...exercise, sets: nextSets };
              }),
            };
          });

          const updatedDay = newPlan.find((day) => day.id === dayId);
          const updatedHistory = updatedDay?.completed
            ? state.history.map((entry) =>
              entry.id === updatedDay.id &&
                entry.dateCompleted === updatedDay.dateCompleted
                ? updatedDay
                : entry,
            )
            : state.history;

          return {
            setLogs: [...state.setLogs, newLog],
            currentPlan: newPlan,
            history: updatedHistory,
          };
        }),

      completeWorkout: (dayId, notes, runData, calvesStretched) => set((state) => {
        const day = state.currentPlan.find(d => d.id === dayId);
        if (!day) return {};
        const dateCompleted = day.dateCompleted || new Date().toISOString();
        const completedDay = {
          ...day,
          completed: true,
          dateCompleted,
          notes,
          runActual: runData,
          calvesStretched
        };

        const existingIndex = state.history.findIndex(
          (entry) =>
            entry.id === completedDay.id &&
            entry.dateCompleted === completedDay.dateCompleted,
        );
        const updatedHistory =
          existingIndex >= 0
            ? state.history.map((entry, index) =>
              index === existingIndex ? completedDay : entry,
            )
            : [...state.history, completedDay];

        return {
          history: pruneHistory(updatedHistory),
          currentPlan: state.currentPlan.map(d => d.id === dayId ? completedDay : d),
        };
      }),

      addExerciseToDay: (dayId, exercise) => set((state) => ({
        currentPlan: state.currentPlan.map((day) => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            exercises: [...day.exercises, exercise]
          };
        })
      })),

      removeExerciseFromDay: (dayId, exerciseId) => set((state) => ({
        currentPlan: state.currentPlan.map((day) => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            exercises: day.exercises.filter(ex => ex.id !== exerciseId)
          };
        })
      })),

      updateExerciseTargets: (dayId, exerciseId, targets) => set((state) => ({
        currentPlan: state.currentPlan.map((day) => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            exercises: day.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              return {
                ...ex,
                sets: ex.sets.map(s => ({
                  ...s,
                  targetReps: targets.targetReps ?? s.targetReps,
                  // We could add more target updates here if needed
                }))
              };
            })
          };
        })
      })),

      resetPlan: () => {
        const normalizedProfile = normalizeProfile(get().profile);
        set({ currentPlan: buildPlan(normalizedProfile) });
      },

      exportData: () => JSON.stringify(get().getUserData()),

      importData: (json) => {
        try {
          const data = userDataSchema.parse(JSON.parse(json));
          const normalizedProfile = normalizeProfile(data.profile);
          set({
            profile: normalizedProfile,
            history: pruneHistory(data.history),
            currentPlan: data.currentPlan?.length ? data.currentPlan : buildPlan(normalizedProfile),
          });
          return true;
        } catch (e) {
          return false;
        }
      },

      applyUserData: (data) =>
        set(() => {
          const normalizedProfile = normalizeProfile(data.profile);
          return {
            profile: normalizedProfile,
            history: pruneHistory(data.history),
            currentPlan: data.currentPlan?.length ? data.currentPlan : buildPlan(normalizedProfile),
          };
        }),

      getUserData: () => ({
        profile: get().profile,
        history: pruneHistory(get().history),
        currentPlan: get().currentPlan,
      }),

      resetUserData: () => {
        set({
          profile: { ...DEFAULT_PROFILE },
          history: [],
          currentPlan: buildPlan(DEFAULT_PROFILE),
          setLogs: [],
        });
      },
    }),
    {
      name: 'iron-stride-storage',
      storage: createJSONStorage(() => userStorage),
      version: 2,
      migrate: (persistedState) => {
        const wrapped = persistedState as { state?: AppState } | AppState;
        const state = ("state" in wrapped ? wrapped.state : wrapped) || {};
        const normalizedProfile = normalizeProfile({
          ...DEFAULT_PROFILE,
          ...(state.profile || {}),
        });
        return {
          ...state,
          profile: normalizedProfile,
          history: pruneHistory(state.history || []),
          currentPlan: state.currentPlan?.length ? state.currentPlan : buildPlan(normalizedProfile),
          setLogs: state.setLogs || [],
        } as AppState;
      },
    }
  )
);

export const rehydrateStore = () => useStore.persist.rehydrate();
