import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Play,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getLastWeekBestForExercise } from "@/lib/progression";

type Params = {
  dayId: string;
  exerciseId: string;
};

type SetField = "weight" | "actualReps";

const trendArrow = (current?: number | null, previous?: number | null) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return "→";
  }
  if (current > previous) return "↑";
  if (current < previous) return "↓";
  return "→";
};

const parseTargetReps = (value?: string) => {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export default function ExerciseDetail() {
  const { dayId, exerciseId } = useParams<Params>();
  const [, setLocation] = useLocation();
  const { currentPlan, history, swapExercise, updateExerciseNotes, profile, logSet } = useStore();
  const { toast } = useToast();

  const day = currentPlan.find((entry) => entry.id === dayId);
  const exercise = day?.exercises.find((entry) => entry.id === exerciseId);

  const unitLabel = profile.units === "imperial" ? "lbs" : "kg";
  const weightStep = profile.units === "imperial" ? 5 : 2.5;

  const primaryExercise = exercise?.primary
    ?? (exercise
      ? {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
        }
      : undefined);

  const exerciseIndex = day ? day.exercises.findIndex((entry) => entry.id === exerciseId) : -1;
  const totalExercises = day?.exercises.length ?? 0;
  const previousExercise = exerciseIndex > 0 ? day?.exercises[exerciseIndex - 1] : undefined;
  const nextExercise =
    exerciseIndex >= 0 && exerciseIndex < totalExercises - 1
      ? day?.exercises[exerciseIndex + 1]
      : undefined;
  const progressValue = totalExercises > 0 ? ((exerciseIndex + 1) / totalExercises) * 100 : 0;

  const alternatives = useMemo(() => {
    if (!exercise || !primaryExercise) return [];
    const baseAlternatives = exercise.alternatives || [];
    const primaryOption = exercise.primary
      ? [
          {
            id: primaryExercise.id,
            name: primaryExercise.name,
            muscleGroup: primaryExercise.muscleGroup,
            reason: "Original exercise",
          },
        ]
      : [];
    const combined = [...primaryOption, ...baseAlternatives];
    const seen = new Set<string>();
    return combined.filter((option) => {
      const key = option.id || option.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [exercise, primaryExercise]);

  const historyEntries = useMemo(() => {
    if (!exercise) return [];
    return history
      .filter((entry) => entry.exercises.some((item) => item.name === exercise.name))
      .map((entry) => {
        const match = entry.exercises.find((item) => item.name === exercise.name);
        const completedSets = match?.sets.filter((set) => set.completed) ?? [];
        const bestSet = completedSets.reduce((best, current) => {
          if (!best) return current;
          const bestWeight = best.weight ?? 0;
          const currentWeight = current.weight ?? 0;
          return currentWeight > bestWeight ? current : best;
        }, undefined as typeof completedSets[number] | undefined);
        return {
          id: `${entry.id}-${entry.dateCompleted}`,
          date: entry.dateCompleted ? new Date(entry.dateCompleted) : null,
          weight: bestSet?.weight ?? null,
          reps: bestSet?.actualReps ?? (bestSet ? parseFloat(bestSet.targetReps) : null),
        };
      })
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
      .slice(0, 5);
  }, [exercise, history]);

  const historyTrend = useMemo(() => [...historyEntries].reverse(), [historyEntries]);
  const lastWeekBest = useMemo(
    () => getLastWeekBestForExercise(history, exercise?.name ?? "", profile.startOfWeek),
    [exercise?.name, history, profile.startOfWeek],
  );
  const sparklinePoints = useMemo(() => {
    const weights = historyTrend
      .map((entry) => entry.weight)
      .filter((value): value is number => typeof value === "number");
    if (weights.length < 2) return "";
    const max = Math.max(...weights);
    const min = Math.min(...weights);
    const range = max - min || 1;
    return weights
      .map((weight, index) => {
        const x = (index / (weights.length - 1)) * 100;
        const y = 90 - ((weight - min) / range) * 70;
        return `${x},${y}`;
      })
      .join(" ");
  }, [historyTrend]);

  if (!exercise || !day) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Exercise not found.</div>
      </div>
    );
  }

  const completedSetCount = exercise.sets.filter((set) => set.completed).length;
  const setProgress = exercise.sets.length
    ? (completedSetCount / exercise.sets.length) * 100
    : 0;
  const latestWeight = historyEntries[0]?.weight ?? null;

  const adjustSetValue = (setId: string, field: SetField, delta: number) => {
    const target = exercise.sets.find((set) => set.id === setId);
    if (!target) return;
    const baseValue =
      field === "weight"
        ? target.weight ?? latestWeight ?? 0
        : target.actualReps ?? parseTargetReps(target.targetReps) ?? 0;
    const nextValue = Math.max(0, baseValue + delta);
    logSet(dayId, exercise.id, setId, { [field]: nextValue });
  };

  const handleSaveSet = (setId: string, setIndex: number) => {
    logSet(dayId, exercise.id, setId, { completed: true });
    toast({
      title: `Set ${setIndex + 1} saved`,
      description: "Logged and added to your session summary.",
    });
    const hasRemaining = exercise.sets.some(
      (set) => set.id === setId ? false : !set.completed,
    );
    if (!hasRemaining) {
      if (nextExercise) {
        setLocation(`/exercise/${dayId}/${nextExercise.id}`);
      } else {
        toast({
          title: "Exercise complete",
          description: "All sets logged. Return to the session when ready.",
        });
      }
    }
  };

  return (
    <div className="min-h-screen app-shell flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background app-panel safe-px safe-pt shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-border/60 sm:rounded-[28px] pb-28">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/session/${dayId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{exercise.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {exercise.muscleGroup || "Full Body"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[11px]">
                  Exercise {exerciseIndex + 1} of {totalExercises}
                </Badge>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Session flow</span>
                  <span>{Math.round(progressValue)}% complete</span>
                </div>
                <Progress value={progressValue} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Exercise Details</CardTitle>
              <CardDescription className="text-xs">
                {primaryExercise?.name} • {primaryExercise?.muscleGroup || "Full Body"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Prescribed</span>
                <span>
                  {exercise.sets.length} x {exercise.sets[0]?.targetReps ?? "8-12"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sets logged</span>
                <span>
                  {completedSetCount}/{exercise.sets.length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs text-muted-foreground">
                <span>Last week best</span>
                <span className="font-mono text-foreground">
                  {lastWeekBest
                    ? `${lastWeekBest.weight} ${unitLabel} x ${lastWeekBest.reps ?? "--"}`
                    : "--"}
                </span>
              </div>
              <Progress value={setProgress} className="h-1.5" />
              {exercise.swapReason && (
                <div className="text-xs text-muted-foreground">
                  Swapped: {exercise.swapReason}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Log Sets</CardTitle>
              <CardDescription className="text-xs">
                Adjust weight and reps, then save each set to auto-advance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercise.sets.map((set, index) => {
                const isCompleted = set.completed;
                return (
                  <div
                    key={set.id}
                    className={cn(
                      "rounded-xl border border-border/60 p-3 space-y-2",
                      isCompleted ? "bg-primary/10" : "bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Set {index + 1}</div>
                      {isCompleted ? (
                        <Badge className="gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" />Completed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Target {set.targetReps}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-muted-foreground">Weight ({unitLabel})</div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={() => adjustSetValue(set.id, "weight", -weightStep)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          placeholder={latestWeight !== null ? latestWeight.toString() : "0"}
                          value={set.weight ?? ""}
                          onChange={(event) =>
                            logSet(dayId, exercise.id, set.id, {
                              weight:
                                event.target.value === ""
                                  ? null
                                  : parseFloat(event.target.value),
                            })
                          }
                          className="h-10 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={() => adjustSetValue(set.id, "weight", weightStep)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-muted-foreground">Reps ({set.targetReps})</div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={() => adjustSetValue(set.id, "actualReps", -1)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          placeholder={set.targetReps}
                          value={set.actualReps ?? ""}
                          onChange={(event) =>
                            logSet(dayId, exercise.id, set.id, {
                              actualReps:
                                event.target.value === ""
                                  ? null
                                  : parseFloat(event.target.value),
                            })
                          }
                          className="h-10 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={() => adjustSetValue(set.id, "actualReps", 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        className="h-10"
                        onClick={() => handleSaveSet(set.id, index)}
                        disabled={isCompleted}
                      >
                        {isCompleted ? "Saved" : "Save Set"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() => logSet(dayId, exercise.id, set.id, { completed: false })}
                        disabled={!isCompleted}
                      >
                        Undo
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Session Summary
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {completedSetCount} logged
                  </div>
                </div>
                {completedSetCount === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Log your first set to see it summarized here.
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    {exercise.sets.map((set, idx) =>
                      set.completed ? (
                        <div
                          key={set.id}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium">Set {idx + 1}</span>
                          <span className="text-muted-foreground">
                            {set.weight ?? "--"} {unitLabel} x {set.actualReps ?? "--"} reps
                          </span>
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Alternatives</CardTitle>
              <CardDescription className="text-xs">
                Tap to swap if equipment is unavailable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {alternatives.length === 0 && (
                <div className="text-xs text-muted-foreground">No alternatives listed yet.</div>
              )}
              {alternatives.map((option) => {
                const isActive = option.name === exercise.name;
                return (
                  <button
                    key={option.id || option.name}
                    type="button"
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                    onClick={() => {
                      if (isActive) return;
                      const exerciseKey = exercise.id;
                      const previous = {
                        id: exercise.id,
                        name: exercise.name,
                        muscleGroup: exercise.muscleGroup,
                        reason: "Back to previous",
                      };
                      swapExercise(dayId, exerciseKey, option);
                      toast({
                        title: `Swapped to ${option.name}`,
                        description: option.reason || "Alternative selected.",
                        action: (
                          <ToastAction
                            altText="Undo swap"
                            onClick={() => swapExercise(dayId, exerciseKey, previous)}
                          >
                            Undo
                          </ToastAction>
                        ),
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-11 w-11 rounded-lg flex items-center justify-center",
                          isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.name}</span>
                          {isActive && (
                            <span className="text-[10px] uppercase tracking-wide text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {option.reason || "Equipment unavailable"} • {option.muscleGroup || "Full Body"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes & Guidance</CardTitle>
              <CardDescription className="text-xs">
                Form cues, tweaks, or pain signals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={exercise.notes || ""}
                onChange={(event) => updateExerciseNotes(dayId, exercise.id, event.target.value)}
                onBlur={() =>
                  toast({
                    title: "Notes saved",
                    description: "Your form notes are stored for the next session.",
                  })
                }
                className="min-h-[110px]"
                placeholder="Add a quick note..."
              />
              <details className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Form tips & demo
                </summary>
                <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <p>Brace your core, control the lowering phase, and stay within a pain-free range.</p>
                  <p>Adjust tempo or range of motion if the set feels unstable.</p>
                  {exercise.videoUrl ? (
                    <a
                      href={exercise.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary"
                    >
                      <Play className="h-4 w-4" /> Watch demo video
                    </a>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Add a video link to keep technique cues handy.
                    </div>
                  )}
                </div>
              </details>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last 5 Sessions</CardTitle>
              <CardDescription className="text-xs">Best set trend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {historyEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground">No history yet.</div>
              ) : (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Best set trend</span>
                      <span>{historyEntries[0]?.weight ?? "--"} {unitLabel}</span>
                    </div>
                    {sparklinePoints ? (
                      <svg
                        viewBox="0 0 100 100"
                        className="mt-2 h-16 w-full"
                        preserveAspectRatio="none"
                      >
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-primary"
                          points={sparklinePoints}
                        />
                      </svg>
                    ) : (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Log two or more sessions to see a trend line.
                      </div>
                    )}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Best</TableHead>
                        <TableHead>Reps</TableHead>
                        <TableHead className="text-right">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyEntries.map((entry, index) => {
                        const previous = historyEntries[index + 1];
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs font-medium">
                              {entry.date ? format(entry.date, "MMM d") : "Session"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {entry.weight ?? "--"} {unitLabel}
                            </TableCell>
                            <TableCell className="text-xs">
                              {entry.reps ?? "--"}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {trendArrow(entry.weight, previous?.weight)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur p-4 safe-pb">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={!previousExercise}
              onClick={() =>
                previousExercise && setLocation(`/exercise/${dayId}/${previousExercise.id}`)
              }
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={() =>
                nextExercise
                  ? setLocation(`/exercise/${dayId}/${nextExercise.id}`)
                  : setLocation(`/session/${dayId}`)
              }
            >
              {nextExercise ? "Next Exercise" : "Back to Session"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
