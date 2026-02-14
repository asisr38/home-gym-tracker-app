import { useParams, useLocation } from "wouter";
import { useStore, ExerciseSet, type WorkoutDay } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { getLastWeekBestForExercise } from "@/lib/progression";

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

  useEffect(() => {
    setLogInputs({});
    setActiveExerciseIndex(0);
    setRestRemaining(null);
    setRestRunning(false);
    setRestComplete(false);
  }, [resolvedDay?.id]);

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
  }, [resolvedDay?.id, isRunDay]);

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

  const adjustQuickWeight = (exerciseId: string, fallbackWeight?: number, delta = 0) => {
    setLogInputs((prev) => {
      const current = prev[exerciseId]?.weight ?? (fallbackWeight?.toString() ?? "");
      const parsed = parseFloat(current || "0");
      const base = Number.isNaN(parsed) ? 0 : parsed;
      const nextValue = Math.max(0, base + delta);
      return {
        ...prev,
        [exerciseId]: {
          weight: nextValue ? nextValue.toString() : "",
          reps: prev[exerciseId]?.reps ?? "",
        },
      };
    });
  };

  const setQuickWeight = (exerciseId: string, value: number) => {
    const nextValue = Math.max(0, value);
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        weight: nextValue ? nextValue.toString() : "",
        reps: prev[exerciseId]?.reps ?? "",
      },
    }));
  };

  const handleQuickLog = (exerciseId: string, targetReps: string, fallbackWeight?: number) => {
    const input = logInputs[exerciseId] || {
      weight: fallbackWeight !== undefined ? fallbackWeight.toString() : "",
      reps: "",
    };
    const fallbackReps = parseTargetReps(targetReps);
    const rawWeight = input.weight.trim() === "" ? null : parseFloat(input.weight);
    const rawReps =
      input.reps.trim() === "" && fallbackReps !== null ? fallbackReps : parseFloat(input.reps);
    const weightValue = rawWeight === null || Number.isNaN(rawWeight) ? null : rawWeight;
    const repsValue = rawReps === null || Number.isNaN(rawReps) ? null : rawReps;
    logWorkoutSet(resolvedDay.id, exerciseId, { weight: weightValue, reps: repsValue });
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: { weight: input.weight, reps: "" },
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
    const completedAt =
      useStore.getState().currentPlan.find((entry) => entry.id === resolvedDay.id)?.dateCompleted;
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

  const isLegDay = resolvedDay.dayType === "legs" || resolvedDay.title.toLowerCase().includes("leg") || resolvedDay.title.toLowerCase().includes("lower");
  const completedExercises = resolvedDay.exercises.filter((exercise) =>
    exercise.sets.every((set) => set.completed),
  ).length;
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
  const activeTargetReps = activeExercise?.sets[0]?.targetReps ?? "8-12";
  const activeInputs =
    activeExercise
      ? logInputs[activeExercise.id] || {
          weight:
            activeLastWeight === null || activeLastWeight === undefined
              ? ""
              : activeLastWeight.toString(),
          reps: "",
        }
      : { weight: "", reps: "" };
  const weightSuggestions =
    activeLastWeight === null || activeLastWeight === undefined
      ? [weightStep, weightStep * 2, weightStep * 3]
      : [activeLastWeight - weightStep, activeLastWeight, activeLastWeight + weightStep]
          .filter((value) => value > 0)
          .map((value) => Number(value.toFixed(2)));
  return (
    <div className="min-h-screen app-shell flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background app-panel safe-px safe-pt shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-border/60 sm:rounded-[28px] pb-24">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h2 className="font-bold text-sm uppercase tracking-wider">{resolvedDay.title}</h2>
            <p className="text-xs text-muted-foreground">Day {resolvedDay.dayNumber}</p>
          </div>
          <Button size="sm" onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white">
            Finish
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {isMockDay && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Starter template loaded because no plan data was found.
            </div>
          )}

          {restRemaining !== null && (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-3">
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
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setRestRunning((prev) => !prev)}
                  >
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
              </CardContent>
            </Card>
          )}

          {resolvedDay.type === "lift" && activeExercise && (
            <div className="space-y-4">
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-3 space-y-3">
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
                    <span className="font-mono">{completedExercises}/{resolvedDay.exercises.length}</span>
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
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setLocation(`/exercise/${resolvedDay.id}/${activeExercise.id}`)}
                    >
                      <p className="text-base font-semibold">{activeExercise.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {activeExercise.sets.length} x {activeTargetReps} • {activeExercise.muscleGroup || "Full Body"}
                      </p>
                    </button>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <div>Last</div>
                      <div className="font-mono text-sm text-foreground">
                        {activeLastWeight ?? "--"} {unitLabel}
                      </div>
                    </div>
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
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => adjustQuickWeight(activeExercise.id, activeLastWeight, -weightStep)}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        placeholder={`Weight (${unitLabel})`}
                        value={activeInputs.weight}
                        onChange={(e) =>
                          setLogInputs((prev) => ({
                            ...prev,
                            [activeExercise.id]: { ...activeInputs, weight: e.target.value },
                          }))
                        }
                        className="h-11 text-sm col-span-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => adjustQuickWeight(activeExercise.id, activeLastWeight, weightStep)}
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
                          onClick={() => setQuickWeight(activeExercise.id, value)}
                        >
                          {value} {unitLabel}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
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
                        onClick={() => handleQuickLog(activeExercise.id, activeTargetReps, activeLastWeight)}
                      >
                        Log Next Set
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
                </CardContent>
              </Card>
            </div>
          )}

        {/* Run / Cardio Section */}
        {(resolvedDay.type === "run" || resolvedDay.runTarget) && (
           <Card className="border-l-4 border-l-blue-500">
             <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                    <Timer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Run Tracker</h3>
                    <p className="text-sm text-muted-foreground">{resolvedDay.runTarget?.description || 'Daily active recovery run'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Distance ({profile.units === 'imperial' ? 'mi' : 'km'})</label>
                    <Input 
                      type="number" 
                      placeholder={resolvedDay.runTarget?.distance.toString() || profile.dailyRunTarget.toString()}
                      value={runDistance}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRunDistance(value);
                        const parsed = value.trim() === "" ? null : parseFloat(value);
                        updateRunDraft(resolvedDay.id, {
                          distance: parsed === null || Number.isNaN(parsed) ? null : parsed,
                        });
                      }}
                      className="text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Time (min)</label>
                    <Input 
                      type="number" 
                      placeholder="30"
                      value={runTime}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRunTime(value);
                        const parsed = value.trim() === "" ? null : parseFloat(value);
                        updateRunDraft(resolvedDay.id, {
                          timeSeconds:
                            parsed === null || Number.isNaN(parsed) ? null : parsed * 60,
                        });
                      }}
                      className="text-lg font-mono"
                    />
                  </div>
                </div>
             </CardContent>
           </Card>
        )}

        {/* Leg Day Extras */}
        {isLegDay && (
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="font-medium text-yellow-600 dark:text-yellow-400">Did you stretch calves after run?</span>
              <Checkbox 
                checked={calvesStretched}
                onCheckedChange={(c) => setCalvesStretched(!!c)}
                className="h-6 w-6 border-yellow-500"
              />
            </CardContent>
          </Card>
        )}

        {/* Session Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Session Notes</label>
          <Textarea 
            placeholder="How did it feel? Any pain? RPE?"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              updateWorkoutNotes(resolvedDay.id, e.target.value);
            }}
            className="min-h-[100px]"
          />
        </div>
        </div>
      </div>
    </div>
  );
}
