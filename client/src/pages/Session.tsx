import { useParams, useLocation } from "@/lib/router";
import { useStore, ExerciseSet, type WorkoutDay } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Flag,
  Search,
  Target,
  Timer,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { getBestSetForExercise, getLastWeekBestForExercise } from "@/lib/progression";
import { getExerciseSwapOptions, getPrimaryExercise, type ExerciseSwapOption } from "@/lib/exercise-alternatives";
import { MetricPill, SurfaceCard } from "@/components/ui/app-surfaces";
import { getWorkoutTypeLabel, getWorkoutVisual } from "@/lib/day-ui";

const DEFAULT_REST_SECONDS = 90;

const parseTargetReps = (value: string) => {
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export default function Session() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const {
    currentPlan,
    logSet,
    logWorkoutSet,
    completeWorkout,
    undoCompleteWorkout,
    swapExercise,
    updateWorkoutNotes,
    updateRunDraft,
    profile,
    setLogs,
    history,
  } = useStore();
  const { toast } = useToast();
  
  const day = currentPlan.find(d => d.id === id);
  const fallbackWorkout: WorkoutDay = {
    id: "mock-day",
    dayNumber: 1,
    title: "Starter Session",
    type: "lift",
    completed: false,
    exercises: [
      {
        id: "mock-e1",
        name: "Pushups",
        sets: Array.from({ length: 3 }, (_, i) => ({
          id: `s-${i + 1}`,
          targetReps: "10-12",
          actualReps: null,
          weight: null,
          completed: false,
          perfectForm: false,
        })),
      },
      {
        id: "mock-e2",
        name: "Bodyweight Squats",
        sets: Array.from({ length: 3 }, (_, i) => ({
          id: `s-${i + 1}`,
          targetReps: "12-15",
          actualReps: null,
          weight: null,
          completed: false,
          perfectForm: false,
        })),
      },
    ],
  };
  const resolvedDay = day || (currentPlan.length === 0 ? fallbackWorkout : null);
  const isMockDay = !day && currentPlan.length === 0;
  const [notes, setNotes] = useState("");
  const [runDistance, setRunDistance] = useState("");
  const [runTime, setRunTime] = useState("");
  const [calvesStretched, setCalvesStretched] = useState(false);
  const isRunDay = resolvedDay?.type === "run" || resolvedDay?.type === "recovery";
  const [logInputs, setLogInputs] = useState<Record<string, { weight: string; reps: string }>>({});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restRunning, setRestRunning] = useState(false);
  const [restComplete, setRestComplete] = useState(false);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);
  const [swapQuery, setSwapQuery] = useState("");
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now());
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const notesHydratedRef = useRef(false);
  const runDraftHydratedRef = useRef(false);

  useEffect(() => {
    setLogInputs({});
    const initialExerciseIndex =
      resolvedDay?.type === "lift"
        ? Math.max(
            resolvedDay.exercises.findIndex((exercise) =>
              exercise.sets.some((set) => !set.completed),
            ),
            0,
          )
        : 0;
    setActiveExerciseIndex(initialExerciseIndex);
    setRestRemaining(null);
    setRestRunning(false);
    setRestComplete(false);
    setSwapSheetOpen(false);
    setSwapQuery("");
    setFinishDialogOpen(false);
    setSessionStartedAt(Date.now());
    setSessionElapsedSeconds(0);
  }, [resolvedDay?.id]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setSessionElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [sessionStartedAt]);

  useEffect(() => {
    if (!resolvedDay) return;
    setNotes(resolvedDay.notes || "");
    setCalvesStretched(!!resolvedDay.calvesStretched);
    if (resolvedDay.runActual?.distance) {
      setRunDistance(resolvedDay.runActual.distance.toString());
    } else if (resolvedDay.runTarget?.distance && isRunDay) {
      setRunDistance(resolvedDay.runTarget.distance.toString());
    } else {
      setRunDistance("");
    }
    if (resolvedDay.runActual?.timeSeconds) {
      setRunTime((resolvedDay.runActual.timeSeconds / 60).toString());
    } else {
      setRunTime("");
    }
    notesHydratedRef.current = false;
    runDraftHydratedRef.current = false;
  }, [resolvedDay?.id, isRunDay]);

  useEffect(() => {
    if (!resolvedDay || !notesHydratedRef.current) {
      notesHydratedRef.current = true;
      return;
    }

    updateWorkoutNotes(resolvedDay.id, notes);
  }, [notes, resolvedDay?.id, updateWorkoutNotes]);

  useEffect(() => {
    if (!resolvedDay || !runDraftHydratedRef.current) {
      runDraftHydratedRef.current = true;
      return;
    }

    const distance =
      runDistance.trim() === "" ? null : parseFloat(runDistance);
    const timeMinutes =
      runTime.trim() === "" ? null : parseFloat(runTime);

    updateRunDraft(resolvedDay.id, {
      distance: distance === null || Number.isNaN(distance) ? null : distance,
      timeSeconds:
        timeMinutes === null || Number.isNaN(timeMinutes) ? null : timeMinutes * 60,
    });
  }, [runDistance, runTime, resolvedDay?.id, updateRunDraft]);

  useEffect(() => {
    if (!restRunning || restRemaining === null) return;
    if (restRemaining <= 0) {
      setRestRunning(false);
      if (!restComplete) {
        setRestComplete(true);
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 880;
          gain.gain.value = 0.2;
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.3);
          oscillator.onended = () => context.close();
        } catch {
          // Ignore audio errors (autoplay restrictions or unsupported APIs).
        }
      }
      return;
    }

    const timerId = window.setTimeout(() => {
      setRestRemaining((prev) => (prev ?? 0) - 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [restRunning, restRemaining, restComplete]);

  if (!resolvedDay) return <div>Workout not found</div>;

  const totalSets = resolvedDay.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = resolvedDay.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((set) => set.completed).length,
    0,
  );
  const sessionVisual = getWorkoutVisual(resolvedDay.dayType, resolvedDay.type);
  const SessionIcon = sessionVisual.icon;
  const sessionProgress =
    totalSets > 0 ? (completedSets / totalSets) * 100 : resolvedDay.completed ? 100 : 0;

  const lastWeightByExercise = useMemo(() => {
    const map = new Map<string, number>();
    [...setLogs]
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((log) => {
        const key = log.exerciseName || log.exerciseId;
        if (!map.has(key) && log.weight !== null) {
          map.set(key, log.weight);
        }
      });
    [...history]
      .sort((a, b) => {
        const timeA = a.dateCompleted ? Date.parse(a.dateCompleted) : 0;
        const timeB = b.dateCompleted ? Date.parse(b.dateCompleted) : 0;
        return timeB - timeA;
      })
      .forEach((dayEntry) => {
        dayEntry.exercises.forEach((exercise) => {
          const key = exercise.name;
          if (map.has(key)) return;
          const lastSetWithWeight = [...exercise.sets].reverse().find((set) => set.weight !== null);
          if (lastSetWithWeight?.weight !== null && lastSetWithWeight?.weight !== undefined) {
            map.set(key, lastSetWithWeight.weight);
          }
        });
      });
    return map;
  }, [setLogs, history]);

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}:${String(mins % 60).padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRestTimer = (seconds = DEFAULT_REST_SECONDS) => {
    setRestComplete(false);
    setRestRemaining(seconds);
    setRestRunning(true);
  };

  const handleSetUpdate = (exerciseId: string, setId: string, field: keyof ExerciseSet, value: any) => {
    logSet(resolvedDay.id, exerciseId, setId, { [field]: value });
  };

  const unitLabel = profile.units === "imperial" ? "lbs" : "kg";
  const weightStep = profile.units === "imperial" ? 5 : 2.5;

  const adjustQuickWeight = (
    exerciseId: string,
    fallbackWeight?: number,
    fallbackReps?: number | null,
    delta = 0,
  ) => {
    setLogInputs((prev) => {
      const current = prev[exerciseId]?.weight ?? (fallbackWeight?.toString() ?? "");
      const parsed = parseFloat(current || "0");
      const base = Number.isNaN(parsed) ? 0 : parsed;
      const nextValue = Math.max(0, base + delta);
      return {
        ...prev,
        [exerciseId]: {
          weight: nextValue ? nextValue.toString() : "",
          reps: prev[exerciseId]?.reps ?? (fallbackReps?.toString() ?? ""),
        },
      };
    });
  };

  const setQuickWeight = (exerciseId: string, value: number, fallbackReps?: number | null) => {
    const nextValue = Math.max(0, value);
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        weight: nextValue ? nextValue.toString() : "",
        reps: prev[exerciseId]?.reps ?? (fallbackReps?.toString() ?? ""),
      },
    }));
  };

  const handleQuickLog = (
    exerciseId: string,
    targetReps: string,
    fallbackWeight?: number,
    fallbackReps?: number | null,
  ) => {
    const input = logInputs[exerciseId] || {
      weight: fallbackWeight !== undefined ? fallbackWeight.toString() : "",
      reps: fallbackReps?.toString() ?? "",
    };
    const parsedFallbackReps = parseTargetReps(targetReps);
    const rawWeight = input.weight.trim() === "" ? null : parseFloat(input.weight);
    const rawReps =
      input.reps.trim() === "" && parsedFallbackReps !== null
        ? parsedFallbackReps
        : parseFloat(input.reps);
    const weightValue = rawWeight === null || Number.isNaN(rawWeight) ? null : rawWeight;
    const repsValue = rawReps === null || Number.isNaN(rawReps) ? null : rawReps;
    logWorkoutSet(resolvedDay.id, exerciseId, { weight: weightValue, reps: repsValue });
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: { weight: input.weight, reps: input.reps },
    }));
    startRestTimer();

    const latestDay = useStore.getState().currentPlan.find((entry) => entry.id === resolvedDay.id);
    if (!latestDay) return;

    const currentIndex = latestDay.exercises.findIndex((exercise) => exercise.id === exerciseId);
    if (currentIndex < 0) return;

    const currentExerciseDone = latestDay.exercises[currentIndex].sets.every((set) => set.completed);
    if (!currentExerciseDone) return;

    const nextIncompleteIndex = latestDay.exercises.findIndex(
      (exercise, index) => index > currentIndex && exercise.sets.some((set) => !set.completed),
    );
    if (nextIncompleteIndex >= 0) {
      setActiveExerciseIndex(nextIncompleteIndex);
    }
  };

  const handleFinish = () => {
    const distanceValue = runDistance.trim() === "" ? null : parseFloat(runDistance);
    const timeValue = runTime.trim() === "" ? null : parseFloat(runTime) * 60;
    const hasRunData = distanceValue !== null || timeValue !== null;
    const allowRunLogging = resolvedDay.type === "run" || !!resolvedDay.runTarget;
    const runData =
      allowRunLogging && hasRunData
        ? {
          distance: distanceValue ?? 0,
          timeSeconds: timeValue ?? 0,
        }
        : undefined;

    completeWorkout(resolvedDay.id, notes, runData, calvesStretched);
    const completedDay = useStore.getState().currentPlan.find((entry) => entry.id === resolvedDay.id);
    const completedAt = completedDay?.dateCompleted;

    // Best-effort: persist to normalized DB tables for unlimited history + analytics
    if (resolvedDay.type === "lift") {
      const exercises = resolvedDay.exercises.map((ex) => {
        const completedSetsData = ex.sets.filter((s) => s.completed);
        const weights = completedSetsData.map((s) => s.weight ?? 0).filter((w) => w > 0);
        const totalVolume = completedSetsData.reduce(
          (sum, s) => sum + (s.weight ?? 0) * (s.actualReps ?? 0), 0
        );
        return {
          exerciseName: ex.name,
          muscleGroup: ex.muscleGroup,
          setsCompleted: completedSetsData.length,
          setsTotal: ex.sets.length,
          maxWeight: weights.length ? Math.max(...weights) : null,
          totalVolume,
        };
      });
      const allSets = resolvedDay.exercises.flatMap((ex) => ex.sets);
      const completedSetsCount = allSets.filter((s) => s.completed).length;
      const totalVolumeAll = resolvedDay.exercises.reduce(
        (sum, ex) => sum + ex.sets.filter((s) => s.completed).reduce(
          (s2, s) => s2 + (s.weight ?? 0) * (s.actualReps ?? 0), 0
        ), 0
      );
      apiRequest("POST", "/api/workouts", {
        dayId: resolvedDay.id,
        title: resolvedDay.title,
        dayType: resolvedDay.dayType,
        workoutType: resolvedDay.type,
        completedAt: completedAt ?? new Date().toISOString(),
        notes: notes || undefined,
        totalVolume: totalVolumeAll,
        totalSets: allSets.length,
        completedSets: completedSetsCount,
        exercises,
      }).catch(() => {});
    } else if (runData) {
      apiRequest("POST", "/api/workouts", {
        dayId: resolvedDay.id,
        title: resolvedDay.title,
        dayType: resolvedDay.dayType,
        workoutType: resolvedDay.type,
        completedAt: completedAt ?? new Date().toISOString(),
        notes: notes || undefined,
        totalVolume: 0,
        totalSets: 0,
        completedSets: 0,
        runDistance: runData.distance,
        runTimeSeconds: runData.timeSeconds,
        exercises: [],
      }).catch(() => {})
    }
    toast({
      title: "Workout completed",
      description:
        resolvedDay.type === "lift" && totalSets > 0 && completedSets < totalSets
          ? "Finished early. You can undo if you want to keep going."
          : "Great job. Rest up and hydrate.",
      action: (
        <ToastAction
          altText="Undo completion"
          onClick={() => {
            undoCompleteWorkout(resolvedDay.id, completedAt);
            setLocation(`/session/${resolvedDay.id}`);
          }}
        >
          Undo
        </ToastAction>
      ),
    });
    setLocation("/");
  };

  const handleFinishPress = () => {
    const shouldConfirmEarlyFinish =
      resolvedDay.type === "lift" &&
      totalSets > 0 &&
      completedSets < totalSets;

    if (shouldConfirmEarlyFinish) {
      setFinishDialogOpen(true);
      return;
    }

    handleFinish();
  };

  const isLegDay = resolvedDay.dayType === "legs" || resolvedDay.title.toLowerCase().includes("leg") || resolvedDay.title.toLowerCase().includes("lower");
  const completedExercises = resolvedDay.exercises.filter((exercise) =>
    exercise.sets.every((set) => set.completed),
  ).length;
  const remainingSets = Math.max(totalSets - completedSets, 0);
  const safeExerciseIndex =
    resolvedDay.type === "lift" && resolvedDay.exercises.length
      ? Math.min(activeExerciseIndex, resolvedDay.exercises.length - 1)
      : 0;
  const activeExercise = resolvedDay.type === "lift" ? resolvedDay.exercises[safeExerciseIndex] : null;
  const activeLastWeight = activeExercise ? lastWeightByExercise.get(activeExercise.name) : undefined;
  const activeLastWeekBest = useMemo(
    () =>
      activeExercise
        ? getLastWeekBestForExercise(history, activeExercise.name, profile.startOfWeek)
        : null,
    [activeExercise, history, profile.startOfWeek],
  );
  const activeBestSet = useMemo(
    () => (activeExercise ? getBestSetForExercise(history, activeExercise.name) : null),
    [activeExercise, history],
  );
  const activePrimaryExercise = useMemo(
    () => (activeExercise ? getPrimaryExercise(activeExercise) : null),
    [activeExercise],
  );
  const activeSwapOptions = useMemo(
    () => (activeExercise ? getExerciseSwapOptions(activeExercise) : []),
    [activeExercise],
  );
  const filteredSwapOptions = useMemo(() => {
    const query = swapQuery.trim().toLowerCase();
    if (!query) return activeSwapOptions;
    return activeSwapOptions.filter((option) =>
      [option.name, option.reason, option.muscleGroup]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [activeSwapOptions, swapQuery]);
  const activeTargetReps = activeExercise?.sets[0]?.targetReps ?? "8-12";
  const activeSuggestedWeight = activeBestSet?.weight ?? activeLastWeight;
  const activeSuggestedReps = activeBestSet?.reps ?? parseTargetReps(activeTargetReps);
  const activeInputs =
    activeExercise
      ? logInputs[activeExercise.id] || {
          weight:
            activeSuggestedWeight === null || activeSuggestedWeight === undefined
              ? ""
              : activeSuggestedWeight.toString(),
          reps: activeSuggestedReps?.toString() ?? "",
        }
      : { weight: "", reps: "" };
  const weightSuggestions =
    activeSuggestedWeight === null || activeSuggestedWeight === undefined
      ? [weightStep, weightStep * 2, weightStep * 3]
      : [activeSuggestedWeight - weightStep, activeSuggestedWeight, activeSuggestedWeight + weightStep]
          .filter((value) => value > 0)
          .map((value) => Number(value.toFixed(2)));
  const activeCompletedSets = activeExercise
    ? activeExercise.sets.filter((set) => set.completed).length
    : 0;
  const activeRemainingSets = activeExercise
    ? Math.max(activeExercise.sets.length - activeCompletedSets, 0)
    : 0;
  const activeExerciseDone = activeExercise ? activeRemainingSets === 0 : false;
  const activeExerciseProgress = activeExercise?.sets.length
    ? (activeCompletedSets / activeExercise.sets.length) * 100
    : 0;
  const nextIncompleteExercise =
    resolvedDay.type === "lift"
      ? resolvedDay.exercises.find((exercise) => exercise.sets.some((set) => !set.completed)) ?? null
      : null;

  const handleSwapSelection = (option: ExerciseSwapOption) => {
    if (!activeExercise || option.isCurrent) return;

    const exerciseKey = activeExercise.id;
    const previous = {
      id: activeExercise.id,
      name: activeExercise.name,
      muscleGroup: activeExercise.muscleGroup,
      reason: option.isOriginal ? "Back to previous swap" : "Back to previous",
    };

    swapExercise(resolvedDay.id, exerciseKey, option);
    setSwapSheetOpen(false);
    setSwapQuery("");
    toast({
      title: option.isOriginal ? `Back to ${option.name}` : `Swapped to ${option.name}`,
      description:
        option.reason || "Your sets and progress stayed attached to this slot.",
      action: (
        <ToastAction
          altText="Undo swap"
          onClick={() => swapExercise(resolvedDay.id, exerciseKey, previous)}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  return (
    <div className="min-h-screen app-shell flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background app-panel safe-px safe-pt shadow-2xl ring-1 ring-white/10 border border-border/60 sm:rounded-[30px] pb-24">
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/80 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-eyebrow">Session</p>
              <h2 className="truncate text-sm font-semibold tracking-[0.02em]">{resolvedDay.title}</h2>
            </div>
            <Button size="sm" onClick={handleFinishPress} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Finish
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-4">
          {isMockDay && (
            <SurfaceCard tone="amber" className="p-4">
              <p className="text-sm text-muted-foreground">
                Starter template loaded because no plan data was found.
              </p>
            </SurfaceCard>
          )}

          <SurfaceCard tone={sessionVisual.tone} className="p-5">
            <div className={cn("absolute inset-x-0 top-0 h-28 bg-linear-to-br", sessionVisual.gradientClassName)} />
            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-background/45">
                      <SessionIcon className={cn("h-5 w-5", sessionVisual.accentClassName)} />
                    </div>
                    <MetricPill tone={sessionVisual.tone}>
                      {getWorkoutTypeLabel(resolvedDay.dayType, resolvedDay.type)}
                    </MetricPill>
                  </div>
                  <div>
                    <p className="text-eyebrow">Day {resolvedDay.dayNumber}</p>
                    <h1 className="text-2xl font-bold tracking-[-0.04em]">{resolvedDay.title}</h1>
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-background/40 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Progress</div>
                  <div className="text-lg font-semibold">{Math.round(sessionProgress)}%</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <MetricPill icon={Dumbbell}>
                  {resolvedDay.type === "lift" ? `${completedSets}/${totalSets} sets` : "Cardio log"}
                </MetricPill>
                <MetricPill icon={Target}>
                  {resolvedDay.type === "lift"
                    ? `${completedExercises}/${resolvedDay.exercises.length} exercises`
                    : resolvedDay.runTarget?.distance
                      ? `${resolvedDay.runTarget.distance} ${profile.units === "imperial" ? "mi" : "km"} target`
                      : "Recovery day"}
                </MetricPill>
                <MetricPill icon={Timer}>
                  {formatElapsedTime(sessionElapsedSeconds)}
                </MetricPill>
                <MetricPill icon={Clock3}>
                  {restRemaining !== null ? formatRestTime(Math.max(restRemaining, 0)) : "No rest timer"}
                </MetricPill>
              </div>
            </div>
          </SurfaceCard>

          {resolvedDay.type === "lift" && !resolvedDay.completed ? (
            <SurfaceCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Focus now
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {nextIncompleteExercise
                      ? `Next up: ${nextIncompleteExercise.name}`
                      : "All exercises logged. Add notes or finish the session."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {remainingSets > 0
                      ? `${remainingSets} sets remaining across the session.`
                      : "No sets left. You can finish whenever you're ready."}
                  </p>
                </div>
                <div className="rounded-[1.1rem] border border-border/60 bg-background/38 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Remaining
                  </div>
                  <div className="text-lg font-semibold">{remainingSets}</div>
                </div>
              </div>
            </SurfaceCard>
          ) : null}

          {restRemaining !== null && (
            <SurfaceCard tone="amber" className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Rest Timer</p>
                    <p className="text-2xl font-mono font-semibold">
                      {formatRestTime(Math.max(restRemaining, 0))}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {restComplete ? "Rest complete" : restRunning ? "Running" : "Paused"}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <Button type="button" variant="outline" className="h-11" onClick={() => setRestRunning((prev) => !prev)}>
                    {restRunning ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setRestRemaining((prev) => Math.max((prev ?? 0) + 15, 0))}
                  >
                    +15s
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setRestRemaining((prev) => Math.max((prev ?? 0) - 15, 0))}
                  >
                    -15s
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      setRestRunning(false);
                      setRestRemaining(null);
                      setRestComplete(false);
                    }}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </SurfaceCard>
          )}

          {resolvedDay.type === "lift" && activeExercise && (
            <div className="space-y-4">
              <SurfaceCard className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      disabled={safeExerciseIndex === 0}
                      onClick={() => setActiveExerciseIndex((prev) => Math.max(prev - 1, 0))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Exercise</p>
                      <p className="text-sm font-semibold">
                        {safeExerciseIndex + 1} / {resolvedDay.exercises.length}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      disabled={safeExerciseIndex === resolvedDay.exercises.length - 1}
                      onClick={() =>
                        setActiveExerciseIndex((prev) =>
                          Math.min(prev + 1, resolvedDay.exercises.length - 1),
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Completed exercises</span>
                    <span className="font-mono">
                      {completedExercises}/{resolvedDay.exercises.length}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {resolvedDay.exercises.map((exercise, index) => {
                      const exerciseDone = exercise.sets.every((set) => set.completed);
                      return (
                        <Button
                          key={exercise.id}
                          type="button"
                          size="sm"
                          variant={index === safeExerciseIndex ? "default" : "outline"}
                          className={cn(
                            "h-8 min-w-8 px-2",
                            exerciseDone && index !== safeExerciseIndex && "border-primary/30 text-primary",
                          )}
                          onClick={() => setActiveExerciseIndex(index)}
                        >
                          {index + 1}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard tone={sessionVisual.tone} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setLocation(`/exercise/${resolvedDay.id}/${activeExercise.id}`)}
                      >
                        <p className="text-base font-semibold">{activeExercise.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {activeExercise.sets.length} x {activeTargetReps} •{" "}
                          {activeExercise.muscleGroup || "Full Body"}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {Math.max(activeSwapOptions.length - 1, 0)} swap options
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {activeRemainingSets} sets left
                        </Badge>
                        {activeExercise.swapReason && (
                          <Badge variant="outline" className="text-[10px]">
                            Swapped today
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <div>Last</div>
                      <div className="font-mono text-sm text-foreground">
                        {activeLastWeight ?? "--"} {unitLabel}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Exercise completion</span>
                      <span>{Math.round(activeExerciseProgress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${activeExerciseProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Need another option?
                        </p>
                        <p className="mt-1 text-sm">
                          Keep this slot, sets, and progress. Swap only the movement.
                        </p>
                        {activePrimaryExercise && activeExercise.name !== activePrimaryExercise.name && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Original movement: {activePrimaryExercise.name}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0"
                        onClick={() => setSwapSheetOpen(true)}
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Find swap
                      </Button>
                    </div>
                    {activeExercise.swapReason && (
                      <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-[11px] text-muted-foreground">
                        <span>Why this swap</span>
                        <span className="font-medium text-foreground">{activeExercise.swapReason}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">Quick Log Next Set</p>
                    <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
                      <span>Last week best</span>
                      <span className="font-mono text-foreground">
                        {activeLastWeekBest
                          ? `${activeLastWeekBest.weight} ${unitLabel} x ${activeLastWeekBest.reps ?? "--"}`
                          : "--"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() =>
                          adjustQuickWeight(
                            activeExercise.id,
                            activeSuggestedWeight,
                            activeSuggestedReps,
                            -weightStep,
                          )
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder={`Weight (${unitLabel})`}
                        value={activeInputs.weight}
                        onChange={(e) =>
                          setLogInputs((prev) => ({
                            ...prev,
                            [activeExercise.id]: { ...activeInputs, weight: e.target.value },
                          }))
                        }
                        className="col-span-2 h-11 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() =>
                          adjustQuickWeight(
                            activeExercise.id,
                            activeSuggestedWeight,
                            activeSuggestedReps,
                            weightStep,
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weightSuggestions.map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => setQuickWeight(activeExercise.id, value, activeSuggestedReps)}
                        >
                          {value} {unitLabel}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder={`Reps (${activeTargetReps})`}
                        value={activeInputs.reps}
                        onChange={(e) =>
                          setLogInputs((prev) => ({
                            ...prev,
                            [activeExercise.id]: { ...activeInputs, reps: e.target.value },
                          }))
                        }
                        className="h-11 text-sm"
                      />
                      <Button
                        type="button"
                        className="h-11 text-sm font-semibold"
                        disabled={activeExerciseDone}
                        onClick={() =>
                          handleQuickLog(
                            activeExercise.id,
                            activeTargetReps,
                            activeSuggestedWeight,
                            activeSuggestedReps,
                          )
                        }
                      >
                        {activeExerciseDone ? "Exercise Complete" : "Log Next Set"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground">Set-by-set edit</p>
                    {activeExercise.sets.map((set, idx) => (
                      <div
                        key={set.id}
                        className={cn(
                          "rounded-lg border border-border/60 px-3 py-3 transition-colors",
                          set.completed ? "bg-primary/10" : "bg-muted/30",
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-semibold text-muted-foreground">
                            Set {idx + 1} • Target {set.targetReps}
                          </div>
                          <Checkbox
                            checked={set.completed}
                            onCheckedChange={(checked) => {
                              handleSetUpdate(activeExercise.id, set.id, "completed", !!checked);
                              if (checked && navigator.vibrate) {
                                navigator.vibrate(10);
                              }
                            }}
                            className="h-5 w-5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder={`Weight (${unitLabel})`}
                            className="h-10 text-sm"
                            value={set.weight ?? ""}
                            onChange={(e) =>
                              handleSetUpdate(
                                activeExercise.id,
                                set.id,
                                "weight",
                                e.target.value === "" ? null : parseFloat(e.target.value),
                              )
                            }
                          />
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder={set.targetReps}
                            className="h-10 text-sm"
                            value={set.actualReps ?? ""}
                            onChange={(e) =>
                              handleSetUpdate(
                                activeExercise.id,
                                set.id,
                                "actualReps",
                                e.target.value === "" ? null : parseFloat(e.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SurfaceCard>
            </div>
          )}

          <Sheet open={swapSheetOpen} onOpenChange={setSwapSheetOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-[24px] px-0 pb-0">
              <SheetHeader className="px-4 pb-0">
                <SheetTitle>Swap exercise</SheetTitle>
                <SheetDescription>
                  Search alternatives for this slot. Logged sets stay with the current exercise position.
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-4 pt-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Current slot
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{activeExercise?.name ?? "Exercise"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {activeExercise?.muscleGroup || activePrimaryExercise?.muscleGroup || "Full Body"}
                      </div>
                    </div>
                    {activeExercise && activePrimaryExercise && activeExercise.name !== activePrimaryExercise.name && (
                      <Badge variant="outline" className="text-[10px]">
                        From {activePrimaryExercise.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={swapQuery}
                    onChange={(event) => setSwapQuery(event.target.value)}
                    placeholder="Search by exercise, reason, or muscle group"
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="h-[52vh] px-4 pb-6">
                <div className="space-y-2 pb-6">
                  {filteredSwapOptions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                      No matching swap options.
                    </div>
                  )}
                  {filteredSwapOptions.map((option) => (
                    <button
                      key={option.id || option.name}
                      type="button"
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                        option.isCurrent
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/60 bg-card hover:bg-muted/40",
                      )}
                      onClick={() => handleSwapSelection(option)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{option.name}</span>
                            {option.isCurrent && (
                              <Badge className="h-5 text-[10px]">Current</Badge>
                            )}
                            {option.isOriginal && !option.isCurrent && (
                              <Badge variant="outline" className="h-5 text-[10px]">
                                Original
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {option.muscleGroup || "Full Body"}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {option.reason || "Alternative movement for the same slot"}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "mt-1 flex h-8 w-8 items-center justify-center rounded-full border",
                            option.isCurrent
                              ? "border-primary/30 bg-primary/15 text-primary"
                              : "border-border/60 text-muted-foreground",
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {(resolvedDay.type === "run" || resolvedDay.runTarget) && (
            <SurfaceCard tone="blue" className="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-500/10 p-2 text-blue-400">
                    <Timer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Run Tracker</h3>
                    <p className="text-sm text-muted-foreground">
                      {resolvedDay.runTarget?.description || "Daily active recovery run"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      Distance ({profile.units === "imperial" ? "mi" : "km"})
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder={
                        resolvedDay.runTarget?.distance.toString() || profile.dailyRunTarget.toString()
                      }
                      value={runDistance}
                      onChange={(e) => setRunDistance(e.target.value)}
                      className="text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Time (min)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="30"
                      value={runTime}
                      onChange={(e) => setRunTime(e.target.value)}
                      className="text-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </SurfaceCard>
          )}

          {isLegDay && (
            <SurfaceCard tone="amber" className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-200">Did you stretch calves after run?</span>
                <Checkbox
                  checked={calvesStretched}
                  onCheckedChange={(c) => setCalvesStretched(!!c)}
                  className="h-6 w-6 border-yellow-500"
                />
              </div>
            </SurfaceCard>
          )}

          <SurfaceCard className="p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Notes</label>
              <Textarea
                placeholder="How did it feel? Any pain? RPE?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </SurfaceCard>
        </div>
      </div>

      <AlertDialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <AlertDialogContent className="max-w-sm rounded-[1.5rem] border-border/60 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-300" />
              Finish early?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You still have {remainingSets} sets left in this workout. Finish now only if you are
              done for the day. You can still undo completion from the toast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep training</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleFinish}
            >
              Finish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
