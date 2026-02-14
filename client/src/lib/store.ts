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
  type Exercise,
  type ExerciseSet,
  type DayType,
  type GoalType,
  type Equipment,
} from "@shared/userData";
import { buildUpperLowerPlan } from "@/lib/upperLowerPlan";

export type {
  UnitSystem,
  DayType,
  ExerciseSet,
  ExerciseAlternative,
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
  exerciseName: string;
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
  undoCompleteWorkout: (dayId: string, dateCompleted?: string) => void;
  updateWorkoutNotes: (dayId: string, notes: string) => void;
  updateRunDraft: (dayId: string, runData: { distance?: number | null; timeSeconds?: number | null }) => void;
  updateExerciseNotes: (dayId: string, exerciseId: string, notes: string) => void;
  swapExercise: (dayId: string, exerciseId: string, next: { id: string; name: string; muscleGroup?: string; reason?: string }) => void;

  // Plan Customization Actions
  addExerciseToDay: (dayId: string, exercise: Exercise) => void;
  removeExerciseFromDay: (dayId: string, exerciseId: string) => void;
  updateExerciseTargets: (dayId: string, exerciseId: string, targets: Partial<ExerciseSet>) => void;

  resetPlan: () => void; // Regenerate the week
  restorePlan: (plan: WorkoutDay[]) => void;
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
  const list: Equipment[] = equipment && equipment.length ? [...equipment] : ["bodyweight"];
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

const inferDayType = (title: string, type: DayType): "push" | "pull" | "legs" | "cardio" | "full" => {
  const normalized = title.toLowerCase();
  if (normalized.includes("push")) return "push";
  if (normalized.includes("pull")) return "pull";
  if (normalized.includes("leg")) return "legs";
  if (type !== "lift") return "cardio";
  if (normalized.includes("full")) return "full";
  if (normalized.includes("shoulder")) return "full";
  return "full";
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
  muscleGroup: string;
  options: ExerciseOption[];
};

const pickExercise = (slot: ExerciseSlot, equipment: Equipment[]) =>
  slot.options.find((option) =>
    option.requires.every((item) => equipment.includes(item)),
  ) || slot.options[slot.options.length - 1];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toExerciseId = (name: string) => `ex-${slugify(name)}`;

const equipmentReasonMap: Record<Equipment, string> = {
  bodyweight: "No equipment",
  dumbbell: "No dumbbells",
  barbell: "No barbell",
  bench: "No bench",
  rack: "No rack",
  bands: "No bands",
  kettlebell: "No kettlebell",
};

const buildAlternativeReason = (primary: ExerciseOption, alternative: ExerciseOption) => {
  const missing = primary.requires.find((req) => !alternative.requires.includes(req));
  return missing ? equipmentReasonMap[missing] : "Busy gym";
};

const buildAlternatives = (slot: ExerciseSlot, primary: ExerciseOption) =>
  slot.options
    .filter((option) => option.name !== primary.name)
    .map((option) => ({
      id: toExerciseId(option.name),
      name: option.name,
      reason: buildAlternativeReason(primary, option),
      muscleGroup: slot.muscleGroup,
    }));

const buildDay = (
  dayNumber: number,
  title: string,
  dayType: "push" | "pull" | "legs" | "cardio" | "full",
  slots: ExerciseSlot[],
  goalType: GoalType,
  equipment: Equipment[],
): WorkoutDay => ({
  id: `day-${dayNumber}`,
  dayNumber,
  title,
  type: "lift",
  dayType,
  completed: false,
  exercises: slots.map((slot, index) => {
    const option = pickExercise(slot, equipment);
    const scheme = getSetScheme(goalType, slot.tier);
    const alternatives = buildAlternatives(slot, option);
    return {
      id: `d${dayNumber}-e${index + 1}`,
      name: option.name,
      muscleGroup: slot.muscleGroup,
      alternatives: alternatives.length ? alternatives : undefined,
      sets: buildSets(scheme.sets, scheme.reps),
    };
  }),
});

const roundDistance = (value: number) => Math.round(value * 10) / 10;

const buildPlan = (_profile: UserProfile): WorkoutDay[] => buildUpperLowerPlan();

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

const normalizeDayData = (day: WorkoutDay): WorkoutDay => ({
  ...day,
  dayType: day.dayType ?? inferDayType(day.title, day.type),
});

const LEGACY_DEFAULT_DAY_TITLES = new Set([
  "Push Day",
  "Leg Day",
  "Pull Day",
  "Shoulders & Abs",
  "Full Body Metabolic",
  "Active Recovery Run",
  "Long Run / Rest",
]);

const looksLikeLegacyDefaultPlan = (plan?: WorkoutDay[]) =>
  (plan || []).some((day) => LEGACY_DEFAULT_DAY_TITLES.has(day.title));

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
          const day = state.currentPlan.find((entry) => entry.id === dayId);
          const exercise = day?.exercises.find((entry) => entry.id === exerciseId);
          const newLog: LoggedSet = {
            id: `${dayId}-${exerciseId}-${timestamp}`,
            dayId,
            exerciseId,
            exerciseName: exercise?.name ?? "Exercise",
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
          notes: notes ?? day.notes,
          runActual: runData ?? day.runActual,
          calvesStretched: calvesStretched ?? day.calvesStretched
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

      undoCompleteWorkout: (dayId, dateCompleted) => set((state) => {
        const nextHistory = dateCompleted
          ? state.history.filter((entry) => !(entry.id === dayId && entry.dateCompleted === dateCompleted))
          : state.history.filter((entry, index) => {
              if (entry.id !== dayId) return true;
              const isLastMatch =
                index ===
                state.history
                  .map((item, idx) => ({ item, idx }))
                  .filter((record) => record.item.id === dayId)
                  .slice(-1)[0]?.idx;
              return !isLastMatch;
            });

        return {
          history: nextHistory,
          currentPlan: state.currentPlan.map((day) =>
            day.id === dayId
              ? { ...day, completed: false, dateCompleted: undefined }
              : day
          ),
        };
      }),

      updateWorkoutNotes: (dayId, notes) =>
        set((state) => ({
          currentPlan: state.currentPlan.map((day) =>
            day.id === dayId ? { ...day, notes } : day,
          ),
        })),

      updateRunDraft: (dayId, runData) =>
        set((state) => ({
          currentPlan: state.currentPlan.map((day) => {
            if (day.id !== dayId) return day;
            const nextDistance =
              runData.distance !== undefined ? runData.distance ?? 0 : day.runActual?.distance;
            const nextTime =
              runData.timeSeconds !== undefined ? runData.timeSeconds ?? 0 : day.runActual?.timeSeconds;
            const hasData =
              (nextDistance ?? 0) > 0 || (nextTime ?? 0) > 0;
            return {
              ...day,
              runActual: hasData ? { distance: nextDistance ?? 0, timeSeconds: nextTime ?? 0 } : undefined,
            };
          }),
        })),

      updateExerciseNotes: (dayId, exerciseId, notes) =>
        set((state) => ({
          currentPlan: state.currentPlan.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, notes } : exercise,
              ),
            };
          }),
        })),

      swapExercise: (dayId, exerciseId, next) =>
        set((state) => ({
          currentPlan: state.currentPlan.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              exercises: day.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;
                const primary = exercise.primary ?? {
                  id: exercise.id,
                  name: exercise.name,
                  muscleGroup: exercise.muscleGroup,
                };
                const isBackToPrimary =
                  exercise.primary &&
                  (next.id === exercise.primary.id || next.name === exercise.primary.name);
                if (isBackToPrimary) {
                  return {
                    ...exercise,
                    name: primary.name,
                    muscleGroup: primary.muscleGroup,
                    primary: undefined,
                    swapReason: undefined,
                  };
                }
                return {
                  ...exercise,
                  name: next.name,
                  muscleGroup: next.muscleGroup ?? exercise.muscleGroup,
                  primary,
                  swapReason: next.reason,
                };
              }),
            };
          }),
        })),

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

      restorePlan: (plan) => set({ currentPlan: plan }),

      exportData: () => JSON.stringify(get().getUserData()),

      importData: (json) => {
        try {
          const data = userDataSchema.parse(JSON.parse(json));
          const normalizedProfile = normalizeProfile(data.profile);
          const normalizedHistory = pruneHistory((data.history || []).map(normalizeDayData));
          const importedPlan = data.currentPlan?.length ? data.currentPlan.map(normalizeDayData) : [];
          const incomingSchemaVersion = data.schemaVersion ?? 0;
          const shouldUpgradePlan =
            incomingSchemaVersion < 2 && looksLikeLegacyDefaultPlan(importedPlan);
          const normalizedPlan = shouldUpgradePlan
            ? buildPlan(normalizedProfile)
            : importedPlan.length
              ? importedPlan
              : buildPlan(normalizedProfile);
          set({
            profile: normalizedProfile,
            history: normalizedHistory,
            currentPlan: normalizedPlan,
          });
          return true;
        } catch (e) {
          return false;
        }
      },

      applyUserData: (data) =>
        set(() => {
          const normalizedProfile = normalizeProfile(data.profile);
          const normalizedIncomingPlan = data.currentPlan?.length
            ? data.currentPlan.map(normalizeDayData)
            : [];
          const incomingSchemaVersion = data.schemaVersion ?? 0;
          const shouldUpgradePlan =
            incomingSchemaVersion < 2 && looksLikeLegacyDefaultPlan(normalizedIncomingPlan);
          return {
            profile: normalizedProfile,
            history: pruneHistory((data.history || []).map(normalizeDayData)),
            currentPlan: shouldUpgradePlan
              ? buildPlan(normalizedProfile)
              : normalizedIncomingPlan.length
                ? normalizedIncomingPlan
                : buildPlan(normalizedProfile),
          };
        }),

      getUserData: () => ({
        schemaVersion: 2,
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
      version: 4,
      migrate: (persistedState) => {
        const wrapped = persistedState as { state?: AppState } | AppState;
        const state = (("state" in wrapped ? wrapped.state : wrapped) || {}) as Partial<AppState>;
        const normalizedProfile = normalizeProfile({
          ...DEFAULT_PROFILE,
          ...(state.profile || {}),
        });
        const normalizeDay = (day: WorkoutDay) => ({
          ...day,
          dayType: day.dayType ?? inferDayType(day.title, day.type),
        });
        const normalizedPlan = (state.currentPlan || []).map(normalizeDay);
        const normalizedHistory = (state.history || []).map(normalizeDay);
        const normalizedLogs = (state.setLogs || []).map((log: LoggedSet) => ({
          ...log,
          exerciseName: log.exerciseName || "Exercise",
        }));

        // Upgrade the old default plan to the new JSON-backed one, but avoid
        // clobbering custom plans.
        const shouldReplacePlan = looksLikeLegacyDefaultPlan(normalizedPlan);
        const nextPlan = shouldReplacePlan
          ? buildPlan(normalizedProfile)
          : normalizedPlan.length
            ? normalizedPlan
            : buildPlan(normalizedProfile);
        return {
          ...state,
          profile: normalizedProfile,
          history: pruneHistory(normalizedHistory),
          currentPlan: nextPlan,
          setLogs: normalizedLogs,
        } as AppState;
      },
    }
  )
);

export const rehydrateStore = () => useStore.persist.rehydrate();
