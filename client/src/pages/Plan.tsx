import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Pencil,
  Trash2,
  Check,
  Dumbbell,
  Zap,
  ArrowDownUp,
  Heart,
  Flame,
  Target,
  ChevronLeft,
  ChevronRight,
  Plus,
  Coffee,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getPlannedSetsForDay, getCompletedSetsForDay, estimateDayMinutes } from "@/lib/workout";
import type { WorkoutDay } from "@shared/userData";

// ---------- constants & helpers ----------

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

const DAY_TYPE_CONFIG: Record<string, { icon: typeof Dumbbell; label: string; accent: string; gradient: string; glow: string }> = {
  push: {
    icon: Zap,
    label: "Push",
    accent: "text-blue-400",
    gradient: "from-blue-500/20 via-blue-600/5 to-transparent",
    glow: "shadow-blue-500/20",
  },
  pull: {
    icon: ArrowDownUp,
    label: "Pull",
    accent: "text-violet-400",
    gradient: "from-violet-500/20 via-violet-600/5 to-transparent",
    glow: "shadow-violet-500/20",
  },
  legs: {
    icon: Flame,
    label: "Legs",
    accent: "text-amber-400",
    gradient: "from-amber-500/20 via-amber-600/5 to-transparent",
    glow: "shadow-amber-500/20",
  },
  cardio: {
    icon: Heart,
    label: "Recovery",
    accent: "text-emerald-400",
    gradient: "from-emerald-500/20 via-emerald-600/5 to-transparent",
    glow: "shadow-emerald-500/20",
  },
  full: {
    icon: Target,
    label: "Full Body",
    accent: "text-primary",
    gradient: "from-primary/20 via-primary/5 to-transparent",
    glow: "shadow-primary/20",
  },
};

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  triceps: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  shoulders: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  front_delts: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  side_delts: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  rear_delts: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  upper_chest: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  lats: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  upper_back: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  biceps: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  quads: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  glutes: "bg-red-500/15 text-red-400 border-red-500/20",
  hamstrings: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  calves: "bg-lime-500/15 text-lime-400 border-lime-500/20",
  core: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

function getMuscleColor(muscleGroup?: string): string {
  if (!muscleGroup) return "bg-muted/40 text-muted-foreground border-border/40";
  const lower = muscleGroup.toLowerCase();
  for (const [key, cls] of Object.entries(MUSCLE_COLORS)) {
    if (lower.includes(key)) return cls;
  }
  return "bg-muted/40 text-muted-foreground border-border/40";
}

function extractMuscleGroups(muscleGroup?: string): string[] {
  if (!muscleGroup) return [];
  return muscleGroup.split(" \u2022 ").map((s) => s.trim()).filter(Boolean);
}

function getDayConfig(dayType?: string) {
  return DAY_TYPE_CONFIG[dayType ?? "full"] ?? DAY_TYPE_CONFIG.full;
}

// ---------- sub-components ----------

