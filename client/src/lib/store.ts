import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { addDays, format, startOfWeek, differenceInDays } from 'date-fns';

export type UnitSystem = 'imperial' | 'metric';
export type DayType = 'lift' | 'run' | 'recovery';

export interface ExerciseSet {
  id: string;
  targetReps: string; // "10-12" or "Failure"
  actualReps: number | null;
  weight: number | null;
  completed: boolean;
  perfectForm: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  restTimerSeconds?: number;
  videoUrl?: string; // Placeholder for future
}

export interface WorkoutDay {
  id: string;
  dayNumber: number; // 1-7
  title: string;
  type: DayType;
  exercises: Exercise[];
  runTarget?: {
    distance: number; // in miles/km
    description: string;
  };
  completed: boolean;
  dateCompleted?: string; // ISO string
  notes?: string;
  runActual?: {
    distance: number;
    timeSeconds: number;
  };
  calvesStretched?: boolean; // For leg day
}

export interface UserProfile {
  name: string;
  height: number;
  weight: number;
  goal: string;
  units: UnitSystem;
  dailyRunTarget: number;
  nutritionTarget: string;
  onboardingCompleted: boolean;
  startOfWeek: number; // 0 = Sunday, 1 = Monday
}

interface AppState {
  profile: UserProfile;
  history: WorkoutDay[]; // Flattened list of completed sessions
  currentPlan: WorkoutDay[]; // The 7-day template
  
  // Actions
  updateProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile) => void;
  logSet: (dayId: string, exerciseId: string, setId: string, data: Partial<ExerciseSet>) => void;
  completeWorkout: (dayId: string, notes?: string, runData?: any, calvesStretched?: boolean) => void;
  resetPlan: () => void; // Regenerate the week
  importData: (jsonData: string) => boolean;
  exportData: () => string;
}

// Initial Template Data
const INITIAL_PLAN: WorkoutDay[] = [
  {
    id: 'day-1',
    dayNumber: 1,
    title: 'Push Day',
    type: 'lift',
    completed: false,
    exercises: [
      { id: 'd1-e1', name: 'DB Flat Bench Press', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '10-12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd1-e2', name: 'Incline DB Press', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd1-e3', name: 'Barbell Floor Press', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '10', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd1-e4', name: 'EZ Skullcrushers', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd1-e5', name: 'Bench Dips', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: 'Failure', actualReps: null, weight: null, completed: false, perfectForm: false })) },
    ]
  },
  {
    id: 'day-2',
    dayNumber: 2,
    title: 'Leg Day',
    type: 'lift',
    completed: false,
    exercises: [
      { id: 'd2-e1', name: 'Barbell RDL', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd2-e2', name: 'Goblet Squats', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '15', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd2-e3', name: 'Walking Lunges', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12/leg', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd2-e4', name: 'Weighted Calf Raises', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '25', actualReps: null, weight: null, completed: false, perfectForm: false })) },
    ]
  },
  {
    id: 'day-3',
    dayNumber: 3,
    title: 'Pull Day',
    type: 'lift',
    completed: false,
    exercises: [
      { id: 'd3-e1', name: 'Barbell Bent-Over Row', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '10', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd3-e2', name: 'Single-Arm DB Row', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12/arm', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd3-e3', name: 'EZ Bar Curls', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd3-e4', name: 'Reverse Grip Curls', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '15', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd3-e5', name: 'DB Pullovers', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '15', actualReps: null, weight: null, completed: false, perfectForm: false })) },
    ]
  },
  {
    id: 'day-4',
    dayNumber: 4,
    title: 'Shoulders & Abs',
    type: 'lift',
    completed: false,
    exercises: [
      { id: 'd4-e1', name: 'Barbell Overhead Press', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '8-10', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd4-e2', name: 'DB Lateral Raises', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '15', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd4-e3', name: 'EZ Upright Rows', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd4-e4', name: 'Russian Twists', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '40 total', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd4-e5', name: 'Lying Leg Raises', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '15', actualReps: null, weight: null, completed: false, perfectForm: false })) },
    ]
  },
  {
    id: 'day-5',
    dayNumber: 5,
    title: 'Full Body Metabolic',
    type: 'lift',
    completed: false,
    exercises: [
      { id: 'd5-e1', name: 'DB Thrusters', sets: Array(4).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd5-e2', name: 'Barbell Floor Wipers', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '12', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd5-e3', name: 'Renegade Rows', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '10/side', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd5-e4', name: 'Decline Pushups', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: 'Failure', actualReps: null, weight: null, completed: false, perfectForm: false })) },
      { id: 'd5-e5', name: 'Plank', sets: Array(3).fill(null).map((_, i) => ({ id: `s-${i}`, targetReps: '60s', actualReps: null, weight: null, completed: false, perfectForm: false })) },
    ]
  },
  {
    id: 'day-6',
    dayNumber: 6,
    title: 'Active Recovery Run',
    type: 'run',
    completed: false,
    exercises: [],
    runTarget: { distance: 3, description: 'Easy pace, keep HR low.' }
  },
  {
    id: 'day-7',
    dayNumber: 7,
    title: 'Long Run / Rest',
    type: 'recovery',
    completed: false,
    exercises: [],
    runTarget: { distance: 5, description: 'Longer distance or complete rest.' }
  }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: {
        name: '',
        height: 0,
        weight: 0,
        goal: '',
        units: 'imperial',
        dailyRunTarget: 2,
        nutritionTarget: '',
        onboardingCompleted: false,
        startOfWeek: 1 // Monday
      },
      history: [],
      currentPlan: INITIAL_PLAN,

      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      
      completeOnboarding: (profile) => set({ profile: { ...profile, onboardingCompleted: true } }),
      
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
        return { currentPlan: newPlan };
      }),

      completeWorkout: (dayId, notes, runData, calvesStretched) => set((state) => {
        const day = state.currentPlan.find(d => d.id === dayId);
        if (!day) return {};
        
        const completedDay = { 
          ...day, 
          completed: true, 
          dateCompleted: new Date().toISOString(),
          notes,
          runActual: runData,
          calvesStretched
        };

        return {
          history: [...state.history, completedDay],
          currentPlan: state.currentPlan.map(d => d.id === dayId ? completedDay : d)
        };
      }),

      resetPlan: () => set({ currentPlan: INITIAL_PLAN }),

      exportData: () => JSON.stringify(get()),

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          set(data);
          return true;
        } catch (e) {
          return false;
        }
      }
    }),
    {
      name: 'iron-stride-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
