import {
  ArrowDownUp,
  Dumbbell,
  Flame,
  Heart,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type SurfaceTone =
  | "default"
  | "primary"
  | "blue"
  | "violet"
  | "amber"
  | "emerald"
  | "rose";

type WorkoutVisual = {
  icon: LucideIcon;
  label: string;
  accentClassName: string;
  gradientClassName: string;
  tone: SurfaceTone;
};

const VISUALS: Record<string, WorkoutVisual> = {
  push: {
    icon: Zap,
    label: "Push",
    accentClassName: "text-sky-300",
    gradientClassName: "from-sky-500/20 via-sky-500/8 to-transparent",
    tone: "blue",
  },
  pull: {
    icon: ArrowDownUp,
    label: "Pull",
    accentClassName: "text-violet-300",
    gradientClassName: "from-violet-500/20 via-violet-500/8 to-transparent",
    tone: "violet",
  },
  legs: {
    icon: Flame,
    label: "Legs",
    accentClassName: "text-amber-300",
    gradientClassName: "from-amber-500/22 via-amber-500/10 to-transparent",
    tone: "amber",
  },
  cardio: {
    icon: Heart,
    label: "Recovery",
    accentClassName: "text-emerald-300",
    gradientClassName: "from-emerald-500/20 via-emerald-500/8 to-transparent",
    tone: "emerald",
  },
  full: {
    icon: Target,
    label: "Full Body",
    accentClassName: "text-primary",
    gradientClassName: "from-primary/20 via-primary/8 to-transparent",
    tone: "primary",
  },
};

export function getWorkoutVisual(dayType?: string, workoutType?: string): WorkoutVisual {
  if (workoutType === "run" || workoutType === "recovery") {
    return VISUALS.cardio;
  }

  if (!dayType) {
    return workoutType === "lift" ? VISUALS.full : VISUALS.cardio;
  }

  return VISUALS[dayType] ?? VISUALS.full;
}

export function getWorkoutTypeLabel(dayType?: string, workoutType?: string) {
  return getWorkoutVisual(dayType, workoutType).label;
}

export function getWorkoutMetricLabel(exerciseCount: number, estimatedMinutes: number) {
  if (exerciseCount === 0) {
    return `Recovery \u2022 ~${estimatedMinutes} min`;
  }

  return `${exerciseCount} exercises \u2022 ~${estimatedMinutes} min`;
}

export const WorkoutTypeIcon = Dumbbell;
