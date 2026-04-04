import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Calendar, Flame, Dumbbell, Clock3 } from "lucide-react";
import { format } from "date-fns";
import { MetricPill, PageHeader, SectionHeading, SurfaceCard } from "@/components/ui/app-surfaces";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/lib/router";

const MS_IN_DAY = 24 * 60 * 60 * 1000;
type ExerciseSessionEntry = { date: number; weight: number | null };

export default function History() {
  const { history, profile } = useStore();
  const [, setLocation] = useLocation();

  const stats = useMemo(() => {
    const now = Date.now();
    const currentWeekStart = now - 7 * MS_IN_DAY;
    const previousWeekStart = now - 14 * MS_IN_DAY;

    const exerciseSessions = new Map<string, ExerciseSessionEntry[]>();
    let currentWeekVolume = 0;
    let previousWeekVolume = 0;
    let cardioTotalSeconds = 0;
    let cardioSessions = 0;

    const dayKeys = new Set<string>();
    const currentMonthKeys = new Set<string>();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    history.forEach((day) => {
      if (day.dateCompleted) {
        const date = new Date(day.dateCompleted);
        const dayKey = date.toISOString().slice(0, 10);
        dayKeys.add(dayKey);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          currentMonthKeys.add(dayKey);
        }
      }

      if (day.runActual?.timeSeconds) {
        cardioTotalSeconds += day.runActual.timeSeconds;
        cardioSessions += 1;
      }

      const dayTimestamp = day.dateCompleted ? Date.parse(day.dateCompleted) : 0;
      const isCurrentWeek = dayTimestamp >= currentWeekStart;
      const isPreviousWeek = dayTimestamp >= previousWeekStart && dayTimestamp < currentWeekStart;

      day.exercises.forEach((exercise) => {
        const completedSets = exercise.sets.filter((set) => set.completed);
        const volume = completedSets.reduce((total, set) => {
          const weight = set.weight ?? 0;
          const reps = (set.actualReps ?? parseFloat(set.targetReps)) || 0;
          return total + weight * reps;
        }, 0);

        if (isCurrentWeek) currentWeekVolume += volume;
        if (isPreviousWeek) previousWeekVolume += volume;

        const bestSet = completedSets.reduce((best, current) => {
          if (!best) return current;
          const bestWeight = best.weight ?? 0;
          const currentWeight = current.weight ?? 0;
          return currentWeight > bestWeight ? current : best;
        }, undefined as typeof completedSets[number] | undefined);

        const weight = bestSet?.weight ?? null;
        const entry = { date: dayTimestamp, weight };
        const list = exerciseSessions.get(exercise.name) || [];
        list.push(entry);
        exerciseSessions.set(exercise.name, list);
      });
    });

    const strength = Array.from(exerciseSessions.entries()).map(([name, sessions]) => {
      const sorted = [...sessions].sort((a, b) => b.date - a.date);
      const bestWeight = sorted.reduce((max, entry) => {
        if (entry.weight === null) return max;
        return Math.max(max, entry.weight ?? 0);
      }, 0);
      const latest = sorted[0]?.weight ?? null;
      const previous = sorted[1]?.weight ?? null;
      const trend = latest === null || previous === null ? "→" : latest > previous ? "↑" : latest < previous ? "↓" : "→";
      return { name, bestWeight, latest, trend };
    });

    strength.sort((a, b) => b.bestWeight - a.bestWeight);

    const streak = (() => {
      const uniqueDays = Array.from(dayKeys).sort((a, b) => (a > b ? -1 : 1));
      let count = 0;
      let cursor = new Date().toISOString().slice(0, 10);
      for (const day of uniqueDays) {
        if (day === cursor) {
          count += 1;
          const prevDate = new Date(Date.parse(day) - MS_IN_DAY);
          cursor = prevDate.toISOString().slice(0, 10);
        } else if (count === 0 && day === cursor) {
          count += 1;
        } else if (count > 0) {
          break;
        }
      }
      return count;
    })();

    return {
      strength: strength.slice(0, 4),
      currentWeekVolume,
      previousWeekVolume,
      streak,
      daysThisMonth: currentMonthKeys.size,
      cardioTotalMinutes: cardioTotalSeconds ? Math.round(cardioTotalSeconds / 60) : 0,
      cardioAvgMinutes: cardioSessions ? Math.round(cardioTotalSeconds / 60 / cardioSessions) : 0,
    };
  }, [history]);

  const volumePercent = stats.previousWeekVolume
    ? Math.min(100, (stats.currentWeekVolume / stats.previousWeekVolume) * 100)
    : stats.currentWeekVolume > 0
      ? 100
      : 0;

  return (
    <MobileShell>
      <div className="space-y-6 p-5">
        <PageHeader
          eyebrow="Progress"
          title="Strength, Volume, Consistency"
          description="Your recent sessions translated into clean training signals instead of a long history dump."
        />

        {history.length === 0 && (
          <SurfaceCard tone="primary" className="p-5">
            <div className="space-y-4">
              <div>
                <p className="text-eyebrow">No Data Yet</p>
                <h2 className="text-xl font-semibold tracking-[-0.03em]">No sessions logged yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start a workout to build strength trends, volume snapshots, and consistency markers.
                </p>
              </div>
              <Button className="w-full" onClick={() => setLocation("/")}>
                Go To Today
              </Button>
            </div>
          </SurfaceCard>
        )}

        {history.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <MetricPill icon={Dumbbell} tone="primary">
                {Math.round(stats.currentWeekVolume)} weekly volume
              </MetricPill>
              <MetricPill icon={Flame} tone="amber">
                {stats.streak} day streak
              </MetricPill>
              <MetricPill icon={Clock3} tone="emerald">
                {stats.cardioTotalMinutes} cardio min
              </MetricPill>
            </div>

            <SurfaceCard tone="primary" className="p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-eyebrow">Weekly Volume</p>
                    <h2 className="text-xl font-semibold tracking-[-0.03em]">Output compared to last week</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Current week volume is {Math.round(stats.currentWeekVolume)} versus{" "}
                      {Math.round(stats.previousWeekVolume)} last week.
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-primary/20 bg-background/40 px-3 py-2 text-right">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trend</div>
                    <div className="text-lg font-semibold">{Math.round(volumePercent)}%</div>
                  </div>
                </div>
                <Progress value={volumePercent} className="h-2.5 bg-primary/12" />
              </div>
            </SurfaceCard>

            <SectionHeading
              icon={TrendingUp}
              title="Performance Snapshot"
              description="The strongest signals from recent logged work."
            />

            <SurfaceCard className="p-5">
              <div className="space-y-3">
                <div>
                  <p className="text-eyebrow">Strength</p>
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">Best weight per exercise</h3>
                </div>
                {stats.strength.length === 0 && (
                  <div className="text-xs text-muted-foreground">Log sets to see strength trends.</div>
                )}
                {stats.strength.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-[1.1rem] border border-border/60 bg-background/40 px-3 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Best {item.bestWeight === 0 ? "0" : item.bestWeight || "--"} {profile.units === "imperial" ? "lbs" : "kg"}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-muted-foreground">{item.trend}</div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <div className="grid gap-3">
              <SurfaceCard tone="amber" className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-semibold">Consistency</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.1rem] border border-border/60 bg-background/38 p-3">
                      <div className="text-xs text-muted-foreground">Workout streak</div>
                      <div className="mt-1 text-2xl font-semibold">{stats.streak} days</div>
                    </div>
                    <div className="rounded-[1.1rem] border border-border/60 bg-background/38 p-3">
                      <div className="text-xs text-muted-foreground">Days this month</div>
                      <div className="mt-1 text-2xl font-semibold">{stats.daysThisMonth}</div>
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard tone="emerald" className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-300" />
                    <p className="text-sm font-semibold">Cardio</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[1.1rem] border border-border/60 bg-background/38 p-3">
                      <div className="text-xs text-muted-foreground">Total minutes</div>
                      <div className="mt-1 text-2xl font-semibold">{stats.cardioTotalMinutes}</div>
                    </div>
                    <div className="rounded-[1.1rem] border border-border/60 bg-background/38 p-3">
                      <div className="text-xs text-muted-foreground">Avg session</div>
                      <div className="mt-1 text-2xl font-semibold">{stats.cardioAvgMinutes} min</div>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            <div className="text-xs text-muted-foreground">
              Updated {format(new Date(), "MMM d, yyyy")}
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}
