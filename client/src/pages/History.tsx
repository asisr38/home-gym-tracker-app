import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Activity, Calendar, Flame } from "lucide-react";
import { format } from "date-fns";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export default function History() {
  const { history, profile } = useStore();

  const stats = useMemo(() => {
    const now = Date.now();
    const currentWeekStart = now - 7 * MS_IN_DAY;
    const previousWeekStart = now - 14 * MS_IN_DAY;

    const exerciseSessions = new Map<string, { date: number; weight: number | null }[]>();
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

    const strength = [...exerciseSessions.entries()].map(([name, sessions]) => {
      const sorted = sessions.sort((a, b) => b.date - a.date);
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
      const uniqueDays = [...dayKeys].sort((a, b) => (a > b ? -1 : 1));
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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Progress</h1>
          <p className="text-xs text-muted-foreground">Clean snapshots of strength, volume, and consistency.</p>
        </div>

        {history.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No sessions logged yet. Start a workout to see progress here.
          </div>
        )}

        {history.length > 0 && (
          <>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Strength
                </CardTitle>
                <CardDescription className="text-xs">Best weight per exercise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.strength.length === 0 && (
                  <div className="text-xs text-muted-foreground">Log sets to see strength trends.</div>
                )}
                {stats.strength.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Best {item.bestWeight === 0 ? "0" : item.bestWeight || "--"} {profile.units === "imperial" ? "lbs" : "kg"}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-muted-foreground">{item.trend}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Volume
                </CardTitle>
                <CardDescription className="text-xs">Weekly total volume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={volumePercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(stats.currentWeekVolume)} total volume</span>
                  <span>Prev week: {Math.round(stats.previousWeekVolume)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" /> Consistency
                </CardTitle>
                <CardDescription className="text-xs">Streak and monthly cadence</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Workout streak</div>
                  <div className="text-xl font-semibold">{stats.streak} days</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Days trained this month</div>
                  <div className="text-xl font-semibold">{stats.daysThisMonth}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Cardio
                </CardTitle>
                <CardDescription className="text-xs">Total minutes & average duration</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Total minutes</div>
                  <div className="text-xl font-semibold">{stats.cardioTotalMinutes}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg session</div>
                  <div className="text-xl font-semibold">{stats.cardioAvgMinutes} min</div>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground">
              Updated {format(new Date(), "MMM d, yyyy")}
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}
