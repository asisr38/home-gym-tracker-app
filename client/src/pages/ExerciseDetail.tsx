import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Params = {
  dayId: string;
  exerciseId: string;
};

const trendArrow = (current?: number | null, previous?: number | null) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return "→";
  }
  if (current > previous) return "↑";
  if (current < previous) return "↓";
  return "→";
};

export default function ExerciseDetail() {
  const { dayId, exerciseId } = useParams<Params>();
  const [, setLocation] = useLocation();
  const { currentPlan, history, swapExercise, updateExerciseNotes, profile } = useStore();
  const { toast } = useToast();

  const day = currentPlan.find((entry) => entry.id === dayId);
  const exercise = day?.exercises.find((entry) => entry.id === exerciseId);

  const unitLabel = profile.units === "imperial" ? "lbs" : "kg";

  const primaryExercise = exercise?.primary ?? (exercise ? {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
  } : undefined);

  const alternatives = useMemo(() => {
    if (!exercise || !primaryExercise) return [];
    const baseAlternatives = exercise.alternatives || [];
    const primaryOption = exercise.primary
      ? [{ id: primaryExercise.id, name: primaryExercise.name, muscleGroup: primaryExercise.muscleGroup, reason: "Original exercise" }]
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

  if (!exercise || !day) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Exercise not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background app-panel shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-border/60 sm:rounded-[28px] pb-24">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/session/${dayId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">{exercise.name}</h2>
            <p className="text-xs text-muted-foreground">{exercise.muscleGroup || "Full Body"}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Primary Exercise</CardTitle>
              <CardDescription className="text-xs">
                {primaryExercise?.name} • {primaryExercise?.muscleGroup || "Full Body"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Prescribed</span>
                <span>
                  {exercise.sets.length} x {exercise.sets[0]?.targetReps ?? "8-12"}
                </span>
              </div>
              {exercise.swapReason && (
                <div className="text-xs text-muted-foreground">
                  Swapped: {exercise.swapReason}
                </div>
              )}
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
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
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
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.name}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-wide text-primary">Current</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {option.reason || "Equipment unavailable"} • {option.muscleGroup || "Full Body"}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription className="text-xs">Form cues, tweaks, or pain signals.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={exercise.notes || ""}
                onChange={(event) => updateExerciseNotes(dayId, exercise.id, event.target.value)}
                className="min-h-[110px]"
                placeholder="Add a quick note..."
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last 5 Sessions</CardTitle>
              <CardDescription className="text-xs">Best set trend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {historyEntries.length === 0 && (
                <div className="text-xs text-muted-foreground">No history yet.</div>
              )}
              {historyEntries.map((entry, index) => {
                const previous = historyEntries[index + 1];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-medium">
                        {entry.date ? format(entry.date, "MMM d") : "Session"}
                      </div>
                      <div className="text-muted-foreground">
                        {entry.weight ?? "--"} {unitLabel} x {entry.reps ?? "--"} reps
                      </div>
                    </div>
                    <div className="text-base font-semibold text-muted-foreground">
                      {trendArrow(entry.weight, previous?.weight)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
