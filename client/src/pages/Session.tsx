import { useParams, useLocation } from "wouter";
import { useStore, ExerciseSet, type WorkoutDay } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Timer } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function Session() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { currentPlan, logSet, logWorkoutSet, completeWorkout, profile, setLogs, history } = useStore();
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
  const [activeTab, setActiveTab] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [runDistance, setRunDistance] = useState("");
  const [runTime, setRunTime] = useState("");
  const [calvesStretched, setCalvesStretched] = useState(false);
  const isRunDay = resolvedDay?.type === "run" || resolvedDay?.type === "recovery";
  const [logInputs, setLogInputs] = useState<Record<string, { weight: string; reps: string }>>({});
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restRunning, setRestRunning] = useState(false);
  const [restComplete, setRestComplete] = useState(false);
  // Assumption: default rest timer is 90s for most lifts.
  const DEFAULT_REST_SECONDS = 90;

  useEffect(() => {
    if (resolvedDay && resolvedDay.exercises.length > 0) {
      setActiveTab(resolvedDay.exercises[0].id);
    }
  }, [resolvedDay]);

  useEffect(() => {
    setLogInputs({});
    setRestRemaining(null);
    setRestRunning(false);
    setRestComplete(false);
  }, [resolvedDay?.id]);

  useEffect(() => {
    if (!resolvedDay || !isRunDay) return;
    if (runDistance === "") {
      const defaultDistance = resolvedDay.runTarget?.distance ?? profile.dailyRunTarget;
      setRunDistance(defaultDistance.toString());
    }
  }, [resolvedDay, isRunDay, profile.dailyRunTarget, runDistance]);

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
        if (!map.has(log.exerciseId) && log.weight !== null) {
          map.set(log.exerciseId, log.weight);
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
          if (map.has(exercise.id)) return;
          const lastSetWithWeight = [...exercise.sets].reverse().find((set) => set.weight !== null);
          if (lastSetWithWeight?.weight !== null && lastSetWithWeight?.weight !== undefined) {
            map.set(exercise.id, lastSetWithWeight.weight);
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

  const handleQuickLog = (exerciseId: string) => {
    const input = logInputs[exerciseId] || { weight: "", reps: "" };
    const rawWeight = input.weight.trim() === "" ? null : parseFloat(input.weight);
    const rawReps = input.reps.trim() === "" ? null : parseFloat(input.reps);
    const weightValue = rawWeight === null || Number.isNaN(rawWeight) ? null : rawWeight;
    const repsValue = rawReps === null || Number.isNaN(rawReps) ? null : rawReps;
    logWorkoutSet(resolvedDay.id, exerciseId, { weight: weightValue, reps: repsValue });
    setLogInputs((prev) => ({
      ...prev,
      [exerciseId]: { weight: input.weight, reps: "" },
    }));
    startRestTimer();
  };

  const handleFinish = () => {
    if (resolvedDay.type === "lift" && totalSets > 0 && completedSets < totalSets) {
      const shouldContinue = confirm(
        `You have ${totalSets - completedSets} unchecked sets. Finish anyway?`,
      );
      if (!shouldContinue) return;
    }

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
    toast({
      title: "Workout Completed!",
      description: "Great job. Rest up and hydrate.",
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
  const exerciseHintMap: Record<string, string> = {
    "Barbell Bench Press": "Pinch shoulder blades. Drive feet.",
    "Band Chest Press": "Stay stacked. Smooth lockout.",
    "DB Flat Bench Press": "Tuck elbows. Press straight up.",
    "Incline DB Press": "Chest up. Control the descent.",
    "Feet-Elevated Pushups": "Brace core. Touch chest softly.",
    "Band Incline Press": "Slow lower. Explode up.",
    "Barbell Floor Press": "Pause on triceps. Drive hard.",
    "Pushups": "Straight line. Elbows at 45 deg.",
    "EZ Skullcrushers": "Elbows fixed. Smooth arc.",
    "DB Skullcrushers": "Lower to temples. No flare.",
    "Band Triceps Pressdown": "Lock elbows. Full squeeze.",
    "Bench Dips": "Shoulders down. Full lockout.",
    "Barbell RDL": "Hinge hips. Keep back flat.",
    "DB RDL": "Soft knees. Hips back.",
    "KB RDL": "Hinge, don't squat.",
    "Band Good Morning": "Push hips back. Flat spine.",
    "Single-Leg RDL": "Hips square. Slow lower.",
    "Goblet Squats": "Chest tall. Knees track toes.",
    "Front Squat": "Elbows high. Brace core.",
    "Bodyweight Squats": "Sit back. Full depth.",
    "Walking Lunges": "Soft steps. Stay balanced.",
    "DB Walking Lunges": "Stay tall. Control knee.",
    "Weighted Calf Raises": "Full stretch. Slow squeeze.",
    "Single-Leg Calf Raises": "Pause at top.",
    "Hip Thrust": "Chin tucked. Full hip lockout.",
    "Glute Bridge": "Ribs down. Squeeze glutes.",
    "Barbell Bent-Over Row": "Brace core. Row to waist.",
    "Single-Arm DB Row": "Pull elbow back. Pause.",
    "Band Row": "Squeeze shoulder blades.",
    "Inverted Row": "Body tight. Pull to chest.",
    "EZ Bar Curls": "No swing. Full extension.",
    "DB Curls": "Elbows still. Slow lower.",
    "Band Curls": "Full squeeze. Control down.",
    "Reverse Grip Curls": "Wrists neutral. Slow reps.",
    "DB Pullovers": "Ribs down. Long arc.",
    "Barbell Overhead Press": "Glutes tight. Head through.",
    "DB Overhead Press": "Stack wrist over elbow.",
    "Kettlebell Press": "Grip tight. No lean.",
    "DB Lateral Raises": "Lead with elbows. Soft bend.",
    "Band Lateral Raises": "Stop at shoulder height.",
    "EZ Upright Rows": "Stop mid-chest. Elbows high.",
    "Russian Twists": "Rotate ribs. Breathe steady.",
    "Lying Leg Raises": "Lower slow. No arching.",
    "Dead Bug": "Press low back down.",
    "DB Thrusters": "Drive legs. Smooth press.",
    "Barbell Thrusters": "Brace core. Fast dip.",
    "Barbell Floor Wipers": "Controlled sweep. Brace core.",
    "Renegade Rows": "Feet wide. Hips stable.",
    "Band Rows": "Elbows tight. Full squeeze.",
    "Decline Pushups": "Body straight. Full range.",
    "Plank": "Ribs down. Hold steady.",
    "Side Plank": "Stack hips. Long neck.",
  };

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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Quick Log</h3>
                <span className="text-[10px] text-muted-foreground">Auto-starts 90s rest</span>
              </div>
              <div className="space-y-3">
                {resolvedDay.exercises.map((exercise) => {
                  const lastWeight = lastWeightByExercise.get(exercise.id);
                  const targetReps = exercise.sets[0]?.targetReps ?? "8-12";
                  const inputs = logInputs[exercise.id] || { weight: "", reps: "" };
                  return (
                    <Card key={exercise.id} className="border-border/60 shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{exercise.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {exercise.sets.length} x {targetReps} • Last {lastWeight ?? "--"} {profile.units === "imperial" ? "lbs" : "kg"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            placeholder={`Weight (${profile.units === "imperial" ? "lbs" : "kg"})`}
                            value={inputs.weight}
                            onChange={(e) =>
                              setLogInputs((prev) => ({
                                ...prev,
                                [exercise.id]: { ...inputs, weight: e.target.value },
                              }))
                            }
                            className="h-11 text-sm"
                          />
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
                            onClick={() => handleQuickLog(exercise.id)}
                          >
                            Log Set
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        
        {/* Lift Section */}
        {!isMockDay && resolvedDay.type === 'lift' && (
          <div className="space-y-4">
             {/* Exercise Navigation */}
            <div className="overflow-x-auto pb-2 no-scrollbar">
              <div className="flex gap-2">
                {resolvedDay.exercises.map((ex, idx) => (
                  <button
                    key={ex.id}
                    onClick={() => setActiveTab(ex.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border",
                      activeTab === ex.id 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-card text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {idx + 1}. {ex.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Exercise Card */}
            {resolvedDay.exercises.map((ex) => (
              <div key={ex.id} className={cn(activeTab === ex.id ? "block" : "hidden")}>
                <Card className="border-0 shadow-lg bg-card">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-black uppercase leading-none">{ex.name}</h3>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {exerciseHintMap[ex.name] || "Focus on form. Controlled tempo."}
                        </p>
                      </div>
                      {/* Placeholder for video/info */}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 text-[10px] sm:text-xs font-mono text-muted-foreground mb-2 text-center">
                        <div className="col-span-1">#</div>
                        <div className="col-span-2 sm:col-span-3">WEIGHT ({profile.units === 'imperial' ? 'lbs' : 'kg'})</div>
                        <div className="col-span-2 sm:col-span-3">REPS ({ex.sets[0].targetReps})</div>
                        <div className="col-span-1">✓</div>
                        <div className="col-span-2">★ Form</div>
                      </div>

                      {ex.sets.map((set, idx) => (
                        <div key={set.id} className={cn(
                          "grid grid-cols-8 sm:grid-cols-10 gap-2 items-center p-2 rounded-lg transition-colors",
                          set.completed ? "bg-primary/10" : "bg-muted/30"
                        )}>
                          <div className="col-span-1 text-center font-bold text-sm text-muted-foreground">{idx + 1}</div>
                          
                          <div className="col-span-2 sm:col-span-3">
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="text-center h-9 sm:h-10 font-mono text-base sm:text-lg bg-background"
                              value={set.weight ?? ''}
                              onChange={(e) => handleSetUpdate(
                                ex.id,
                                set.id,
                                'weight',
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )}
                            />
                          </div>
                          
                          <div className="col-span-2 sm:col-span-3">
                            <Input 
                              type="number" 
                              placeholder={set.targetReps}
                              className="text-center h-9 sm:h-10 font-mono text-base sm:text-lg bg-background"
                              value={set.actualReps ?? ''}
                              onChange={(e) => handleSetUpdate(
                                ex.id,
                                set.id,
                                'actualReps',
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )}
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <Checkbox 
                              checked={set.completed}
                              onCheckedChange={(checked) => handleSetUpdate(ex.id, set.id, 'completed', !!checked)}
                              className="h-6 w-6"
                            />
                          </div>

                          <div className="col-span-2 flex justify-center">
                            <Checkbox 
                                checked={set.perfectForm}
                                onCheckedChange={(checked) => handleSetUpdate(ex.id, set.id, 'perfectForm', !!checked)}
                                className="h-6 w-6 border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                              />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
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
                      onChange={(e) => setRunDistance(e.target.value)}
                      className="text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Time (min)</label>
                    <Input 
                      type="number" 
                      placeholder="30"
                      value={runTime}
                      onChange={(e) => setRunTime(e.target.value)}
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
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        </div>
      </div>
    </div>
  );
}