function DaySelector({
  days,
  selectedIndex,
  onSelect,
}: {
  days: WorkoutDay[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const btn = container.children[selectedIndex] as HTMLElement | undefined;
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar px-1 py-1"
      >
        {days.map((day, i) => {
          const config = getDayConfig(day.dayType);
          const isActive = i === selectedIndex;
          const Icon = config.icon;
          return (
            <motion.button
              key={day.id}
              onClick={() => onSelect(i)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-2xl px-4 py-3 min-w-[68px] transition-all duration-300 shrink-0",
                isActive
                  ? "bg-primary/15 ring-1 ring-primary/40"
                  : "bg-card/60 hover:bg-card/80 ring-1 ring-border/40"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="day-glow"
                  className="absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={cn(
                  "relative text-[10px] font-bold uppercase tracking-[0.15em]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {WEEKDAY_LABELS[i] ?? `D${day.dayNumber}`}
              </span>
              <div
                className={cn(
                  "relative h-8 w-8 rounded-xl flex items-center justify-center transition-colors duration-300",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"
                )}
              >
                {day.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              {day.completed && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise,
  index,
  isEditing,
  onRemove,
  dayType,
}: {
  exercise: WorkoutDay["exercises"][number];
  index: number;
  isEditing: boolean;
  onRemove: () => void;
  dayType?: string;
}) {
  const muscles = extractMuscleGroups(exercise.muscleGroup);
  const totalSets = exercise.sets.length;
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const targetReps = exercise.sets[0]?.targetReps ?? "?";
  const hasProgress = completedSets > 0;
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative"
    >
      <div
        className={cn(
          "relative flex items-start gap-3 rounded-xl p-3 transition-all duration-200",
          "bg-card/40 ring-1 ring-border/30 hover:ring-border/50 hover:bg-card/60"
        )}
      >
        {/* exercise number indicator */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
              hasProgress
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            {index + 1}
          </div>
          {/* tiny progress bar */}
          {totalSets > 0 && (
            <div className="w-1 h-6 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="w-full bg-primary rounded-full"
                initial={{ height: 0 }}
                animate={{ height: `${progressPct}%` }}
                transition={{ delay: index * 0.04 + 0.2, duration: 0.5 }}
              />
            </div>
          )}
        </div>

        {/* content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-tight">{exercise.name}</h4>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* sets x reps chip */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-mono bg-muted/40 rounded-md px-2 py-0.5 ring-1 ring-border/20">
              <span className="text-foreground/90 font-semibold">{totalSets}</span>
              <span className="text-muted-foreground">&times;</span>
              <span className="text-foreground/90 font-semibold">{targetReps}</span>
            </span>
            {hasProgress && (
              <span className="text-[10px] text-primary font-medium">
                {completedSets}/{totalSets} done
              </span>
            )}
          </div>

          {/* muscle group tags */}
          {muscles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {muscles.map((m) => (
                <span
                  key={m}
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                    getMuscleColor(m)
                  )}
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* swap indicator */}
          {exercise.swapReason && exercise.primary && (
            <p className="text-[10px] text-muted-foreground/60 italic">
              Swapped from {exercise.primary.name} &mdash; {exercise.swapReason}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RestDayCard({ day }: { day: WorkoutDay }) {
  const config = getDayConfig(day.dayType);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <div className="relative">
        <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
          <Coffee className={cn("h-9 w-9", config.accent)} />
        </div>
        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center">
          <Heart className="h-3 w-3 text-emerald-400" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Recovery Day</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          {day.runTarget?.description || "Rest, stretch, and let your body rebuild. Light cardio or mobility work encouraged."}
        </p>
      </div>
    </motion.div>
  );
}

function WorkoutDayCard({
  day,
  isEditing,
  onRemoveExercise,
  onAddExercise,
}: {
  day: WorkoutDay;
  isEditing: boolean;
  onRemoveExercise: (exerciseId: string) => void;
  onAddExercise: (exercise: WorkoutDay["exercises"][number]) => void;
}) {
  const config = getDayConfig(day.dayType);
  const Icon = config.icon;
  const isRestDay = day.exercises.length === 0;
  const totalSets = getPlannedSetsForDay(day);
  const completedSets = getCompletedSetsForDay(day);
  const estimated = estimateDayMinutes(day);

  if (isRestDay) {
    return <RestDayCard day={day} />;
  }

  return (
    <motion.div
      key={day.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* day header card */}
      <div className={cn("relative overflow-hidden rounded-2xl p-4 ring-1 ring-border/30", "bg-gradient-to-br", config.gradient)}>
        {/* decorative background element */}
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-current opacity-[0.03]" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", "bg-background/60 ring-1 ring-border/30")}>
                <Icon className={cn("h-4 w-4", config.accent)} />
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] h-5 uppercase tracking-wider font-bold border-0", config.accent, "bg-background/40")}
              >
                {config.label}
              </Badge>
              {day.completed && (
                <Badge className="text-[10px] h-5 bg-emerald-500/20 text-emerald-400 border-emerald-500/20 border font-bold">
                  Done
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight leading-tight">{day.title}</h2>
          </div>
        </div>

        {/* stat chips */}
        <div className="relative flex items-center gap-3 mt-3 pt-3 border-t border-border/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Dumbbell className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground/80">{day.exercises.length}</span>
            <span>exercises</span>
          </div>
          <div className="h-3 w-px bg-border/40" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground/80">{totalSets}</span>
            <span>sets</span>
          </div>
          <div className="h-3 w-px bg-border/40" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5" />
            <span>~{estimated} min</span>
          </div>
        </div>

        {/* progress bar if any progress */}
        {completedSets > 0 && (
          <div className="relative mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-bold text-primary">{Math.round((completedSets / totalSets) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(completedSets / totalSets) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* exercise list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {day.exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              index={i}
              isEditing={isEditing}
              onRemove={() => onRemoveExercise(ex.id)}
              dayType={day.dayType}
            />
          ))}
        </AnimatePresence>

        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-1"
          >
            <AddExerciseDialog
              onAdd={onAddExercise}
              trigger={
                <Button
                  variant="outline"
                  className="w-full h-11 border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              }
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ---------- main page ----------

export default function Plan() {
  const { currentPlan, profile, addExerciseToDay, removeExerciseFromDay } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const selectedDay = currentPlan[selectedDayIndex];

  const handleDaySelect = (index: number) => {
    setDirection(index > selectedDayIndex ? 1 : -1);
    setSelectedDayIndex(index);
  };

  const handlePrev = () => {
    if (selectedDayIndex > 0) handleDaySelect(selectedDayIndex - 1);
  };

  const handleNext = () => {
    if (selectedDayIndex < currentPlan.length - 1) handleDaySelect(selectedDayIndex + 1);
  };

  const trainingDays = currentPlan.filter((d) => d.exercises.length > 0).length;
  const totalExercises = currentPlan.reduce((acc, d) => acc + d.exercises.length, 0);

  const goalLabelMap: Record<string, string> = {
    strength: "Strength",
    hypertrophy: "Muscle Growth",
    endurance: "Endurance",
    fat_loss: "Fat Loss",
    balanced: "Balanced",
  };

  const splitLabelMap: Record<string, string> = {
    upper_lower: "Upper / Lower",
    ppl: "Push Pull Legs",
    ppl_6day: "PPL 6-Day",
    full_body: "Full Body",
  };

  return (
    <MobileShell>
      <div className="p-5 space-y-5">
        {/* page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
                Training Plan
              </p>
              <h1 className="text-xl font-bold tracking-tight leading-tight">
                {splitLabelMap[profile.splitType ?? "upper_lower"] ?? "Weekly Split"}
              </h1>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "gap-1.5 rounded-xl h-9 text-xs font-bold transition-all",
                isEditing && "shadow-lg shadow-primary/25"
              )}
            >
              {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {isEditing ? "Done" : "Edit"}
            </Button>
          </div>

          {/* overview chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/10 text-primary rounded-lg px-2.5 py-1 font-semibold ring-1 ring-primary/20">
              <Dumbbell className="h-3 w-3" />
              {trainingDays} days
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] bg-muted/50 text-muted-foreground rounded-lg px-2.5 py-1 font-medium ring-1 ring-border/30">
              <Target className="h-3 w-3" />
              {totalExercises} exercises
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] bg-muted/50 text-muted-foreground rounded-lg px-2.5 py-1 font-medium ring-1 ring-border/30">
              <Flame className="h-3 w-3" />
              {goalLabelMap[profile.goalType] ?? "Balanced"}
            </span>
          </div>
        </motion.div>

        {/* day selector strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <DaySelector
            days={currentPlan}
            selectedIndex={selectedDayIndex}
            onSelect={handleDaySelect}
          />
        </motion.div>

        {/* day navigation with arrows */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            disabled={selectedDayIndex === 0}
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Day {(selectedDay?.dayNumber ?? selectedDayIndex + 1)} of {currentPlan.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            disabled={selectedDayIndex === currentPlan.length - 1}
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* selected day content */}
        <AnimatePresence mode="wait">
          {selectedDay && (
            <WorkoutDayCard
              key={selectedDay.id}
              day={selectedDay}
              isEditing={isEditing}
              onRemoveExercise={(exerciseId) => removeExerciseFromDay(selectedDay.id, exerciseId)}
              onAddExercise={(exercise) => addExerciseToDay(selectedDay.id, exercise)}
            />
          )}
        </AnimatePresence>
      </div>
    </MobileShell>
  );
}
