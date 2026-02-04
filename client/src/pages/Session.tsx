import { useParams, useLocation } from "wouter";
import { useStore, ExerciseSet, type WorkoutDay } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Timer } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";

const DEFAULT_REST_SECONDS = 90;
const SWIPE_THRESHOLD = 60;

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
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restRunning, setRestRunning] = useState(false);
  const [restComplete, setRestComplete] = useState(false);
  const swipeStartRef = useRef(new Map<string, number>());

  useEffect(() => {
    setLogInputs({});
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
  };

  const handleSwipeStart = (key: string, clientX: number) => {
    swipeStartRef.current.set(key, clientX);
  };

  const handleSwipeMove = (
    key: string,
    clientX: number,
    isCompleted: boolean,
    exerciseId: string,
    setId: string,
  ) => {
    const start = swipeStartRef.current.get(key);
    if (start === undefined) return;
    const delta = clientX - start;
    if (delta > SWIPE_THRESHOLD) {
      swipeStartRef.current.delete(key);
      if (!isCompleted) {
        handleSetUpdate(exerciseId, setId, "completed", true);
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }
  };

  const handleSwipeEnd = (key: string) => {
    swipeStartRef.current.delete(key);
  };

  const handleFinish = () => {
    const distanceValue = runDistance.trim() === "" ? null : parseFloat(runDistance);
    const timeValue = runTime.trim() === "" ? null : parseFloat(runTime) * 60;
    const hasRunData = distanceValue !== null || timeValue !== null;
    const runData =
      (resolvedDay.type !== "lift" || resolvedDay.runTarget) && hasRunData
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

  const isLegDay = resolvedDay.title.toLowerCase().includes('leg');
  const hintText = (() => {
    const title = resolvedDay.title.toLowerCase();
    if (resolvedDay.type === "run") return "Easy pace. Breathe through the nose.";
    if (resolvedDay.type === "recovery") return "Light effort. Keep it restorative.";
    if (title.includes("push")) return "Control the tempo. Full range.";
    if (title.includes("pull")) return "Squeeze the back. No momentum.";
    if (title.includes("leg")) return "Drive through heels. Stay tight.";
    if (title.includes("shoulder")) return "Brace core. Smooth reps.";
    if (title.includes("full body")) return "Keep rest short. Stay crisp.";
    return "Quality reps. Leave 1-2 in reserve.";
  })();
  return (
    <div className="min-h-screen app-shell flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background app-panel shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-border/60 sm:rounded-[28px] pb-24">
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
          <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {hintText}
          </div>

          {resolvedDay.type === "lift" && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-xs">
              <span className="text-muted-foreground">Completed sets</span>
              <span className="font-mono font-semibold">{completedSets}/{totalSets}</span>
            </div>
          )}

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

          {resolvedDay.type === "lift" && (
            <div className="space-y-4">
              {resolvedDay.exercises.map((exercise) => {
                const lastWeight = lastWeightByExercise.get(exercise.name);
                const targetReps = exercise.sets[0]?.targetReps ?? "8-12";
                const inputs = logInputs[exercise.id] || {
                  weight: lastWeight === null || lastWeight === undefined ? "" : lastWeight.toString(),
                  reps: "",
                };

                return (
                  <Card key={exercise.id} className="border-border/60 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setLocation(`/exercise/${resolvedDay.id}/${exercise.id}`)}
                        >
                          <p className="text-base font-semibold">{exercise.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {exercise.sets.length} x {targetReps} • {exercise.muscleGroup || "Full Body"}
                          </p>
                        </button>
                        <div className="text-right text-[11px] text-muted-foreground">
                          <div>Last</div>
                          <div className="font-mono text-sm text-foreground">
                            {lastWeight ?? "--"} {unitLabel}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2 items-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          onClick={() => adjustQuickWeight(exercise.id, lastWeight, -weightStep)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          placeholder={`Weight (${unitLabel})`}
                          value={inputs.weight}
                          onChange={(e) =>
                            setLogInputs((prev) => ({
                              ...prev,
                              [exercise.id]: { ...inputs, weight: e.target.value },
                            }))
                          }
                          className="h-11 text-sm col-span-2"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          onClick={() => adjustQuickWeight(exercise.id, lastWeight, weightStep)}
                        >
                          +
                        </Button>
                        <Input
                          type="number"
                          placeholder={`Reps (${targetReps})`}
                          value={inputs.reps}
                          onChange={(e) =>
                            setLogInputs((prev) => ({
                              ...prev,
                              [exercise.id]: { ...inputs, reps: e.target.value },
                            }))
                          }
                          className="h-11 text-sm"
                        />
                        <Button
                          type="button"
                          className="h-11 text-sm"
                          onClick={() => handleQuickLog(exercise.id, targetReps, lastWeight)}
                        >
                          Log
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground">Swipe a set to mark complete.</p>
                        {exercise.sets.map((set, idx) => {
                          const swipeKey = `${exercise.id}-${set.id}`;
                          return (
                            <div
                              key={set.id}
                              className={cn(
                                "grid grid-cols-4 items-center gap-2 rounded-lg border border-border/60 px-2 py-2 text-xs transition-colors touch-pan-y",
                                set.completed ? "bg-primary/10" : "bg-muted/30",
                              )}
                              onPointerDown={(event) =>
                                handleSwipeStart(swipeKey, event.clientX)
                              }
                              onPointerMove={(event) =>
                                handleSwipeMove(
                                  swipeKey,
                                  event.clientX,
                                  set.completed,
                                  exercise.id,
                                  set.id,
                                )
                              }
                              onPointerUp={() => handleSwipeEnd(swipeKey)}
                              onPointerCancel={() => handleSwipeEnd(swipeKey)}
                            >
                              <div className="font-semibold text-muted-foreground">Set {idx + 1}</div>
                              <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-center text-sm"
                                value={set.weight ?? ""}
                                onChange={(e) =>
                                  handleSetUpdate(
                                    exercise.id,
                                    set.id,
                                    "weight",
                                    e.target.value === "" ? null : parseFloat(e.target.value),
                                  )
                                }
                              />
                              <Input
                                type="number"
                                placeholder={set.targetReps}
                                className="h-9 text-center text-sm"
                                value={set.actualReps ?? ""}
                                onChange={(e) =>
                                  handleSetUpdate(
                                    exercise.id,
                                    set.id,
                                    "actualReps",
                                    e.target.value === "" ? null : parseFloat(e.target.value),
                                  )
                                }
                              />
                              <Checkbox
                                checked={set.completed}
                                onCheckedChange={(checked) => {
                                  handleSetUpdate(exercise.id, set.id, "completed", !!checked);
                                  if (checked && navigator.vibrate) {
                                    navigator.vibrate(10);
                                  }
                                }}
                                className="h-5 w-5 justify-self-end"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        {/* Run / Cardio Section */}
        {(isRunDay || resolvedDay.runTarget) && (
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
